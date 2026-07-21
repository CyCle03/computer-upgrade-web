/**
 * 레이드 전투 순수 로직 단위 테스트 (DB·소켓 불필요, 결정론적).
 * ---------------------------------------------------------------------------
 * 기존 testRaid.ts 는 실서버+소켓+Postgres 를 띄우는 E2E 해피패스라 순수 규칙
 * (보스 HP 공식/DPS/오버킬 다층 클리어)을 격리 검증하지 못했다. 이 테스트는
 * raidCombat.ts 의 순수 함수를 직접 호출해 CI 친화적으로 고정한다.
 */
import {
  getBossMaxHpForFloor,
  calculatePlayerDps,
  hpDecayAmount,
  resolveOverkill,
} from './raidCombat';

let passed = true;
function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  [OK] ${label}`);
  } else {
    passed = false;
    console.error(`  [FAILED] ${label}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('==================================================');
console.log('[RaidCombatTest] 레이드 전투 순수 로직 단위 검증');
console.log('==================================================');

// --- 보스 HP 공식 ----------------------------------------------------------
console.log('\n[getBossMaxHpForFloor]');
check('1층 = 1000', getBossMaxHpForFloor(1) === 1000, String(getBossMaxHpForFloor(1)));
check('2층 = round(1000*1.14) = 1140', getBossMaxHpForFloor(2) === 1140, String(getBossMaxHpForFloor(2)));
check('층이 오를수록 단조 증가', getBossMaxHpForFloor(50) > getBossMaxHpForFloor(49) && getBossMaxHpForFloor(100) > getBossMaxHpForFloor(99));
check('100층 = round(1000*1.14^99)', getBossMaxHpForFloor(100) === Math.round(1000 * Math.pow(1.14, 99)));

// --- 플레이어 DPS (일반 하드웨어=성능수치 + 채굴봇=채굴력×75) ----------------
console.log('\n[calculatePlayerDps]');
const mkPlayer = (over: any = {}) => ({
  isDead: false,
  perfScore: 100000,
  miningPower: 0,
  ...over,
});
// DPS = perfScore × 0.011(하드웨어 축소) + miningPower × 75(채굴 핵심)
check('하드웨어만(perf 100000, 채굴 0) → 1100', calculatePlayerDps(mkPlayer()) === 1100, String(calculatePlayerDps(mkPlayer())));
check('사망 시 0', calculatePlayerDps(mkPlayer({ isDead: true })) === 0);
check('채굴력 1000 → 1100 + 1000×75 = 76100', calculatePlayerDps(mkPlayer({ miningPower: 1000 })) === 76100, String(calculatePlayerDps(mkPlayer({ miningPower: 1000 }))));
check('perf 200000 + 채굴력 200 → 2200 + 15000 = 17200', calculatePlayerDps(mkPlayer({ perfScore: 200000, miningPower: 200 })) === 17200);
check('채굴력 0 → 하드웨어만(1100)', calculatePlayerDps(mkPlayer({ miningPower: 0 })) === 1100);

// --- HP Decay 산식 ---------------------------------------------------------
console.log('\n[hpDecayAmount]');
check('unitHp 1000 * rate 0.1 = 100', hpDecayAmount(1000, 0.1) === 100);
check('rate 0 → 0', hpDecayAmount(5000, 0) === 0);

// --- 오버킬 다층 클리어 ----------------------------------------------------
console.log('\n[resolveOverkill]');

// (1) 보스 못 죽임 — 잔여 데미지 소진, 층 유지
{
  const r = resolveOverkill({ totalDps: 500, currentFloor: 1, bossCurrentHp: 1000, bossMaxHp: 1000 });
  check('DPS 부족: 층 유지 + HP 감소', r.floor === 1 && r.bossCurrentHp === 500 && r.milestoneFloors.length === 0 && !r.won,
    JSON.stringify(r));
}

// (2) 정확히 1층 격파 → 2층 진입(마일스톤 아님)
{
  const r = resolveOverkill({ totalDps: 1000, currentFloor: 1, bossCurrentHp: 1000, bossMaxHp: 1000 });
  check('1층 격파 → 2층 진입, 마일스톤 없음',
    r.floor === 2 && r.bossMaxHp === getBossMaxHpForFloor(2) && r.bossCurrentHp === getBossMaxHpForFloor(2) && r.milestoneFloors.length === 0 && !r.won,
    JSON.stringify(r));
}

// (3) 9→10층 연속 격파 → 10층 마일스톤 기록, 11층 진입
{
  const hp9 = getBossMaxHpForFloor(9);
  const hp10 = getBossMaxHpForFloor(10);
  const r = resolveOverkill({ totalDps: hp9 + hp10, currentFloor: 9, bossCurrentHp: hp9, bossMaxHp: hp9 });
  check('9→10 격파: 마일스톤=[10], 11층 진입',
    r.floor === 11 && r.milestoneFloors.length === 1 && r.milestoneFloors[0] === 10 && r.bossCurrentHp === getBossMaxHpForFloor(11) && !r.won,
    JSON.stringify(r));
}

// (4) 99→100 격파 승리 — 마일스톤은 100만(99는 10의 배수 아님), won=true
{
  const hp99 = getBossMaxHpForFloor(99);
  const hp100 = getBossMaxHpForFloor(100);
  const r = resolveOverkill({ totalDps: hp99 + hp100 + 999999, currentFloor: 99, bossCurrentHp: hp99, bossMaxHp: hp99 });
  check('99→100 격파: won=true, 마일스톤=[100], 100층 유지',
    r.won === true && r.floor === 100 && r.milestoneFloors.length === 1 && r.milestoneFloors[0] === 100 && r.bossCurrentHp <= 0,
    JSON.stringify(r));
}

// (5) totalDps 0 → 아무 변화 없음
{
  const r = resolveOverkill({ totalDps: 0, currentFloor: 5, bossCurrentHp: 777, bossMaxHp: 800 });
  check('DPS 0: 변화 없음', r.floor === 5 && r.bossCurrentHp === 777 && r.bossMaxHp === 800 && r.milestoneFloors.length === 0 && !r.won,
    JSON.stringify(r));
}

console.log('\n==================================================');
if (passed) {
  console.log('=> [PASSED] 레이드 전투 순수 로직 검증 통과');
} else {
  console.error('=> [FAILED] 레이드 전투 순수 로직 검증 실패');
  process.exit(1);
}
