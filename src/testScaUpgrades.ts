/**
 * 채굴증폭기 순수 로직 단위 테스트 (DB·소켓 불필요, 결정론적).
 * ---------------------------------------------------------------------------
 * scaUpgrades.ts 의 채굴력·공속 계산은 프론트(OMG 사본)·scaIncomeService·
 * scaShopService 가 공유하는 단일 소스인데 그동안 단위 테스트 커버가 없었다.
 * 값이 OMG 사본과 어긋나면 조용히 밸런스가 깨지므로 여기서 산식을 고정한다.
 */
import { GameStatePayload } from './types';
import { StateKey } from './stateKeys';
import {
  parseScaUpgrades,
  isMiningAmplifierUnlocked,
  calcMiningPower,
  calcMiningSpeedMult,
} from './scaUpgrades';

let passed = true;
function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  [OK] ${label}`);
  } else {
    passed = false;
    console.error(`  [FAILED] ${label}${detail ? ' — ' + detail : ''}`);
  }
}

const state = (raw?: string): GameStatePayload =>
  ({ [StateKey.scaUpgrades]: raw } as unknown as GameStatePayload);

console.log('==================================================');
console.log('[ScaUpgradesTest] 채굴증폭기 순수 로직 단위 검증');
console.log('==================================================');

// --- parseScaUpgrades --------------------------------------------------------
console.log('\n[parseScaUpgrades]');
check('정상 JSON 파싱', JSON.stringify(parseScaUpgrades(state('{"miningAmplifier":3}'))) === '{"miningAmplifier":3}');
check('키 없음 → {}', JSON.stringify(parseScaUpgrades(state(undefined))) === '{}');
check('깨진 JSON → {} (throw 안 함)', JSON.stringify(parseScaUpgrades(state('{broken'))) === '{}');

// --- isMiningAmplifierUnlocked ----------------------------------------------
console.log('\n[isMiningAmplifierUnlocked]');
check('null → false', isMiningAmplifierUnlocked(null) === false);
check('undefined → false', isMiningAmplifierUnlocked(undefined) === false);
check('{} → false', isMiningAmplifierUnlocked({}) === false);
check('unlock 플래그 true → true', isMiningAmplifierUnlocked({ miningAmplifierUnlock: true }) === true);
check('miningAmplifier 1 → true', isMiningAmplifierUnlocked({ miningAmplifier: 1 }) === true);
check('miningAmplifier 0 → false', isMiningAmplifierUnlocked({ miningAmplifier: 0 }) === false);

// --- calcMiningPower (level × 500) ------------------------------------------
console.log('\n[calcMiningPower]');
check('미해금 → 0', calcMiningPower({}) === 0);
check('unlock + level 3 → 1500', calcMiningPower({ miningAmplifierUnlock: true, miningAmplifier: 3 }) === 1500);
check('level 3(암묵 해금) → 1500', calcMiningPower({ miningAmplifier: 3 }) === 1500);
check('level 0 → 0(미해금 취급)', calcMiningPower({ miningAmplifier: 0 }) === 0);
check('null → 0', calcMiningPower(null) === 0);

// --- calcMiningSpeedMult (24 / max(8, 24-lv)) -------------------------------
console.log('\n[calcMiningSpeedMult]');
check('미해금 → 1', calcMiningSpeedMult({}) === 1);
check('speed만 있고 미해금 → 1', calcMiningSpeedMult({ miningAmplifierSpeed: 4 }) === 1);
check('unlock + speed 0 → 1 (24/24)', calcMiningSpeedMult({ miningAmplifierUnlock: true, miningAmplifierSpeed: 0 }) === 1);
check('unlock + speed 4 → 1.2 (24/20)', Math.abs(calcMiningSpeedMult({ miningAmplifierUnlock: true, miningAmplifierSpeed: 4 }) - 1.2) < 1e-9);
check('unlock + speed 100 → 3 (하한 8프레임 clamp)', calcMiningSpeedMult({ miningAmplifierUnlock: true, miningAmplifierSpeed: 100 }) === 3);

console.log('\n==================================================');
if (passed) {
  console.log('=> [PASSED] 채굴증폭기 순수 로직 검증 통과');
} else {
  console.error('=> [FAILED] 채굴증폭기 순수 로직 검증 실패');
  process.exit(1);
}
