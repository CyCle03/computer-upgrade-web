import { pool } from './db';
import { RewardService } from './rewardService';
import { v4 as uuidv4 } from 'uuid';

/**
 * 일일 마일스톤 보상 검증 및 동시성(Race Condition) 방지 통합 테스트 스크립트
 * 
 * [수행 테스트]
 * 1. 기본 마일스톤 보상 획득 시나리오 (순차 처리 및 차분 계산 검증)
 * 2. 중복 수령 및 층수 역행 요청 차단 검증
 * 3. [핵심] 5개 비동기 요청 동시 발송 시의 Race Condition 방지 검증 (SELECT ... FOR UPDATE 락 검증)
 */
async function runTests(): Promise<boolean> {
  console.log('==================================================');
  console.log('[Test] ' + new Date().toISOString() + ' - 통합 검증 스크립트 시작');
  console.log('==================================================');

  let passedAll = true;

  // 테스트 유저 생성
  const testUserId = uuidv4();
  const testNickname = `tester_${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[Test] 가상 유저 생성 시도: ID = ${testUserId}, Nickname = ${testNickname}`);

  const client = await pool.connect();
  try {
    // 0. 테이블 스키마 보장 (만약 없을 경우를 대비)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        nickname VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS permanent_currencies (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sca_coins INTEGER DEFAULT 0 NOT NULL CHECK (sca_coins >= 0)
      );
      CREATE TABLE IF NOT EXISTS daily_raid_progresses (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        last_played_date DATE DEFAULT CURRENT_DATE NOT NULL,
        highest_claimed_floor INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // 테스트 유저 삽입
    await client.query('INSERT INTO users (id, nickname) VALUES ($1, $2)', [testUserId, testNickname]);
    console.log('[Test] 1단계: 가상 테스트 유저 생성 완료.');

    console.log('\n--------------------------------------------------');
    console.log('[Test 2단계] 순차 보상 수령 및 차분 계산 테스트');
    console.log('--------------------------------------------------');

    // 시나리오 1: 오늘 첫 판에 50층 클리어 (보상 10~50층 총 5회 분량 = 50 코인 지급 예정)
    console.log('[Request] 50층 클리어 보상 요청...');
    const res1 = await RewardService.claimRewardWithTx(testUserId, 50);
    console.log(`[Response] 성공여부: ${res1.success}, 메시지: "${res1.message}", 지급코인: ${res1.claimedCoins}, 최고층수: ${res1.newHighestFloor}, 총잔액: ${res1.currentTotalCoins}`);
    if (res1.success && res1.claimedCoins === 50 && res1.currentTotalCoins === 50) {
      console.log('=> [PASSED] 50층 최초 보상 지급 성공');
    } else {
      console.error('=> [FAILED] 50층 최초 보상 지급 실패');
      passedAll = false;
    }

    // 시나리오 2: 30층 클리어 보상 요청 (이전 층수 역행 - 거절되어야 함)
    console.log('\n[Request] 30층 클리어 보상 요청 (역행)...');
    const res2 = await RewardService.claimRewardWithTx(testUserId, 30);
    console.log(`[Response] 성공여부: ${res2.success}, 메시지: "${res2.message}", 지급코인: ${res2.claimedCoins}, 최고층수: ${res2.newHighestFloor}, 총잔액: ${res2.currentTotalCoins}`);
    if (!res2.success && res2.claimedCoins === 0) {
      console.log('=> [PASSED] 층수 역행 요청 정상 차단');
    } else {
      console.error('=> [FAILED] 층수 역행 요청 차단 실패 (비정상 지급)');
      passedAll = false;
    }

    // 시나리오 3: 80층 클리어 보상 요청 (차분 지급 - 60, 70, 80층 3회 분량 = 30 코인 추가 지급 예정)
    console.log('\n[Request] 80층 클리어 보상 요청 (추가 진행)...');
    const res3 = await RewardService.claimRewardWithTx(testUserId, 80);
    console.log(`[Response] 성공여부: ${res3.success}, message: "${res3.message}", 지급코인: ${res3.claimedCoins}, 최고층수: ${res3.newHighestFloor}, 총잔액: ${res3.currentTotalCoins}`);
    if (res3.success && res3.claimedCoins === 30 && res3.currentTotalCoins === 80) {
      console.log('=> [PASSED] 추가 층수 차분 보상 정상 지급 완료');
    } else {
      console.error('=> [FAILED] 추가 층수 차분 보상 지급 오류');
      passedAll = false;
    }

    // 시나리오 4: 80층 재요청 (중복 - 거절되어야 함)
    console.log('\n[Request] 80층 보상 중복 요청...');
    const res4 = await RewardService.claimRewardWithTx(testUserId, 80);
    console.log(`[Response] 성공여부: ${res4.success}, message: "${res4.message}", 지급코인: ${res4.claimedCoins}, 최고층수: ${res4.newHighestFloor}, 총잔액: ${res4.currentTotalCoins}`);
    if (!res4.success && res4.claimedCoins === 0) {
      console.log('=> [PASSED] 중복 보상 요청 정상 차단');
    } else {
      console.error('=> [FAILED] 중복 보상 요청 차단 실패');
      passedAll = false;
    }

    console.log('\n--------------------------------------------------');
    console.log('[Test 3단계] 동시성(Race Condition) 방지 테스트');
    console.log('--------------------------------------------------');
    console.log('[Action] 동일 유저가 100층 클리어 보상을 동시에 5회 요청함 (Promise.all)');
    console.log('[Info] 기존 최고 수령 층수는 80층입니다. 100층 요청 시 단 1번만 성공하여');
    console.log('[Info] 90, 100층 분량인 20 코인이 단 한 번만 지급되고, 총 잔고는 100 코인이 되어야 함.');

    // 5개 요청 동시 발송
    const promises = [
      RewardService.claimRewardWithTx(testUserId, 100),
      RewardService.claimRewardWithTx(testUserId, 100),
      RewardService.claimRewardWithTx(testUserId, 100),
      RewardService.claimRewardWithTx(testUserId, 100),
      RewardService.claimRewardWithTx(testUserId, 100),
    ];

    const results = await Promise.all(promises);

    let successCount = 0;
    let failCount = 0;
    let finalCoins = 0;

    results.forEach((res, idx) => {
      console.log(`[Request #${idx + 1}] 결과 -> 성공: ${res.success}, 메시지: "${res.message}", 지급코인: ${res.claimedCoins}, 총잔액: ${res.currentTotalCoins}`);
      if (res.success) {
        successCount++;
        finalCoins = res.currentTotalCoins;
      } else {
        failCount++;
      }
    });

    console.log(`\n[Test Result] 총 성공 횟수: ${successCount}회, 실패 횟수: ${failCount}회`);
    
    // 최종 검증
    if (successCount === 1 && failCount === 4 && finalCoins === 100) {
      console.log('=> [PASSED] Race Condition 방지 테스트 완벽 성공! 중복 수령 방지됨.');
    } else {
      console.error('=> [FAILED] Race Condition 방지 테스트 실패! 중복 지급 의심.');
      passedAll = false;
    }

  } catch (error) {
    console.error('[Test Error] 테스트 진행 도중 심각한 에러 발생:', error);
    passedAll = false;
  } finally {
    // 테스트 데이터 깔끔하게 정리
    console.log('\n[Test] 4단계: 테스트 유저 데이터 DB 클린업 실행...');
    await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
    client.release();
    console.log('[Test] 클린업 완료. 커넥션 반환.');
    await pool.end(); // 커넥션 풀 종료
    console.log('==================================================');
    console.log('[Test] 모든 테스트 시나리오 검증 종료.');
    console.log('==================================================');
  }

  return passedAll;
}

runTests()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((err) => {
    console.error('[Test] Fatal error:', err);
    process.exit(1);
  });
