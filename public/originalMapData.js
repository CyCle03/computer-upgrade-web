/**
 * [SCA] 컴퓨터 강화하기 V1.2.9 — 원본 유즈맵 기준 게임 데이터
 * 미네랄 = 원(1:1). tier.cost = 스프레드시트 구매가. "-"=0(강화만), NC=N×천만.
 */
(function (global) {
  const MINERAL_PER_COIN = 10000000;
  const MANWON_MINERALS = 10000;

  /** 스프레드시트 가격 → tier.cost. 숫자=원, NC=N×천만, -=0 */
  function parseSheetPrice(raw) {
    if (raw == null) return 0;
    const s = String(raw).trim().replace(/,/g, '');
    if (s === '' || s === '-') return 0;
    if (s.endsWith('C')) {
      const n = parseFloat(s.slice(0, -1)) || 1;
      return Math.floor(n * MINERAL_PER_COIN);
    }
    return Math.floor(Number(s)) || 0;
  }


  const INTEL_CPU = [
    { level: 1, name: 'Core i5-760', cost: 1, prob: 0.4, cores: 1, perf: 1, cooling: 100 },
    { level: 2, name: 'Core i5-2500K', cost: 0, prob: 0.4, cores: 1, perf: 5, cooling: 200 },
    { level: 3, name: 'Core i5-3570K', cost: 0, prob: 0.3, cores: 1, perf: 25, cooling: 300 },
    { level: 4, name: 'Core i5-4670K', cost: 30, prob: 0.25, cores: 2, perf: 60, cooling: 400 },
    { level: 5, name: 'Core i5-4690', cost: 0, prob: 0.25, cores: 2, perf: 75, cooling: 450 },
    { level: 6, name: 'Core i5-6600K', cost: 0, prob: 0.2, cores: 4, perf: 150, cooling: 600 },
    { level: 7, name: 'Core i5-7600K', cost: 3500, prob: 0.15, cores: 6, perf: 300, cooling: 700 },
    { level: 8, name: 'Core i5-8600K', cost: 0, prob: 0.15, cores: 8, perf: 750, cooling: 800 },
    { level: 9, name: 'Core i5-9600K', cost: 0, prob: 0.1, cores: 10, perf: 1500, cooling: 900 },
    { level: 10, name: 'Core i5-10600K', cost: 2000000, prob: 0.05, cores: 12, perf: 3000, cooling: 1000 },
    { level: 11, name: 'Core i5-11600K', cost: 40000000, prob: 0.05, cores: 12, perf: 5000, cooling: 1200 },
    { level: 12, name: 'Core i5-12600K', cost: 0, prob: 0.05, cores: 14, perf: 12000, cooling: 1600 },
    { level: 13, name: 'Core i5-13600K', cost: 0, prob: 0.05, cores: 16, perf: 18000, cooling: 1800 },
    { level: 14, name: 'Core i5-14600K', cost: 0, prob: 0, cores: 16, perf: 25000, cooling: 2000 },
  ];

  const AMD_CPU = [
    { level: 1, name: 'Ryzen™ 5 1600X', cost: 25000, prob: 0.15, cores: 8, perf: 700, cooling: 500 },
    { level: 2, name: 'Ryzen™ 5 2600X', cost: 0, prob: 0.1, cores: 10, perf: 1250, cooling: 600 },
    { level: 3, name: 'Ryzen™ 5 3600X', cost: 2000000, prob: 0.05, cores: 12, perf: 2500, cooling: 700 },
    { level: 4, name: 'Ryzen™ 5 4600G', cost: 0, prob: 0.05, cores: 12, perf: 4000, cooling: 800 },
    { level: 5, name: 'Ryzen™ 5 5600X', cost: 0, prob: 0.05, cores: 14, perf: 10000, cooling: 900 },
    { level: 6, name: 'Ryzen™ 5 7600X', cost: 0, prob: 0, cores: 16, perf: 18000, cooling: 1100 },
  ];

  /** GPU (gid=0) — generation·등급별 공격력·모델명·성능(엔트리) */
  const GPU = [
    { level: 1, generation: 'GeForce 200', name: 'GeForce 200', cost: 10, prob: 0.2, attackEntry: 2, attackMainstream: 7, attackPerformance: 16, attackHighend: 26, perfEntry: 20, modelEntry: 'GT 240', modelMainstream: 'GTS 250', modelPerformance: 'GTX 260', modelHighend: 'GTX 280' },
    { level: 2, generation: 'GeForce 400', name: 'GeForce 400', cost: 0, prob: 0.15, attackEntry: 5, attackMainstream: 18, attackPerformance: 42, attackHighend: 65, perfEntry: 40, modelEntry: 'GT 430', modelMainstream: 'GTS 450', modelPerformance: 'GTX 460', modelHighend: 'GTX 480' },
    { level: 3, generation: 'GeForce 500', name: 'GeForce 500', cost: 400, prob: 0.1, attackEntry: 20, attackMainstream: 72, attackPerformance: 168, attackHighend: 262, perfEntry: 80, modelEntry: 'GTX 550Ti', modelMainstream: 'GTX 560', modelPerformance: 'GTX 570', modelHighend: 'GTX 580' },
    { level: 4, generation: 'GeForce 600', name: 'GeForce 600', cost: 0, prob: 0.1, attackEntry: 50, attackMainstream: 180, attackPerformance: 420, attackHighend: 655, perfEntry: 150, modelEntry: 'GT 640', modelMainstream: 'GTX 660', modelPerformance: 'GTX 670', modelHighend: 'GTX 680' },
    { level: 5, generation: 'GeForce 700', name: 'GeForce 700', cost: 50000, prob: 0.05, attackEntry: 100, attackMainstream: 360, attackPerformance: 840, attackHighend: 1310, perfEntry: 250, modelEntry: 'GT 740', modelMainstream: 'GTX 760', modelPerformance: 'GTX 770', modelHighend: 'GTX 780' },
    { level: 6, generation: 'GeForce 900', name: 'GeForce 900', cost: 0, prob: 0.05, attackEntry: 200, attackMainstream: 720, attackPerformance: 1680, attackHighend: 2620, perfEntry: 500, modelEntry: 'GTX 950', modelMainstream: 'GTX 960', modelPerformance: 'GTX 970', modelHighend: 'GTX 980' },
    { level: 7, generation: 'GeForce 10', name: 'GeForce 10', cost: 20000000, prob: 0.05, attackEntry: 450, attackMainstream: 1620, attackPerformance: 3780, attackHighend: 5895, perfEntry: 800, modelEntry: 'GTX 1050', modelMainstream: 'GTX 1060', modelPerformance: 'GTX 1070 Ti', modelHighend: 'GTX 1080 Ti' },
    { level: 8, generation: 'GeForce 20', name: 'GeForce 20', cost: 0, prob: 0.05, attackEntry: 1000, attackMainstream: 3600, attackPerformance: 8400, attackHighend: 13100, perfEntry: 1500, modelEntry: 'RTX 2050', modelMainstream: 'RTX 2060 SUPER', modelPerformance: 'RTX 2070 SUPER', modelHighend: 'RTX 2080 Ti' },
    { level: 9, generation: 'GeForce 30', name: 'GeForce 30', cost: 0, prob: 0.02, attackEntry: 2500, attackMainstream: 9000, attackPerformance: 21000, attackHighend: 32750, perfEntry: 3000, modelEntry: 'RTX 3050', modelMainstream: 'RTX 3060 Ti', modelPerformance: 'RTX 3070 Ti', modelHighend: 'RTX 3090 Ti' },
    { level: 10, generation: 'GeForce 40', name: 'GeForce 40', cost: 0, prob: 0, attackEntry: 5000, attackMainstream: 18000, attackPerformance: 42000, attackHighend: 65535, perfEntry: 4500, modelEntry: 'RTX 4050', modelMainstream: 'RTX 4060 Ti', modelPerformance: 'RTX 4070 Ti', modelHighend: 'RTX 4090' },
  ];

  /** 시트「성능 증가량」엔트리 대비 배율 (x2, x5, x12) */
  const GPU_GRADE_PERF_MULT = [1, 2, 5, 12];

  const RAM = [
    { level: 1, name: 'DDR3-1333 (1GB)', cost: 5, prob: 0.3, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' },
    { level: 2, name: 'DDR3-1333 (2GB)', cost: 0, prob: 0.3, clockMhz: 1333, capacityGb: 2, ddrGeneration: 'DDR3' },
    { level: 3, name: 'DDR3-1600 (2GB)', cost: 0, prob: 0.25, clockMhz: 1600, capacityGb: 2, ddrGeneration: 'DDR3' },
    { level: 4, name: 'DDR3-1600 (4GB)', cost: 0, prob: 0.25, clockMhz: 1600, capacityGb: 4, ddrGeneration: 'DDR3' },
    { level: 5, name: 'DDR4-2400 (4GB)', cost: 1000, prob: 0.2, clockMhz: 2400, capacityGb: 4, ddrGeneration: 'DDR4' },
    { level: 6, name: 'DDR4-2400 (8GB)', cost: 0, prob: 0.2, clockMhz: 2400, capacityGb: 8, ddrGeneration: 'DDR4' },
    { level: 7, name: 'DDR4-2666 (8GB)', cost: 0, prob: 0.15, clockMhz: 2666, capacityGb: 8, ddrGeneration: 'DDR4' },
    { level: 8, name: 'DDR4-3200 (8GB)', cost: 0, prob: 0.1, clockMhz: 3200, capacityGb: 8, ddrGeneration: 'DDR4' },
    { level: 9, name: 'DDR4-3200 (16GB)', cost: 0, prob: 0.1, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    { level: 10, name: 'DDR5-4800 (8GB)', cost: 20000000, prob: 0.05, clockMhz: 4800, capacityGb: 8, ddrGeneration: 'DDR5' },
    { level: 11, name: 'DDR5-4800 (16GB)', cost: 0, prob: 0.05, clockMhz: 4800, capacityGb: 16, ddrGeneration: 'DDR5' },
    { level: 12, name: 'DDR5-5600 (16GB)', cost: 0, prob: 0.05, clockMhz: 5600, capacityGb: 16, ddrGeneration: 'DDR5' },
    { level: 13, name: 'DDR5-5600 (32GB)', cost: 0, prob: 0, clockMhz: 5600, capacityGb: 32, ddrGeneration: 'DDR5' },
  ];

  const COOLER_AIR = [
    { level: 1, name: '인텔 기본 번들 (초코파이)', cost: 500, prob: 0.3, coolingCapacity: 500 },
    { level: 2, name: '구리 히트싱크 공랭', cost: 0, prob: 0.25, coolingCapacity: 650 },
    { level: 3, name: '보급형 타워 싱글팬', cost: 0, prob: 0.2, coolingCapacity: 800 },
    { level: 4, name: '듀얼타워 대장급 (NH-D15)', cost: 0, prob: 0.2, coolingCapacity: 950 },
    { level: 5, name: '듀얼타워 RGB 공랭', cost: 0, prob: 0, coolingCapacity: 1100 },
  ];

  const COOLER_WATER = [
    { level: 1, name: '120mm 1열 수랭', cost: 300000, prob: 0.15, coolingCapacity: 1200 },
    { level: 2, name: '240mm 2열 AIO', cost: 0, prob: 0.15, coolingCapacity: 1400 },
    { level: 3, name: '360mm 3열 RGB 수랭', cost: 0, prob: 0.1, coolingCapacity: 1600 },
    { level: 4, name: '커스텀 수로 오픈형', cost: 0, prob: 0.05, coolingCapacity: 1800 },
    { level: 5, name: '외장 MORA 라디에이터', cost: 0, prob: 0, coolingCapacity: 2000 },
  ];

  const HDD = [
    { level: 1, name: 'HDD 60GB', cost: 50000, prob: 0.2, capacityGb: 60, storageType: 'HDD' },
    { level: 2, name: 'HDD 250GB', cost: 0, prob: 0.15, capacityGb: 250, storageType: 'HDD' },
    { level: 3, name: 'HDD 500GB', cost: 0, prob: 0.1, capacityGb: 500, storageType: 'HDD' },
    { level: 4, name: 'HDD 1TB', cost: 0, prob: 0, capacityGb: 1000, storageType: 'HDD' },
  ];

  const NVME = [
    { level: 1, name: 'M.2 NVMe 250GB', cost: 3000000, prob: 0.15, capacityGb: 250, storageType: 'SSD' },
    { level: 2, name: 'M.2 NVMe 500GB', cost: 0, prob: 0.1, capacityGb: 500, storageType: 'SSD' },
    { level: 3, name: 'M.2 NVMe 1TB', cost: 0, prob: 0.05, capacityGb: 1000, storageType: 'SSD' },
    { level: 4, name: 'M.2 NVMe 2TB', cost: 0, prob: 0, capacityGb: 2000, storageType: 'SSD' },
  ];

  const MOTHERBOARDS = [
    { name: '인텔 P55', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 0, cost: 1 },
    { name: '인텔 B75', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 5, cost: 10 },
    { name: '인텔 H87', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 30, cost: 150 },
    { name: '인텔 H270', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 100, cost: 3000 },
    { name: '인텔 H370', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 300, cost: 100000 },
    { name: 'AMD A320', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 300, cost: 100000 },
    { name: '인텔 Z390', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 1000, cost: 1500000 },
    { name: '인텔 H570', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 2000, cost: 20000000 },
    { name: 'AMD B550', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 2000, cost: 20000000 },
    { name: '인텔 Z590', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 3500, cost: 300000000 },
    { name: 'AMD X570', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR4', shieldIncrease: 3500, cost: 300000000 },
    { name: '인텔 H770', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 5000, cost: 5000000000 },
    { name: '인텔 Z790', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 8000, cost: 25000000000 },
    { name: 'AMD X670E', socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 8000, cost: 25000000000 },
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

  /** 환생 미네랄 SCA 가격: +10원당 500 SCA 코인 고정 */
  const REBIRTH_MINERAL_SCA_PER_10 = 500;

  const SCA_SHOP_ITEMS = [
    { id: 'rebirthMineral500', name: '환생 시작 미네랄 +500', mineralBonus: 500, maxPurchases: 1 },
    { id: 'rebirthMineralMax200', name: '환생 미네랄 +200', mineralBonus: 200, maxPurchases: 5 },
    { id: 'rebirthMineralMax2000', name: '환생 미네랄 +2,000', mineralBonus: 2000, maxPurchases: 3 },
    { id: 'rebirthMineralMax7500', name: '환생 미네랄 +7,500', mineralBonus: 7500, maxPurchases: 2 },
    { id: 'huntIncome1', name: '사냥터 수입 +1%', cost: 12000, maxPurchases: 10 },
    { id: 'gameSpeed1', name: '게임 배속 +1프레임', cost: 25000, maxPurchases: 12 },
    { id: 'upgradeProb01', name: '강화 확률 +0.1%', cost: 30000, maxPurchases: 10 },
    { id: 'downloadSpeed10', name: '다운로드 속도 +10%', cost: 35000, maxPurchases: 10 },
    { id: 'gpuGradeUp', name: 'GPU 등급 상승', cost: 40000, maxPurchases: 3 },
  ];

  function getScaShopItemCost(item) {
    if (item && item.mineralBonus) {
      return Math.floor((item.mineralBonus / 10) * REBIRTH_MINERAL_SCA_PER_10);
    }
    return item && item.cost != null ? item.cost : 0;
  }

  function getScaShopItemDisplayName(item, scaUpgrades) {
    if (!item) return '';
    if (item.id === 'gpuGradeUp') {
      const cur = getGpuGradeLevel(scaUpgrades);
      if (cur >= GPU_GRADE_NAMES.length - 1) return 'GPU 등급 (하이엔드 달성)';
      const from = GPU_GRADE_NAMES[cur];
      const to = GPU_GRADE_NAMES[cur + 1];
      return `GPU 등급: ${from} → ${to}`;
    }
    return item.name;
  }

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

  /** 램 슬롯 구매 (시트) — 장착 1개 = 슬롯 수만큼 동일 램 효과 */
  const RAM_SLOT_UPGRADES = [
    { slots: 2, cost: 5000 },
    { slots: 4, cost: 500000 },
  ];
  const DEFAULT_RAM_SLOTS = 1;

  const SHOP_PURCHASABLE_LEVELS = {
    cpu: { Intel: [1, 4, 7, 10, 11], AMD: [1, 3] },
    gpu: [1, 3, 5, 7],
    ram: [1, 5, 10],
    cooler: [1],
    storage: [1],
  };

  function getShopTierCost(type, level, part) {
    const tier = getTier(type, part, level);
    return tier && tier.cost != null ? tier.cost : Infinity;
  }

  function getShopSellPrice(type, level, part) {
    const cost = getShopTierCost(type, level, part);
    return cost === Infinity ? 0 : Math.floor(cost * 0.5);
  }

  /** 부품(변형 포함)별 직접 구매 가능한 강 목록 */
  function getPurchasableLevels(type, part) {
    const maxLevel = getMaxLevel(type, part);
    let levels = SHOP_PURCHASABLE_LEVELS[type];
    if (levels && !Array.isArray(levels)) {
      const key = type === 'cpu' ? ((part && part.manufacturer) || 'Intel') : null;
      levels = (key != null && levels[key]) || [];
    }
    if (!levels) return [];
    return levels.filter((lv) => lv >= 1 && lv <= maxLevel);
  }

  /** 부품별 직접 구매 가능한 최고 강 (안내 메시지용) */
  function getPurchasableMaxLevel(type, part) {
    const levels = getPurchasableLevels(type, part);
    return levels.length ? Math.max.apply(null, levels) : 0;
  }

  /** 해당 강을 상점에서 직접 구매할 수 있는지 */
  function isPurchasableLevel(type, level, part) {
    return getPurchasableLevels(type, part).indexOf(level) !== -1;
  }

  function getShopCatalog(type, part) {
    const buyable = getPurchasableLevels(type, part);
    return getPartTable(type, part).map((row) => ({
      level: row.level,
      name: row.name,
      costC: row.cost,
      costMinerals: Math.max(0, Math.floor(row.cost || 0)),
      prob: row.prob,
      cores: row.cores,
      cooling: row.cooling,
      capacityGb: row.capacityGb,
      purchasable: buyable.indexOf(row.level) !== -1,
    }));
  }

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

  function countRamInInventory(inventory) {
    return (inventory || []).filter((p) => p.type === 'ram').length;
  }

  function canPurchaseRam() {
    return true;
  }

  function buildInventoryPart(type, level, partMeta) {
    const meta = Object.assign({ type }, partMeta || {});
    const id = `inv-${type}-${Math.random().toString(36).substring(2, 9)}`;
    let newPart = { id, type, level };
    if (type === 'cpu') {
      const t = getTier('cpu', meta, level);
      newPart.manufacturer = meta.manufacturer || 'Intel';
      newPart.ddrGeneration = getCpuRequiredDdrGeneration(newPart);
      if (t && t.name) newPart.name = t.name;
    } else if (type === 'gpu') {
      const t = getTier('gpu', meta, level);
      if (t) {
        newPart.generation = t.generation || t.name;
        newPart.name = getGpuModelName(t, 0);
      }
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

  function getPartName(type, level, part, scaUpgrades) {
    if (type === 'gpu') return getGpuDisplayName(level, part, scaUpgrades);
    const tier = getTier(type, part, level);
    return tier ? tier.name : type.toUpperCase() + ' Lv.' + level;
  }

  function applyTierStats(part, nextLevel) {
    const tier = getTier(part.type, part, nextLevel);
    if (!tier) return part;
    const upgraded = Object.assign({}, part, { level: nextLevel });
    if (part.type === 'cpu') {
      upgraded.ddrGeneration = getCpuRequiredDdrGeneration(upgraded);
    } else if (part.type === 'gpu') {
      upgraded.generation = tier.generation || tier.name;
      upgraded.name = getGpuModelName(tier, 0);
    } else if (part.type === 'ram') {
      upgraded.clockMhz = tier.clockMhz;
      upgraded.capacityGb = tier.capacityGb;
      upgraded.ddrGeneration = tier.ddrGeneration;
    } else if (part.type === 'cooler') {
      upgraded.coolingCapacity = tier.coolingCapacity;
      upgraded.coolerKind = part.coolerKind || upgraded.coolerKind || 'air';
    } else if (part.type === 'storage') {
      upgraded.capacityGb = tier.capacityGb;
      upgraded.storageType = tier.storageType;
      upgraded.storageKind = part.storageKind || (tier.storageType === 'SSD' ? 'nvme' : 'hdd');
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
    let total = 0;
    SCA_SHOP_ITEMS.forEach((item) => {
      if (item.mineralBonus) {
        total += (u[item.id] || 0) * item.mineralBonus;
      }
    });
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

  /**
   * 자동 구매·강화 루프 주기(ms). SCA 배속이 높을수록 짧아짐.
   * 구버전 650ms+600ms ≈ 0.8회/초 → 배속3 기준 약 8~12회/초 목표.
   */

  /** 백그라운드 탭: 경과 시간을 게임 틱 수로 변환 (remainderMs는 다음 누적용) */
  function consumeElapsedTicks(elapsedMs, tickMs, maxTicks) {
    const cap = maxTicks == null ? 120000 : maxTicks;
    if (!tickMs || tickMs <= 0 || elapsedMs <= 0) return { ticks: 0, remainderMs: elapsedMs };
    let ticks = Math.floor(elapsedMs / tickMs);
    if (ticks > cap) ticks = cap;
    return { ticks, remainderMs: elapsedMs - ticks * tickMs };
  }

  function calcAutoLoopIntervalMs(scaUpgrades) {
    const mult = calcGameSpeedMultiplier(scaUpgrades);
    return Math.max(22, Math.round(90 / mult));
  }

  /** 수동 강화 버튼 연출용 지연(ms) */
  function calcManualUpgradeDelayMs() {
    return 100;
  }

  function calcGpuBenchmarkMultiplier(scaUpgrades) {
    return GPU_GRADE_BENCHMARK_MULTIPLIERS[calcGpuGrade(scaUpgrades)] || 1;
  }

  function getGpuGradeLevel(scaUpgrades) {
    const u = scaUpgrades || {};
    if (typeof u.gpuGradeLevel === 'number') {
      return Math.max(0, Math.min(GPU_GRADE_NAMES.length - 1, u.gpuGradeLevel));
    }
    if (u.gpuGradeUp) {
      return Math.min(GPU_GRADE_NAMES.length - 1, typeof u.gpuGradeUp === 'number' ? u.gpuGradeUp : GPU_GRADE_NAMES.length - 1);
    }
    return 0;
  }

  function calcGpuGrade(scaUpgrades) {
    return getGpuGradeLevel(scaUpgrades);
  }

  function canPurchaseGpuGradeUp(scaUpgrades) {
    return getGpuGradeLevel(scaUpgrades) < GPU_GRADE_NAMES.length - 1;
  }

  function calcGpuAttackFrames(scaUpgrades) {
    return GPU_GRADE_ATTACK_FRAMES[calcGpuGrade(scaUpgrades)];
  }


  function normalizeEquippedStorage(storage) {
    if (!storage) return { type: 'HDD', capacityGb: 60, level: 1, storageKind: 'hdd' };
    const legacyType = storage.type || storage.storageType;
    const storageKind = storage.storageKind || (legacyType === 'SSD' ? 'nvme' : 'hdd');
    const type = legacyType || (storageKind === 'nvme' ? 'SSD' : 'HDD');
    return Object.assign({}, storage, { storageKind, type });
  }

  function normalizeEquippedCooler(cooler) {
    if (!cooler) return { level: 1, coolingCapacity: 500, coolerKind: 'air' };
    return Object.assign({}, cooler, { coolerKind: cooler.coolerKind || 'air' });
  }

  function getStorageDownloadMultiplier(storage) {
    const kind = storage && (storage.storageKind || (storage.type === 'SSD' ? 'nvme' : 'hdd'));
    return kind === 'nvme' || kind === 'ssd' || (storage && storage.type === 'SSD') ? 4 : 1;
  }

  function calcDownloadSpeedBonus(scaUpgrades) {
    return 1 + (scaUpgrades.downloadSpeed10 || 0) * 0.1;
  }

  function calcDownloadSpeedMb(storage, scaUpgrades) {
    // 원작 §3.8: 다운로드 속도는 드라이브 종류 배수(HDD x1 / SSD·NVMe x4)와
    // SCA '다운로드 속도 +10%' 업그레이드에만 비례한다. 용량(capacityGb)이나
    // 강화 레벨에 의한 속도 가산은 원작에 없으므로 적용하지 않는다.
    return Math.round(DOWNLOAD_BASE_MB * getStorageDownloadMultiplier(storage) * calcDownloadSpeedBonus(scaUpgrades || {}) * 10) / 10;
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

  function getRamSlotCount(ramSlots) {
    const n = Number(ramSlots) || DEFAULT_RAM_SLOTS;
    if (n >= 4) return 4;
    if (n >= 2) return 2;
    return 1;
  }

  function getRamEffectiveCapacityGb(ram, ramSlots) {
    return getRamCapacityGb(ram) * getRamSlotCount(ramSlots);
  }

  function getRamSlotUpgradeCost(targetSlots) {
    const row = RAM_SLOT_UPGRADES.find((u) => u.slots === targetSlots);
    return row ? row.cost : null;
  }

  function canPurchaseRamSlotUpgrade(currentSlots, targetSlots) {
    const cur = getRamSlotCount(currentSlots);
    const tgt = getRamSlotCount(targetSlots);
    return tgt > cur && RAM_SLOT_UPGRADES.some((u) => u.slots === tgt);
  }

  function validateRamSlotPurchase(currentSlots, targetSlots, minerals) {
    if (!canPurchaseRamSlotUpgrade(currentSlots, targetSlots)) {
      return { ok: false, reason: '이미 보유한 슬롯이거나 구매할 수 없는 단계입니다.' };
    }
    const cost = getRamSlotUpgradeCost(targetSlots);
    if ((minerals ?? 0) < cost) {
      return { ok: false, reason: `미네랄 부족 (필요 ${formatMineral(cost)} · 보유 ${formatMineral(minerals ?? 0)})` };
    }
    return { ok: true, cost, newSlots: getRamSlotCount(targetSlots) };
  }

  function getRamCapacityGb(ram) {
    return (ram && ram.capacityGb) || 1;
  }

  function getStorageCapacityGb(storage) {
    return (storage && storage.capacityGb) || 60;
  }


  const GPU_ATTACK_KEYS = ['attackEntry', 'attackMainstream', 'attackPerformance', 'attackHighend'];
  const GPU_MODEL_KEYS = ['modelEntry', 'modelMainstream', 'modelPerformance', 'modelHighend'];

  function getGpuTierAttack(tier, gradeIndex) {
    if (!tier) return 1;
    const idx = Math.max(0, Math.min(GPU_ATTACK_KEYS.length - 1, gradeIndex || 0));
    return tier[GPU_ATTACK_KEYS[idx]] != null ? tier[GPU_ATTACK_KEYS[idx]] : tier.attackEntry || 1;
  }

  function getGpuModelName(tier, gradeIndex) {
    if (!tier) return '';
    const idx = Math.max(0, Math.min(GPU_MODEL_KEYS.length - 1, gradeIndex || 0));
    return tier[GPU_MODEL_KEYS[idx]] || tier.modelEntry || tier.generation || tier.name || '';
  }

  function getGpuDisplayName(level, part, scaUpgrades) {
    const tier = getTier('gpu', part, level);
    if (!tier) return 'GPU +' + level + '강';
    const grade = scaUpgrades != null ? calcGpuGrade(scaUpgrades) : 0;
    const model = getGpuModelName(tier, grade);
    return model || ('GPU +' + level + '강');
  }

  function getGpuAttackPower(gpu, scaUpgrades) {
    const tier = getTier('gpu', gpu, (gpu && gpu.level) || 1);
    return getGpuTierAttack(tier, calcGpuGrade(scaUpgrades || {}));
  }

  function perfToGuideRamGb(perf) {
    if (perf <= 25) return 1;
    if (perf <= 150) return 2;
    if (perf <= 750) return 4;
    if (perf <= 3000) return 8;
    if (perf <= 12000) return 16;
    return 32;
  }

  function getGpuRamPerUnit(gpu, scaUpgrades) {
    const tier = getTier('gpu', gpu, (gpu && gpu.level) || 1);
    const perf = (tier && tier.perfEntry) || 20;
    const mult = GPU_GRADE_PERF_MULT[calcGpuGrade(scaUpgrades || {})] || 1;
    return perfToGuideRamGb(perf * mult);
  }

  /** Intel: 6강+ DDR4, 12강+ DDR5 · AMD: 1강+ DDR4, 6강+ DDR5 (시트 비고) */
  function getCpuRequiredDdrGeneration(cpu) {
    const level = Math.max(1, (cpu && cpu.level) || 1);
    const manufacturer = (cpu && cpu.manufacturer) || 'Intel';
    if (manufacturer === 'AMD') {
      return level >= 6 ? 'DDR5' : 'DDR4';
    }
    if (level >= 12) return 'DDR5';
    if (level >= 6) return 'DDR4';
    return 'DDR3';
  }

  /** 게임 사냥 1기당 RAM(GB) — CPU 성능 1 / 2 / 4GB 구간만 (고성능도 4GB 상한) */
  function getCpuHuntRamPerUnitGb(cpu) {
    const tier = getTier('cpu', cpu, (cpu && cpu.level) || 1);
    const perf = (tier && tier.perf) || 1;
    if (perf <= 75) return 1;
    if (perf <= 750) return 2;
    return 4;
  }

  /** 다운로드 완료 게임 requiredGb 합산 (gameIndex 1~unlocked) */
  function calcStorageUsedGb(unlockedGameIndex) {
    const unlocked = unlockedGameIndex ?? 0;
    if (unlocked <= 0) return 0;
    return DOWNLOAD_TARGETS.reduce((sum, t) => {
      if (t.gameIndex != null && t.gameIndex <= unlocked) {
        return sum + (t.requiredGb || 0);
      }
      return sum;
    }, 0);
  }

  function getStorageFreeGb(storage, unlockedGameIndex) {
    const cap = getStorageCapacityGb(storage);
    return Math.max(0, cap - calcStorageUsedGb(unlockedGameIndex));
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
    const ramSlots = (parts && parts.ramSlots) != null ? parts.ramSlots : DEFAULT_RAM_SLOTS;
    const ramGb = getRamEffectiveCapacityGb(ram, ramSlots);
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
  function calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride, scaUpgrades) {
    const ramSlots = (parts && parts.ramSlots) != null ? parts.ramSlots : DEFAULT_RAM_SLOTS;
    const totalRam = getRamEffectiveCapacityGb(parts && parts.ram, ramSlots);
    const maxByCpu = maxUnitsOverride != null ? maxUnitsOverride : getCpuCores(parts && parts.cpu);
    const workSpec = evaluateWorkTaskSpec(parts, workTaskIndex);
    const work = workSpec.task;
    const maxWorkUnits = workSpec.ok ? workSpec.activeWorkUnits : 0;
    const activeWorkUnits = workUnitsOverride != null
      ? Math.max(0, Math.min(workUnitsOverride, maxWorkUnits))
      : maxWorkUnits;
    const workRamUsed = workSpec.ok
      ? activeWorkUnits * (work.ramPerUnitGb || 1)
      : (work.requiredRamGb || 0);
    const huntRamFree = Math.max(0, totalRam - workRamUsed);
    const huntRamPerUnit = getCpuHuntRamPerUnitGb(parts && parts.cpu);
    const gpuRamPerUnit = getGpuRamPerUnit(parts && parts.gpu, scaUpgrades);
    const maxByRam = huntRamPerUnit > 0 ? Math.floor(huntRamFree / huntRamPerUnit) : 0;
    const activeHuntingUnits = Math.max(0, Math.min(maxByRam, maxByCpu));
    return {
      totalRam,
      ramSlots: getRamSlotCount(ramSlots),
      workRamUsed,
      huntRamFree,
      huntRamPerUnit,
      ramPerUnit: huntRamPerUnit,
      gpuRamPerUnit,
      maxByRam,
      maxByCpu,
      activeHuntingUnits,
      activeWorkUnits,
      maxWorkUnits,
      canRunWork: workSpec.ok && activeWorkUnits > 0,
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
    const usedGb = calcStorageUsedGb(unlocked);
    const freeGb = getStorageFreeGb(parts && parts.storage, unlocked);
    if (freeGb < meta.requiredGb) {
      return {
        ok: false,
        reason: `저장장치 여유 부족 (이번 게임 ${meta.requiredGb}GB 필요 · 여유 ${freeGb}GB / 사용 ${usedGb}GB / 전체 ${storageGb}GB)`,
      };
    }
    const cost = meta.mineralCost || 0;
    if ((minerals ?? 0) < cost) {
      return { ok: false, reason: `게임 다운로드에 필요한 자금이 부족합니다. (필요 ${formatMineral(cost)})` };
    }
    return { ok: true, reason: '', mineralCost: cost, storageUsedGb: usedGb, storageFreeGb: freeGb, storageCapacityGb: storageGb };
  }

  function calcHuntIncomePerTick(parts, workTaskIndex, unlockedGameIndex, incomeBonusRate, isDownloading, maxUnitsOverride, workUnitsOverride) {
    if (isDownloading) return 0;
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    const game = getGameHunt(unlockedGameIndex);
    if (!game || alloc.activeHuntingUnits <= 0) return 0;
    const bonus = 1 + (incomeBonusRate || 0);
    return Math.round(game.mineralPerUnit * alloc.activeHuntingUnits * bonus);
  }

  function calcWorkIncomePerTick(parts, workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride, workUnitsOverride) {
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    if (!alloc.canRunWork || alloc.activeWorkUnits <= 0) return 0;
    const task = getWorkTask(workTaskIndex);
    return Math.round(
      task.mineralPerUnit * alloc.activeWorkUnits *
      (mineralMultiplier || 1) * (rebirthIncomeMult || 1) * (1 + (incomeBonusRate || 0))
    );
  }

  /** 작업·사냥 합산 틱 수입이 최대가 되도록 작업 유닛 수 탐색 */
  function calcOptimalWorkUnits(parts, workTaskIndex, unlockedGameIndex, maxUnitsOverride, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading) {
    const spec = evaluateWorkTaskSpec(parts, workTaskIndex);
    const maxW = spec.ok ? spec.activeWorkUnits : 0;
    if (maxW <= 0) return 0;
    let bestUnits = 0;
    let bestTotal = -1;
    for (let w = 0; w <= maxW; w++) {
      const workInc = calcWorkIncomePerTick(parts, workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride, w);
      const huntInc = calcHuntIncomePerTick(parts, workTaskIndex, unlockedGameIndex, incomeBonusRate, isDownloading, maxUnitsOverride, w);
      const total = workInc + huntInc;
      if (total > bestTotal) {
        bestTotal = total;
        bestUnits = w;
      }
    }
    return bestUnits;
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
    MINERAL_PER_COIN, MANWON_MINERALS, parseSheetPrice, REBIRTH_MINERAL_CAP,
    GAME_SPEED_BASE, GAME_SPEED_MAX, GAME_SPEED_FRAME_REF,
    GPU_GRADE_NAMES, GPU_GRADE_ATTACK_FRAMES, GPU_GRADE_BENCHMARK_MULTIPLIERS, DOWNLOAD_BASE_MB,
    INTEL_CPU, AMD_CPU, GPU, RAM, COOLER_AIR, COOLER_WATER, HDD, NVME,
    MOTHERBOARDS, WORK_TASKS, GAME_HUNTING, WORK_HUNTING_GROUNDS, PARTY_HUNTING_TIERS, SCA_SHOP_ITEMS, DOWNLOAD_TARGETS, GPU_GRADE_PERF_MULT,
    getPartTable, getMaxLevel, getTier, getUpgradeCost, getUpgradeProbability, getPartName,
    applyTierStats, getCpuCoolingRequired, getCpuCores, convertMineralsToCoins,
    calcRebirthPerformanceScore, calcRebirthStatGain, calcRebirthScaReward,
    calcRebirthStartMinerals, calcRebirthIncomeMultiplier,
    calcIncomeBonus, calcProbBonus,
    REBIRTH_REWARD_TIERS, getRebirthRewardTier, calcRebirthScaRewardByRebirthStat, applyRebirthStatCorrection, calcRebirthOutcome,
    calcGameSpeedFrames, calcGameSpeedWaitFrames, calcGameSpeedMultiplier, calcGameSpeedTickMs, calcIncomeEventIntervalMs, consumeElapsedTicks, calcAutoLoopIntervalMs, calcManualUpgradeDelayMs,
    REBIRTH_MINERAL_SCA_PER_10, getScaShopItemCost, getScaShopItemDisplayName, getGpuGradeLevel, canPurchaseGpuGradeUp, calcGpuGrade, calcGpuAttackFrames, calcGpuBenchmarkMultiplier,
    normalizeEquippedStorage, normalizeEquippedCooler, getStorageDownloadMultiplier, calcDownloadSpeedBonus, calcDownloadSpeedMb,
    RAM_SLOT_UPGRADES, DEFAULT_RAM_SLOTS, getRamSlotCount, getRamEffectiveCapacityGb, getRamSlotUpgradeCost, canPurchaseRamSlotUpgrade, validateRamSlotPurchase,
    SHOP_PURCHASABLE_LEVELS, getShopTierCost, getShopTierCostMinerals, getShopSellPrice, getShopSellPriceMinerals, getShopCatalog, getPurchasableLevels, getPurchasableMaxLevel, isPurchasableLevel, countRamInInventory, canPurchaseRam, buildInventoryPart,
    costToMinerals, formatMineral, formatManwon, getPurchaseCostMinerals,
    getRamCapacityGb, getRamEffectiveCapacityGb, getRamSlotCount, getRamSlotUpgradeCost, canPurchaseRamSlotUpgrade, validateRamSlotPurchase, getStorageCapacityGb, getGpuRamPerUnit, getGpuDisplayName, getGpuModelName, getGpuAttackPower, getGpuTierAttack, getCpuRequiredDdrGeneration, getCpuHuntRamPerUnitGb,
    calcStorageUsedGb, getStorageFreeGb,
    getWorkTask, getGameHunt, getDownloadTargetMeta,
    getPartLevel, evaluateWorkTaskSpec, getWorkTaskSpecReason,
    calcRamAllocation, canSelectWorkTask, normalizeGameProgress, validateDownloadStart,
    calcHuntIncomePerTick, calcWorkIncomePerTick, calcOptimalWorkUnits, toDownloadTargetSnapshot,
    createIntelCpu11InventoryItem,
  };
})(typeof window !== 'undefined' ? window : globalThis);
