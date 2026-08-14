import express, { Request, Response, RequestHandler } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { createExpressCorsOptions } from './corsConfig';
import { isDbReady, pool, testConnection } from './db';
import { RewardService } from './rewardService';
import { userIdFromCookieHeader, verifyInternal, AUTH_ORIGIN } from './sharedAuth';
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

// 정적 파일은 CORS 정책 대상이 아니므로 cors 미들웨어보다 먼저 둔다.
// (웹폰트는 same-origin이어도 브라우저가 CORS 모드로 받아 Origin 헤더를 붙인다 —
//  cors가 앞에 있으면 허용 목록에 없는 오리진에서 woff2가 500으로 떨어진다.)
app.use(express.static('public'));

app.use(cors(createExpressCorsOptions()));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    db: isDbReady() ? 'connected' : 'unavailable',
    timestamp: new Date(),
  });
});

// requireAuth 미들웨어가 채워 넣는 인증된 유저 ID를 담는 요청 타입.
interface AuthedRequest extends Request {
  userId: string;
}

function getUserId(req: Request): string {
  return (req as AuthedRequest).userId;
}

// 인증은 통합 로그인(auth.elcherlab.com)이 발급한 .elcherlab.com 도메인 쿠키로 한다.
// 같은 등록 도메인이라 이 앱으로 오는 요청에 브라우저가 알아서 실어 보낸다.

// DB 연결 보장 미들웨어: 미연결 시 재시도 후 실패하면 503.
const ensureDb: RequestHandler = async (_req, res, next) => {
  if (isDbReady() || (await testConnection())) return next();
  res.status(503).json({
    success: false,
    message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  });
};

// 인증 미들웨어: 통합 세션 쿠키가 유효하면 req.userId(로컬 users.id) 설정, 아니면 401.
const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = await userIdFromCookieHeader(req.headers.cookie);
  if (!userId) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
};

// 가입·로그인·로그아웃은 통합 인증(auth.elcherlab.com)이 소유한다.
// 이 앱은 발급된 쿠키를 검증만 하므로 해당 라우트를 두지 않는다.
// 프론트가 어디로 보낼지 알아야 하므로 주소만 공개한다(비로그인도 필요).
app.get('/api/auth/origin', (_req: Request, res: Response) => {
  res.json({ success: true, authOrigin: AUTH_ORIGIN });
});

/**
 * 통합 인증(auth.elcherlab.com)이 탈퇴 처리 중에 부르는 내부 엔드포인트.
 * Caddy 가 이 호스트의 모든 경로를 프록시하므로 공개 주소로도 닿는다 —
 * 공유 시크릿에서 유도한 토큰을 반드시 확인한다.
 *
 * public.users 한 줄만 지우면 게임 데이터는 전부 따라 지워진다
 * (game_states·재화·레이드 진행도·세션이 users.id 를 on delete cascade 로 참조).
 * 지울 행이 없어도 성공으로 본다 — auth 가 실패한 서비스만 다시 부르므로 멱등이어야 한다.
 */
app.post('/internal/delete-user', ensureDb, async (req: Request, res: Response) => {
  if (!verifyInternal(req.headers['x-internal-auth'])) {
    return res.status(403).json({ success: false, message: 'forbidden' });
  }
  const userId = (req.body as { userId?: unknown } | undefined)?.userId;
  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ success: false, message: 'userId 가 필요합니다.' });
  }
  try {
    const r = await pool.query('DELETE FROM users WHERE identity_id = $1', [userId]);
    console.log(`[delete-user] ${userId} → users ${r.rowCount}행 삭제(연관 데이터 cascade)`);
    return res.json({ success: true, removed: r.rowCount });
  } catch (error: unknown) {
    console.error('[delete-user] error:', error);
    return res.status(500).json({ success: false, message: '삭제 중 오류가 발생했습니다.' });
  }
});

/** 열람권(제35조) — 통합 인증의 "내 데이터 내려받기"가 부른다. 같은 토큰으로 확인한다. */
app.post('/internal/export-user', ensureDb, async (req: Request, res: Response) => {
  if (!verifyInternal(req.headers['x-internal-auth'])) {
    return res.status(403).json({ success: false, message: 'forbidden' });
  }
  const body = req.body as { userId?: unknown; lang?: unknown } | undefined;
  const userId = body?.userId;
  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ success: false, message: 'userId 가 필요합니다.' });
  }
  // 열람권 문서의 키는 언어별로 아예 다른 한 벌이다. 받아서 보관하는 파일이라
  // 같은 키를 언어에 따라 바꾸면 이미 받아 둔 파일과 형식이 갈린다.
  // lang 은 auth 가 본문에 실어 보낸다(모르는 값이면 한국어).
  const en = body?.lang === 'en';
  try {
    const u = await pool.query(
      'SELECT id, nickname, created_at FROM users WHERE identity_id = $1',
      [userId]
    );
    if (!u.rowCount) {
      return res.json(
        en
          ? { service: 'PC Upgrade (pc.elcherlab.com)', storedData: null }
          : { 서비스: '컴퓨터 강화하기 (pc.elcherlab.com)', 저장된데이터: null }
      );
    }
    const localId = u.rows[0].id;
    const [state, perm, ingame, raid] = await Promise.all([
      pool.query('SELECT state, updated_at FROM game_states WHERE user_id = $1', [localId]),
      pool.query('SELECT * FROM permanent_currencies WHERE user_id = $1', [localId]),
      pool.query('SELECT * FROM in_game_currencies WHERE user_id = $1', [localId]),
      pool.query('SELECT * FROM daily_raid_progresses WHERE user_id = $1', [localId]),
    ]);
    if (en) {
      return res.json({
        service: 'PC Upgrade (pc.elcherlab.com)',
        account: { inGameNickname: u.rows[0].nickname, createdAt: u.rows[0].created_at },
        gameProgress: state.rows[0] || null,
        permanentCurrency: perm.rows[0] || null,
        inGameCurrency: ingame.rows[0] || null,
        dailyRaidProgress: raid.rows[0] || null,
      });
    }
    return res.json({
      서비스: '컴퓨터 강화하기 (pc.elcherlab.com)',
      계정: { 게임내닉네임: u.rows[0].nickname, 생성일: u.rows[0].created_at },
      게임진행상태: state.rows[0] || null,
      영구재화: perm.rows[0] || null,
      인게임재화: ingame.rows[0] || null,
      일일레이드진행도: raid.rows[0] || null,
    });
  } catch (error: unknown) {
    console.error('[export-user] error:', error);
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' });
  }
});

// 계정 진행도 초기화 (닉네임·로그인 유지)
app.post('/api/account/reset', ensureDb, requireAuth, async (req: Request, res: Response) => {
  try {
    await StateService.resetAccount(getUserId(req));
    return res.status(200).json({ success: true, message: '계정이 초기화되었습니다.' });
  } catch (error: unknown) {
    console.error('[AccountAPI] reset error:', error);
    return res.status(500).json({ success: false, message: '계정 초기화 중 오류가 발생했습니다.' });
  }
});

// SCA 상점 구매 (서버 잔액 차감·업그레이드 반영)
app.post('/api/sca/purchase', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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
app.post('/api/sca/rebirth', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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
app.post('/api/sca/party/start', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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
app.post('/api/sca/party/income', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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
app.get('/api/state', ensureDb, requireAuth, async (req: Request, res: Response) => {
  try {
    const state = await StateService.getState(getUserId(req));
    return res.status(200).json({ success: true, state });
  } catch (error: unknown) {
    console.error('[StateAPI] get error:', error);
    return res.status(500).json({ success: false, message: '진행도 조회 중 오류가 발생했습니다.' });
  }
});

// 게임 진행도 저장
app.put('/api/state', ensureDb, requireAuth, async (req: Request, res: Response) => {
  try {
    const { state } = req.body ?? {};
    const saved = await StateService.saveState(getUserId(req), state);
    return res.status(200).json({ success: true, state: saved });
  } catch (error: unknown) {
    console.error('[StateAPI] save error:', error);
    return res.status(500).json({ success: false, message: '진행도 저장 중 오류가 발생했습니다.' });
  }
});

app.get('/api/raid/progress', ensureDb, requireAuth, async (req: Request, res: Response) => {
  try {
    const progress = await RewardService.getDailyRaidProgress(getUserId(req));
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

app.post('/api/raid/claim', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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
