import { PoolClient } from 'pg';
import { GameStatePayload } from './types';

/**
 * game_states.sca_scaCoins + permanent_currencies 동시 갱신.
 * 호출 전 game_states FOR UPDATE 락이 잡혀 있어야 한다.
 */
export async function applyScaWalletDelta(
  client: PoolClient,
  userId: string,
  state: GameStatePayload,
  delta: number
): Promise<number> {
  const wallet = Number(state.sca_scaCoins) || 0;
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
    `INSERT INTO permanent_currencies (user_id, sca_coins)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET sca_coins = $2`,
    [userId, next]
  );
  return next;
}
