import { pool } from './db';
import { GameStatePayload } from './types';

const REBIRTH_MINERAL_SCA_PER_10 = 500;
const REBIRTH_MINERAL_CAP = 1_000_000;
const GPU_GRADE_MAX = 3;
const GPU_GRADE_UP_COSTS = [120_000, 600_000, 2_500_000];

const MINING_AMPLIFIER_SPEC = {
  unlockCost: 10_000_000,
  powerUpgradeCost: 1_500_000,
  speedUpgradeCost: 2_500_000,
  maxPowerLevels: 130,
  maxSpeedLevels: 16,
};

type ScaShopItem = {
  id: string;
  maxPurchases: number;
  cost?: number;
  mineralBonus?: number;
  requiresMining?: boolean;
};

const SCA_SHOP_ITEMS: ScaShopItem[] = [
  { id: 'rebirthMineral500', mineralBonus: 500, maxPurchases: 2000 },
  { id: 'rebirthMineralMax200', mineralBonus: 200, maxPurchases: 5000 },
  { id: 'rebirthMineralMax2000', mineralBonus: 2000, maxPurchases: 500 },
  { id: 'rebirthMineralMax7500', mineralBonus: 7500, maxPurchases: 134 },
  { id: 'huntIncome1', cost: 12000, maxPurchases: 10 },
  { id: 'gameSpeed1', cost: 25000, maxPurchases: 12 },
  { id: 'upgradeProb01', cost: 30000, maxPurchases: 10 },
  { id: 'downloadSpeed10', cost: 35000, maxPurchases: 10 },
  { id: 'gpuGradeUp', maxPurchases: 3 },
  { id: 'miningAmplifierUnlock', cost: MINING_AMPLIFIER_SPEC.unlockCost, maxPurchases: 1 },
  { id: 'miningAmplifier', maxPurchases: MINING_AMPLIFIER_SPEC.maxPowerLevels, requiresMining: true },
  { id: 'miningAmplifierSpeed', maxPurchases: MINING_AMPLIFIER_SPEC.maxSpeedLevels, requiresMining: true },
];

export interface ScaPurchaseResult {
  success: boolean;
  message: string;
  scaCoins: number;
  scaUpgrades: Record<string, unknown>;
  cost: number;
}

function getShopItem(itemId: string): ScaShopItem | undefined {
  return SCA_SHOP_ITEMS.find((item) => item.id === itemId);
}

function parseScaUpgrades(state: GameStatePayload): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const raw = state.sca_scaUpgrades;
  if (!raw) return { ...defaults };
  try {
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

function getGpuGradeLevel(scaUpgrades: Record<string, unknown>): number {
  if (typeof scaUpgrades.gpuGradeLevel === 'number') {
    return Math.max(0, Math.min(GPU_GRADE_MAX, scaUpgrades.gpuGradeLevel));
  }
  if (scaUpgrades.gpuGradeUp) {
    const n = typeof scaUpgrades.gpuGradeUp === 'number' ? scaUpgrades.gpuGradeUp : GPU_GRADE_MAX;
    return Math.min(GPU_GRADE_MAX, n);
  }
  return 0;
}

function isMiningAmplifierUnlocked(scaUpgrades: Record<string, unknown>): boolean {
  return !!(scaUpgrades.miningAmplifierUnlock || (Number(scaUpgrades.miningAmplifier) || 0) > 0);
}

function calcRebirthStartMinerals(scaUpgrades: Record<string, unknown>): number {
  let total = 0;
  for (const item of SCA_SHOP_ITEMS) {
    if (item.mineralBonus) {
      total += (Number(scaUpgrades[item.id]) || 0) * item.mineralBonus;
    }
  }
  return Math.min(REBIRTH_MINERAL_CAP, total);
}

function getItemCost(item: ScaShopItem, scaUpgrades: Record<string, unknown>): number {
  if (item.mineralBonus) {
    return Math.floor((item.mineralBonus / 10) * REBIRTH_MINERAL_SCA_PER_10);
  }
  if (item.id === 'gpuGradeUp') {
    const level = getGpuGradeLevel(scaUpgrades);
    if (level >= GPU_GRADE_UP_COSTS.length) return 0;
    return GPU_GRADE_UP_COSTS[level];
  }
  if (item.id === 'miningAmplifier') {
    return MINING_AMPLIFIER_SPEC.powerUpgradeCost;
  }
  if (item.id === 'miningAmplifierSpeed') {
    return MINING_AMPLIFIER_SPEC.speedUpgradeCost;
  }
  return item.cost ?? 0;
}

function canPurchase(item: ScaShopItem, scaUpgrades: Record<string, unknown>): string | null {
  const bought = Number(scaUpgrades[item.id]) || 0;
  if (bought >= item.maxPurchases) {
    return '최대 구매 횟수에 도달했습니다.';
  }
  if (item.id === 'gpuGradeUp' && getGpuGradeLevel(scaUpgrades) >= GPU_GRADE_MAX) {
    return 'GPU 등급이 이미 하이엔드입니다.';
  }
  if (item.id === 'miningAmplifierUnlock' && isMiningAmplifierUnlocked(scaUpgrades)) {
    return '이미 채굴증폭기를 구축했습니다.';
  }
  if (item.requiresMining && !isMiningAmplifierUnlocked(scaUpgrades)) {
    return '먼저 채굴증폭기를 구축해야 합니다.';
  }
  if (item.mineralBonus && calcRebirthStartMinerals(scaUpgrades) >= REBIRTH_MINERAL_CAP) {
    return `시작 미네랄이 이미 최대 상한선(${REBIRTH_MINERAL_CAP.toLocaleString()}원)에 도달했습니다.`;
  }
  return null;
}

function applyPurchase(item: ScaShopItem, scaUpgrades: Record<string, unknown>): Record<string, unknown> {
  const bought = Number(scaUpgrades[item.id]) || 0;
  const next: Record<string, unknown> = { ...scaUpgrades, [item.id]: bought + 1 };
  if (item.id === 'gpuGradeUp') {
    next.gpuGradeLevel = getGpuGradeLevel(scaUpgrades) + 1;
  }
  if (item.id === 'miningAmplifierUnlock') {
    next.miningAmplifierUnlock = 1;
  }
  return next;
}

/**
 * SCA 상점 구매 — 서버에서 비용 검증·잔액 차감·업그레이드 반영.
 */
export class ScaShopService {
  static async purchase(userId: string, itemId: string): Promise<ScaPurchaseResult> {
    const item = getShopItem(itemId);
    if (!item) {
      return { success: false, message: '존재하지 않는 상점 항목입니다.', scaCoins: 0, scaUpgrades: {}, cost: 0 };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stateRes = await client.query(
        `SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      if (stateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: '게임 진행도를 찾을 수 없습니다.', scaCoins: 0, scaUpgrades: {}, cost: 0 };
      }

      const state: GameStatePayload = { ...(stateRes.rows[0].state as GameStatePayload) };
      const scaUpgrades = parseScaUpgrades(state);
      const blockReason = canPurchase(item, scaUpgrades);
      if (blockReason) {
        await client.query('ROLLBACK');
        const wallet = Number(state.sca_scaCoins) || 0;
        return { success: false, message: blockReason, scaCoins: wallet, scaUpgrades, cost: 0 };
      }

      const cost = getItemCost(item, scaUpgrades);
      const wallet = Number(state.sca_scaCoins) || 0;
      if (wallet < cost) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `SCA 코인이 부족합니다. (필요 ${cost.toLocaleString()}, 보유 ${wallet.toLocaleString()})`,
          scaCoins: wallet,
          scaUpgrades,
          cost: 0,
        };
      }

      const nextUpgrades = applyPurchase(item, scaUpgrades);
      const nextWallet = wallet - cost;

      state.sca_scaCoins = String(nextWallet);
      state.sca_scaUpgrades = JSON.stringify(nextUpgrades);

      await client.query(
        `UPDATE game_states
         SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, JSON.stringify(state)]
      );

      await client.query(
        `INSERT INTO permanent_currencies (user_id, sca_coins)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET sca_coins = $2`,
        [userId, nextWallet]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: '구매가 완료되었습니다.',
        scaCoins: nextWallet,
        scaUpgrades: nextUpgrades,
        cost,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ScaShopService] purchase error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
