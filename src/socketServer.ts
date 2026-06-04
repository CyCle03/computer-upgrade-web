import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RaidRoomState } from './raidSimulator';
import { RewardService } from './rewardService';
import { ComputerParts } from './types';
import { pool } from './db';
import { AuthService } from './authService';
import { getSocketCorsOrigin } from './corsConfig';

// 활성화된 레이드 방 저장소
const activeRooms: Map<string, RaidRoomState> = new Map();

/** Socket.io 연결 시 Bearer 토큰을 검증해 socket.data.userId를 설정한다. */
async function authenticateSocket(socket: Socket): Promise<string | null> {
  const token =
    (socket.handshake.auth?.token as string | undefined) ||
    (socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.slice('Bearer '.length).trim()
      : undefined);

  if (!token) return null;
  return AuthService.resolveToken(token);
}

/**
 * Socket.io 서버 설정 및 실시간 멀티플레이 이벤트 핸들러 주입
 */
export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getSocketCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 120000,
    pingInterval: 30000,
  });

  io.use(async (socket, next) => {
    try {
      const userId = await authenticateSocket(socket);
      if (!userId) {
        return next(new Error('로그인이 필요합니다.'));
      }
      socket.data.userId = userId;
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error('인증 처리 중 오류가 발생했습니다.'));
    }
  });

  console.log('[Socket] Socket.io server successfully attached to HTTP server.');

  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    const userId = socket.data.userId as string;

    console.log(`[Socket] Client connected: SocketID = ${socket.id}, UserID = ${userId}`);

    /**
     * 방 참여 이벤트
     * userId·nickname은 세션 토큰·DB에서 확인한다 (클라이언트 값 신뢰하지 않음).
     */
    socket.on('joinRoom', async ({ roomId, parts }: { roomId: string; parts: ComputerParts }) => {
      try {
        if (!roomId || !parts) {
          socket.emit('error_message', '방 입장 정보가 누락되었습니다.');
          return;
        }

        const userRes = await pool.query(
          `SELECT nickname FROM users WHERE id = $1`,
          [userId]
        );
        if (userRes.rowCount === 0) {
          socket.emit('error_message', '유효하지 않은 계정입니다.');
          return;
        }
        const nickname = userRes.rows[0].nickname as string;

        if (!activeRooms.has(roomId)) {
          console.log(`[Socket] Creating new Raid Room: ${roomId}`);

          const newRoom = new RaidRoomState(
            roomId,
            (state) => {
              io.to(roomId).emit('room_state', state);
            },
            async (uId, clearedFloor) => {
              try {
                console.log(`[Socket DB Core] 10층 마일스톤 돌파 보상 검증 및 지급 시도: User=${uId}, Floor=${clearedFloor}`);
                const useRpc = process.env.USE_RPC === 'true';
                const txResult = useRpc
                  ? await RewardService.claimRewardWithRpc(uId, clearedFloor)
                  : await RewardService.claimRewardWithTx(uId, clearedFloor);

                const targetPlayer = Array.from(newRoom.players.values()).find((p) => p.userId === uId);
                if (targetPlayer) {
                  io.to(targetPlayer.socketId).emit('milestone_reward_claimed', {
                    clearedFloor,
                    txResult,
                  });
                }
                return txResult;
              } catch (err: unknown) {
                console.error('[Socket DB Error] 보상 지급 트랜잭션 중대 오류:', err);
                throw err;
              }
            }
          );
          activeRooms.set(roomId, newRoom);
        }

        const room = activeRooms.get(roomId)!;

        room.addPlayer(socket.id, userId, nickname, parts);
        socket.join(roomId);
        currentRoomId = roomId;

        console.log(`[Socket] Player ${nickname}(${userId}) joined Room ${roomId}. Players inside: ${room.players.size}`);

        io.to(roomId).emit('room_state', room.getSummaryState(`플레이어 ${nickname} 님이 입장하셨습니다.`));
      } catch (err: unknown) {
        console.error('[Socket] Error in joinRoom:', err);
        const message = err instanceof Error ? err.message : '방 입장 도중 오류가 발생했습니다.';
        socket.emit('error_message', message);
      }
    });

    socket.on('readyStatus', ({ isReady }: { isReady: boolean }) => {
      if (!currentRoomId) {
        socket.emit('error_message', '참여 중인 방이 존재하지 않습니다.');
        return;
      }

      const room = activeRooms.get(currentRoomId);
      if (room) {
        room.setReady(socket.id, isReady);
        console.log(`[Socket] Player ${socket.id} ready status changed to: ${isReady}`);

        if (room.isAllReady()) {
          console.log(`[Socket] All players ready in Room ${currentRoomId}. Starting 100-floor boss raid simulation.`);
          room.startRaid();
          io.to(currentRoomId).emit('room_state', room.getSummaryState('보스 레이드가 시작되었습니다. 유닛들이 자동 전투에 진입합니다.'));
        } else {
          io.to(currentRoomId).emit('room_state', room.getSummaryState());
        }
      }
    });

    socket.on('leaveRoom', () => {
      handlePlayerExit();
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: SocketID = ${socket.id}`);
      handlePlayerExit();
    });

    function handlePlayerExit() {
      if (!currentRoomId) return;

      const room = activeRooms.get(currentRoomId);
      if (room) {
        const player = room.players.get(socket.id);
        const nickname = player ? player.nickname : '알 수 없는 유저';

        room.removePlayer(socket.id);
        socket.leave(currentRoomId);

        console.log(`[Socket] Player ${nickname} left Room ${currentRoomId}. Players remaining: ${room.players.size}`);

        if (room.players.size === 0) {
          console.log(`[Socket] Room ${currentRoomId} is empty. Disposing and cleaning up room states.`);
          room.destroy();
          activeRooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit('room_state', room.getSummaryState(`플레이어 ${nickname} 님이 퇴장하셨습니다.`));
        }
      }
      currentRoomId = null;
    }
  });
}
