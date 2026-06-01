#!/usr/bin/env python3
"""Apply V1.2.9 original map gameplay patches to public/index.html"""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "public" / "index.html"
text = path.read_text(encoding="utf-8")

replacements = [
    (
        '  <script src="/socket.io/socket.io.js"></script>',
        '  <script src="/socket.io/socket.io.js"></script>\n  <script src="/originalMapData.js"></script>',
    ),
    (
        "    const { useState, useEffect, useMemo, useRef } = React;\n\n    function App() {",
        "    const { useState, useEffect, useMemo, useRef } = React;\n    const OMG = window.OriginalMapGame;\n\n    function App() {",
    ),
    (
        "        return saved !== null ? parseInt(saved, 10) : 50;",
        "        return saved !== null ? parseInt(saved, 10) : 0;",
    ),
    (
        """      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });

      // ----------------------------------------------------------------------
      // 2. 조립 컴퓨터 부품 상태 정의""",
        """      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const [scaUpgrades, setScaUpgrades] = useState(() => {
        const saved = localStorage.getItem('sca_scaUpgrades');
        return saved !== null ? JSON.parse(saved) : {};
      });
      const [showScaCenter, setShowScaCenter] = useState(false);
      const [partyHuntingTier, setPartyHuntingTier] = useState(() => {
        const saved = localStorage.getItem('sca_partyHuntingTier');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const [isPartyHunting, setIsPartyHunting] = useState(false);
      const [cpuBuyManufacturer, setCpuBuyManufacturer] = useState('Intel');
      const [coolerBuyKind, setCoolerBuyKind] = useState('air');
      const [storageBuyKind, setStorageBuyKind] = useState('hdd');

      // ----------------------------------------------------------------------
      // 2. 조립 컴퓨터 부품 상태 정의""",
    ),
    (
        "        return saved !== null ? JSON.parse(saved) : { level: 1, coolingCapacity: 30 };",
        "        return saved !== null ? JSON.parse(saved) : { level: 1, coolingCapacity: 100, coolerKind: 'air' };",
    ),
    (
        "        return saved !== null ? JSON.parse(saved) : { type: 'HDD', capacityGb: 250, level: 1 };",
        "        return saved !== null ? JSON.parse(saved) : { type: 'HDD', capacityGb: 60, level: 1, storageKind: 'hdd' };",
    ),
    (
        """          { id: 'inv-ram-1', type: 'ram', level: 1, clockMhz: 2400, capacityGb: 8, ddrGeneration: 'DDR4' },
          { id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 30 },
          { id: 'inv-storage-1', type: 'storage', level: 1, storageType: 'HDD', capacityGb: 250 }""",
        """          { id: 'inv-ram-1', type: 'ram', level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' },
          { id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 100, coolerKind: 'air' },
          { id: 'inv-storage-1', type: 'storage', level: 1, storageType: 'HDD', storageKind: 'hdd', capacityGb: 60 }""",
    ),
    (
        "        return saved !== null ? JSON.parse(saved) : { name: '테이블 탑 조립소 (1단계)', multiplier: 1.0 };",
        """        if (saved !== null) return JSON.parse(saved);
        const g = OMG.WORK_HUNTING_GROUNDS[0];
        return { name: g.name, multiplier: g.multiplier, mineralBase: g.mineralBase, groundIndex: 0 };""",
    ),
    (
        "        return saved !== null ? JSON.parse(saved) : { name: '서버 랙 테마파크 (2단계)', sizeMb: 5000, requiredGb: 500, multiplier: 2.5 };",
        """        if (saved !== null) return JSON.parse(saved);
        const t = OMG.DOWNLOAD_TARGETS[0];
        return { name: t.name, sizeMb: t.sizeMb, requiredGb: t.requiredGb, groundIndex: t.groundIndex };""",
    ),
    (
        "        const cpuHeatDemand = cpu.level * 15;",
        "        const cpuHeatDemand = OMG.getCpuCoolingRequired(cpu);",
    ),
    (
        "        let unitLimit = cpu.level * 2;",
        "        let unitLimit = OMG.getCpuCores(cpu) * 2;",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"MISSING BLOCK:\n{old[:120]}...")
    text = text.replace(old, new, 1)

# Replace getCpuName block through getCoolerName
start = text.index("      const getCpuName = (level) => {")
end = text.index("      // ----------------------------------------------------------------------\n      // 5. 실시간 하드웨어 스펙 연산")
text = text[:start] + """      const incomeBonusRate = useMemo(() => OMG.calcIncomeBonus(scaUpgrades), [scaUpgrades]);
      const probBonusRate = useMemo(() => OMG.calcProbBonus(scaUpgrades), [scaUpgrades]);

      const getCpuName = (level, manufacturer) => OMG.getPartName('cpu', level, { type: 'cpu', manufacturer: manufacturer || cpu.manufacturer });
      const getGpuName = (level) => OMG.getPartName('gpu', level, { type: 'gpu' });
      const getRamName = (level, part) => OMG.getPartName('ram', level, part || ram);
      const getCoolerName = (level, part) => OMG.getPartName('cooler', level, part || cooler);
      const getStorageName = (level, part) => OMG.getPartName('storage', level, part || storage);

""" + text[end:]

# Mineral conversion + auto earn + party hunting
old_block = """      // ----------------------------------------------------------------------
      // 6. 초당 자동 미네랄 수급 라이프사이클 (환생 버프 적용)
      // ----------------------------------------------------------------------
      useEffect(() => {
        const interval = setInterval(() => {
          const baseEarn = Math.round(10 * specs.penalties.mineralMultiplier * huntingGround.multiplier);
          const autoEarn = Math.round(baseEarn * (1 + rebirthCount * 0.5));
          setMinerals(prev => prev + autoEarn);
        }, 1000);

        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount]);"""

new_block = """      useEffect(() => {
        if (minerals >= OMG.MINERAL_PER_COIN) {
          const { coins, remainder } = OMG.convertMineralsToCoins(minerals);
          if (coins > 0) {
            setMinerals(remainder);
            setNormalCoins((prev) => prev + coins);
          }
        }
      }, [minerals]);

      useEffect(() => {
        const interval = setInterval(() => {
          const base = huntingGround.mineralBase || Math.round(10 * huntingGround.multiplier);
          const autoEarn = Math.round(base * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate));
          setMinerals((prev) => prev + autoEarn);
        }, 1000);
        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount, incomeBonusRate]);

      useEffect(() => {
        if (!isPartyHunting) return;
        const tier = OMG.PARTY_HUNTING_TIERS[partyHuntingTier];
        if (!tier) return;
        const interval = setInterval(() => {
          setMinerals((prev) => prev + Math.round(tier.mineralPerTick * (1 + incomeBonusRate)));
          setScaCoins((prev) => prev + tier.scaCoins);
        }, 3000);
        return () => clearInterval(interval);
      }, [isPartyHunting, partyHuntingTier, incomeBonusRate]);"""

if old_block not in text:
    raise SystemExit("auto earn block missing")
text = text.replace(old_block, new_block, 1)

text = text.replace(
    "        localStorage.setItem('sca_rebirthCount', rebirthCount.toString());",
    "        localStorage.setItem('sca_rebirthCount', rebirthCount.toString());\n        localStorage.setItem('sca_scaUpgrades', JSON.stringify(scaUpgrades));\n        localStorage.setItem('sca_partyHuntingTier', partyHuntingTier.toString());",
    1,
)
text = text.replace(
    "      }, [minerals, normalCoins, scaCoins, rebirthCount, cpu, gpu, ram, cooler, motherboard, storage, huntingGround, downloadTarget, workerType, inventory, autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage]);",
    "      }, [minerals, normalCoins, scaCoins, rebirthCount, scaUpgrades, partyHuntingTier, cpu, gpu, ram, cooler, motherboard, storage, huntingGround, downloadTarget, workerType, inventory, autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage]);",
    1,
)

text = text.replace(
    "          const earn = Math.round(10 * specs.penalties.mineralMultiplier * huntingGround.multiplier * (1 + rebirthCount * 0.5));",
    "          const earn = Math.round((huntingGround.mineralBase || 10) * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate));",
    1,
)
text = text.replace(
    "      }, [cpu.level, specs, huntingGround, rebirthCount]);",
    "      }, [cpu.level, specs, huntingGround, rebirthCount, incomeBonusRate]);",
    1,
)

# Auto buy loop
old_auto = """            if (owned.length === 0) {
              // A. 부품 소멸 감지 시 1강 즉시 자동 구매
              if (minerals >= 100) {
                handleBuyComponentPack(type);
                break; // 한 턴에 하나만 시도
              } else {
                setAuto(false);
                setCombatLogs(prev => [...prev.slice(-7), `⚠️ [SYSTEM] 미네랄이 부족하여 ${type.toUpperCase()} 자동 구매가 중단되었습니다.`]);
                break;
              }
            } else {
              // B. 부품 존재 시 10강 미만 중 등급이 가장 높은 부품을 타겟으로 지정
              const target = owned.filter(p => p.level < 10).sort((a, b) => b.level - a.level)[0];
              if (target) {
                const cost = getUpgradeCost(target.level);
                if (minerals >= cost) {
                  handleInventoryUpgrade(target.id);
                  break; // 한 턴에 하나만 시도
                } else {
                  setAuto(false);
                  setCombatLogs(prev => [...prev.slice(-7), `⚠️ [SYSTEM] 미네랄이 부족하여 ${type.toUpperCase()} 자동 강화가 중단되었습니다.`]);
                  break;
                }
              } else {"""

new_auto = """            if (owned.length === 0) {
              const buyMeta = { type, manufacturer: type === 'cpu' ? cpuBuyManufacturer : undefined, coolerKind: type === 'cooler' ? coolerBuyKind : undefined, storageKind: type === 'storage' ? storageBuyKind : undefined };
              const packCost = OMG.getUpgradeCost(type, 0, buyMeta);
              if (normalCoins >= packCost) { handleBuyComponentPack(type); break; }
              setAuto(false);
              setCombatLogs(prev => [...prev.slice(-7), `⚠️ [SYSTEM] Normal 코인 부족 — ${type.toUpperCase()} 자동 구매 중단`]);
              break;
            } else {
              const target = owned.filter(p => p.level < OMG.getMaxLevel(type, p)).sort((a, b) => b.level - a.level)[0];
              if (target) {
                const cost = OMG.getUpgradeCost(target.type, target.level, target);
                if (normalCoins >= cost) { handleInventoryUpgrade(target.id); break; }
                setAuto(false);
                setCombatLogs(prev => [...prev.slice(-7), `⚠️ [SYSTEM] Normal 코인 부족 — ${type.toUpperCase()} 자동 강화 중단`]);
                break;
              } else {"""

text = text.replace(old_auto, new_auto, 1)
text = text.replace(
    "      }, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, isUpgrading, inventory, minerals]);",
    "      }, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, isUpgrading, inventory, normalCoins, cpuBuyManufacturer, coolerBuyKind, storageBuyKind]);",
    1,
)

# Replace cost helpers and buy handler start through sell handler
start = text.index("      // ----------------------------------------------------------------------\n      // 7. 실시간 상점 강화 비용 계산 헬퍼")
end = text.index("      // 2. 보관 장비 스왑 장착 핸들러")
logic = Path(__file__).resolve().parent / "patch_game_handlers.js"
handlers = logic.read_text(encoding="utf-8")
text = text[:start] + handlers + "\n\n      " + text[end:]

path.write_text(text, encoding="utf-8")
print("patched", path)
