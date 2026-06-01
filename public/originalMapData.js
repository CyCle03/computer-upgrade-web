/**
 * [SCA] 컴퓨터 강화하기 V1.2.9 — 원본 유즈맵 기준 게임 데이터
 * 미네랄 = 원(1:1). 상점 tier.cost = 구매가(원) 그대로.
 */
(function (global) {
  const MINERAL_PER_COIN = 10000000;
  const MANWON_MINERALS = 10000;

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

  /** GPU 등급별 참고 RAM(GB/유닛) — 가이드 센터 */
  const GPU_RAM_PER_UNIT_GB = [1, 2, 2, 4, 4, 8, 8, 16, 16, 32];

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
    { level: 2, name: '구리 히트싱크 공랭', cost: 500, prob: 0.45, coolingCapacity: 250 },
    { level: 3, name: '보급형 타워 싱글팬', cost: 1500, prob: 0.40, coolingCapacity: 450 },
    { level: 4, name: '듀얼타워 대장급 (NH-D15)', cost: 5000, prob: 0.35, coolingCapacity: 700 },
    { level: 5, name: '듀얼타워 RGB 공랭', cost: 15000, prob: 0.30, coolingCapacity: 1000 },
  ];

  const COOLER_WATER = [
    { level: 1, name: '120mm 1열 수랭', cost: 300000, prob: 0.40, coolingCapacity: 600 },
    { level: 2, name: '240mm 2열 AIO', cost: 500000, prob: 0.35, coolingCapacity: 900 },
    { level: 3, name: '360mm 3열 RGB 수랭', cost: 800000, prob: 0.30, coolingCapacity: 1300 },
    { level: 4, name: '커스텀 수로 오픈형', cost: 1200000, prob: 0.25, coolingCapacity: 1800 },
    { level: 5, name: '외장 MORA 라디에이터', cost: 2000000, prob: 0.20, coolingCapacity: 2500 },
  ];

  const HDD = [
    { level: 1, name: 'HDD 60GB', cost: 1, prob: 0.50, capacityGb: 60, storageType: 'HDD' },
    { level: 2, name: 'HDD 250GB', cost: 50000, prob: 0.45, capacityGb: 250, storageType: 'HDD' },
    { level: 3, name: 'HDD 500GB', cost: 150000, prob: 0.40, capacityGb: 500, storageType: 'HDD' },
    { level: 4, name: 'HDD 1TB', cost: 400000, prob: 0.35, capacityGb: 1000, storageType: 'HDD' },
  ];

  const NVME = [
    { level: 1, name: 'M.2 NVMe 250GB', cost: 300000, prob: 0.45, capacityGb: 250, storageType: 'SSD' },
    { level: 2, name: 'M.2 NVMe 500GB', cost: 500000, prob: 0.40, capacityGb: 500, storageType: 'SSD' },
    { level: 3, name: 'M.2 NVMe 1TB', cost: 800000, prob: 0.35, capacityGb: 1000, storageType: 'SSD' },
    { level: 4, name: 'M.2 NVMe 2TB', cost: 2000000, prob: 0.30, capacityGb: 2000, storageType: 'SSD' },
  ];

  const MOTHERBOARDS = [
    { name: 'Intel P55 (DDR3)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 30, cost: 150 },
    { name: 'Intel H270 (DDR4)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 100, cost: 3000 },
    { name: 'Intel Z590 (DDR4)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 300, cost: 100000 },
    { name: 'Intel Z790 (DDR5)', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 600, cost: 2000000 },
    { name: 'AMD B550 (DDR4)', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 200, cost: 50000 },
    { name: 'AMD X670E (DDR5)', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 800, cost: 2500000 },
  ];

    /** 작업(Work) — mineralPerUnit + GPU/RAM/CPU/실드 스펙 게이트 */
  const WORK_TASKS = [
    { name: '간단한 문서작업', taskIndex: 0, ramPerUnitGb: 1, mineralPerUnit: 1, requiredRamGb: 1, requiredGpuLevel: 1, requiredRamLevel: 1, requiredCpuCores: 1, requiredShield: 0 },
    { name: '2D/3D 그래픽 작업', taskIndex: 1, ramPerUnitGb: 1, mineralPerUnit: 10, requiredRamGb: 4, requiredGpuLevel: 2, requiredRamLevel: 2, requiredCpuCores: 1, requiredShield: 0 },
    { name: '간단한 AI 작업', taskIndex: 2, ramPerUnitGb: 2, mineralPerUnit: 30, requiredRamGb: 4, requiredGpuLevel: 3, requiredRamLevel: 3, requiredCpuCores: 2, requiredShield: 0 },
    { name: '3D 그래픽 / 전문 편집', taskIndex: 3, ramPerUnitGb: 4, mineralPerUnit: 100, requiredRamGb: 8, requiredGpuLevel: 4, requiredRamLevel: 5, requiredCpuCores: 4, requiredShield: 30 },
    { name: '고사양 AI / 렌더링', taskIndex: 4, ramPerUnitGb: 8, mineralPerUnit: 500, requiredRamGb: 16, requiredGpuLevel: 6, requiredRamLevel: 7, requiredCpuCores: 6, requiredShield: 100 },
  ];

  /** 게임 사냥(Gaming) — 다운로드 해금 · CPU 코어 = 유닛 수 · 작업과 동시 */
  const GAME_HUNTING = [
    { name: '대항해시대', mineralPerUnit: 1, gameIndex: 0 },
    { name: '심시티 2000', mineralPerUnit: 100, gameIndex: 1 },
    { name: '스타크래프트 II', mineralPerUnit: 100, gameIndex: 2 },
    { name: '다크 소울', mineralPerUnit: 2500, gameIndex: 3 },
    { name: '사이버펑크 2077', mineralPerUnit: 10000, gameIndex: 4 },
    { name: '리그 오브 레전드', mineralPerUnit: 30000, gameIndex: 5 },
    { name: 'FIFA 온라인', mineralPerUnit: 250000, gameIndex: 6 },
    { name: '배틀그라운드', mineralPerUnit: 5000000, gameIndex: 7 },
  ];

  const WORK_HUNTING_GROUNDS = WORK_TASKS.map((t) => ({
    name: t.name,
    multiplier: t.mineralPerUnit,
    mineralBase: t.mineralPerUnit,
    tierIndex: t.taskIndex,
    ramPerUnitGb: t.ramPerUnitGb,
  }));

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
  const GAME_SPEED_MAX = 15;
  /** SCA/EUD Wait 주기 상한. 배속 N ≠ 실시간 N배 — 배율 = (REF−BASE) / (REF−N) */
  const GAME_SPEED_FRAME_REF = 29;
  const GPU_GRADE_NAMES = ['엔트리', '메인스트림', '퍼포먼스', '하이엔드'];
  const GPU_GRADE_ATTACK_FRAMES = [20, 16, 12, 8];
  /** 커뮤니티 13배속방 7→10 자동구매 통계용 등급별 내부 카운터 배율 (재미 참고치) */
  const GPU_GRADE_BENCHMARK_MULTIPLIERS = [1, 4, 10, 25];
  const DOWNLOAD_BASE_MB = 25;

  const SCA_SHOP_ITEMS = [
    { id: 'rebirthMineral500', name: '환생 시작 미네랄 +500', cost: 500, maxPurchases: 1 },
    { id: 'rebirthMineralMax200', name: '환생 미네랄 최대 +200', cost: 800, maxPurchases: 5 },
    { id: 'rebirthMineralMax2000', name: '환생 미네랄 최대 +2,000', cost: 5000, maxPurchases: 3 },
    { id: 'rebirthMineralMax7500', name: '환생 미네랄 최대 +7,500', cost: 8000, maxPurchases: 2 },
    { id: 'huntIncome1', name: '사냥터 수입 +1%', cost: 12000, maxPurchases: 10 },
    { id: 'gameSpeed1', name: '게임 배속 +1프레임', cost: 25000, maxPurchases: 12 },
    { id: 'upgradeProb01', name: '강화 확률 +0.1%', cost: 30000, maxPurchases: 10 },
    { id: 'downloadSpeed10', name: '다운로드 속도 +10%', cost: 35000, maxPurchases: 10 },
    { id: 'gpuGradeUp', name: 'GPU 등급 증가 (하이엔드)', cost: 40000, maxPurchases: 1 },
    { id: 'intelCpu11', name: 'Intel CPU 11강 (Core i5-11600K)', cost: 50000, maxPurchases: 1 },
  ];

  /** gameIndex N 해금용 — mineralCost(원) + 저장공간 */
  const DOWNLOAD_TARGETS = [
    { name: '심시티 2000', sizeMb: 3000, requiredGb: 5, mineralCost: 10000, gameIndex: 1 },
    { name: '스타크래프트 II', sizeMb: 8000, requiredGb: 15, mineralCost: 30000, gameIndex: 2 },
    { name: '다크 소울', sizeMb: 20000, requiredGb: 30, mineralCost: 50000, gameIndex: 3 },
    { name: '사이버펑크 2077', sizeMb: 60000, requiredGb: 60, mineralCost: 100000, gameIndex: 4 },
    { name: '리그 오브 레전드', sizeMb: 120000, requiredGb: 250, mineralCost: 30000, gameIndex: 5 },
    { name: 'FIFA 온라인', sizeMb: 80000, requiredGb: 120, mineralCost: 500000, gameIndex: 6 },
    { name: '배틀그라운드', sizeMb: 200000, requiredGb: 500, mineralCost: 5000000, gameIndex: 7 },
  ];

  const MAX_RAM_INVENTORY = 4;

  function getShopTierCost(type, level, part) {
    const tier = getTier(type, part, level);
    return tier && tier.cost != null ? tier.cost : Infinity;
  }

  function getShopSellPrice(type, level, part) {
    const cost = getShopTierCost(type, level, part);
    return cost === Infinity ? 0 : Math.floor(cost * 0.5);
  }

  /** tier.cost = 미네랄(원) 구매가 (1:1) */
  function getShopTierCostMinerals(type, level, part) {
    const c = getShopTierCost(type, level, part);
    return c === Infinity ? Infinity : Math.max(0, Math.floor(c));
  }

  function getShopSellPriceMinerals(type, level, part) {
    const buy = getShopTierCostMinerals(type, level, part);
    return buy === Infinity ? 0 : Math.floor(buy * 0.5);
  }

  function getShopCatalog(type, part) {
    return getPartTable(type, part).map((row) => ({
      level: row.level,
      name: row.name,
      costC: row.cost,
      costMinerals: Math.max(0, Math.floor(row.cost || 0)),
      prob: row.prob,
      cores: row.cores,
      cooling: row.cooling,
      capacityGb: row.capacityGb,
    }));
  }

  function countRamInInventory(inventory) {
    return (inventory || []).filter((p) => p.type === 'ram').length;
  }

  function canPurchaseRam(inventory) {
    return countRamInInventory(inventory) < MAX_RAM_INVENTORY;
  }

  function buildInventoryPart(type, level, partMeta) {
    const meta = Object.assign({ type }, partMeta || {});
    const id = `inv-${type}-${Math.random().toString(36).substring(2, 9)}`;
    let newPart = { id, type, level };
    if (type === 'cpu') {
      const t = getTier('cpu', meta, level);
      newPart.manufacturer = meta.manufacturer || 'Intel';
      newPart.ddrGeneration = meta.ddrGeneration || 'DDR3';
      if (t && t.name) newPart.name = t.name;
    } else if (type === 'gpu') {
      const t = getTier('gpu', meta, level);
      if (t && t.name) newPart.name = t.name;
    } else if (type === 'ram') {
      const t = getTier('ram', meta, level);
      newPart.clockMhz = t.clockMhz;
      newPart.capacityGb = t.capacityGb;
      newPart.ddrGeneration = t.ddrGeneration;
    } else if (type === 'cooler') {
      newPart.coolerKind = meta.coolerKind || 'air';
      newPart.coolingCapacity = getTier('cooler', newPart, level).coolingCapacity;
    } else if (type === 'storage') {
      newPart.storageKind = meta.storageKind || 'hdd';
      const t = getTier('storage', newPart, level);
      newPart.storageType = t.storageType;
      newPart.capacityGb = t.capacityGb;
    }
    return newPart;
  }

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

  function calcRebirthScaRewardByRebirthStat(baseRebirthStat) {
    const s = Math.max(0, baseRebirthStat || 0);
    const tier = getRebirthRewardTier(s);
    return Math.max(0, Math.floor(tier.scaBase + s * tier.scaRate));
  }

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
    return { statGain, baseStat, correctedStat, scaReward, tier, extra: tier.extra || null };
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

  function calcRebirthStatGain(parts) { return calcRebirthPerformanceScore(parts); }

  function calcRebirthScaReward(parts, prevRebirthStat) {
    if (typeof prevRebirthStat === 'number') {
      return calcRebirthScaRewardByRebirthStat(prevRebirthStat + calcRebirthStatGain(parts));
    }
    return Math.max(10, Math.floor(calcRebirthPerformanceScore(parts) / 100));
  }

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

  function calcGameSpeedFrames(scaUpgrades) {
    return Math.min(GAME_SPEED_MAX, GAME_SPEED_BASE + (scaUpgrades.gameSpeed1 || 0));
  }

  function calcGameSpeedWaitFrames(scaUpgrades) {
    return GAME_SPEED_FRAME_REF - calcGameSpeedFrames(scaUpgrades);
  }

  /**
   * SCA 게임 배속 배율. N배속 ≠ 실시간 N배.
   * 예: BASE 3 → 15(상한)일 때 (29−3)/(29−15) = 26/14 ≈ 1.857배 (구버전 N/3 사용 금지)
   */
  function calcGameSpeedMultiplier(scaUpgrades) {
    const frames = calcGameSpeedFrames(scaUpgrades);
    const baseWait = GAME_SPEED_FRAME_REF - GAME_SPEED_BASE;
    const currentWait = GAME_SPEED_FRAME_REF - frames;
    return Math.max(1, baseWait / currentWait);
  }

  /** 수입·다운로드 등 틱 간격(ms). baseMs 기본 1000(1초) */
  function calcGameSpeedTickMs(scaUpgrades, baseMs) {
    const base = baseMs == null ? 1000 : baseMs;
    return Math.max(50, Math.round(base / calcGameSpeedMultiplier(scaUpgrades)));
  }

  /**
   * 작업·사냥 수입 이벤트 간격(ms) — 원작: 킬/타격 = GPU 공속(프레임) + SCA 배속.
   * 24fps 기준 공격 주기 / gameSpeedMult. (고정 1초 틱보다 원작에 가깝게)
   */
  function calcIncomeEventIntervalMs(scaUpgrades, gpuAttackFrames) {
    const frames = Math.max(1, gpuAttackFrames || GPU_GRADE_ATTACK_FRAMES[0]);
    const secPerEvent = frames / 24 / calcGameSpeedMultiplier(scaUpgrades);
    return Math.max(50, Math.round(secPerEvent * 1000));
  }

  function calcGpuBenchmarkMultiplier(scaUpgrades) {
    return GPU_GRADE_BENCHMARK_MULTIPLIERS[calcGpuGrade(scaUpgrades)] || 1;
  }

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

  function calcDownloadSpeedMb(storage, scaUpgrades) {
    const cap = (storage && storage.capacityGb) || 60;
    const base = DOWNLOAD_BASE_MB + cap * 0.01;
    return Math.round(base * getStorageDownloadMultiplier(storage) * calcDownloadSpeedBonus(scaUpgrades || {}) * 10) / 10;
  }

  /** 테이블 cost = 미네랄(원) 그대로 */
  function costToMinerals(cost) {
    return Math.max(0, Math.floor(cost || 0));
  }

  /** 1만 원 이상이면 만원 표기 */
  function formatMineral(amount) {
    const n = Math.max(0, Math.floor(amount || 0));
    if (n >= MANWON_MINERALS) {
      const man = n / MANWON_MINERALS;
      return (Number.isInteger(man) ? man.toLocaleString() : man.toFixed(1)) + '만원';
    }
    return n.toLocaleString() + '원';
  }

  const formatManwon = formatMineral;


  function getPurchaseCostMinerals(type, level, part) {
    return costToMinerals(getUpgradeCost(type, level, part));
  }

  function getRamCapacityGb(ram) {
    return (ram && ram.capacityGb) || 1;
  }

  function getStorageCapacityGb(storage) {
    return (storage && storage.capacityGb) || 60;
  }

  function getGpuRamPerUnit(gpu) {
    const lv = Math.max(1, Math.min(GPU_RAM_PER_UNIT_GB.length, (gpu && gpu.level) || 1));
    return GPU_RAM_PER_UNIT_GB[lv - 1];
  }

function getPartLevel(part) {
    return Math.max(1, (part && part.level) || 1);
  }

  /**
   * 작업 티어 스펙 검사 — CPU 코어, RAM 용량·강, GPU 강, (고티어) 메인보드 실드
   */
  function evaluateWorkTaskSpec(parts, taskIndex) {
    const task = getWorkTask(taskIndex);
    const cpu = (parts && parts.cpu) || { level: 1 };
    const gpu = (parts && parts.gpu) || { level: 1 };
    const ram = (parts && parts.ram) || { level: 1, capacityGb: 1 };
    const motherboard = (parts && parts.motherboard) || { shieldIncrease: 0 };

    const gpuLevel = getPartLevel(gpu);
    const ramLevel = getPartLevel(ram);
    const ramGb = getRamCapacityGb(ram);
    const cpuCores = getCpuCores(cpu);
    const shield = motherboard.shieldIncrease || 0;
    const minRamGb = task.requiredRamGb || task.ramPerUnitGb || 1;

    const failures = [];
    if (gpuLevel < task.requiredGpuLevel) {
      failures.push(`GPU ${task.requiredGpuLevel}강 필요 (현재 ${gpuLevel}강)`);
    }
    if (ramLevel < task.requiredRamLevel) {
      failures.push(`RAM ${task.requiredRamLevel}강 필요 (현재 ${ramLevel}강)`);
    }
    if (cpuCores < task.requiredCpuCores) {
      failures.push(`CPU 코어 ${task.requiredCpuCores} 필요 (현재 ${cpuCores})`);
    }
    if (ramGb < minRamGb) {
      failures.push(`RAM ${minRamGb}GB 필요 (현재 ${ramGb}GB)`);
    }
    if ((task.requiredShield || 0) > 0 && shield < task.requiredShield) {
      failures.push(`고정 실드 ${task.requiredShield} 필요 (현재 ${shield})`);
    }

    const ramPerUnit = task.ramPerUnitGb || 1;
    const maxWorkByRam = Math.floor(ramGb / ramPerUnit);
    const activeWorkUnits = Math.max(0, Math.min(cpuCores, maxWorkByRam));

    return {
      ok: failures.length === 0,
      failures,
      task,
      gpuLevel,
      ramLevel,
      ramGb,
      cpuCores,
      shield,
      activeWorkUnits,
      ramPerUnit,
    };
  }

  function getWorkTaskSpecReason(parts, taskIndex) {
    const ev = evaluateWorkTaskSpec(parts, taskIndex);
    return ev.ok ? '' : ev.failures.join(' · ');
  }

    function getWorkTask(taskIndex) {
    const idx = Math.max(0, Math.min(WORK_TASKS.length - 1, taskIndex || 0));
    return WORK_TASKS[idx];
  }

  function getGameHunt(gameIndex) {
    return GAME_HUNTING.find((g) => g.gameIndex === gameIndex) || null;
  }

  function getDownloadTargetMeta(downloadTarget) {
    if (!downloadTarget || downloadTarget.gameIndex == null) return null;
    return DOWNLOAD_TARGETS.find((t) => t.gameIndex === downloadTarget.gameIndex) || downloadTarget;
  }

  /** RAM: 작업 점유 후 남은 용량으로 사냥 유닛 수 계산 (작업·게임 동시) */
  function calcRamAllocation(parts, workTaskIndex, maxUnitsOverride) {
    const totalRam = getRamCapacityGb(parts && parts.ram);
    const maxByCpu = maxUnitsOverride != null ? maxUnitsOverride : getCpuCores(parts && parts.cpu);
    const workSpec = evaluateWorkTaskSpec(parts, workTaskIndex);
    const work = workSpec.task;
    const workRamUsed = workSpec.ok ? workSpec.activeWorkUnits * (work.ramPerUnitGb || 1) : (work.requiredRamGb || 0);
    const huntRamFree = Math.max(0, totalRam - workRamUsed);
    const ramPerUnit = getGpuRamPerUnit(parts && parts.gpu);
    const maxByRam = ramPerUnit > 0 ? Math.floor(huntRamFree / ramPerUnit) : 0;
    const activeHuntingUnits = Math.max(0, Math.min(maxByRam, maxByCpu));
    return {
      totalRam,
      workRamUsed,
      huntRamFree,
      ramPerUnit,
      maxByRam,
      maxByCpu,
      activeHuntingUnits,
      activeWorkUnits: workSpec.ok ? workSpec.activeWorkUnits : 0,
      canRunWork: workSpec.ok && workSpec.activeWorkUnits > 0,
      workSpecOk: workSpec.ok,
      workSpecFailures: workSpec.failures,
    };
  }

  function canSelectWorkTask(parts, taskIndex) {
    return evaluateWorkTaskSpec(parts, taskIndex).ok;
  }

  function toDownloadTargetSnapshot(target) {
    if (!target) return null;
    return {
      name: target.name,
      sizeMb: target.sizeMb,
      requiredGb: target.requiredGb,
      mineralCost: target.mineralCost || 0,
      gameIndex: target.gameIndex,
    };
  }

  function normalizeGameProgress(unlockedGameIndex, downloadTarget) {
    let unlocked = unlockedGameIndex ?? 0;
    if (unlocked < 0) unlocked = 0;
    unlocked = Math.min(GAME_HUNTING.length - 1, unlocked);
    let nextTarget = null;
    if (downloadTarget && downloadTarget.gameIndex != null) {
      const found = DOWNLOAD_TARGETS.find((t) => t.gameIndex === downloadTarget.gameIndex);
      nextTarget = found || DOWNLOAD_TARGETS.find((t) => t.gameIndex === unlocked + 1) || null;
      if (nextTarget && unlocked >= nextTarget.gameIndex) {
        nextTarget = DOWNLOAD_TARGETS.find((t) => t.gameIndex === unlocked + 1) || null;
      }
    } else if (unlocked < GAME_HUNTING.length - 1) {
      nextTarget = DOWNLOAD_TARGETS.find((t) => t.gameIndex === unlocked + 1) || null;
    }
    return {
      unlockedGameIndex: unlocked,
      downloadTarget: toDownloadTargetSnapshot(nextTarget),
    };
  }

  function validateDownloadStart(parts, unlockedGameIndex, downloadTarget, isDownloading, minerals) {
    if (isDownloading) return { ok: false, reason: '이미 다운로드가 진행 중입니다.' };
    const meta = getDownloadTargetMeta(downloadTarget);
    if (!meta || meta.gameIndex == null) {
      return { ok: false, reason: '다운로드할 게임이 없습니다.' };
    }
    const unlocked = unlockedGameIndex ?? 0;
    if (unlocked !== meta.gameIndex - 1) {
      return { ok: false, reason: '이전 게임을 다운로드한 뒤에만 다음 게임을 받을 수 있습니다.' };
    }
    const storageGb = getStorageCapacityGb(parts && parts.storage);
    if (storageGb < meta.requiredGb) {
      return { ok: false, reason: `저장장치 용량 부족 (필요 ${meta.requiredGb}GB / 현재 ${storageGb}GB)` };
    }
    const cost = meta.mineralCost || 0;
    if ((minerals ?? 0) < cost) {
      return { ok: false, reason: `게임 다운로드에 필요한 자금이 부족합니다. (필요 ${formatMineral(cost)})` };
    }
    return { ok: true, reason: '', mineralCost: cost };
  }

  function calcHuntIncomePerTick(parts, workTaskIndex, unlockedGameIndex, incomeBonusRate, isDownloading, maxUnitsOverride) {
    if (isDownloading) return 0;
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride);
    const game = getGameHunt(unlockedGameIndex);
    if (!game || alloc.activeHuntingUnits <= 0) return 0;
    const bonus = 1 + (incomeBonusRate || 0);
    return Math.round(game.mineralPerUnit * alloc.activeHuntingUnits * bonus);
  }

  function calcWorkIncomePerTick(parts, workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride) {
    const spec = evaluateWorkTaskSpec(parts, workTaskIndex);
    if (!spec.ok || spec.activeWorkUnits <= 0) return 0;
    const task = spec.task;
    return Math.round(
      task.mineralPerUnit * spec.activeWorkUnits *
      (mineralMultiplier || 1) * (rebirthIncomeMult || 1) * (1 + (incomeBonusRate || 0))
    );
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
    MINERAL_PER_COIN, MANWON_MINERALS, REBIRTH_MINERAL_CAP,
    GAME_SPEED_BASE, GAME_SPEED_MAX, GAME_SPEED_FRAME_REF,
    GPU_GRADE_NAMES, GPU_GRADE_ATTACK_FRAMES, GPU_GRADE_BENCHMARK_MULTIPLIERS, DOWNLOAD_BASE_MB,
    INTEL_CPU, AMD_CPU, GPU, RAM, COOLER_AIR, COOLER_WATER, HDD, NVME,
    MOTHERBOARDS, WORK_TASKS, GAME_HUNTING, WORK_HUNTING_GROUNDS, PARTY_HUNTING_TIERS, SCA_SHOP_ITEMS, DOWNLOAD_TARGETS, GPU_RAM_PER_UNIT_GB,
    getPartTable, getMaxLevel, getTier, getUpgradeCost, getUpgradeProbability, getPartName,
    applyTierStats, getCpuCoolingRequired, getCpuCores, convertMineralsToCoins,
    calcRebirthPerformanceScore, calcRebirthStatGain, calcRebirthScaReward,
    calcRebirthStartMinerals, calcRebirthIncomeMultiplier,
    calcIncomeBonus, calcProbBonus,
    REBIRTH_REWARD_TIERS, getRebirthRewardTier, calcRebirthScaRewardByRebirthStat, applyRebirthStatCorrection, calcRebirthOutcome,
    calcGameSpeedFrames, calcGameSpeedWaitFrames, calcGameSpeedMultiplier, calcGameSpeedTickMs, calcIncomeEventIntervalMs,
    calcGpuGrade, calcGpuAttackFrames, calcGpuBenchmarkMultiplier,
    getStorageDownloadMultiplier, calcDownloadSpeedBonus, calcDownloadSpeedMb,
    MAX_RAM_INVENTORY, getShopTierCost, getShopTierCostMinerals, getShopSellPrice, getShopSellPriceMinerals, getShopCatalog, countRamInInventory, canPurchaseRam, buildInventoryPart,
    costToMinerals, formatMineral, formatManwon, getPurchaseCostMinerals,
    getRamCapacityGb, getStorageCapacityGb, getGpuRamPerUnit, getWorkTask, getGameHunt, getDownloadTargetMeta,
    getPartLevel, evaluateWorkTaskSpec, getWorkTaskSpecReason,
    calcRamAllocation, canSelectWorkTask, normalizeGameProgress, validateDownloadStart,
    calcHuntIncomePerTick, calcWorkIncomePerTick, toDownloadTargetSnapshot,
    createIntelCpu11InventoryItem,
  };
})(typeof window !== 'undefined' ? window : globalThis);
