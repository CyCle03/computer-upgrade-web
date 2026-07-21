/**
 * 레이드 마일스톤 지급 산식 단위 테스트 (DB·소켓 불필요, 결정론적).
 * ---------------------------------------------------------------------------
 * 기존 testReward.ts 는 실 Postgres 트랜잭션 E2E 라 CI 기본 실행에서 빠지고,
 * 지급 차분·환생 배율·내림 산식이 claimRewardWithTx 내부 인라인이라 격리 검증이
 * 불가능했다. 그 산식을 computeRaidClaimCoins 로 추출해 합성 보상표로 고정한다.
 * (실제 누적표 값 ↔ schema.sql 사본 일치는 testRewardTable 이 별도로 감시.)
 */
import { computeRaidClaimCoins } from './rewardService';

let passed = true;
function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  [OK] ${label}`);
  } else {
    passed = false;
    console.error(`  [FAILED] ${label}${detail ? ' — ' + detail : ''}`);
  }
}

// 합성 누적 보상표(실제 값과 무관 — 산식만 검증)
const R: Record<number, number> = { 10: 1000, 20: 3000, 30: 6000, 100: 80000 };

console.log('==================================================');
console.log('[RewardMathTest] 레이드 지급 산식 단위 검증');
console.log('==================================================\n');

// 환생 배율: statMult = 1 + rebirthStat / 10,000,000
check('환생 0 → statMult 1', computeRaidClaimCoins(10, 0, 0, R).statMult === 1);
check('환생 10,000,000 → statMult 2', computeRaidClaimCoins(10, 0, 10_000_000, R).statMult === 2);
check('환생 5,000,000 → statMult 1.5', computeRaidClaimCoins(10, 0, 5_000_000, R).statMult === 1.5);

// 첫 수령(highest 0): rewards[0] 없음 → 0 취급
check('첫 수령 10층(환생 0) → 1000', computeRaidClaimCoins(10, 0, 0, R).coinsToReward === 1000);

// 차분 지급: rewards[current] - rewards[highest]
check('20층(이미 10 수령, 환생 0) → 2000', computeRaidClaimCoins(20, 10, 0, R).coinsToReward === 2000);
check('30층(이미 10 수령, 환생 0) → 5000', computeRaidClaimCoins(30, 10, 0, R).coinsToReward === 5000);

// 환생 배율 반영(내림)
check('20층(이미 10, 환생 10M ×2) → 4000', computeRaidClaimCoins(20, 10, 10_000_000, R).coinsToReward === 4000);
check('20층(이미 10, 환생 5M ×1.5) → 3000', computeRaidClaimCoins(20, 10, 5_000_000, R).coinsToReward === 3000);

// 내림(floor) 검증: 차분 999 × 1.5 = 1498.5 → 1498
check('내림 적용: 999×1.5 → 1498', computeRaidClaimCoins(10, 0, 5_000_000, { 10: 999 }).coinsToReward === 1498);

// 중복 수령 방지: currentFloor <= highestClaimedFloor → 0
check('동일 층 재수령 → 0', computeRaidClaimCoins(20, 20, 0, R).coinsToReward === 0);
check('낮은 층 재수령 → 0', computeRaidClaimCoins(10, 30, 0, R).coinsToReward === 0);

// 100층 완등(첫 수령, 환생 0)
check('100층 첫 수령(환생 0) → 80000', computeRaidClaimCoins(100, 0, 0, R).coinsToReward === 80000);

console.log('\n==================================================');
if (passed) {
  console.log('=> [PASSED] 레이드 지급 산식 검증 통과');
} else {
  console.error('=> [FAILED] 레이드 지급 산식 검증 실패');
  process.exit(1);
}
