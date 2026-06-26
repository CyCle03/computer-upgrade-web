import { pool } from './db';
import { GameStatePayload } from './types';

/**
 * 계정별 게임 진행도(localStorage 스냅샷)를 PostgreSQL JSONB로 저장/복원하는 서비스.
 */
export class StateService {
  /**
   * 저장된 진행도 조회. 없으면 빈 객체 반환.
   * permanent_currencies를 SCA 잔액의 단일 진실 소스로 사용한다.
   * game_states.sca_scaCoins가 stale하더라도 permanent_currencies 값을 반환하며,
   * 다음 SCA 트랜잭션(applyScaWalletDelta)이 두 테이블을 함께 갱신할 때 자동 복구된다.
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

    if (!currRes.rowCount) {
      // permanent_currencies 행 없음 — 신규 유저, game_states 값 그대로 반환
      return state;
    }

    // permanent_currencies가 권위 있는 잔액 소스
    const permSca = Number(currRes.rows[0].sca_coins) || 0;
    state.sca_scaCoins = String(permSca);
    return state;
  }

  /**
   * 진행도 저장(Upsert). 'sca_'로 시작하는 문자열 키/값만 보관한다.
   * sca_scaCoins·sca_scaUpgrades·환생 수치·파티 타이머는 서버 API만 갱신한다.
   *
   * FOR UPDATE로 직렬화하여 SCA 트랜잭션(applyScaWalletDelta)과의 레이스 컨디션을 방지한다.
   * 레이스 없이는 save 도중 커밋된 SCA 차감이 오래된 sca_scaCoins로 덮여 쓰일 수 있다.
   */
  static async saveState(userId: string, state: unknown): Promise<GameStatePayload> {
    const sanitized = sanitizeState(state);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 행 없는 신규 유저를 위해 먼저 upsert
      await client.query(
        `INSERT INTO game_states (user_id, state) VALUES ($1, '{}'::jsonb) ON CONFLICT DO NOTHING`,
        [userId]
      );

      // FOR UPDATE: 동시 SCA 트랜잭션이 커밋할 때까지 대기 후 최신 값 읽음
      const existingRes = await client.query(
        `SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE`,
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

      await client.query(
        `UPDATE game_states
         SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, JSON.stringify(merged)]
      );

      await client.query('COMMIT');
      return merged;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
