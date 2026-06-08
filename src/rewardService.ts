import { pool } from './db';
import { ClaimRewardResponse } from './types';

// 각 마일스톤 도달 시의 누적 보상 도표 (10층 ~ 100층, 차분 지급)
const RAID_CUMULATIVE_REWARDS: Record<number, number> = {
  0: 0,
  10: 1000,
  20: 3000,
  30: 6000,
  40: 10000,
  50: 15000,
  60: 22000,
  70: 30000,
  80: 40000,
  90: 55000,
  100: 80000
};

/**
 * 일일 마일스톤 보상 검증 및 지급 서비스 클래스
 * 
 * [보안 설계 포인트]
 * 1. 클라이언트 시간 전면 불신: 데이터베이스의 'CURRENT_DATE'를 날짜 비교의 절대 기준으로 삼음.
 * 2. 동시성 제어 (Race Condition 차단): 트랜잭션 시작 직후 SELECT ... FOR UPDATE 로우 락을 획득하여
 *    동일 유저에 대한 다중 요청이 동시에 들어올 경우 강제로 순차 처리하고, 중복 수령 시도를 원천 차단함.
 * 3. 층수 무결성 검증: 10~100 사이의 10의 배수인지 엄격히 검사.
 * 4. DB 트랜잭션 보장: 모든 갱신(날짜 초기화, 진행도 업데이트, 재화 누적)을 하나의 원자적 트랜잭션 내에서 수행.
 */
export class RewardService {
  
  /**
   * Node.js 백엔드 단에서 트랜잭션을 수동으로 열어 보상을 안전하게 지급하는 방식
   * (일반 Express + PostgreSQL 프로젝트에 적합)
   */
  static async claimRewardWithTx(userId: string, currentFloor: number): Promise<ClaimRewardResponse> {
    // 층수 유효성 1차 검증
    if (currentFloor < 10 || currentFloor > 100 || currentFloor % 10 !== 0) {
      return {
        success: false,
        message: '올바르지 않은 층수입니다. 10층 단위(10~100)로만 클리어할 수 있습니다.',
        claimedCoins: 0,
        newHighestFloor: 0,
        currentTotalCoins: 0,
      };
    }

    const client = await pool.connect();
    
    try {
      // 1. 트랜잭션 시작
      await client.query('BEGIN');

      // 2. [보안] 유저의 관련 데이터가 존재하지 않는 경우를 대비한 Upsert (초기화)
      await client.query(`
        INSERT INTO daily_raid_progresses (user_id, last_played_date, highest_claimed_floor)
        VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date, 0)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      await client.query(`
        INSERT INTO permanent_currencies (user_id, sca_coins)
        VALUES ($1, 0)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      await client.query(`
        INSERT INTO game_states (user_id, state)
        VALUES ($1, '{}'::jsonb)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      // 3. [보안 핵심] SELECT ... FOR UPDATE 로우 레벨 락 획득 (Race Condition 완벽 차단)
      const progressRes = await client.query(`
        SELECT last_played_date::text, highest_claimed_floor 
        FROM daily_raid_progresses 
        WHERE user_id = $1 
        FOR UPDATE
      `, [userId]);

      let { last_played_date: lastPlayedDateStr, highest_claimed_floor: highestClaimedFloor } = progressRes.rows[0];

      await client.query(`
        SELECT sca_coins FROM permanent_currencies WHERE user_id = $1 FOR UPDATE
      `, [userId]);

      // 4. [보안] 데이터베이스 서버 기준의 오늘 날짜 획득
      const dateRes = await client.query("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date::text AS today");
      const todayStr = dateRes.rows[0].today; // 'YYYY-MM-DD' 포맷

      // 4-1. 환생 수치·지갑 SCA (game_states) 로드 — 화면 잔액과 동일 소스
      const stateRes = await client.query(`
        SELECT state FROM game_states WHERE user_id = $1 FOR UPDATE
      `, [userId]);
      const gameState = stateRes.rows[0]?.state ?? {};
      const walletScaBefore = Number(gameState.sca_scaCoins) || 0;
      const rebirthStat = Number(gameState.sca_rebirthStat) || 0;
      const statMult = 1.0 + (rebirthStat / 10000000.0);

      // 5. [일일 리셋 처리] 날짜가 바뀌었다면 수령 최고 층수를 0으로 리셋하고 날짜 갱신
      if (lastPlayedDateStr !== todayStr) {
        highestClaimedFloor = 0;
        lastPlayedDateStr = todayStr;

        await client.query(`
          UPDATE daily_raid_progresses
          SET last_played_date = $1,
              highest_claimed_floor = 0
          WHERE user_id = $2
        `, [todayStr, userId]);
      }

      // 6. [보상 수령 자격 검증] 클라이언트 층수가 이미 오늘 보상받은 최고 층수 이하인지 검사
      if (currentFloor <= highestClaimedFloor) {
        // 이미 보상을 다 수령했으므로 트랜잭션 롤백 없이 안전하게 종료
        await client.query('COMMIT');
        return {
          success: false,
          message: '이미 해당 층수 이하의 모든 마일스톤 보상을 수령하셨습니다.',
          claimedCoins: 0,
          newHighestFloor: highestClaimedFloor,
          currentTotalCoins: walletScaBefore,
        };
      }

      // 7. [차분 지급량 계산] 중복 지급 방지
      const baseReward = (RAID_CUMULATIVE_REWARDS[currentFloor] || 0) - (RAID_CUMULATIVE_REWARDS[highestClaimedFloor] || 0);
      const coinsToReward = Math.floor(baseReward * statMult);

      const newWalletSca = walletScaBefore + coinsToReward;

      // 8. permanent_currencies·game_states 지갑을 동일한 절대 잔액으로 유지 (합산 병합 버그 방지)
      await client.query(`
        INSERT INTO permanent_currencies (user_id, sca_coins)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET sca_coins = $2
      `, [userId, newWalletSca]);
      await client.query(`
        UPDATE game_states
        SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{sca_scaCoins}', to_jsonb($1::text))
        WHERE user_id = $2
      `, [String(newWalletSca), userId]);

      // 9. [진행도 갱신] daily_raid_progresses 최고 수령 층수 업데이트
      await client.query(`
        UPDATE daily_raid_progresses
        SET highest_claimed_floor = $1
        WHERE user_id = $2
      `, [currentFloor, userId]);

      // 10. 트랜잭션 커밋
      await client.query('COMMIT');

      return {
        success: true,
        message: '보상이 정상적으로 지급되었습니다.',
        claimedCoins: coinsToReward,
        newHighestFloor: currentFloor,
        currentTotalCoins: newWalletSca,
      };

    } catch (error) {
      // 에러 발생 시 즉시 롤백하여 재화 복제 방지
      await client.query('ROLLBACK');
      console.error('[RewardService] Transaction rolled back due to error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Supabase 클라이언트를 모방하여 PostgreSQL에 정의된 PL/pgSQL RPC 함수를 호출하는 방식
   * (Supabase 백엔드를 이미 구성한 아키텍처에 매우 이상적이며, DB 단에서 모든 트랜잭션이 종결됨)
   */
  static async claimRewardWithRpc(userId: string, currentFloor: number): Promise<ClaimRewardResponse> {
    try {
      // DB 스키마에 작성해 둔 PL/pgSQL RPC 함수 호출
      const result = await pool.query(
        'SELECT * FROM claim_daily_raid_reward($1, $2)',
        [userId, currentFloor]
      );
      
      const row = result.rows[0];
      return {
        success: row.success,
        message: row.message,
        claimedCoins: row.claimed_coins,
        newHighestFloor: row.new_highest_floor,
        currentTotalCoins: row.current_total_coins,
      };
    } catch (error) {
      console.error('[RewardService] RPC Function Call Failed:', error);
      throw error;
    }
  }
}
