import { pool } from './db';
import { GameStatePayload } from './types';

/**
 * 계정별 게임 진행도(localStorage 스냅샷)를 PostgreSQL JSONB로 저장/복원하는 서비스.
 */
export class StateService {
  /**
   * 저장된 진행도 조회. 없으면 빈 객체 반환.
   */
  static async getState(userId: string): Promise<GameStatePayload> {
    const res = await pool.query(
      `SELECT state FROM game_states WHERE user_id = $1`,
      [userId]
    );
    if (res.rowCount === 0 || !res.rows[0].state) {
      return {};
    }
    return res.rows[0].state as GameStatePayload;
  }

  /**
   * 진행도 저장(Upsert). 'sca_'로 시작하는 문자열 키/값만 보관한다.
   */
  static async saveState(userId: string, state: unknown): Promise<GameStatePayload> {
    const sanitized = sanitizeState(state);
    await pool.query(
      `INSERT INTO game_states (user_id, state, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(sanitized)]
    );
    return sanitized;
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
