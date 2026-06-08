import { pool } from './db';
import { GameStatePayload } from './types';

/**
 * 계정별 게임 진행도(localStorage 스냅샷)를 PostgreSQL JSONB로 저장/복원하는 서비스.
 */
export class StateService {
  /**
   * 저장된 진행도 조회. 없으면 빈 객체 반환.
   * 레이드 보상이 permanent_currencies에만 쌓인 구버전 데이터는 sca_scaCoins로 1회 병합한다.
   */
  static async getState(userId: string): Promise<GameStatePayload> {
    const res = await pool.query(
      `SELECT state FROM game_states WHERE user_id = $1`,
      [userId]
    );
    const state: GameStatePayload =
      res.rowCount && res.rows[0].state
        ? { ...(res.rows[0].state as GameStatePayload) }
        : {};

    const currRes = await pool.query(
      `SELECT sca_coins FROM permanent_currencies WHERE user_id = $1`,
      [userId]
    );
    const orphanedRaidSca = Number(currRes.rows[0]?.sca_coins) || 0;
    if (orphanedRaidSca <= 0) {
      return state;
    }

    const walletSca = Number(state.sca_scaCoins) || 0;
    const merged = walletSca + orphanedRaidSca;
    state.sca_scaCoins = String(merged);

    await pool.query(`UPDATE permanent_currencies SET sca_coins = 0 WHERE user_id = $1`, [userId]);
    await pool.query(
      `INSERT INTO game_states (user_id, state, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(sanitizeState(state))]
    );

    return state;
  }

  /**
   * 진행도 저장(Upsert). 'sca_'로 시작하는 문자열 키/값만 보관한다.
   * sca_scaCoins·sca_scaUpgrades·환생 수치·파티 타이머는 서버 API만 갱신한다.
   */
  static async saveState(userId: string, state: unknown): Promise<GameStatePayload> {
    const sanitized = sanitizeState(state);
    const existingRes = await pool.query(
      `SELECT state FROM game_states WHERE user_id = $1`,
      [userId]
    );
    const existing: GameStatePayload =
      existingRes.rowCount && existingRes.rows[0].state
        ? { ...(existingRes.rows[0].state as GameStatePayload) }
        : {};

    const merged: GameStatePayload = { ...existing, ...sanitized };
    const serverOnlyKeys = [
      'sca_scaCoins',
      'sca_scaUpgrades',
      'sca_rebirthStat',
      'sca_rebirthCount',
      'sca_partyLastClaimMs',
      'sca_partyHuntingTier',
    ] as const;
    for (const key of serverOnlyKeys) {
      delete merged[key];
      if (existing[key]) {
        merged[key] = existing[key];
      }
    }

    await pool.query(
      `INSERT INTO game_states (user_id, state, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(merged)]
    );
    return merged;
  }

  /**
   * 계정 진행도 초기화. 닉네임·로그인 세션은 유지한다.
   */
  static async resetAccount(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO game_states (user_id, state, updated_at)
         VALUES ($1, '{}'::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id)
         DO UPDATE SET state = '{}'::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [userId]
      );

      await client.query(
        `INSERT INTO permanent_currencies (user_id, sca_coins)
         VALUES ($1, 0)
         ON CONFLICT (user_id) DO UPDATE SET sca_coins = 0`,
        [userId]
      );

      await client.query(
        `INSERT INTO in_game_currencies (user_id, minerals, normal_coins)
         VALUES ($1, 0, 0)
         ON CONFLICT (user_id) DO UPDATE SET minerals = 0, normal_coins = 0`,
        [userId]
      );

      await client.query(`DELETE FROM daily_raid_progresses WHERE user_id = $1`, [userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * 클라이언트가 보낸 상태를 화이트리스트 검증한다.
 * - 객체가 아니면 빈 객체로 처리
 * - 'sca_' 접두사 + 문자열 값만 허용 (임의 데이터 주입 방지)
 */
function sanitizeState(state: unknown): GameStatePayload {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {};
  }
  const result: GameStatePayload = {};
  for (const [key, value] of Object.entries(state as Record<string, unknown>)) {
    if (key.startsWith('sca_') && typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}
