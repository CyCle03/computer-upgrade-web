import { PoolClient } from 'pg';
import { GameStatePayload } from './types';

/**
 * game_states.sca_scaCoins + permanent_currencies 동시 갱신.
 * 호출 전 game_states FOR UPDATE 락이 잡혀 있어야 한다.
 *
 * permanent_currencies를 잔액의 단일 진실 소스로 사용한다:
 * game_states.sca_scaCoins가 saveState() 레이스로 stale해질 수 있으므로
 * 실제 차감·지급은 permanent_currencies에서 읽은 값을 기준으로 계산한다.
 */
export async function applyScaWalletDelta(
  client: PoolClient,
  userId: string,
  state: GameStatePayload,
  delta: number
): Promise<number> {
  // 행이 없으면 먼저 생성 (신규 유저)
  await client.query(
    `INSERT INTO permanent_currencies (user_id, sca_coins) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
    [userId]
  );
  // FOR UPDATE로 잠금 후 최신 잔액 읽기 (game_states의 stale 값 무시)
  const permRes = await client.query(
    `SELECT sca_coins FROM permanent_currencies WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  const wallet = Number(permRes.rows[0].sca_coins) || 0;
  const next = wallet + delta;
  if (next < 0) {
    throw new Error('SCA 잔액이 부족합니다.');
  }
  state.sca_scaCoins = String(next);
  await client.query(
    `UPDATE game_states
     SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, JSON.stringify(state)]
  );
  await client.query(
    `UPDATE permanent_currencies SET sca_coins = $2 WHERE user_id = $1`,
    [userId, next]
  );
  return next;
}
