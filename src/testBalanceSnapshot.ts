/**
 * 밸런스 회귀 스냅샷 테스트
 * ---------------------------------------------------------------------------
 * 강화·전투·수입 밸런스는 부품/RAM/GPU/쿨러/스토리지 간 상호 의존이 커서
 * 한 곳을 손대면 다른 곳 수치가 조용히 바뀌기 쉽다(예: 환생 인벤토리 버그).
 * 이 테스트는 대표 시나리오들의 계산 결과를 스냅샷 파일에 고정해두고,
 * 이후 값이 바뀌면 diff 를 출력하며 실패시킨다 → 의도치 않은 밸런스 드리프트 감지.
 *
 *   npm run test:balance          # 스냅샷과 비교 (드리프트 시 실패)
 *   npm run test:balance:update   # 의도한 변경이면 스냅샷 갱신 후 커밋
 *
 * DB 불필요. HardwareSimulator + originalMapData.js 의 순수 계산만 사용.
 */
import fs from 'fs';
import path from 'path';
import { HardwareSimulator } from './hardwareSimulator';
import { loadOmg } from './omgLoader';
import { ComputerParts } from './types';

const SNAP_PATH = path.join(__dirname, '__snapshots__', 'balance.snapshot.json');

// --- 대표 부품 시나리오 (페널티/등급 스펙트럼을 넓게 커버) -------------------
const SCENARIOS: Record<string, { parts: ComputerParts; sca?: any }> = {
  perfect_low: {
    parts: {
      cpu: { manufacturer: 'Intel', level: 5, ddrGeneration: 'DDR3' },
      gpu: { level: 5 },
      ram: { level: 4, clockMhz: 1600, capacityGb: 4, ddrGeneration: 'DDR3' },
      cooler: { level: 2, coolingCapacity: 650 },
      motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 30 },
      storage: { type: 'SSD', capacityGb: 250 },
    },
  },
  overheated: {
    parts: {
      cpu: { manufacturer: 'AMD', level: 6, ddrGeneration: 'DDR5' },
      gpu: { level: 2 },
      ram: { level: 10, clockMhz: 4800, capacityGb: 8, ddrGeneration: 'DDR5' },
      cooler: { level: 2, coolingCapacity: 500 },
      motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 8000 },
      storage: { type: 'HDD', capacityGb: 500 },
    },
  },
  socket_mismatch: {
    parts: {
      cpu: { manufacturer: 'Intel', level: 6, ddrGeneration: 'DDR4' },
      gpu: { level: 1 },
      ram: { level: 5, clockMhz: 2400, capacityGb: 4, ddrGeneration: 'DDR4' },
      cooler: { level: 4, coolingCapacity: 1000 },
      motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 300 },
      storage: { type: 'SSD', capacityGb: 250 },
    },
  },
  ddr_mismatch: {
    parts: {
      cpu: { manufacturer: 'Intel', level: 4, ddrGeneration: 'DDR4' },
      gpu: { level: 3 },
      ram: { level: 4, clockMhz: 1600, capacityGb: 4, ddrGeneration: 'DDR3' },
      cooler: { level: 3, coolingCapacity: 900 },
      motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 100 },
      storage: { type: 'HDD', capacityGb: 500 },
    },
  },
  highend_nvme: {
    parts: {
      cpu: { manufacturer: 'AMD', level: 10, ddrGeneration: 'DDR5' },
      gpu: { level: 9 },
      ram: { level: 13, clockMhz: 6000, capacityGb: 32, ddrGeneration: 'DDR5' },
      cooler: { level: 8, coolingCapacity: 5000 },
      motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 20000 },
      storage: { type: 'SSD', capacityGb: 2000 },
    },
    sca: { ddr5OverclockedStep: 2 },
  },
  highend_sca_gpu: {
    parts: {
      cpu: { manufacturer: 'Intel', level: 8, ddrGeneration: 'DDR5' },
      gpu: { level: 7 },
      ram: { level: 9, clockMhz: 3600, capacityGb: 16, ddrGeneration: 'DDR4' },
      cooler: { level: 6, coolingCapacity: 3000 },
      motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 5000 },
      storage: { type: 'SSD', capacityGb: 1000 },
    },
    sca: { ddr4Overclocked: true, gpuAttackBonusPct: 20 },
  },
};

// --- OMG 순수 getter 커버리지 (시그니처가 확실한 것만, 방어적으로 호출) ------
function omgCoverage(): Record<string, unknown> {
  const OMG = loadOmg();
  const out: Record<string, unknown> = {};
  const safe = (label: string, fn: () => unknown) => {
    try { out[label] = fn(); } catch (e) { out[label] = { __error: String((e as Error).message) }; }
  };

  for (const mfr of ['Intel', 'AMD']) {
    for (let lv = 1; lv <= 10; lv++) {
      const cpu = { manufacturer: mfr, level: lv, ddrGeneration: 'DDR5' };
      safe(`getCpuCores.${mfr}.${lv}`, () => OMG.getCpuCores(cpu));
      safe(`getCpuCoolingRequired.${mfr}.${lv}`, () => OMG.getCpuCoolingRequired(cpu));
    }
  }
  for (let lv = 1; lv <= 10; lv++) {
    safe(`getGpuAttackPower.${lv}`, () => OMG.getGpuAttackPower({ level: lv }, {}));
  }
  // CPU 소환 DPS 배율 — Intel 14강까지(11~14강 확장 값)를 스냅샷에 고정, 프론트/백엔드 단일 소스 드리프트 감지
  for (let lv = 1; lv <= 14; lv++) {
    safe(`getCpuSummonDpsFactor.${lv}`, () => OMG.getCpuSummonDpsFactor({ manufacturer: 'Intel', level: lv }));
  }
  // 파티 틱 간격 — 채굴력이 높을수록 빨라짐(전력이 파티 수입에 유의미). 채굴 공격력 레벨 = miningPower/500.
  for (const mp of [0, 10000, 40000, 100000]) {
    safe(`calcPartyTickMs.mining${mp}`, () => OMG.calcPartyTickMs({ miningAmplifierUnlock: true, miningAmplifier: mp / 500 }));
  }
  // 파티 생존율(uptime) — 2-x 티어(반격)에서 채굴력이 안정성 결정. + 미네랄/SCA 최적 티어 분화 고정.
  const t21 = (OMG.PARTY_HUNTING_TIERS as any[])[6];
  const t23 = (OMG.PARTY_HUNTING_TIERS as any[])[8];
  for (const mp of [0, 20000, 50000, 150000]) {
    safe(`calcPartyUptime.2-1.mining${mp}`, () => OMG.calcPartyUptime(t21, mp));
    safe(`calcPartyUptime.2-3.mining${mp}`, () => OMG.calcPartyUptime(t23, mp));
  }
  for (const mp of [0, 20000, 150000]) {
    safe(`findOptimalPartyTier.mineral.mining${mp}`, () => OMG.findOptimalPartyTierIndex(9999, 9999999, mp, 0, 'mineral'));
    safe(`findOptimalPartyTier.sca.mining${mp}`, () => OMG.findOptimalPartyTierIndex(9999, 9999999, mp, 0, 'sca'));
  }
  for (const clk of [1333, 1600, 2400, 3200, 4800, 6000]) {
    safe(`calcRamAttackFrames.${clk}`, () =>
      OMG.calcRamAttackFrames({ level: 5, clockMhz: clk, capacityGb: 8, ddrGeneration: 'DDR4' }));
  }
  for (const t of ['HDD', 'SSD', 'NVMe']) {
    safe(`calcDownloadSpeedMb.${t}`, () => OMG.calcDownloadSpeedMb({ type: t, capacityGb: 500 }, {}));
    safe(`getStorageDownloadMultiplier.${t}`, () => OMG.getStorageDownloadMultiplier({ type: t, capacityGb: 500 }));
  }
  // 사냥 유닛 생존율(리스폰 다운타임 반영) — 자동 배분 최적화가 곱하는 계수를 고정
  const upMid = {
    cpu: { manufacturer: 'Intel', level: 5, ddrGeneration: 'DDR4' },
    ram: { level: 9, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    cooler: { level: 4, coolingCapacity: 1500 },
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 300 },
  };
  const upTank = { ...upMid, cpu: { manufacturer: 'AMD', level: 8, ddrGeneration: 'DDR5' }, motherboard: { ...upMid.motherboard, shieldIncrease: 8000 } };
  for (let gi = 0; gi < 8; gi++) {
    safe(`calcHuntUnitUptime.mid.${gi}`, () => OMG.calcHuntUnitUptime(upMid, {}, gi, OMG.calcRamAttackFrames(upMid.ram)));
    safe(`calcHuntUnitUptime.tank.${gi}`, () => OMG.calcHuntUnitUptime(upTank, {}, gi, OMG.calcRamAttackFrames(upTank.ram)));
  }
  return out;
}

function buildSnapshot() {
  const specs: Record<string, unknown> = {};
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    specs[name] = HardwareSimulator.calculateComputerSpecs(sc.parts, sc.sca);
  }
  const omg = omgCoverage();
  return { specs, omg };
}

// --- 딥 비교 & diff 리포트 --------------------------------------------------
function diff(expected: any, actual: any, prefix = ''): string[] {
  const diffs: string[] = [];
  const keys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k;
    const e = expected?.[k];
    const a = actual?.[k];
    if (e && a && typeof e === 'object' && typeof a === 'object') {
      diffs.push(...diff(e, a, p));
    } else if (JSON.stringify(e) !== JSON.stringify(a)) {
      diffs.push(`  ${p}: 스냅샷=${JSON.stringify(e)}  →  현재=${JSON.stringify(a)}`);
    }
  }
  return diffs;
}

function main() {
  const current = buildSnapshot();
  const update = process.env.UPDATE_SNAPSHOT === '1';

  if (update || !fs.existsSync(SNAP_PATH)) {
    fs.mkdirSync(path.dirname(SNAP_PATH), { recursive: true });
    fs.writeFileSync(SNAP_PATH, JSON.stringify(current, null, 2) + '\n', 'utf8');
    console.log(`[balance] 스냅샷 ${fs.existsSync(SNAP_PATH) && !update ? '생성' : '갱신'}: ${path.relative(process.cwd(), SNAP_PATH)}`);
    console.log('[balance] 변경이 의도한 것인지 diff 를 검토하고 커밋하세요.');
    return;
  }

  const saved = JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8'));
  const diffs = diff(saved, current);
  if (diffs.length === 0) {
    console.log('[balance] PASS — 밸런스 스냅샷 일치 (드리프트 없음).');
    return;
  }
  console.error('[balance] FAIL — 밸런스 수치가 스냅샷과 다릅니다:');
  console.error(diffs.join('\n'));
  console.error(`\n[balance] 의도한 변경이면: npm run test:balance:update  후 스냅샷을 함께 커밋하세요.`);
  process.exit(1);
}

main();
