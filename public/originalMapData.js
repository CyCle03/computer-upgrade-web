/**
 * [SCA] 컴퓨터 강화하기 V1.2.9 — 원본 유즈맵 기준 게임 데이터
 */
(function (global) {
  const MINERAL_PER_COIN = 10000;

  const INTEL_CPU = [
    { level: 1, name: 'Core i5-760', cost: 1, prob: 0.40, cores: 1, perf: 1, cooling: 100 },
    { level: 2, name: 'Core i5-2500K', cost: 5, prob: 0.40, cores: 1, perf: 5, cooling: 200 },
    { level: 3, name: 'Core i5-3570K', cost: 25, prob: 0.30, cores: 1, perf: 25, cooling: 300 },
    { level: 4, name: 'Core i5-4670K', cost: 30, prob: 0.25, cores: 2, perf: 60, cooling: 400 },
    { level: 5, name: 'Core i5-4690', cost: 60, prob: 0.25, cores: 2, perf: 75, cooling: 450 },
    { level: 6, name: 'Core i5-6600K', cost: 75, prob: 0.20, cores: 4, perf: 150, cooling: 600 },
    { level: 7, name: 'Core i5-7600K', cost: 150, prob: 0.15, cores: 6, perf: 300, cooling: 700 },
    { level: 8, name: 'Core i5-8600K', cost: 300, prob: 0.15, cores: 8, perf: 750, cooling: 800 },
    { level: 9, name: 'Core i5-9600K', cost: 750, prob: 0.10, cores: 10, perf: 1500, cooling: 900 },
    { level: 10, name: 'Core i5-10600K', cost: 1500, prob: 0.10, cores: 12, perf: 3000, cooling: 1000 },
    { level: 11, name: 'Core i5-11600K', cost: 3000, prob: 0.05, cores: 12, perf: 5000, cooling: 1200 },
    { level: 12, name: 'Core i5-12600K', cost: 5000, prob: 0.05, cores: 14, perf: 12000, cooling: 1600 },
    { level: 13, name: 'Core i5-13600K', cost: 12000, prob: 0.05, cores: 16, perf: 18000, cooling: 1800 },
    { level: 14, name: 'Core i5-14600K', cost: 18000, prob: 0.05, cores: 16, perf: 25000, cooling: 2000 },
  ];

  const AMD_CPU = [
    { level: 1, name: 'Ryzen™ 5 1600X', cost: 1, prob: 0.40, cores: 1, perf: 1, cooling: 100 },
    { level: 2, name: 'Ryzen™ 5 2600X', cost: 8, prob: 0.35, cores: 2, perf: 8, cooling: 200 },
    { level: 3, name: 'Ryzen™ 5 3600X', cost: 40, prob: 0.30, cores: 4, perf: 40, cooling: 350 },
    { level: 4, name: 'Ryzen™ 5 4600G', cost: 80, prob: 0.25, cores: 6, perf: 100, cooling: 500 },
    { level: 5, name: 'Ryzen™ 5 5600X', cost: 200, prob: 0.20, cores: 8, perf: 250, cooling: 650 },
    { level: 6, name: 'Ryzen™ 5 7600X', cost: 500, prob: 0.15, cores: 10, perf: 600, cooling: 800 },
  ];

  const GPU = [
    { level: 1, name: 'GeForce GT 240', cost: 1, prob: 0.40 },
    { level: 2, name: 'GeForce GTS 250', cost: 5, prob: 0.35 },
    { level: 3, name: 'GeForce GTX 460', cost: 20, prob: 0.30 },
    { level: 4, name: 'GeForce GTX 760', cost: 40, prob: 0.25 },
    { level: 5, name: 'GeForce GTX 960', cost: 80, prob: 0.25 },
    { level: 6, name: 'GeForce GTX 1060', cost: 150, prob: 0.20 },
    { level: 7, name: 'GeForce GTX 1070 Ti', cost: 300, prob: 0.15 },
    { level: 8, name: 'GeForce RTX 3060 Ti', cost: 600, prob: 0.15 },
    { level: 9, name: 'GeForce RTX 4070 Ti', cost: 1200, prob: 0.10 },
    { level: 10, name: 'GeForce RTX 4090', cost: 2500, prob: 0.10 },
  ];

  const RAM = [
    { level: 1, name: 'DDR3-1333 (1GB)', cost: 1, prob: 0.40, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' },
    { level: 2, name: 'DDR3-1333 (2GB)', cost: 3, prob: 0.35, clockMhz: 1333, capacityGb: 2, ddrGeneration: 'DDR3' },
    { level: 3, name: 'DDR3-1600 (4GB)', cost: 8, prob: 0.30, clockMhz: 1600, capacityGb: 4, ddrGeneration: 'DDR3' },
    { level: 4, name: 'DDR3-1866 (4GB)', cost: 15, prob: 0.25, clockMhz: 1866, capacityGb: 4, ddrGeneration: 'DDR3' },
    { level: 5, name: 'DDR4-2400 (8GB)', cost: 25, prob: 0.25, clockMhz: 2400, capacityGb: 8, ddrGeneration: 'DDR4' },
    { level: 6, name: 'DDR4-2666 (8GB)', cost: 40, prob: 0.20, clockMhz: 2666, capacityGb: 8, ddrGeneration: 'DDR4' },
    { level: 7, name: 'DDR4-3200 (16GB)', cost: 75, prob: 0.15, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    { level: 8, name: 'DDR4-3600 (16GB)', cost: 120, prob: 0.15, clockMhz: 3600, capacityGb: 16, ddrGeneration: 'DDR4' },
    { level: 9, name: 'DDR5-4800 (8GB)', cost: 200, prob: 0.10, clockMhz: 4800, capacityGb: 8, ddrGeneration: 'DDR5' },
    { level: 10, name: 'DDR5-4800 (8GB)', cost: 350, prob: 0.10, clockMhz: 4800, capacityGb: 8, ddrGeneration: 'DDR5' },
    { level: 11, name: 'DDR5-5200 (16GB)', cost: 600, prob: 0.08, clockMhz: 5200, capacityGb: 16, ddrGeneration: 'DDR5' },
    { level: 12, name: 'DDR5-5600 (16GB)', cost: 1000, prob: 0.08, clockMhz: 5600, capacityGb: 16, ddrGeneration: 'DDR5' },
    { level: 13, name: 'DDR5-5600 (32GB)', cost: 1800, prob: 0.05, clockMhz: 5600, capacityGb: 32, ddrGeneration: 'DDR5' },
  ];

  const COOLER_AIR = [
    { level: 1, name: '인텔 기본 번들 (초코파이)', cost: 1, prob: 0.50, coolingCapacity: 100 },
    { level: 2, name: '구리 히트싱크 공랭', cost: 5, prob: 0.45, coolingCapacity: 250 },
    { level: 3, name: '보급형 타워 싱글팬', cost: 15, prob: 0.40, coolingCapacity: 450 },
    { level: 4, name: '듀얼타워 대장급 (NH-D15)', cost: 40, prob: 0.35, coolingCapacity: 700 },
    { level: 5, name: '듀얼타워 RGB 공랭', cost: 80, prob: 0.30, coolingCapacity: 1000 },
  ];

  const COOLER_WATER = [
    { level: 1, name: '120mm 1열 수랭', cost: 20, prob: 0.40, coolingCapacity: 600 },
    { level: 2, name: '240mm 2열 AIO', cost: 50, prob: 0.35, coolingCapacity: 900 },
    { level: 3, name: '360mm 3열 RGB 수랭', cost: 120, prob: 0.30, coolingCapacity: 1300 },
    { level: 4, name: '커스텀 수로 오픈형', cost: 250, prob: 0.25, coolingCapacity: 1800 },
    { level: 5, name: '외장 MORA 라디에이터', cost: 500, prob: 0.20, coolingCapacity: 2500 },
  ];

  const HDD = [
    { level: 1, name: 'HDD 60GB', cost: 1, prob: 0.50, capacityGb: 60, storageType: 'HDD' },
    { level: 2, name: 'HDD 250GB', cost: 5, prob: 0.45, capacityGb: 250, storageType: 'HDD' },
    { level: 3, name: 'HDD 500GB', cost: 15, prob: 0.40, capacityGb: 500, storageType: 'HDD' },
    { level: 4, name: 'HDD 1TB', cost: 40, prob: 0.35, capacityGb: 1000, storageType: 'HDD' },
  ];

  const NVME = [
    { level: 1, name: 'M.2 NVMe 250GB', cost: 10, prob: 0.45, capacityGb: 250, storageType: 'SSD' },
    { level: 2, name: 'M.2 NVMe 500GB', cost: 30, prob: 0.40, capacityGb: 500, storageType: 'SSD' },
    { level: 3, name: 'M.2 NVMe 1TB', cost: 80, prob: 0.35, capacityGb: 1000, storageType: 'SSD' },
    { level: 4, name: 'M.2 NVMe 2TB', cost: 200, prob: 0.30, capacityGb: 2000, storageType: 'SSD' },
  ];

  const MOTHERBOARDS = [
    { name: 'Intel P55 (DDR3)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 200, cost: 5 },
    { name: 'Intel H270 (DDR4)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 400, cost: 15 },
    { name: 'Intel Z590 (DDR4)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 600, cost: 40 },
    { name: 'Intel Z790 (DDR5)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 800, cost: 80 },
    { name: 'AMD B550 (DDR4)', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 500, cost: 30 },
    { name: 'AMD X670E (DDR5)', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 900, cost: 100 },
  ];

  // 원작 UI: 작업명 [필요 RAM GB] — tierIndex 0=시작, 상위는 다운로드로만 해금
  const WORK_HUNTING_GROUNDS = [
    { name: '간단한 문서작업 (1단계)', multiplier: 1.0, mineralBase: 10, tierIndex: 0, requiredRamGb: 1 },
    { name: '2D/3D 그래픽 작업 (2단계)', multiplier: 2.5, mineralBase: 25, tierIndex: 1, requiredRamGb: 4 },
    { name: 'AI 작업 (3단계)', multiplier: 5.0, mineralBase: 50, tierIndex: 2, requiredRamGb: 8 },
    { name: '스타크래프트 8K 게이밍 (4단계)', multiplier: 10.0, mineralBase: 100, tierIndex: 3, requiredRamGb: 16 },
    { name: '사이버펑크 2077 (5단계)', multiplier: 20.0, mineralBase: 200, tierIndex: 4, requiredRamGb: 32 },
  ];

  const PARTY_HUNTING_TIERS = [
    { name: '파티 1-1', mineralPerTick: 30, scaCoins: 2 },
    { name: '파티 1-2', mineralPerTick: 300, scaCoins: 20 },
    { name: '파티 1-3', mineralPerTick: 3500, scaCoins: 200 },
    { name: '파티 1-4', mineralPerTick: 50000, scaCoins: 2000 },
    { name: '파티 1-5', mineralPerTick: 750000, scaCoins: 5000 },
    { name: '파티 1-6', mineralPerTick: 1500000, scaCoins: 40000 },
    { name: '파티 2-1', mineralPerTick: 1, scaCoins: 20 },
    { name: '파티 2-2', mineralPerTick: 100, scaCoins: 500 },
    { name: '파티 2-3', mineralPerTick: 2500, scaCoins: 7500 },
  ];

  const GAME_SPEED_BASE = 3;
  const GAME_SPEED_MAX = 13;
  const GPU_GRADE_NAMES = ['엔트리', '메인스트림', '퍼포먼스', '하이엔드'];
  const GPU_GRADE_ATTACK_FRAMES = [20, 16, 12, 8];
  const DOWNLOAD_BASE_MB = 25;

  const SCA_SHOP_ITEMS = [
    { id: 'rebirthMineral500', name: '환생 시작 미네랄 +500', cost: 500, maxPurchases: 1 },
    { id: 'rebirthMineralMax200', name: '환생 미네랄 최대 +200', cost: 800, maxPurchases: 5 },
    { id: 'rebirthMineralMax2000', name: '환생 미네랄 최대 +2,000', cost: 5000, maxPurchases: 3 },
    { id: 'rebirthMineralMax7500', name: '환생 미네랄 최대 +7,500', cost: 8000, maxPurchases: 2 },
    { id: 'huntIncome1', name: '사냥터 수입 +1%', cost: 12000, maxPurchases: 10 },
    { id: 'gameSpeed1', name: '게임 배속 +1프레임', cost: 25000, maxPurchases: 10 },
    { id: 'upgradeProb01', name: '강화 확률 +0.1%', cost: 30000, maxPurchases: 10 },
    { id: 'downloadSpeed10', name: '다운로드 속도 +10%', cost: 35000, maxPurchases: 10 },
    { id: 'gpuGradeUp', name: 'GPU 등급 증가 (하이엔드)', cost: 40000, maxPurchases: 1 },
    { id: 'intelCpu11', name: 'Intel CPU 11강 (Core i5-11600K)', cost: 50000, maxPurchases: 1 },
  ];

  const DOWNLOAD_TARGETS = [
    { name: '2D/3D 그래픽 작업 (2단계)', sizeMb: 5000, requiredGb: 500, requiredRamGb: 4, groundIndex: 1 },
    { name: 'AI 작업 (3단계)', sizeMb: 15000, requiredGb: 1000, requiredRamGb: 8, groundIndex: 2 },
    { name: '스타크래프트 8K 게이밍 (4단계)', sizeMb: 50000, requiredGb: 2000, requiredRamGb: 16, groundIndex: 3 },
    { name: '사이버펑크 2077 (5단계)', sizeMb: 150000, requiredGb: 4000, requiredRamGb: 32, groundIndex: 4 },
  ];

  function getPartTable(type, part) {
    if (type === 'cpu') return part && part.manufacturer === 'AMD' ? AMD_CPU : INTEL_CPU;
    if (type === 'gpu') return GPU;
    if (type === 'ram') return RAM;
    if (type === 'cooler') return part && part.coolerKind === 'water' ? COOLER_WATER : COOLER_AIR;
    if (type === 'storage') return part && part.storageKind === 'nvme' ? NVME : HDD;
    return [];
  }

  function getMaxLevel(type, part) { return getPartTable(type, part).length; }

  function getTier(type, part, level) {
    const table = getPartTable(type, part);
    return table.find((row) => row.level === level) || table[table.length - 1];
  }

  function getUpgradeCost(type, currentLevel, part) {
    const tier = getTier(type, part, currentLevel + 1);
    return tier ? tier.cost : Infinity;
  }

  function getUpgradeProbability(type, currentLevel, part, bonusProb) {
    const tier = getTier(type, part, currentLevel + 1);
    return tier ? Math.min(1, tier.prob + (bonusProb || 0)) : 0;
  }

  function getPartName(type, level, part) {
    const tier = getTier(type, part, level);
    return tier ? tier.name : type.toUpperCase() + ' Lv.' + level;
  }

  function applyTierStats(part, nextLevel) {
    const tier = getTier(part.type, part, nextLevel);
    if (!tier) return part;
    const upgraded = Object.assign({}, part, { level: nextLevel });
    if (part.type === 'ram') {
      upgraded.clockMhz = tier.clockMhz;
      upgraded.capacityGb = tier.capacityGb;
      upgraded.ddrGeneration = tier.ddrGeneration;
    } else if (part.type === 'cooler') {
      upgraded.coolingCapacity = tier.coolingCapacity;
    } else if (part.type === 'storage') {
      upgraded.capacityGb = tier.capacityGb;
      upgraded.storageType = tier.storageType;
    }
    return upgraded;
  }

  function getCpuCoolingRequired(cpu) {
    const tier = getTier('cpu', cpu, cpu.level);
    return tier ? tier.cooling : cpu.level * 100;
  }

  function getCpuCores(cpu) {
    const tier = getTier('cpu', cpu, cpu.level);
    return tier ? tier.cores : cpu.level;
  }

  function convertMineralsToCoins(minerals) {
    const coins = Math.floor(minerals / MINERAL_PER_COIN);
    return { coins, remainder: minerals % MINERAL_PER_COIN };
  }

  const REBIRTH_MINERAL_CAP = 1000000;

  // 환생수치 구간표 (제공된 표 기준)
  // % 계산은 '보정 이전 환생수치' 기준
  const REBIRTH_REWARD_TIERS = [
    { min: 0, max: 5_000_000, scaBase: 50_000, scaRate: 0.01, correction: { type: 'add', value: 5_000_000 } },
    { min: 5_000_000, max: 10_000_000, scaBase: 100_000, scaRate: 0.01, correction: { type: 'add', value: 7_000_000 } },
    { min: 10_000_000, max: 20_000_000, scaBase: 200_000, scaRate: 0.005, correction: { type: 'add', value: 10_000_000 } },
    { min: 20_000_000, max: 40_000_000, scaBase: 300_000, scaRate: 0.005, correction: { type: 'mul', value: 1.40 }, extra: { incomeCoupons: 100, speedCoupons: 5 } },
    { min: 40_000_000, max: 100_000_000, scaBase: 500_000, scaRate: 0.002, correction: { type: 'mul', value: 1.30 } },
    { min: 100_000_000, max: 300_000_000, scaBase: 700_000, scaRate: 0.001, correction: { type: 'mul', value: 1.25 } },
    { min: 300_000_000, max: Infinity, scaBase: 1_000_000, scaRate: 0.001, correction: { type: 'mul', value: 1.25 } },
  ];

  function getRebirthRewardTier(baseRebirthStat) {
    const s = Math.max(0, baseRebirthStat || 0);
    return REBIRTH_REWARD_TIERS.find((t) => s >= t.min && s < t.max) || REBIRTH_REWARD_TIERS[REBIRTH_REWARD_TIERS.length - 1];
  }

  /** 표 기준: SCA 코인 = scaBase + (보정 전 환생수치 * scaRate) */
  function calcRebirthScaRewardByRebirthStat(baseRebirthStat) {
    const s = Math.max(0, baseRebirthStat || 0);
    const tier = getRebirthRewardTier(s);
    const reward = tier.scaBase + s * tier.scaRate;
    return Math.max(0, Math.floor(reward));
  }

  /** 표 기준: 환생수치 보정(가산/퍼센트) */
  function applyRebirthStatCorrection(baseRebirthStat) {
    const s = Math.max(0, baseRebirthStat || 0);
    const tier = getRebirthRewardTier(s);
    const corr = tier.correction || null;
    if (!corr) return s;
    if (corr.type === 'add') return s + corr.value;
    if (corr.type === 'mul') return Math.floor(s * corr.value);
    return s;
  }

  function calcRebirthOutcome(parts, prevRebirthStat) {
    const statGain = calcRebirthStatGain(parts);
    const baseStat = Math.max(0, (prevRebirthStat || 0)) + statGain;
    const tier = getRebirthRewardTier(baseStat);
    const scaReward = calcRebirthScaRewardByRebirthStat(baseStat);
    const correctedStat = applyRebirthStatCorrection(baseStat);
    return {
      statGain,
      baseStat,
      correctedStat,
      scaReward,
      tier,
      extra: tier.extra || null,
    };
  }

  function calcRebirthPerformanceScore(parts) {
    const cpu = parts.cpu || { level: 1 };
    const gpu = parts.gpu || { level: 1 };
    const ram = parts.ram || { level: 1 };
    const cooler = parts.cooler || { level: 1 };
    const storage = parts.storage || { level: 1 };
    const cpuTier = getTier('cpu', cpu, cpu.level);
    const cpuPerf = cpuTier && cpuTier.perf ? cpuTier.perf : cpu.level * 10;
    return cpuPerf + gpu.level * 800 + ram.level * 200 + cooler.level * 150 + storage.level * 100;
  }

  function calcRebirthStatGain(parts) {
    return calcRebirthPerformanceScore(parts);
  }

  function calcRebirthScaReward(parts, prevRebirthStat) {
    // 기존 호출부 호환: prevRebirthStat가 있으면 표 기반, 없으면 성능점수 기반 근사
    if (typeof prevRebirthStat === 'number') {
      const statGain = calcRebirthStatGain(parts);
      return calcRebirthScaRewardByRebirthStat(prevRebirthStat + statGain);
    }
    const score = calcRebirthPerformanceScore(parts);
    return Math.max(10, Math.floor(score / 100));
  }

  /** SCA 상점 구매분 합산 = 다음 환생 시작 미네랄 (고정, 랜덤 없음) */
  function calcRebirthStartMinerals(scaUpgrades) {
    const u = scaUpgrades || {};
    const total =
      (u.rebirthMineral500 || 0) * 500 +
      (u.rebirthMineralMax200 || 0) * 200 +
      (u.rebirthMineralMax2000 || 0) * 2000 +
      (u.rebirthMineralMax7500 || 0) * 7500;
    return Math.min(REBIRTH_MINERAL_CAP, total);
  }

  function calcRebirthIncomeMultiplier(rebirthStat) {
    return 1 + Math.min((rebirthStat || 0) * 0.00005, 10);
  }

  function calcIncomeBonus(scaUpgrades) { return (scaUpgrades.huntIncome1 || 0) * 0.01; }
  function calcProbBonus(scaUpgrades) { return (scaUpgrades.upgradeProb01 || 0) * 0.001; }

  /** v1.1.9: 기본 3프레임 + 구매당 +1, 최대 13 */
  function calcGameSpeedFrames(scaUpgrades) {
    return Math.min(GAME_SPEED_MAX, GAME_SPEED_BASE + (scaUpgrades.gameSpeed1 || 0));
  }

  function calcGameSpeedMultiplier(scaUpgrades) {
    return calcGameSpeedFrames(scaUpgrades) / GAME_SPEED_BASE;
  }

  /** v1.1.6~1.1.9: 엔트리→하이엔드, 공속 프레임 20/16/12/8 */
  function calcGpuGrade(scaUpgrades) {
    return scaUpgrades.gpuGradeUp ? GPU_GRADE_ATTACK_FRAMES.length - 1 : 0;
  }

  function calcGpuAttackFrames(scaUpgrades) {
    return GPU_GRADE_ATTACK_FRAMES[calcGpuGrade(scaUpgrades)];
  }

  function getStorageDownloadMultiplier(storage) {
    const kind = storage && (storage.storageKind || (storage.type === 'SSD' ? 'nvme' : 'hdd'));
    return kind === 'nvme' || kind === 'ssd' || (storage && storage.type === 'SSD') ? 4 : 1;
  }

  function calcDownloadSpeedBonus(scaUpgrades) {
    return 1 + (scaUpgrades.downloadSpeed10 || 0) * 0.1;
  }

  /** §3.8 HDD x1 / SSD·NVMe x4 + SCA 다운로드 +10% */
  function calcDownloadSpeedMb(storage, scaUpgrades) {
    const cap = (storage && storage.capacityGb) || 60;
    const base = DOWNLOAD_BASE_MB + cap * 0.01;
    const speed = base * getStorageDownloadMultiplier(storage) * calcDownloadSpeedBonus(scaUpgrades || {});
    return Math.round(speed * 10) / 10;
  }


  function getRamCapacityGb(ram) {
    return (ram && ram.capacityGb) || 1;
  }

  function getStorageCapacityGb(storage) {
    return (storage && storage.capacityGb) || 60;
  }

  function getWorkTier(tierIndex) {
    const idx = Math.max(0, Math.min(WORK_HUNTING_GROUNDS.length - 1, tierIndex || 0));
    return WORK_HUNTING_GROUNDS[idx];
  }

  /** 저장값·UI 조작으로 티어가 앞당겨진 경우 원작 순서(다운로드 해금)에 맞게 보정 */
  function normalizeWorkProgress(huntingGround, downloadTarget) {
    let groundIdx = Math.max(0, Math.min(WORK_HUNTING_GROUNDS.length - 1, (huntingGround && huntingGround.groundIndex) || 0));
    let nextTarget = null;

    if (downloadTarget && downloadTarget.groundIndex != null) {
      const maxAllowed = downloadTarget.groundIndex - 1;
      if (groundIdx > maxAllowed) groundIdx = maxAllowed;
      nextTarget = DOWNLOAD_TARGETS.find((t) => t.groundIndex === downloadTarget.groundIndex) || DOWNLOAD_TARGETS[0];
    } else if (groundIdx < WORK_HUNTING_GROUNDS.length - 1) {
      nextTarget = DOWNLOAD_TARGETS.find((t) => t.groundIndex === groundIdx + 1) || null;
    }

    const tier = getWorkTier(groundIdx);
    return {
      huntingGround: {
        name: tier.name,
        multiplier: tier.multiplier,
        mineralBase: tier.mineralBase,
        groundIndex: groundIdx,
      },
      downloadTarget: nextTarget
        ? {
            name: nextTarget.name,
            sizeMb: nextTarget.sizeMb,
            requiredGb: nextTarget.requiredGb,
            requiredRamGb: nextTarget.requiredRamGb,
            groundIndex: nextTarget.groundIndex,
          }
        : null,
    };
  }

  function canRunWorkTier(parts, tierIndex) {
    const tier = getWorkTier(tierIndex);
    return getRamCapacityGb(parts && parts.ram) >= tier.requiredRamGb;
  }

  /** 다운로드 시도 가능 여부 — 스펙·순서·진행 상태 검증 (미달 시 시도 불가) */
  function validateDownloadStart(parts, huntingGround, downloadTarget, isDownloading) {
    if (isDownloading) return { ok: false, reason: '이미 다운로드가 진행 중입니다.' };
    if (!downloadTarget || downloadTarget.groundIndex == null) {
      return { ok: false, reason: '모든 작업/게임을 다운로드했습니다.' };
    }
    const currentIdx = (huntingGround && huntingGround.groundIndex) || 0;
    if (currentIdx !== downloadTarget.groundIndex - 1) {
      return { ok: false, reason: '현재 작업 단계를 완료한 뒤에만 다음 다운로드를 시작할 수 있습니다.' };
    }
    const storageGb = getStorageCapacityGb(parts && parts.storage);
    if (storageGb < downloadTarget.requiredGb) {
      return { ok: false, reason: `저장장치 용량 부족 (필요 ${downloadTarget.requiredGb}GB / 현재 ${storageGb}GB)` };
    }
    const ramGb = getRamCapacityGb(parts && parts.ram);
    const reqRam = downloadTarget.requiredRamGb || getWorkTier(downloadTarget.groundIndex).requiredRamGb;
    if (ramGb < reqRam) {
      return { ok: false, reason: `RAM 용량 부족 (필요 ${reqRam}GB / 현재 ${ramGb}GB)` };
    }
    return { ok: true, reason: '' };
  }

  function createIntelCpu11InventoryItem() {
    const tier = INTEL_CPU.find((row) => row.level === 11);
    return {
      id: 'inv-cpu-sca11-' + Math.random().toString(36).substring(2, 9),
      type: 'cpu',
      level: 11,
      manufacturer: 'Intel',
      ddrGeneration: 'DDR4',
      name: tier ? tier.name : 'Core i5-11600K',
    };
  }

  global.OriginalMapGame = {
    MINERAL_PER_COIN, REBIRTH_MINERAL_CAP, GAME_SPEED_BASE, GAME_SPEED_MAX,
    GPU_GRADE_NAMES, GPU_GRADE_ATTACK_FRAMES, DOWNLOAD_BASE_MB,
    INTEL_CPU, AMD_CPU, GPU, RAM, COOLER_AIR, COOLER_WATER, HDD, NVME,
    MOTHERBOARDS, WORK_HUNTING_GROUNDS, PARTY_HUNTING_TIERS, SCA_SHOP_ITEMS, DOWNLOAD_TARGETS,
    getPartTable, getMaxLevel, getTier, getUpgradeCost, getUpgradeProbability, getPartName,
    applyTierStats, getCpuCoolingRequired, getCpuCores, convertMineralsToCoins,
    calcRebirthPerformanceScore, calcRebirthStatGain, calcRebirthScaReward,
    calcRebirthStartMinerals, calcRebirthIncomeMultiplier,
    calcIncomeBonus, calcProbBonus,
    REBIRTH_REWARD_TIERS, getRebirthRewardTier, calcRebirthScaRewardByRebirthStat, applyRebirthStatCorrection, calcRebirthOutcome,
    calcGameSpeedFrames, calcGameSpeedMultiplier, calcGpuGrade, calcGpuAttackFrames,
    getStorageDownloadMultiplier, calcDownloadSpeedBonus, calcDownloadSpeedMb,
    getRamCapacityGb, getStorageCapacityGb, getWorkTier, normalizeWorkProgress,
    canRunWorkTier, validateDownloadStart,
    createIntelCpu11InventoryItem,
  };
})(typeof window !== 'undefined' ? window : globalThis);
