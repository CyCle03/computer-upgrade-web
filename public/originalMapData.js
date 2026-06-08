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

  /** RAM — 시트 공속(프레임)·성능(1개)·오버클럭 분기. variant: standard | overclock */
  const RAM = [
    { level: 1, variant: 'standard', name: 'DDR3-1333 (1GB)', cost: 5, prob: 0.3, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3', attackSpeed: 48, perfPerUnit: 10 },
    { level: 2, variant: 'standard', name: 'DDR3-1333 (2GB)', cost: 0, prob: 0.3, clockMhz: 1333, capacityGb: 2, ddrGeneration: 'DDR3', attackSpeed: 48, perfPerUnit: 10 },
    { level: 3, variant: 'standard', name: 'DDR3-1600 (2GB)', cost: 0, prob: 0.25, clockMhz: 1600, capacityGb: 2, ddrGeneration: 'DDR3', attackSpeed: 44, perfPerUnit: 50 },
    { level: 4, variant: 'standard', name: 'DDR3-1600 (4GB)', cost: 0, prob: 0.25, clockMhz: 1600, capacityGb: 4, ddrGeneration: 'DDR3', attackSpeed: 44, perfPerUnit: 50 },
    { level: 5, variant: 'standard', name: 'DDR4-2400 (4GB)', cost: 1000, prob: 0.2, clockMhz: 2400, capacityGb: 4, ddrGeneration: 'DDR4', attackSpeed: 36, perfPerUnit: 200 },
    { level: 6, variant: 'standard', name: 'DDR4-2400 (8GB)', cost: 0, prob: 0.2, clockMhz: 2400, capacityGb: 8, ddrGeneration: 'DDR4', attackSpeed: 36, perfPerUnit: 200 },
    { level: 7, variant: 'standard', name: 'DDR4-2666 (8GB)', cost: 0, prob: 0.15, clockMhz: 2666, capacityGb: 8, ddrGeneration: 'DDR4', attackSpeed: 32, perfPerUnit: 300 },
    { level: 8, variant: 'standard', name: 'DDR4-3200 (8GB)', cost: 0, prob: 0.1, clockMhz: 3200, capacityGb: 8, ddrGeneration: 'DDR4', attackSpeed: 28, perfPerUnit: 500 },
    { level: 9, variant: 'standard', name: 'DDR4-3200 (16GB)', cost: 0, prob: 0.1, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4', attackSpeed: 28, perfPerUnit: 500 },
    { level: 9, variant: 'overclock', name: 'DDR4 OC-4000 (16GB)', cost: 0, prob: 0, clockMhz: 4000, capacityGb: 16, ddrGeneration: 'DDR4', attackSpeed: 24, perfPerUnit: 800 },
    { level: 10, variant: 'standard', name: 'DDR5-4800 (8GB)', cost: 20000000, prob: 0.05, clockMhz: 4800, capacityGb: 8, ddrGeneration: 'DDR5', attackSpeed: 20, perfPerUnit: 1500 },
    { level: 11, variant: 'standard', name: 'DDR5-4800 (16GB)', cost: 0, prob: 0.05, clockMhz: 4800, capacityGb: 16, ddrGeneration: 'DDR5', attackSpeed: 20, perfPerUnit: 1500 },
    { level: 12, variant: 'standard', name: 'DDR5-5600 (16GB)', cost: 0, prob: 0.05, clockMhz: 5600, capacityGb: 16, ddrGeneration: 'DDR5', attackSpeed: 16, perfPerUnit: 2200 },
    { level: 13, variant: 'standard', name: 'DDR5-5600 (32GB)', cost: 0, prob: 0, clockMhz: 5600, capacityGb: 32, ddrGeneration: 'DDR5', attackSpeed: 16, perfPerUnit: 2200 },
    { level: 13, variant: 'overclock', ocStep: 1, name: 'DDR5 OC-6000 (32GB)', cost: 0, prob: 0, clockMhz: 6000, capacityGb: 32, ddrGeneration: 'DDR5', attackSpeed: 12, perfPerUnit: 3000 },
    { level: 13, variant: 'overclock', ocStep: 2, name: 'DDR5 OC-7200 (32GB)', cost: 0, prob: 0, clockMhz: 7200, capacityGb: 32, ddrGeneration: 'DDR5', attackSpeed: 10, perfPerUnit: 4000 },
    { level: 13, variant: 'overclock', ocStep: 3, name: 'DDR5 OC-8000 (32GB)', cost: 0, prob: 0, clockMhz: 8000, capacityGb: 32, ddrGeneration: 'DDR5', attackSpeed: 8, perfPerUnit: 5000 },
  ];

  function getRamStandardTable() {
    return RAM.filter((row) => (row.variant || 'standard') === 'standard');
  }

  let _scaUpgradesRef = {};
  function setScaUpgradesRef(ref) {
    _scaUpgradesRef = ref || {};
  }

  function getRamTierRow(part, level) {
    const lv = level != null ? level : ((part && part.level) || 1);
    let variant = (part && part.ramVariant) || 'standard';
    let step = part && part.ramOcStep;
    let mhz = part && part.clockMhz;

    // 장착된 RAM이 standard 상태일 때 영구 오버클럭 라이선스가 존재하면 오버클럭 스펙으로 치환
    if (variant === 'standard') {
      if (lv === 9 && _scaUpgradesRef.ddr4Overclocked) {
        variant = 'overclock';
      } else if (lv === 13 && _scaUpgradesRef.ddr5OverclockedStep > 0) {
        variant = 'overclock';
        step = _scaUpgradesRef.ddr5OverclockedStep;
      }
    }

    if (variant === 'overclock') {
      const ocRows = RAM.filter((row) => row.level === lv && row.variant === 'overclock');
      if (lv === 13 && ocRows.length) {
        if (step) {
          const byStep = ocRows.find((row) => row.ocStep === step);
          if (byStep) return byStep;
        }
        if (mhz) {
          const byClock = ocRows.find((row) => row.clockMhz === mhz);
          if (byClock) return byClock;
        }
        return ocRows[0];
      }
      if (ocRows.length) return ocRows[0];
    }
    return RAM.find((row) => row.level === lv && (row.variant || 'standard') === 'standard')
      || RAM.find((row) => row.level === lv)
      || RAM[RAM.length - 1];
  }

  function getRamMaxLevel() {
    return getRamStandardTable().reduce((max, row) => Math.max(max, row.level), 1);
  }

  function getRamPerfPerUnit(ram) {
    const tier = getRamTierRow(ram, (ram && ram.level) || 1);
    return tier && tier.perfPerUnit != null ? tier.perfPerUnit : 10;
  }

  function applyRamOverclock(part, ocStep) {
    if (!part || part.type !== 'ram') return part;
    const lv = part.level;
    if (lv !== 9 && lv !== 13) return part;
    const ocRows = RAM.filter((row) => row.level === lv && row.variant === 'overclock');
    if (!ocRows.length) return part;
    let tier = ocRows[0];
    if (lv === 13 && ocStep != null) {
      tier = ocRows.find((row) => row.ocStep === ocStep) || ocRows[ocRows.length - 1];
    }
    return Object.assign({}, part, {
      ramVariant: 'overclock',
      ramOcStep: tier.ocStep || 1,
      clockMhz: tier.clockMhz,
      capacityGb: tier.capacityGb,
      ddrGeneration: tier.ddrGeneration,
    });
  }


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

  /**
   * 작업(Work) 11단계 — 원작 맵 UI 순서·[NGB] RAM 요구.
   * requiredRamGb/ramPerUnitGb만 배치에 사용. requiredGpuLevel 등은 참고용(선택 잠금에 미사용).
   */
  const WORK_TASKS = [
    { name: '간단한 문서작업', taskIndex: 0, ramPerUnitGb: 1, mineralPerUnit: 1, requiredRamGb: 1, requiredGpuLevel: 1, requiredRamLevel: 1, requiredCpuCores: 1, requiredShield: 0 },
    { name: 'PPT 제작', taskIndex: 1, ramPerUnitGb: 1, mineralPerUnit: 2, requiredRamGb: 1, requiredGpuLevel: 1, requiredRamLevel: 1, requiredCpuCores: 1, requiredShield: 0 },
    { name: '포토샵', taskIndex: 2, ramPerUnitGb: 1, mineralPerUnit: 5, requiredRamGb: 2, requiredGpuLevel: 1, requiredRamLevel: 2, requiredCpuCores: 1, requiredShield: 0 },
    { name: '간단한 편집', taskIndex: 3, ramPerUnitGb: 1, mineralPerUnit: 8, requiredRamGb: 4, requiredGpuLevel: 2, requiredRamLevel: 2, requiredCpuCores: 1, requiredShield: 0 },
    { name: '2D 그래픽 작업', taskIndex: 4, ramPerUnitGb: 1, mineralPerUnit: 10, requiredRamGb: 4, requiredGpuLevel: 2, requiredRamLevel: 3, requiredCpuCores: 1, requiredShield: 0 },
    { name: '간단한 AI 작업', taskIndex: 5, ramPerUnitGb: 2, mineralPerUnit: 30, requiredRamGb: 4, requiredGpuLevel: 3, requiredRamLevel: 3, requiredCpuCores: 2, requiredShield: 0 },
    { name: '3D 그래픽 작업', taskIndex: 6, ramPerUnitGb: 2, mineralPerUnit: 50, requiredRamGb: 8, requiredGpuLevel: 3, requiredRamLevel: 4, requiredCpuCores: 2, requiredShield: 0 },
    { name: '전문 편집', taskIndex: 7, ramPerUnitGb: 4, mineralPerUnit: 100, requiredRamGb: 8, requiredGpuLevel: 4, requiredRamLevel: 5, requiredCpuCores: 4, requiredShield: 30 },
    { name: '고사양 AI 작업', taskIndex: 8, ramPerUnitGb: 4, mineralPerUnit: 200, requiredRamGb: 16, requiredGpuLevel: 5, requiredRamLevel: 6, requiredCpuCores: 4, requiredShield: 50 },
    { name: '초고사양 그래픽작업', taskIndex: 9, ramPerUnitGb: 8, mineralPerUnit: 350, requiredRamGb: 16, requiredGpuLevel: 6, requiredRamLevel: 7, requiredCpuCores: 6, requiredShield: 80 },
    { name: '대규모 렌더링 작업', taskIndex: 10, ramPerUnitGb: 8, mineralPerUnit: 500, requiredRamGb: 16, requiredGpuLevel: 6, requiredRamLevel: 7, requiredCpuCores: 6, requiredShield: 100 },
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

  /**
   * 작업·게임 사냥 적 스펙 (처치 시간 = GPU 공격력 vs 내구도, 공속은 RAM만).
   * hp·shield·defense·shieldArmor — 맵 EUD 근사. 수입 = 처치 시 mineralPerUnit×유닛수.
   */
  /** 사냥 유닛 사망 후 자동 재배치 대기(원작: 즉시 부활·수동 배치 → 웹: 1초 후 자동 복귀) */
  const HUNT_UNIT_RESPAWN_MS = 1000;
  /** 1기 기준 건물 파괴가 이 시간(초) 이내일 때만 작업 선택 가능 (웹 편의 잠금) */
  const WORK_PRACTICAL_CLEAR_KILL_SEC = 120;

  /** 작업 건물 — HP·방어만, 반격(attack) 없음 */
  const WORK_TASK_MOB_SPECS = [
    { hp: 1, shield: 0, defense: 0, shieldArmor: 0, attack: 0 },
    { hp: 2, shield: 0, defense: 0, shieldArmor: 0, attack: 0 },
    { hp: 5, shield: 0, defense: 0, shieldArmor: 0, attack: 0 },
    { hp: 8, shield: 0, defense: 0, shieldArmor: 0, attack: 0 },
    { hp: 10, shield: 0, defense: 0, shieldArmor: 0, attack: 0 },
    { hp: 30, shield: 0, defense: 2, shieldArmor: 0, attack: 0 },
    { hp: 50, shield: 0, defense: 3, shieldArmor: 0, attack: 0 },
    { hp: 100, shield: 30, defense: 5, shieldArmor: 0, attack: 0 },
    { hp: 200, shield: 50, defense: 10, shieldArmor: 0, attack: 0 },
    { hp: 350, shield: 80, defense: 12, shieldArmor: 3, attack: 0 },
    { hp: 500, shield: 100, defense: 15, shieldArmor: 5, attack: 0 },
  ];

  const GAME_HUNT_MOB_SPECS = [
    { hp: 2, shield: 0, defense: 0, shieldArmor: 0, attack: 1 },
    { hp: 200, shield: 0, defense: 0, shieldArmor: 0, attack: 5 },
    { hp: 200, shield: 0, defense: 0, shieldArmor: 0, attack: 5 },
    { hp: 5000, shield: 1000, defense: 10, shieldArmor: 0, attack: 25 },
    { hp: 20000, shield: 5000, defense: 25, shieldArmor: 5, attack: 60 },
    { hp: 60000, shield: 15000, defense: 50, shieldArmor: 10, attack: 120 },
    { hp: 500000, shield: 100000, defense: 100, shieldArmor: 20, attack: 300 },
    { hp: 10000000, shield: 2500000, defense: 255, shieldArmor: 50, attack: 800 },
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

  /**
   * 파티 사냥 미네랄만 후반 완화용 스케일. 작업·게임 사냥은 원작대로 타격당 mineralPerUnit×유닛수.
   */
  const MINERAL_INCOME_SCALE = 0.28;
  const MINERAL_DAMAGE_INCOME_EXP = 0.5;

  /** GPU 등급 상승 비용 (엔트리→메인→퍼포→하이엔드) */
  const GPU_GRADE_UP_COSTS = [120000, 600000, 2500000];

  /** 파티 보스 채굴증폭기 — 최종 컨텐츠 (채굴력 상한 65,000 = +500 × 130) */
  const MINING_AMPLIFIER_SPEC = {
    unlockCost: 10000000,
    powerUpgradeCost: 1500000,
    speedUpgradeCost: 2500000,
    powerPerLevel: 500,
    maxPowerLevels: 130,
    maxSpeedLevels: 16,
    baseSpeedFrames: 24,
    minSpeedFrames: 8,
    framesPerSpeedLevel: 1,
  };

  const SCA_SHOP_ITEMS = [
    { id: 'rebirthMineral500', name: '환생 시작 미네랄 +500', mineralBonus: 500, maxPurchases: 2000 },
    { id: 'rebirthMineralMax200', name: '환생 미네랄 +200', mineralBonus: 200, maxPurchases: 5000 },
    { id: 'rebirthMineralMax2000', name: '환생 미네랄 +2,000', mineralBonus: 2000, maxPurchases: 500 },
    { id: 'rebirthMineralMax7500', name: '환생 미네랄 +7,500', mineralBonus: 7500, maxPurchases: 134 },
    { id: 'huntIncome1', name: '사냥터 수입 +1%', cost: 12000, maxPurchases: 10 },
    { id: 'gameSpeed1', name: '게임 배속 +1프레임', cost: 25000, maxPurchases: 12 },
    { id: 'upgradeProb01', name: '강화 확률 +0.1%', cost: 30000, maxPurchases: 10 },
    { id: 'downloadSpeed10', name: '다운로드 속도 +10%', cost: 35000, maxPurchases: 10 },
    { id: 'gpuGradeUp', name: 'GPU 등급 상승', maxPurchases: 3 },
    { id: 'miningAmplifierUnlock', name: '채굴증폭기 구축', cost: MINING_AMPLIFIER_SPEC.unlockCost, maxPurchases: 1, shopGroup: 'mining' },
    { id: 'miningAmplifier', name: '채굴증폭기 공격력 +500', maxPurchases: MINING_AMPLIFIER_SPEC.maxPowerLevels, shopGroup: 'mining', requiresMining: true },
    { id: 'miningAmplifierSpeed', name: '채굴증폭기 공속 강화', maxPurchases: MINING_AMPLIFIER_SPEC.maxSpeedLevels, shopGroup: 'mining', requiresMining: true },
  ];

  function getGpuGradeUpCost(scaUpgrades) {
    const level = getGpuGradeLevel(scaUpgrades || {});
    const costs = GPU_GRADE_UP_COSTS;
    if (level >= costs.length) return 0;
    return costs[level];
  }

  function getMiningAmplifierPowerCost() {
    return MINING_AMPLIFIER_SPEC.powerUpgradeCost;
  }

  function getMiningAmplifierSpeedCost() {
    return MINING_AMPLIFIER_SPEC.speedUpgradeCost;
  }

  function getScaShopItemCost(item, scaUpgrades) {
    if (item && item.mineralBonus) {
      return Math.floor((item.mineralBonus / 10) * REBIRTH_MINERAL_SCA_PER_10);
    }
    const u = scaUpgrades || {};
    if (item && item.id === 'gpuGradeUp') {
      return getGpuGradeUpCost(u);
    }
    if (item && item.id === 'miningAmplifier') {
      return getMiningAmplifierPowerCost(u.miningAmplifier || 0);
    }
    if (item && item.id === 'miningAmplifierSpeed') {
      return getMiningAmplifierSpeedCost(u.miningAmplifierSpeed || 0);
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
    if (item.id === 'miningAmplifierUnlock') {
      return isMiningAmplifierUnlocked(scaUpgrades) ? '채굴증폭기 (구축 완료)' : '채굴증폭기 구축';
    }
    if (item.id === 'miningAmplifier') {
      return `채굴증폭기 공격력 (채굴력 ${getMiningPower(scaUpgrades).toLocaleString()})`;
    }
    if (item.id === 'miningAmplifierSpeed') {
      const frames = getMiningAttackFrames(scaUpgrades);
      return `채굴증폭기 공속 (${frames}f · ×${getMiningSpeedMultiplier(scaUpgrades).toFixed(2)})`;
    }
    return item.name;
  }

  function getScaShopItemHint(item, scaUpgrades) {
    if (!item) return '';
    if (item.id === 'miningAmplifierUnlock') {
      return isMiningAmplifierUnlocked(scaUpgrades) ? '레이드 채굴봇 활성화됨' : '최종 컨텐츠 · 레이드 채굴봇 해금';
    }
    if (item.id === 'miningAmplifier') {
      if (!isMiningAmplifierUnlocked(scaUpgrades)) return '구축 후 구매 가능';
      return `+${MINING_AMPLIFIER_SPEC.powerPerLevel} 채굴력 · 10,000당 레이드 DPS +100%`;
    }
    if (item.id === 'miningAmplifierSpeed') {
      if (!isMiningAmplifierUnlocked(scaUpgrades)) return '구축 후 구매 가능';
      const bought = (scaUpgrades && scaUpgrades.miningAmplifierSpeed) || 0;
      if (bought >= MINING_AMPLIFIER_SPEC.maxSpeedLevels) {
        return `최고 공속 ${getMiningAttackFrames(scaUpgrades)}f`;
      }
      const nextFrames = Math.max(
        MINING_AMPLIFIER_SPEC.minSpeedFrames,
        getMiningAttackFrames(scaUpgrades) - MINING_AMPLIFIER_SPEC.framesPerSpeedLevel
      );
      return `공속 −${MINING_AMPLIFIER_SPEC.framesPerSpeedLevel}f (다음 ${nextFrames}f)`;
    }
    return '';
  }

  function isMiningAmplifierUnlocked(scaUpgrades) {
    const u = scaUpgrades || {};
    return !!(u.miningAmplifierUnlock || (u.miningAmplifier || 0) > 0);
  }

  function canPurchaseScaShopItem(item, scaUpgrades) {
    if (!item) return false;
    const bought = (scaUpgrades && scaUpgrades[item.id]) || 0;
    if (bought >= item.maxPurchases) return false;
    if (item.id === 'gpuGradeUp' && !canPurchaseGpuGradeUp(scaUpgrades)) return false;
    if (item.id === 'miningAmplifierUnlock') return !isMiningAmplifierUnlocked(scaUpgrades);
    if (item.requiresMining && !isMiningAmplifierUnlocked(scaUpgrades)) return false;
    return true;
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
      newPart.ramVariant = 'standard';
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
    if (type === 'ram') return getRamStandardTable();
    if (type === 'cooler') return part && part.coolerKind === 'water' ? COOLER_WATER : COOLER_AIR;
    if (type === 'storage') return part && part.storageKind === 'nvme' ? NVME : HDD;
    return [];
  }

  function getMaxLevel(type, part) {
    if (type === 'ram') return getRamMaxLevel();
    return getPartTable(type, part).length;
  }

  function getTier(type, part, level) {
    if (type === 'ram') return getRamTierRow(part, level);
    const table = getPartTable(type, part);
    return table.find((row) => row.level === level) || table[table.length - 1];
  }

  function getUpgradeCost(type, currentLevel, part) {
    const tier = getTier(type, part, currentLevel + 1);
    return tier ? tier.cost : Infinity;
  }

  function getUpgradeProbability(type, currentLevel, part, bonusProb) {
    const nextLevel = currentLevel + 1;
    const tier = getTier(type, part, nextLevel);
    if (!tier) return 0;
    let baseProb = tier.prob;
    // 시트 최종 강 행 prob=0은 '최고강' 표기 — 13→14 등 마지막 강화는 직전 강 확률 적용
    if (baseProb <= 0 && nextLevel >= getMaxLevel(type, part)) {
      const prevTier = getTier(type, part, currentLevel);
      baseProb = prevTier ? prevTier.prob : 0;
    }
    return Math.min(1, baseProb + (bonusProb || 0));
  }

  /** 강화 구간별 확률 검증용 (CI·디버그) */
  function auditUpgradeProbTable() {
    const specs = [
      { label: 'Intel CPU', type: 'cpu', part: { type: 'cpu', manufacturer: 'Intel' } },
      { label: 'AMD CPU', type: 'cpu', part: { type: 'cpu', manufacturer: 'AMD' } },
      { label: 'GPU', type: 'gpu', part: { type: 'gpu' } },
      { label: 'RAM', type: 'ram', part: { type: 'ram', ramVariant: 'standard' } },
      { label: 'Cooler 공랭', type: 'cooler', part: { type: 'cooler', coolerKind: 'air' } },
      { label: 'Cooler 수랭', type: 'cooler', part: { type: 'cooler', coolerKind: 'water' } },
      { label: 'HDD', type: 'storage', part: { type: 'storage', storageKind: 'hdd' } },
      { label: 'NVMe', type: 'storage', part: { type: 'storage', storageKind: 'nvme' } },
    ];
    const rows = [];
    specs.forEach(({ label, type, part }) => {
      const max = getMaxLevel(type, part);
      for (let lv = 1; lv < max; lv += 1) {
        const prob = getUpgradeProbability(type, lv, part, 0);
        const nextTier = getTier(type, part, lv + 1);
        rows.push({
          label,
          from: lv,
          to: lv + 1,
          prob,
          sheetProb: nextTier ? nextTier.prob : null,
          isFinalStep: lv + 1 >= max,
        });
      }
    });
    return rows;
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
      upgraded.ramVariant = 'standard';
      upgraded.ramOcStep = undefined;
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

  /** 타격 주기(프레임) — 장착 RAM 공격 딜레이만 (GPU는 공격력만) */
  function calcIncomeAttackFrames(scaUpgrades, ramAttackFrames) {
    return Math.max(1, ramAttackFrames != null ? ramAttackFrames : calcRamAttackFrames(null));
  }

  /** RAM 공속 기준 타격 간격(초) */
  function calcAttackIntervalSec(ramAttackFrames, scaUpgrades) {
    const frames = calcIncomeAttackFrames(scaUpgrades, ramAttackFrames);
    return frames / 24 / calcGameSpeedMultiplier(scaUpgrades);
  }

  /** 타격 1회 간격(ms) — 처치 시간 계산용, GPU 무관 */
  function calcIncomeEventIntervalMs(scaUpgrades, ramAttackFrames) {
    return Math.max(50, Math.round(calcAttackIntervalSec(ramAttackFrames, scaUpgrades) * 1000));
  }

  function calcShieldDamagePerHit(attack, shieldArmor) {
    return Math.max(1, attack - (shieldArmor || 0));
  }

  function calcHpDamagePerHit(attack, defense) {
    return Math.max(1, attack - (defense || 0));
  }

  /** 적 실드·HP·방어·실드방어를 반영한 처치까지 타격 횟수 */
  function calcHitsToKillTarget(target, unitDamage) {
    const dmg = Math.max(1, unitDamage || 1);
    let shield = Math.max(0, (target && target.shield) || 0);
    let hp = Math.max(1, (target && target.hp) || 1);
    let hits = 0;
    const cap = 200000;
    while ((shield > 0 || hp > 0) && hits < cap) {
      hits++;
      if (shield > 0) {
        shield = Math.max(0, shield - calcShieldDamagePerHit(dmg, target.shieldArmor));
      } else {
        hp = Math.max(0, hp - calcHpDamagePerHit(dmg, target.defense));
      }
    }
    return Math.max(1, hits);
  }

  function calcKillTimeSec(unitDamage, ramAttackFrames, scaUpgrades, target) {
    const hits = calcHitsToKillTarget(target, unitDamage);
    return hits * calcAttackIntervalSec(ramAttackFrames, scaUpgrades);
  }

  function calcKillsPerSecond(unitDamage, ramAttackFrames, scaUpgrades, target) {
    const killSec = calcKillTimeSec(unitDamage, ramAttackFrames, scaUpgrades, target);
    return killSec > 0 ? 1 / killSec : 0;
  }

  function getWorkMobSpec(workTaskIndex) {
    return WORK_TASK_MOB_SPECS[workTaskIndex] || WORK_TASK_MOB_SPECS[0];
  }

  function getGameMobSpec(unlockedGameIndex) {
    const gi = getEffectiveUnlockedGameIndex(unlockedGameIndex);
    return GAME_HUNT_MOB_SPECS[gi] || GAME_HUNT_MOB_SPECS[0];
  }

  function getMobAttackPerHit(mobSpec) {
    if (mobSpec && mobSpec.attack != null) return Math.max(0, mobSpec.attack);
    const hp = (mobSpec && mobSpec.hp) || 1;
    return Math.max(1, Math.round(Math.pow(hp, 0.4)));
  }

  function mobCanCounterattack(mobSpec) {
    return getMobAttackPerHit(mobSpec) > 0;
  }

  /** 타격 1회·유닛 1기당 작업 미네랄 (표시용·원작 mineralPerUnit) */
  function calcWorkMineralPerHitPerUnit(workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate) {
    const task = getWorkTask(workTaskIndex);
    if (!task) return 0;
    return Math.max(
      0,
      Math.round(
        task.mineralPerUnit *
        (mineralMultiplier || 1) *
        (rebirthIncomeMult || 1) *
        (1 + (incomeBonusRate || 0))
      )
    );
  }

  /** 타격 1회·유닛 1기당 게임 사냥 미네랄 */
  function calcHuntMineralPerHitPerUnit(unlockedGameIndex, incomeBonusRate) {
    const game = getGameHunt(getEffectiveUnlockedGameIndex(unlockedGameIndex));
    if (!game) return 0;
    return Math.max(0, Math.round(game.mineralPerUnit * (1 + (incomeBonusRate || 0))));
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


  /** 장착 RAM 시트「공속」컬럼(프레임) — 수입·전투 주기 */
  function calcRamAttackFrames(ram) {
    const tier = getRamTierRow(ram, (ram && ram.level) || 1);
    const frames = tier && tier.attackSpeed;
    return Math.max(1, frames != null ? frames : 48);
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

  /** CPU 소환 유닛 DPS 배율 — index.html getSummonUnit 과 동일 */
  const CPU_SUMMON_DPS_FACTORS = [1.0, 1.5, 2.2, 3.2, 4.8, 7.2, 11.0, 16.0, 25.0, 45.0];
  const INCOME_REF_UNIT_DAMAGE = 2;

  function getCpuSummonDpsFactor(cpu) {
    const lv = Math.max(1, Math.min(10, getPartLevel(cpu)));
    return CPU_SUMMON_DPS_FACTORS[lv - 1] || lv * 5;
  }

  /** 1기 타격 데미지(GPU 공격력×CPU 소환 배율) — 공속은 RAM만 */
  function calcUnitDamageForIncome(parts, scaUpgrades) {
    const gpu = parts && parts.gpu;
    const cpu = parts && parts.cpu;
    const atk = getGpuAttackPower(gpu, scaUpgrades);
    return Math.max(1, Math.round(atk * getCpuSummonDpsFactor(cpu)));
  }

  function calcIncomeDamageMultiplier(parts, scaUpgrades) {
    const raw = calcUnitDamageForIncome(parts, scaUpgrades) / INCOME_REF_UNIT_DAMAGE;
    return Math.max(1, Math.pow(Math.max(1, raw), MINERAL_DAMAGE_INCOME_EXP));
  }

  /** 파티 사냥 틱당 미네랄 (MINERAL_INCOME_SCALE 반영) */
  function calcPartyMineralPerTick(tier, incomeBonusRate) {
    if (!tier) return 0;
    return Math.round(tier.mineralPerTick * MINERAL_INCOME_SCALE * (1 + (incomeBonusRate || 0)));
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
    const unlocked = getEffectiveUnlockedGameIndex(unlockedGameIndex);
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

  function resolveWorkCombat(parts, scaUpgrades, unitDamage, ramAttackFrames) {
    return {
      unitDamage: unitDamage != null ? unitDamage : calcUnitDamageForIncome(parts, scaUpgrades),
      ramAttackFrames: ramAttackFrames != null ? ramAttackFrames : calcRamAttackFrames(parts && parts.ram),
    };
  }

  /**
   * 작업 배치 용량 — 원작 [NGB] RAM·유닛당 RAM·CPU 코어 (등급 게이트 없음)
   */
  function evaluateWorkTaskCapacity(parts, taskIndex) {
    const task = getWorkTask(taskIndex);
    const cpu = (parts && parts.cpu) || { level: 1 };
    const ram = (parts && parts.ram) || { level: 1, capacityGb: 1 };
    const ramSlots = (parts && parts.ramSlots) != null ? parts.ramSlots : DEFAULT_RAM_SLOTS;
    const ramGb = getRamEffectiveCapacityGb(ram, ramSlots);
    const cpuCores = getCpuCores(cpu);
    const minRamGb = task.requiredRamGb || task.ramPerUnitGb || 1;
    const ramPerUnit = task.ramPerUnitGb || 1;

    const failures = [];
    if (ramGb < minRamGb) {
      failures.push(`RAM ${minRamGb}GB 필요 (현재 ${ramGb}GB)`);
    }
    const maxWorkByRam = Math.floor(ramGb / ramPerUnit);
    const activeWorkUnits = Math.max(0, Math.min(cpuCores, maxWorkByRam));
    if (activeWorkUnits < 1) {
      failures.push(`작업 유닛 배치 불가 (${ramPerUnit}GB/기 · 코어 ${cpuCores})`);
    }

    return {
      ok: failures.length === 0,
      failures,
      task,
      ramGb,
      cpuCores,
      activeWorkUnits,
      ramPerUnit,
    };
  }

  /** @deprecated evaluateWorkTaskCapacity 별칭 */
  function evaluateWorkTaskSpec(parts, taskIndex) {
    return evaluateWorkTaskCapacity(parts, taskIndex);
  }

  /**
   * 건물 실제 파괴 가능 여부 — GPU 공격·RAM 공속·건물 내구 vs 1기 파괴 시간
   */
  function canClearWorkTask(parts, taskIndex, unitDamage, ramAttackFrames, scaUpgrades) {
    const idx = Math.max(0, Math.min(WORK_TASKS.length - 1, taskIndex || 0));
    const cap = evaluateWorkTaskCapacity(parts, idx);
    const combat = resolveWorkCombat(parts, scaUpgrades, unitDamage, ramAttackFrames);
    const mob = getWorkMobSpec(idx);
    const killSec = calcKillTimeSec(combat.unitDamage, combat.ramAttackFrames, scaUpgrades, mob);
    const kps = calcKillsPerSecond(combat.unitDamage, combat.ramAttackFrames, scaUpgrades, mob);

    const failures = cap.failures.slice();
    if (cap.ok && (combat.unitDamage <= 0 || kps <= 0)) {
      failures.push('공격력 부족 — 건물 파괴 불가');
    }
    if (cap.ok && kps > 0 && killSec > WORK_PRACTICAL_CLEAR_KILL_SEC) {
      failures.push(`1기 파괴 ${killSec.toFixed(0)}초 — GPU·공속 강화 필요 (기준 ${WORK_PRACTICAL_CLEAR_KILL_SEC}초)`);
    }

    return {
      ok: failures.length === 0,
      failures,
      task: cap.task,
      activeWorkUnits: cap.activeWorkUnits,
      killSec,
      killsPerSec: kps,
      unitDamage: combat.unitDamage,
    };
  }

  function getWorkTaskSpecReason(parts, taskIndex, unitDamage, ramAttackFrames, scaUpgrades) {
    const clear = canClearWorkTask(parts, taskIndex, unitDamage, ramAttackFrames, scaUpgrades);
    return clear.ok ? '' : clear.failures.join(' · ');
  }

  function countClearableWorkTasks(parts, unitDamage, ramAttackFrames, scaUpgrades) {
    let n = 0;
    for (let i = 0; i < WORK_TASKS.length; i += 1) {
      if (canClearWorkTask(parts, i, unitDamage, ramAttackFrames, scaUpgrades).ok) n += 1;
    }
    return n;
  }

    function getWorkTask(taskIndex) {
    const idx = Math.max(0, Math.min(WORK_TASKS.length - 1, taskIndex || 0));
    return WORK_TASKS[idx];
  }

  function getGameHunt(gameIndex) {
    return GAME_HUNTING.find((g) => g.gameIndex === gameIndex) || null;
  }

  /** 대항해시대(0)는 기본 해금. 저장값 -1·null은 0으로 보정 */
  function getEffectiveUnlockedGameIndex(unlockedGameIndex) {
    const n = unlockedGameIndex == null ? 0 : Number(unlockedGameIndex);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(GAME_HUNTING.length - 1, Math.floor(n));
  }

  function getDownloadTargetMeta(downloadTarget) {
    if (!downloadTarget || downloadTarget.gameIndex == null) return null;
    return DOWNLOAD_TARGETS.find((t) => t.gameIndex === downloadTarget.gameIndex) || downloadTarget;
  }

  /** RAM: 작업 점유 후 남은 용량으로 사냥 유닛 수 계산 (작업·게임 동시) */
  function calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride, scaUpgrades, unitDamage, ramAttackFrames) {
    const ramSlots = (parts && parts.ramSlots) != null ? parts.ramSlots : DEFAULT_RAM_SLOTS;
    const totalRam = getRamEffectiveCapacityGb(parts && parts.ram, ramSlots);
    const maxByCpu = maxUnitsOverride != null ? maxUnitsOverride : getCpuCores(parts && parts.cpu);
    const clear = canClearWorkTask(parts, workTaskIndex, unitDamage, ramAttackFrames, scaUpgrades);
    const work = clear.task || getWorkTask(workTaskIndex);
    const maxWorkUnits = clear.ok ? clear.activeWorkUnits : 0;
    const activeWorkUnits = workUnitsOverride != null
      ? Math.max(0, Math.min(workUnitsOverride, maxWorkUnits))
      : maxWorkUnits;
    const workRamUsed = clear.ok
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
      canRunWork: clear.ok && activeWorkUnits > 0,
      workSpecOk: clear.ok,
      workSpecFailures: clear.failures,
      workKillSec: clear.killSec,
    };
  }

  /** 원작처럼 목록은 모두 표시, 실제 선택은 처치 가능할 때만 */
  function canSelectWorkTask(parts, taskIndex, unitDamage, ramAttackFrames, scaUpgrades) {
    return canClearWorkTask(parts, taskIndex, unitDamage, ramAttackFrames, scaUpgrades).ok;
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
    let unlocked = getEffectiveUnlockedGameIndex(unlockedGameIndex);
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
    const unlocked = getEffectiveUnlockedGameIndex(unlockedGameIndex);
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

  function calcWorkIncomePerSec(parts, workTaskIndex, unitDamage, ramAttackFrames, scaUpgrades, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride, workUnitsOverride, activeUnitsOverride) {
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    const active = activeUnitsOverride != null ? activeUnitsOverride : alloc.activeWorkUnits;
    if (!alloc.canRunWork || active <= 0) return 0;
    const kps = calcKillsPerSecond(unitDamage, ramAttackFrames, scaUpgrades, getWorkMobSpec(workTaskIndex)) * active;
    const perKill = calcWorkMineralPerHitPerUnit(workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate);
    return Math.round(kps * perKill);
  }

  function calcHuntIncomePerSec(parts, workTaskIndex, unlockedGameIndex, unitDamage, ramAttackFrames, scaUpgrades, incomeBonusRate, isDownloading, maxUnitsOverride, workUnitsOverride, activeUnitsOverride) {
    if (isDownloading) return 0;
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    const active = activeUnitsOverride != null ? activeUnitsOverride : alloc.activeHuntingUnits;
    if (active <= 0) return 0;
    const kps = calcKillsPerSecond(unitDamage, ramAttackFrames, scaUpgrades, getGameMobSpec(unlockedGameIndex)) * active;
    const perKill = calcHuntMineralPerHitPerUnit(unlockedGameIndex, incomeBonusRate);
    return Math.round(kps * perKill);
  }

  /** @deprecated 처치 1회 시 총 지급량(표시용). 실제 수입은 calcWork/HuntIncomePerSec */
  function calcHuntIncomePerTick(parts, workTaskIndex, unlockedGameIndex, incomeBonusRate, isDownloading, maxUnitsOverride, workUnitsOverride) {
    if (isDownloading) return 0;
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    if (alloc.activeHuntingUnits <= 0) return 0;
    const perUnit = calcHuntMineralPerHitPerUnit(unlockedGameIndex, incomeBonusRate);
    return perUnit * alloc.activeHuntingUnits;
  }

  function calcWorkIncomePerTick(parts, workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride, workUnitsOverride) {
    const alloc = calcRamAllocation(parts, workTaskIndex, maxUnitsOverride, workUnitsOverride);
    if (!alloc.canRunWork || alloc.activeWorkUnits <= 0) return 0;
    const perUnit = calcWorkMineralPerHitPerUnit(workTaskIndex, mineralMultiplier, rebirthIncomeMult, incomeBonusRate);
    return perUnit * alloc.activeWorkUnits;
  }

  function calcWorkHuntIncomePerSec(parts, workTaskIndex, unlockedGameIndex, unitDamage, ramAttackFrames, scaUpgrades, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading, maxUnitsOverride, workUnitsOverride, activeWorkOverride, activeHuntOverride) {
    return calcWorkIncomePerSec(parts, workTaskIndex, unitDamage, ramAttackFrames, scaUpgrades, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, maxUnitsOverride, workUnitsOverride, activeWorkOverride)
      + calcHuntIncomePerSec(parts, workTaskIndex, unlockedGameIndex, unitDamage, ramAttackFrames, scaUpgrades, incomeBonusRate, isDownloading, maxUnitsOverride, workUnitsOverride, activeHuntOverride);
  }

  /** 작업·사냥 합산 초당 수입이 최대가 되도록 작업 유닛 수 탐색 */
  function calcOptimalWorkUnits(parts, workTaskIndex, unlockedGameIndex, maxUnitsOverride, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading, unitDamage, ramAttackFrames, scaUpgrades) {
    const clear = canClearWorkTask(parts, workTaskIndex, unitDamage, ramAttackFrames, scaUpgrades);
    const maxW = clear.ok ? clear.activeWorkUnits : 0;
    if (maxW <= 0) return 0;
    const dmg = unitDamage != null ? unitDamage : calcUnitDamageForIncome(parts, scaUpgrades);
    const ramF = ramAttackFrames != null ? ramAttackFrames : calcRamAttackFrames(parts && parts.ram);
    let bestUnits = 0;
    let bestTotal = -1;
    for (let w = 0; w <= maxW; w++) {
      const total = calcWorkHuntIncomePerSec(parts, workTaskIndex, unlockedGameIndex, dmg, ramF, scaUpgrades, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading, maxUnitsOverride, w);
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

  function getMiningPower(scaUpgrades) {
    if (!isMiningAmplifierUnlocked(scaUpgrades)) return 0;
    const u = scaUpgrades || {};
    return (u.miningAmplifier || 0) * MINING_AMPLIFIER_SPEC.powerPerLevel;
  }

  function getMiningAttackFrames(scaUpgrades) {
    if (!isMiningAmplifierUnlocked(scaUpgrades)) return MINING_AMPLIFIER_SPEC.baseSpeedFrames;
    const lv = (scaUpgrades && scaUpgrades.miningAmplifierSpeed) || 0;
    return Math.max(
      MINING_AMPLIFIER_SPEC.minSpeedFrames,
      MINING_AMPLIFIER_SPEC.baseSpeedFrames - lv * MINING_AMPLIFIER_SPEC.framesPerSpeedLevel
    );
  }

  function getMiningSpeedMultiplier(scaUpgrades) {
    const frames = getMiningAttackFrames(scaUpgrades);
    return MINING_AMPLIFIER_SPEC.baseSpeedFrames / Math.max(1, frames);
  }

  const RAID_CUMULATIVE_REWARDS = {
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
   * 오버클럭 연구소 건물 스펙.
   * defense = 방어력(초당 net DPS = unitDps − defense)
   * minDps  = 해당 레벨 파밍에 필요한 차출 1기 DPS (엔트리→하이엔드 구간)
   * 하이엔드 풀스펙 기준 Lv.4 파밍 약 15~25초/회 목표로 내구도 조정 (구버전 대비 ~5배 완화)
   */
  const OVERCLOCK_LAB_SPECS = {
    1: { hp: 400000, shield: 200000, defense: 5, minDps: 0 },
    2: { hp: 4000000, shield: 2000000, defense: 25, minDps: 5000 },
    3: { hp: 20000000, shield: 10000000, defense: 80, minDps: 50000 },
    4: { hp: 80000000, shield: 40000000, defense: 150, minDps: 150000 },
  };
  const OVERCLOCK_LAB_RESPAWN_SEC = 1;

  /** 연구소 차출 1기 공속 — RAM만 (GPU는 공격력만) */
  function calcOverclockLabAttackSpeedSec(ram, scaUpgrades) {
    const ramFrames = calcRamAttackFrames(ram);
    return Math.max(0.1, Math.round((ramFrames / 24) * 100) / 100);
  }

  function calcOverclockLabUnitDps(unitDamage, ram, scaUpgrades) {
    const sec = calcOverclockLabAttackSpeedSec(ram, scaUpgrades);
    return calcUnitDps(unitDamage, sec);
  }

  function calcUnitDps(unitDamage, attackSpeedSec) {
    const sec = Math.max(0.1, attackSpeedSec || 1);
    return Math.max(1, Math.round((1 / sec) * (unitDamage || 1)));
  }

  function calcMaxOverclockLabLevel(unitDps) {
    let max = 1;
    for (let lvl = 1; lvl <= 4; lvl++) {
      const spec = OVERCLOCK_LAB_SPECS[lvl];
      if (spec && unitDps >= (spec.minDps || 0)) max = lvl;
    }
    return max;
  }

  function calcOverclockLabNetDps(unitDps, farmLevel) {
    const spec = OVERCLOCK_LAB_SPECS[farmLevel];
    if (!spec) return 0;
    return Math.max(0, unitDps - spec.defense);
  }

  global.OriginalMapGame = {
    MINERAL_PER_COIN, MANWON_MINERALS, parseSheetPrice, REBIRTH_MINERAL_CAP, HUNT_UNIT_RESPAWN_MS,
    GAME_SPEED_BASE, GAME_SPEED_MAX, GAME_SPEED_FRAME_REF,
    GPU_GRADE_NAMES, GPU_GRADE_ATTACK_FRAMES, GPU_GRADE_BENCHMARK_MULTIPLIERS, DOWNLOAD_BASE_MB,
    INTEL_CPU, AMD_CPU, GPU, RAM, COOLER_AIR, COOLER_WATER, HDD, NVME,
    MOTHERBOARDS, WORK_TASKS, GAME_HUNTING, WORK_HUNTING_GROUNDS, WORK_TASK_MOB_SPECS, GAME_HUNT_MOB_SPECS, PARTY_HUNTING_TIERS, SCA_SHOP_ITEMS, DOWNLOAD_TARGETS, GPU_GRADE_PERF_MULT, WORK_PRACTICAL_CLEAR_KILL_SEC,
    getPartTable, getMaxLevel, getTier, getUpgradeCost, getUpgradeProbability, auditUpgradeProbTable, getPartName,
    applyTierStats, getCpuCoolingRequired, getCpuCores, convertMineralsToCoins,
    calcRebirthPerformanceScore, calcRebirthStatGain, calcRebirthScaReward,
    calcRebirthStartMinerals, calcRebirthIncomeMultiplier,
    calcIncomeBonus, calcProbBonus,
    REBIRTH_REWARD_TIERS, getRebirthRewardTier, calcRebirthScaRewardByRebirthStat, applyRebirthStatCorrection, calcRebirthOutcome,
    calcGameSpeedFrames, calcGameSpeedWaitFrames, calcGameSpeedMultiplier, calcGameSpeedTickMs, calcIncomeAttackFrames, calcAttackIntervalSec, calcIncomeEventIntervalMs,
    calcShieldDamagePerHit, calcHpDamagePerHit, calcHitsToKillTarget, calcKillTimeSec, calcKillsPerSecond, getWorkMobSpec, getGameMobSpec, getMobAttackPerHit, mobCanCounterattack,
    consumeElapsedTicks, calcAutoLoopIntervalMs, calcManualUpgradeDelayMs,
    MINERAL_INCOME_SCALE, MINERAL_DAMAGE_INCOME_EXP,
    GPU_GRADE_UP_COSTS,
    REBIRTH_MINERAL_SCA_PER_10, getScaShopItemCost, getGpuGradeUpCost, getMiningAmplifierPowerCost, getMiningAmplifierSpeedCost,
    getScaShopItemDisplayName, getGpuGradeLevel, canPurchaseGpuGradeUp, calcGpuGrade, calcGpuAttackFrames, calcGpuBenchmarkMultiplier,
    normalizeEquippedStorage, normalizeEquippedCooler, getStorageDownloadMultiplier, calcDownloadSpeedBonus, calcDownloadSpeedMb,
    RAM_SLOT_UPGRADES, DEFAULT_RAM_SLOTS, getRamSlotCount, getRamEffectiveCapacityGb, getRamSlotUpgradeCost, canPurchaseRamSlotUpgrade, validateRamSlotPurchase,
    SHOP_PURCHASABLE_LEVELS, getShopTierCost, getShopTierCostMinerals, getShopSellPrice, getShopSellPriceMinerals, getShopCatalog, getPurchasableLevels, getPurchasableMaxLevel, isPurchasableLevel, countRamInInventory, canPurchaseRam, buildInventoryPart,
    costToMinerals, formatMineral, formatManwon, getPurchaseCostMinerals,
    getRamCapacityGb, getRamEffectiveCapacityGb, getRamSlotCount, getRamSlotUpgradeCost, canPurchaseRamSlotUpgrade, validateRamSlotPurchase, getStorageCapacityGb, getGpuRamPerUnit, getGpuDisplayName, getGpuModelName, getGpuAttackPower, calcRamAttackFrames, getRamTierRow, getRamStandardTable, getRamMaxLevel, getRamPerfPerUnit, applyRamOverclock, getGpuTierAttack, getCpuRequiredDdrGeneration, getCpuHuntRamPerUnitGb,
    calcStorageUsedGb, getStorageFreeGb,
    getWorkTask, getGameHunt, getEffectiveUnlockedGameIndex, getDownloadTargetMeta,
    getPartLevel, evaluateWorkTaskSpec, evaluateWorkTaskCapacity, canClearWorkTask, getWorkTaskSpecReason, countClearableWorkTasks,
    calcRamAllocation, canSelectWorkTask, normalizeGameProgress, validateDownloadStart,
    calcHuntIncomePerTick, calcWorkIncomePerTick, calcWorkIncomePerSec, calcHuntIncomePerSec, calcWorkHuntIncomePerSec,
    calcWorkMineralPerHitPerUnit, calcHuntMineralPerHitPerUnit,
    calcPartyMineralPerTick, calcOptimalWorkUnits, toDownloadTargetSnapshot,
    getCpuSummonDpsFactor, calcUnitDamageForIncome, calcIncomeDamageMultiplier,
    createIntelCpu11InventoryItem,
    getMiningPower, getMiningAttackFrames, getMiningSpeedMultiplier, isMiningAmplifierUnlocked, canPurchaseScaShopItem, getScaShopItemHint, MINING_AMPLIFIER_SPEC,
    RAID_CUMULATIVE_REWARDS, setScaUpgradesRef,
    OVERCLOCK_LAB_SPECS, OVERCLOCK_LAB_RESPAWN_SEC,
    calcUnitDps, calcOverclockLabAttackSpeedSec, calcOverclockLabUnitDps,
    calcMaxOverclockLabLevel, calcOverclockLabNetDps,
  };
})(typeof window !== 'undefined' ? window : globalThis);
