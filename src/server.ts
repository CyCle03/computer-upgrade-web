import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { isDbReady, testConnection } from './db';
import { RewardService } from './rewardService';
import { ClaimRewardRequest } from './types';
import { setupSocketServer } from './socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    db: isDbReady() ? 'connected' : 'unavailable',
    timestamp: new Date(),
  });
});

app.post('/api/raid/claim', async (req: Request, res: Response) => {
  if (!isDbReady()) {
    const ok = await testConnection();
    if (!ok) {
      return res.status(503).json({
        success: false,
        message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        claimedCoins: 0,
        newHighestFloor: 0,
        currentTotalCoins: 0,
      });
    }
  }

  const { userId, currentFloor } = req.body as ClaimRewardRequest;

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
    const useRpc = process.env.USE_RPC === 'true';
    const result = useRpc
      ? await RewardService.claimRewardWithRpc(userId, currentFloor)
      : await RewardService.claimRewardWithTx(userId, currentFloor);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[RaidAPI] Error occurred while claiming reward:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생하여 보상 처리에 실패했습니다.',
      error: message,
      claimedCoins: 0,
      newHighestFloor: 0,
      currentTotalCoins: 0,
    });
  }
});

function startServer() {
  setupSocketServer(httpServer);

  httpServer.listen(PORT, HOST, () => {
    console.log('==================================================');
    console.log("[Server] 'Computer Upgrade' Web Backend + Socket Server is running");
    console.log(`[Server] Listening on http://${HOST}:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Mode: ${process.env.USE_RPC === 'true' ? 'Supabase RPC Mode' : 'PostgreSQL Express TX Mode'}`);
    console.log('==================================================');
  });

  testConnection().then((ok) => {
    if (!ok) {
      console.warn('[Server] Database unavailable — static UI is still served; raid API will return 503 until DB connects.');
    }
  });
}

startServer();
