import { ComputerParts } from './types';
import { HardwareSimulator } from './hardwareSimulator';

/**
 * 하드웨어 페널티/시너지 시뮬레이션 유닛 및 통합 검증 테스트 스크립트
 */
function runHardwareTests() {
  console.log('==================================================');
  console.log('[HardwareTest] 하드웨어 스펙 연산 및 페널티 감지 엔진 검증 시작');
  console.log('==================================================');

  let passedAll = true;

  // ------------------------------------------------------------------------
  // 테스트 케이스 1: 완벽 호환 조합 (Perfect Build)
  // ------------------------------------------------------------------------
  console.log('\n[TestCase 1] 완벽 호환 프리미엄 부품 조립');
  const perfectParts: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 5, ddrGeneration: 'DDR5' }, // 코어 10, 발열 75
    gpu: { level: 5 }, // 데미지: 10 * 1.5^4 = 50.625 -> 반올림 51
    ram: { level: 4, clockMhz: 5600, capacityGb: 32, ddrGeneration: 'DDR5' }, // 공속: 2.0 - 5600/4000 = 0.6초, 사냥배치 = 8기
    cooler: { level: 6, coolingCapacity: 120 }, // 쿨링 120 (발열 75 커버), 방어력 18
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 1000 },
    storage: { type: 'SSD', capacityGb: 1000 }, // 속도: 100 + 50 = 150MB/s
  };

  const specs1 = HardwareSimulator.calculateComputerSpecs(perfectParts);
  console.log(`- 결과: 유닛수 상한: ${specs1.unitLimit}, 사냥터 한계: ${specs1.maxHuntingUnits}, 체력: ${specs1.unitHp}, 실드: ${specs1.unitShield}, 데미지: ${specs1.unitDamage}, 공속: ${specs1.attackSpeedSec}초, 방어: ${specs1.unitDefense}, 다운로드: ${specs1.downloadSpeedMb}MB/s`);
  console.log(`- 페널티: 과열: ${specs1.penalties.isOverheated}, 소켓: ${specs1.penalties.isSocketMismatched}, DDR오류: ${specs1.penalties.isDdrMismatched}, HP Decay: ${specs1.penalties.hpDecayRate}, 수익배율: ${specs1.penalties.mineralMultiplier}`);

  const cond1 = 
    specs1.unitLimit === 10 &&
    specs1.maxHuntingUnits === 8 &&
    specs1.unitDamage === 51 &&
    specs1.attackSpeedSec === 0.6 &&
    specs1.unitDefense === 18 &&
    specs1.downloadSpeedMb === 150 &&
    !specs1.penalties.isOverheated &&
    !specs1.penalties.isSocketMismatched &&
    !specs1.penalties.isDdrMismatched &&
    specs1.penalties.mineralMultiplier === 1.0;

  if (cond1) {
    console.log('=> [PASSED] 완벽 호환 조합 사양 연산 일치');
  } else {
    console.error('=> [FAILED] 완벽 호환 조합 사양 연산 불일치');
    passedAll = false;
  }

  // ------------------------------------------------------------------------
  // 테스트 케이스 2: 과열 페널티 조합 (Overheat Setup)
  // ------------------------------------------------------------------------
  console.log('\n[TestCase 2] CPU 레벨 대비 부실한 쿨러 조립 (과열 검증)');
  const overheatedParts: ComputerParts = {
    cpu: { manufacturer: 'AMD', level: 10, ddrGeneration: 'DDR4' }, // 요구 발열: 150
    gpu: { level: 2 },
    ram: { level: 2, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    cooler: { level: 2, coolingCapacity: 80 }, // 쿨링성능 80 (발열 150 해소 불가)
    motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 300 },
    storage: { type: 'HDD', capacityGb: 500 }, // 속도: 25 + 5 = 30MB/s
  };

  const specs2 = HardwareSimulator.calculateComputerSpecs(overheatedParts);
  console.log(`- 결과: 방어력(페널티 적용 전 기본 6): ${specs2.unitDefense}, 다운로드: ${specs2.downloadSpeedMb}MB/s`);
  console.log(`- 페널티: 과열: ${specs2.penalties.isOverheated}, 수익배율: ${specs2.penalties.mineralMultiplier}`);

  // 과열 시 수익 배율은 0.5배, 방어력도 50% 감쇠 적용되어 6 -> 3이 되어야 함. HDD 속도는 30MB/s
  const cond2 = 
    specs2.penalties.isOverheated && 
    specs2.penalties.mineralMultiplier === 0.5 && 
    specs2.unitDefense === 3 &&
    specs2.downloadSpeedMb === 30;

  if (cond2) {
    console.log('=> [PASSED] 과열 감지 및 미네랄/방어 페널티 정상 작동');
  } else {
    console.error('=> [FAILED] 과열 페널티 계산 오류');
    passedAll = false;
  }

  // ------------------------------------------------------------------------
  // 테스트 케이스 3: 소켓 미스매치 조합 (Socket Mismatch Setup)
  // ------------------------------------------------------------------------
  console.log('\n[TestCase 3] Intel CPU + AMD 메인보드 오결합 (소켓 미스매치 검증)');
  const socketMismatchedParts: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 6, ddrGeneration: 'DDR4' }, // 가용 유닛 기본 12기
    gpu: { level: 1 },
    ram: { level: 2, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    cooler: { level: 4, coolingCapacity: 100 },
    motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 200 }, // 소켓 제조사 AMD (Intel과 불일치)
    storage: { type: 'SSD', capacityGb: 250 },
  };

  const specs3 = HardwareSimulator.calculateComputerSpecs(socketMismatchedParts);
  console.log(`- 결과: 가용 유닛 제한: ${specs3.unitLimit}기 (기본 12기)`);
  console.log(`- 페널티: 소켓미스매치: ${specs3.penalties.isSocketMismatched}`);

  // 소켓 미스매치로 가용 유닛 제한이 12마리에서 6마리로 반감되어야 함
  const cond3 = 
    specs3.penalties.isSocketMismatched && 
    specs3.unitLimit === 6;

  if (cond3) {
    console.log('=> [PASSED] 소켓 미스매치 감지 및 유닛 소환량 반감 페널티 작동');
  } else {
    console.error('=> [FAILED] 소켓 미스매치 페널티 계산 오류');
    passedAll = false;
  }

  // ------------------------------------------------------------------------
  // 테스트 케이스 4: DDR 세대 혼용 호환 에러 조합 (DDR Mismatch Setup - 2세대 혼용)
  // ------------------------------------------------------------------------
  console.log('\n[TestCase 4] CPU/RAM/보드 간 DDR 혼용 (DDR 혼용 및 초당 5% HP Decay 검증)');
  const ddrMismatchedParts: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 4, ddrGeneration: 'DDR5' },
    gpu: { level: 1 },
    ram: { level: 2, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' }, // DDR4 램 혼용 (CPU/보드와 미스매치)
    cooler: { level: 4, coolingCapacity: 100 },
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 200 },
    storage: { type: 'SSD', capacityGb: 250 },
  };

  const specs4 = HardwareSimulator.calculateComputerSpecs(ddrMismatchedParts);
  console.log(`- 페널티: DDR에러: ${specs4.penalties.isDdrMismatched}, HP Decay Rate: ${specs4.penalties.hpDecayRate * 100}%/초`);

  // DDR 2종류 혼용 시 초당 HP Decay 비율은 0.05 (5%)여야 함
  const cond4 = 
    specs4.penalties.isDdrMismatched && 
    specs4.penalties.hpDecayRate === 0.50;

  if (cond4) {
    console.log('=> [PASSED] DDR 혼용 오류 감지 및 초당 5% HP 감쇠 페널티 검증 성공');
  } else {
    console.error('=> [FAILED] DDR 혼용 오류 계산 실패');
    passedAll = false;
  }

  // ------------------------------------------------------------------------
  // 테스트 케이스 5: 극단적 3세대 난립 오류 (3-way DDR Mismatch)
  // ------------------------------------------------------------------------
  console.log('\n[TestCase 5] CPU/RAM/보드 3개 세대 전원 불일치 (극단 혼용 및 초당 10% HP Decay 검증)');
  const extremeDdrParts: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 4, ddrGeneration: 'DDR3' }, // CPU DDR3
    gpu: { level: 1 },
    ram: { level: 2, clockMhz: 2400, capacityGb: 16, ddrGeneration: 'DDR4' }, // RAM DDR4
    cooler: { level: 4, coolingCapacity: 100 },
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 200 }, // Board DDR5
    storage: { type: 'SSD', capacityGb: 250 },
  };

  const specs5 = HardwareSimulator.calculateComputerSpecs(extremeDdrParts);
  console.log(`- 페널티: DDR에러: ${specs5.penalties.isDdrMismatched}, HP Decay Rate: ${specs5.penalties.hpDecayRate * 100}%/초`);

  // 3가지 세대가 전부 혼용 시 초당 HP Decay 비율은 0.10 (10%)이어야 함
  const cond5 = 
    specs5.penalties.isDdrMismatched && 
    specs5.penalties.hpDecayRate === 1.00;

  if (cond5) {
    console.log('=> [PASSED] 3세대 DDR 극단 혼용 감지 및 초당 10% HP 감쇠 페널티 검증 성공');
  } else {
    console.error('=> [FAILED] 3세대 DDR 극단 혼용 계산 실패');
    passedAll = false;
  }

  console.log('\n==================================================');
  if (passedAll) {
    console.log('[HardwareTest] 축하합니다! 모든 시뮬레이션 테스트를 통과했습니다.');
  } else {
    console.error('[HardwareTest] 경고: 일부 하드웨어 사양 검증에 실패했습니다.');
  }
  console.log('==================================================');
}

// 스크립트 실행
runHardwareTests();
