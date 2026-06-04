import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RaidRoomState, RaidPlayer } from './raidSimulator';
import { RewardService } from './rewardService';
import { ComputerParts } from './types';
import { pool } from './db';

// 활성화된 레이드 방 저장소
const activeRooms: Map<string, RaidRoomState> = new Map();

/**
 * Socket.io 서버 설정 및 실시간 멀티플레이 이벤트 핸들러 주입
 * 
 * @param httpServer Express HTTP 서버 인스턴스
 */
export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // 전체 오리진 허용 (개발 및 웹 복원 대응)
      methods: ['GET', 'POST'],
    },
    // [고증 보안 고도화] Render.com 무료 호스팅 서버 CPU 쓰로틀링/지연 대비용 커넥션 유지 세팅 상향
    pingTimeout: 120000, // 핑 타임아웃 120초
    pingInterval: 30000, // 핑 주기 30초
  });

  console.log('[Socket] Socket.io server successfully attached to HTTP server.');

  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;

    console.log(`[Socket] Client connected: SocketID = ${socket.id}`);

    /**
     * 방 참여 이벤트
     * 
     * @param roomId 방 고유 ID
     * @param userId 유저 고유 ID (UUID)
     * @param nickname 유저 닉네임
     * @param parts 유저의 현재 컴퓨터 조립 부품 세트
     */
    socket.on('joinRoom', async ({ roomId, userId, nickname, parts, scaUpgrades }: { roomId: string, userId: string, nickname: string, parts: ComputerParts, scaUpgrades?: any }) => {
      try {
        if (!roomId || !userId || !nickname || !parts) {
          socket.emit('error_message', '방 입장 정보가 누락되었습니다.');
          return;
        }

        // [고증 복원 보안 패치] 부모 테이블인 users 테이블에 해당 유저가 존재하지 않으면 강제 Upsert 등록 진행
        // 외래키(foreign key references users(id)) 제약조건으로 인한 트랜잭션 롤백 폭사 방지
        await pool.query(`
          INSERT INTO users (id, nickname)
          VALUES ($1, $2)
          ON CONFLICT (id) 
          DO UPDATE SET nickname = EXCLUDED.nickname
        `, [userId, nickname]);

        // 방이 없으면 동적 신규 생성
        if (!activeRooms.has(roomId)) {
          console.log(`[Socket] Creating new Raid Room: ${roomId}`);
          
          const newRoom = new RaidRoomState(
            roomId,
            // 1. 실시간 브로드캐스트 콜백
            (state) => {
              io.to(roomId).emit('room_state', state);
            },
            // 2. 10층 단위 돌파 시 실시간 DB 보상 안전 지급 콜백 (1단계 모듈 연동)
            async (uId, clearedFloor) => {
              try {
                console.log(`[Socket DB Core] 10층 마일스톤 돌파 보상 검증 및 지급 시도: User=${uId}, Floor=${clearedFloor}`);
                const useRpc = process.env.USE_RPC === 'true';
                const txResult = useRpc
                  ? await RewardService.claimRewardWithRpc(uId, clearedFloor)
                  : await RewardService.claimRewardWithTx(uId, clearedFloor);
                
                // 해당 플레이어의 소켓을 찾아 보상 수령 결과 전송
                const targetPlayer = Array.from(newRoom.players.values()).find(p => p.userId === uId);
                if (targetPlayer) {
                  io.to(targetPlayer.socketId).emit('milestone_reward_claimed', {
                    clearedFloor,
                    txResult,
                  });
                }
                return txResult;
              } catch (err: any) {
                console.error(`[Socket DB Error] 보상 지급 트랜잭션 중대 오류:`, err);
                throw err;
              }
            }
          );
          activeRooms.set(roomId, newRoom);
        }

        const room = activeRooms.get(roomId)!;
        
        // 유저 소켓 채널 등록 및 플레이어 추가
        room.addPlayer(socket.id, userId, nickname, parts, scaUpgrades);
        socket.join(roomId);
        currentRoomId = roomId;

        console.log(`[Socket] Player ${nickname}(${userId}) joined Room ${roomId}. Players inside: ${room.players.size}`);

        // 해당 방 전체 플레이어에게 갱신된 정보 실시간 브로드캐스트
        io.to(roomId).emit('room_state', room.getSummaryState(`플레이어 ${nickname} 님이 입장하셨습니다.`));

      } catch (err: any) {
        console.error('[Socket] Error in joinRoom:', err);
        socket.emit('error_message', err.message || '방 입장 도중 오류가 발생했습니다.');
      }
    });

    /**
     * 준비 상태 업데이트 이벤트
     * 
     * @param isReady 준비 완료 여부
     */
    socket.on('readyStatus', ({ isReady }: { isReady: boolean }) => {
      if (!currentRoomId) {
        socket.emit('error_message', '참여 중인 방이 존재하지 않습니다.');
        return;
      }

      const room = activeRooms.get(currentRoomId);
      if (room) {
        room.setReady(socket.id, isReady);
        console.log(`[Socket] Player ${socket.id} ready status changed to: ${isReady}`);

        // 모든 방 인원이 준비 완료 시 레이드 등반 자동 시작
        if (room.isAllReady()) {
          console.log(`[Socket] All players ready in Room ${currentRoomId}. Starting 100-floor boss raid simulation.`);
          room.startRaid();
          io.to(currentRoomId).emit('room_state', room.getSummaryState('보스 레이드가 시작되었습니다. 유닛들이 자동 전투에 진입합니다.'));
        } else {
          io.to(currentRoomId).emit('room_state', room.getSummaryState());
        }
      }
    });

    /**
     * 방 이탈 이벤트
     */
    socket.on('leaveRoom', () => {
      handlePlayerExit();
    });

    /**
     * 연결 끊김 (이탈과 동일 취급)
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: SocketID = ${socket.id}`);
      handlePlayerExit();
    });

    // 방 이탈 통합 안전 처리 함수
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
