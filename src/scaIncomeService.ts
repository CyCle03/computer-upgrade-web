import { pool } from './db';
import { getOmgBalance, RebirthParts } from './gameBalance';
import { GameStatePayload } from './types';
import { applyScaWalletDelta } from './scaWalletService';
import { StateKey } from './stateKeys';
import { parseScaUpgrades } from './scaUpgrades';

const PARTY_BASE_TICK_MS = 3000;
const MAX_PARTY_TICKS_PER_REQUEST = 200;

export interface ScaRebirthResult {
  success: boolean;
  message: string;
  scaCoins: number;
  scaReward: number;
  rebirthStat: number;
  rebirthCount: number;
}

export interface ScaPartyIncomeResult {
  success: boolean;
  message: string;
  scaCoins: number;
  grantedTicks: number;
  grantedSca: number;
}

function clampGpuLevel(parts: RebirthParts): number {
  return Math.max(0, Math.min(999, Number(parts.gpu?.level) || 0));
}

function resolvePartyTierForUser(
  omg: ReturnType<typeof getOmgBalance>,
  tierIndex: number,
  parts: RebirthParts | undefined,
  rebirthStat: number,
  scaUpgrades: Record<string, unknown>
): { ok: boolean; message: string; effectiveTier: number } {
  const tiers = omg.PARTY_HUNTING_TIERS;
  if (!Number.isInteger(tierIndex) || tierIndex < 0 || tierIndex >= tiers.length) {
    return { ok: false, message: '올바르지 않은 파티 티어입니다.', effectiveTier: 0 };
  }
  const mining = omg.getMiningPower(scaUpgrades);
  const perf = parts ? omg.calcPartyPerformanceScore(parts, scaUpgrades) : 0;
  if (parts && !omg.canSelectPartyTier(tierIndex, perf, rebirthStat, mining)) {
    const access = omg.evaluatePartyTierAccess(tierIndex, perf, rebirthStat, mining);
    return {
      ok: false,
      message: access.failures.join(' · '),
      effectiveTier: omg.resolvePartyHuntingTierIndex(tierIndex, perf, rebirthStat, mining),
    };
  }
  if (!parts) {
    const tier = tiers[tierIndex];
    const failures: string[] = [];
    if (rebirthStat < (tier.minRebirthStat || 0)) {
      failures.push(`환생수치 ${(tier.minRebirthStat || 0).toLocaleString()}+ 필요`);
    }
    if (mining < (tier.minMiningPower || 0)) {
      failures.push(`채굴력 ${(tier.minMiningPower || 0).toLocaleString()}+ 필요`);
    }
    if (failures.length > 0) {
      return { ok: false, message: failures.join(' · '), effectiveTier: 0 };
    }
  }
  const effectiveTier = parts
    ? omg.resolvePartyHuntingTierIndex(tierIndex, perf, rebirthStat, mining)
    : tierIndex;
  if (effectiveTier !== tierIndex) {
    return {
      ok: false,
      message: '파티 티어 해금 조건을 충족하지 않습니다.',
      effectiveTier,
    };
  }
  return { ok: true, message: '', effectiveTier: tierIndex };
}

/**
 * SCA 수입·환생 — 서버 검증 후 지갑 반영.
 */
export class ScaIncomeService {
  /** 환생 SCA 지급 (부품 스냅샷으로 보상 재계산) */
  static async claimRebirth(userId: string, parts: RebirthParts): Promise<ScaRebirthResult> {
    const gpuLevel = clampGpuLevel(parts);
    if (gpuLevel < 10) {
      return {
        success: false,
        message: 'GPU 10강 이상이어야 환생할 수 있습니다.',
        scaCoins: 0,
        scaReward: 0,
        rebirthStat: 0,
        rebirthCount: 0,
      };
    }

    const omg = getOmgBalance();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO game_states (user_id, state) VALUES ($1, '{}'::jsonb) ON CONFLICT DO NOTHING`,
        [userId]
      );

      const stateRes = await client.query(
        `SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      const state: GameStatePayload = { ...(stateRes.rows[0].state as GameStatePayload) };

      const prevRebirthStat = Number(state[StateKey.rebirthStat]) || 0;
      const prevRebirthCount = Number(state[StateKey.rebirthCount]) || 0;
      const outcome = omg.calcRebirthOutcome(parts, prevRebirthStat);
      const scaReward = Math.max(0, Math.floor(outcome.scaReward));

      const nextWallet = await applyScaWalletDelta(client, userId, state, scaReward);
      state[StateKey.rebirthStat] = String(outcome.correctedStat);
      state[StateKey.rebirthCount] = String(prevRebirthCount + 1);

      await client.query(
        `UPDATE game_states
         SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, JSON.stringify(state)]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: '환생 SCA가 지급되었습니다.',
        scaCoins: nextWallet,
        scaReward,
        rebirthStat: outcome.correctedStat,
        rebirthCount: prevRebirthCount + 1,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ScaIncomeService] claimRebirth error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 파티 사냥 SCA 틱 지급 — 서버 시각 기준 허용 틱만 크레딧.
   * 미네랄 수입은 클라이언트 시뮬, SCA만 서버 권위.
   */
  static async claimPartyIncome(
    userId: string,
    tierIndex: number,
    requestedTicks: number,
    parts?: RebirthParts
  ): Promise<ScaPartyIncomeResult> {
    const omg = getOmgBalance();
    const tiers = omg.PARTY_HUNTING_TIERS;
    if (!Number.isInteger(tierIndex) || tierIndex < 0 || tierIndex >= tiers.length) {
      return {
        success: false,
        message: '올바르지 않은 파티 티어입니다.',
        scaCoins: 0,
        grantedTicks: 0,
        grantedSca: 0,
      };
    }

    const ticksWanted = Math.max(0, Math.min(MAX_PARTY_TICKS_PER_REQUEST, Math.floor(requestedTicks)));
    if (ticksWanted <= 0) {
      return {
        success: true,
        message: '지급할 파티 틱이 없습니다.',
        scaCoins: 0,
        grantedTicks: 0,
        grantedSca: 0,
      };
    }

    const tier = tiers[tierIndex];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stateRes = await client.query(
        `SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      const state: GameStatePayload =
        stateRes.rowCount && stateRes.rows[0].state
          ? { ...(stateRes.rows[0].state as GameStatePayload) }
          : {};

      const scaUpgrades = parseScaUpgrades(state);
      const rebirthStat = Number(state[StateKey.rebirthStat]) || 0;
      const tierCheck = resolvePartyTierForUser(omg, tierIndex, parts, rebirthStat, scaUpgrades);
      if (!tierCheck.ok) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: tierCheck.message,
          scaCoins: Number(state[StateKey.scaCoins]) || 0,
          grantedTicks: 0,
          grantedSca: 0,
        };
      }

      const partyTickMs = omg.calcGameSpeedTickMs(scaUpgrades, PARTY_BASE_TICK_MS);
      const nowMs = Date.now();
      const lastClaimMs = Number(state[StateKey.partyLastClaimMs]) || nowMs;
      const elapsed = Math.max(0, nowMs - lastClaimMs);
      const allowedTicks = Math.floor(elapsed / partyTickMs);
      const grantedTicks = Math.min(ticksWanted, allowedTicks);

      const walletBefore = Number(state[StateKey.scaCoins]) || 0;

      if (grantedTicks <= 0) {
        await client.query('COMMIT');
        return {
          success: true,
          message: '아직 다음 파티 SCA 틱 시각이 되지 않았습니다.',
          scaCoins: walletBefore,
          grantedTicks: 0,
          grantedSca: 0,
        };
      }

      const grantedSca = grantedTicks * tier.scaCoins;
      const nextWallet = await applyScaWalletDelta(client, userId, state, grantedSca);
      state[StateKey.partyLastClaimMs] = String(lastClaimMs + grantedTicks * partyTickMs);
      state[StateKey.partyHuntingTier] = String(tierIndex);

      await client.query(
        `UPDATE game_states
         SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, JSON.stringify(state)]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: '파티 SCA가 지급되었습니다.',
        scaCoins: nextWallet,
        grantedTicks,
        grantedSca,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ScaIncomeService] claimPartyIncome error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /** 파티 사냥 시작·티어 변경 시 타이머 초기화 */
  static async startPartyHunting(
    userId: string,
    tierIndex: number,
    parts?: RebirthParts
  ): Promise<{ success: boolean; message: string }> {
    const omg = getOmgBalance();
    const tiers = omg.PARTY_HUNTING_TIERS;
    if (!Number.isInteger(tierIndex) || tierIndex < 0 || tierIndex >= tiers.length) {
      return { success: false, message: '올바르지 않은 파티 티어입니다.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO game_states (user_id, state) VALUES ($1, '{}'::jsonb) ON CONFLICT DO NOTHING`,
        [userId]
      );
      const stateRes = await client.query(
        `SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      const state: GameStatePayload = { ...(stateRes.rows[0].state as GameStatePayload) };
      const scaUpgrades = parseScaUpgrades(state);
      const rebirthStat = Number(state[StateKey.rebirthStat]) || 0;
      const tierCheck = resolvePartyTierForUser(omg, tierIndex, parts, rebirthStat, scaUpgrades);
      if (!tierCheck.ok) {
        await client.query('ROLLBACK');
        return { success: false, message: tierCheck.message };
      }
      state[StateKey.partyLastClaimMs] = String(Date.now());
      state[StateKey.partyHuntingTier] = String(tierCheck.effectiveTier);
      await client.query(
        `UPDATE game_states SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId, JSON.stringify(state)]
      );
      await client.query('COMMIT');
      return { success: true, message: '파티 사냥 타이머가 시작되었습니다.' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
