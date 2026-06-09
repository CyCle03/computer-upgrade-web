import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { createExpressCorsOptions } from './corsConfig';
import { isDbReady, testConnection } from './db';
import { RewardService } from './rewardService';
import { AuthService, AuthError } from './authService';
import { StateService } from './stateService';
import { ScaShopService } from './scaShopService';
import { ScaIncomeService } from './scaIncomeService';
import {
  ClaimRewardRequest,
  ScaPurchaseRequest,
  ScaRebirthRequest,
  ScaPartyIncomeRequest,
  ScaPartyStartRequest,
} from './types';
import { setupSocketServer } from './socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors(createExpressCorsOptions()));
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    db: isDbReady() ? 'connected' : 'unavailable',
    timestamp: new Date(),
  });
});

// DB 연결 보장 헬퍼: 미연결 시 재시도 후 실패하면 503 응답.
async function ensureDb(res: Response): Promise<boolean> {
  if (isDbReady()) return true;
  const ok = await testConnection();
  if (!ok) {
    res.status(503).json({
      success: false,
      message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    });
    return false;
  }
  return true;
}

// Authorization 헤더에서 Bearer 토큰 추출.
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

// 인증 미들웨어: 유효한 토큰이면 req.userId 설정, 아니면 401.
async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const userId = await AuthService.resolveToken(extractToken(req));
  if (!userId) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return null;
  }
  return userId;
}

// 회원가입
app.post('/api/auth/register', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const { username, password } = req.body ?? {};
    const result = await AuthService.register(username, password);
    return res.status(201).json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('[AuthAPI] register error:', error);
    return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/auth/login', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const { username, password } = req.body ?? {};
    const result = await AuthService.login(username, password);
    return res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('[AuthAPI] login error:', error);
    return res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 로그아웃 (세션 토큰 폐기)
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    await AuthService.logout(extractToken(req));
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    console.error('[AuthAPI] logout error:', error);
    return res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
});

// 계정 진행도 초기화 (닉네임·로그인 유지)
app.post('/api/account/reset', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    await StateService.resetAccount(userId);
    return res.status(200).json({ success: true, message: '계정이 초기화되었습니다.' });
  } catch (error: unknown) {
    console.error('[AccountAPI] reset error:', error);
    return res.status(500).json({ success: false, message: '계정 초기화 중 오류가 발생했습니다.' });
  }
});

// SCA 상점 구매 (서버 잔액 차감·업그레이드 반영)
app.post('/api/sca/purchase', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const { itemId } = (req.body ?? {}) as ScaPurchaseRequest;
  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({
      success: false,
      message: '상점 항목 ID(itemId)가 필요합니다.',
      scaCoins: 0,
      scaUpgrades: {},
      cost: 0,
    });
  }
  try {
    const result = await ScaShopService.purchase(userId, itemId.trim());
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('[ScaAPI] purchase error:', error);
    return res.status(500).json({
      success: false,
      message: 'SCA 상점 구매 처리 중 오류가 발생했습니다.',
      scaCoins: 0,
      scaUpgrades: {},
      cost: 0,
    });
  }
});

// 환생 SCA 지급 (서버 보상 계산)
app.post('/api/sca/rebirth', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const { parts } = (req.body ?? {}) as ScaRebirthRequest;
  if (!parts || typeof parts !== 'object') {
    return res.status(400).json({
      success: false,
      message: '환생 부품 정보(parts)가 필요합니다.',
      scaCoins: 0,
      scaReward: 0,
      rebirthStat: 0,
      rebirthCount: 0,
    });
  }
  try {
    const result = await ScaIncomeService.claimRebirth(userId, parts);
    if (!result.success) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('[ScaAPI] rebirth error:', error);
    return res.status(500).json({
      success: false,
      message: '환생 SCA 지급 중 오류가 발생했습니다.',
      scaCoins: 0,
      scaReward: 0,
      rebirthStat: 0,
      rebirthCount: 0,
    });
  }
});

// 파티 사냥 타이머 시작
app.post('/api/sca/party/start', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const { tierIndex, parts } = (req.body ?? {}) as ScaPartyStartRequest;
  try {
    const result = await ScaIncomeService.startPartyHunting(userId, Number(tierIndex), parts);
    if (!result.success) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('[ScaAPI] party start error:', error);
    return res.status(500).json({ success: false, message: '파티 타이머 시작 중 오류가 발생했습니다.' });
  }
});

// 파티 사냥 SCA 틱 지급
app.post('/api/sca/party/income', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const { tierIndex, tickCount, parts } = (req.body ?? {}) as ScaPartyIncomeRequest;
  try {
    const result = await ScaIncomeService.claimPartyIncome(
      userId,
      Number(tierIndex),
      Number(tickCount),
      parts
    );
    if (!result.success) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('[ScaAPI] party income error:', error);
    return res.status(500).json({
      success: false,
      message: '파티 SCA 지급 중 오류가 발생했습니다.',
      scaCoins: 0,
      grantedTicks: 0,
      grantedSca: 0,
    });
  }
});

// 게임 진행도 조회
app.get('/api/state', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const state = await StateService.getState(userId);
    return res.status(200).json({ success: true, state });
  } catch (error: unknown) {
    console.error('[StateAPI] get error:', error);
    return res.status(500).json({ success: false, message: '진행도 조회 중 오류가 발생했습니다.' });
  }
});

// 게임 진행도 저장
app.put('/api/state', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const { state } = req.body ?? {};
    const saved = await StateService.saveState(userId, state);
    return res.status(200).json({ success: true, state: saved });
  } catch (error: unknown) {
    console.error('[StateAPI] save error:', error);
    return res.status(500).json({ success: false, message: '진행도 저장 중 오류가 발생했습니다.' });
  }
});

app.get('/api/raid/progress', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) {
    return res.status(503).json({
      success: false,
      message: '데이터베이스에 연결할 수 없습니다.',
      highestClaimedFloor: 0,
      lastPlayedDate: '',
      todayDate: '',
    });
  }

  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const progress = await RewardService.getDailyRaidProgress(userId);
    return res.status(200).json({ success: true, ...progress });
  } catch (error: unknown) {
    console.error('[RaidAPI] progress error:', error);
    return res.status(500).json({
      success: false,
      message: '레이드 진행도를 불러오지 못했습니다.',
      highestClaimedFloor: 0,
      lastPlayedDate: '',
      todayDate: '',
    });
  }
});

app.post('/api/raid/claim', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) {
    return res.status(503).json({
      success: false,
      message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      claimedCoins: 0,
      newHighestFloor: 0,
      currentTotalCoins: 0,
    });
  }

  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { currentFloor } = req.body as ClaimRewardRequest;

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
