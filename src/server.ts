import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db';
import { RewardService } from './rewardService';
import { ClaimRewardRequest } from './types';
import { setupSocketServer } from './socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 헬스 체크 엔드포인트
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * 일일 마일스톤 보상 수령 API 엔드포인트
 * 
 * [요청 Body]
 * - userId: string (UUID)
 * - currentFloor: number (10~100 사이, 10의 배수)
 */
app.post('/api/raid/claim', async (req: Request, res: Response) => {
  const { userId, currentFloor } = req.body as ClaimRewardRequest;

  // 기본 DTO 검증
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: '유저 ID(userId)는 필수 필드입니다.',
      claimedCoins: 0,
      newHighestFloor: 0,
      currentTotalCoins: 0,
    });
  }

  if (currentFloor === undefined || typeof currentFloor !== 'number') {
    return res.status(400).json({
      success: false,
      message: '달성한 층수(currentFloor)는 숫자 타입으로 입력해야 합니다.',
      claimedCoins: 0,
      newHighestFloor: 0,
      currentTotalCoins: 0,
    });
  }

  try {
    // 환경 변수 설정에 따라 수동 TX 처리 혹은 DB RPC 처리 선택 가능 (Supabase 유연성 확보)
    const useRpc = process.env.USE_RPC === 'true';
    let result;

    if (useRpc) {
      console.log(`[RaidAPI] Processing reward claim via DB RPC Function for User: ${userId}, Floor: ${currentFloor}`);
      result = await RewardService.claimRewardWithRpc(userId, currentFloor);
    } else {
      console.log(`[RaidAPI] Processing reward claim via Manual DB Transaction for User: ${userId}, Floor: ${currentFloor}`);
      result = await RewardService.claimRewardWithTx(userId, currentFloor);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[RaidAPI] Error occurred while claiming reward:', error);
    
    // 내부 서버 에러 시 500 응답
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생하여 보상 처리에 실패했습니다.',
      error: error.message || String(error),
      claimedCoins: 0,
      newHighestFloor: 0,
      currentTotalCoins: 0,
    });
  }
});

// 서버 초기화 함수
async function startServer() {
  // DB 서버 접속 유효성 먼저 검사
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('[Server] Critical: Database is not reachable. Shutting down...');
    process.exit(1);
  }

  // Socket.io 소켓 서버 마운트
  setupSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`[Server] 'Computer Upgrade' Web Backend + Socket Server is running`);
    console.log(`[Server] Local URL: http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Mode: ${process.env.USE_RPC === 'true' ? 'Supabase RPC Mode' : 'PostgreSQL Express TX Mode'}`);
    console.log(`==================================================`);
  });
}

startServer();
