#!/usr/bin/env python3
from pathlib import Path

path = Path("/workspace/public/index.html")
text = path.read_text(encoding="utf-8")

def must_replace(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f"MISSING: {label}")
    text = text.replace(old, new, 1)

must_replace(
    '  <script src="/socket.io/socket.io.js"></script>',
    '  <script src="/socket.io/socket.io.js"></script>\n  <script src="/originalMapData.js"></script>',
    "script tag",
)
must_replace(
    "    const { useState, useEffect, useMemo, useRef } = React;\n\n    function App() {",
    "    const { useState, useEffect, useMemo, useRef } = React;\n    const OMG = window.OriginalMapGame;\n\n    function App() {",
    "OMG const",
)
must_replace("return saved !== null ? parseInt(saved, 10) : 50;", "return saved !== null ? parseInt(saved, 10) : 0;", "normalCoins default")

insert = """      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });"""
extra = """
      const [scaUpgrades, setScaUpgrades] = useState(() => JSON.parse(localStorage.getItem('sca_scaUpgrades') || '{}'));
      const [showScaCenter, setShowScaCenter] = useState(false);
      const [partyHuntingTier, setPartyHuntingTier] = useState(0);
      const [isPartyHunting, setIsPartyHunting] = useState(false);
      const [cpuBuyManufacturer, setCpuBuyManufacturer] = useState('Intel');
      const [coolerBuyKind, setCoolerBuyKind] = useState('air');
      const [storageBuyKind, setStorageBuyKind] = useState('hdd');"""
must_replace(insert, insert + extra, "extra state")

must_replace(
    "return saved !== null ? JSON.parse(saved) : { name: '테이블 탑 조립소 (1단계)', multiplier: 1.0 };",
    "if (saved !== null) return JSON.parse(saved); const g = OMG.WORK_HUNTING_GROUNDS[0]; return { name: g.name, multiplier: g.multiplier, mineralBase: g.mineralBase, groundIndex: 0 };",
    "hunting ground",
)
must_replace(
    "return saved !== null ? JSON.parse(saved) : { name: '서버 랙 테마파크 (2단계)', sizeMb: 5000, requiredGb: 500, multiplier: 2.5 };",
    "if (saved !== null) return JSON.parse(saved); const t = OMG.DOWNLOAD_TARGETS[0]; return { name: t.name, sizeMb: t.sizeMb, requiredGb: t.requiredGb, groundIndex: t.groundIndex };",
    "download target",
)
must_replace("const cpuHeatDemand = cpu.level * 15;", "const cpuHeatDemand = OMG.getCpuCoolingRequired(cpu);", "cpu heat")
must_replace("let unitLimit = cpu.level * 2;", "let unitLimit = OMG.getCpuCores(cpu) * 2;", "unit limit")

s = text.index("      const getCpuName = (level) => {")
e = text.index("      // ----------------------------------------------------------------------\n      // 5. 실시간 하드웨어 스펙 연산")
text = text[:s] + """      const incomeBonusRate = useMemo(() => OMG.calcIncomeBonus(scaUpgrades), [scaUpgrades]);
      const probBonusRate = useMemo(() => OMG.calcProbBonus(scaUpgrades), [scaUpgrades]);
      const getCpuName = (level, m) => OMG.getPartName('cpu', level, { type: 'cpu', manufacturer: m || cpu.manufacturer });
      const getGpuName = (level) => OMG.getPartName('gpu', level, { type: 'gpu' });
      const getRamName = (level, part) => OMG.getPartName('ram', level, part || ram);
      const getCoolerName = (level, part) => OMG.getPartName('cooler', level, part || cooler);
      const getStorageName = (level, part) => OMG.getPartName('storage', level, part || storage);

""" + text[e:]

must_replace(
    """      // ----------------------------------------------------------------------
      // 6. 초당 자동 미네랄 수급 라이프사이클 (환생 버프 적용)
      // ----------------------------------------------------------------------
      useEffect(() => {
        const interval = setInterval(() => {
          const baseEarn = Math.round(10 * specs.penalties.mineralMultiplier * huntingGround.multiplier);
          const autoEarn = Math.round(baseEarn * (1 + rebirthCount * 0.5));
          setMinerals(prev => prev + autoEarn);
        }, 1000);

        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount]);""",
    """      useEffect(() => {
        if (minerals >= OMG.MINERAL_PER_COIN) {
          const { coins, remainder } = OMG.convertMineralsToCoins(minerals);
          if (coins > 0) { setMinerals(remainder); setNormalCoins(p => p + coins); }
        }
      }, [minerals]);
      useEffect(() => {
        const interval = setInterval(() => {
          const base = huntingGround.mineralBase || 10 * huntingGround.multiplier;
          setMinerals(p => p + Math.round(base * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate)));
        }, 1000);
        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount, incomeBonusRate]);
      useEffect(() => {
        if (!isPartyHunting) return;
        const tier = OMG.PARTY_HUNTING_TIERS[partyHuntingTier];
        if (!tier) return;
        const iv = setInterval(() => { setMinerals(p => p + tier.mineralPerTick); setScaCoins(p => p + tier.scaCoins); }, 3000);
        return () => clearInterval(iv);
      }, [isPartyHunting, partyHuntingTier]);""",
    "auto earn",
)

must_replace(
    "localStorage.setItem('sca_rebirthCount', rebirthCount.toString());",
    "localStorage.setItem('sca_rebirthCount', rebirthCount.toString());\n        localStorage.setItem('sca_scaUpgrades', JSON.stringify(scaUpgrades));",
    "localStorage sca",
)
must_replace(
    "}, [minerals, normalCoins, scaCoins, rebirthCount, cpu,",
    "}, [minerals, normalCoins, scaCoins, rebirthCount, scaUpgrades, cpu,",
    "localStorage deps",
)

hs = text.index("      // ----------------------------------------------------------------------\n      // 7. 실시간 상점 강화 비용 계산 헬퍼")
he = text.index("      // 2. 보관 장비 스왑 장착 핸들러")
handlers = Path("/workspace/scripts/patch_game_handlers.js").read_text(encoding="utf-8")
text = text[:hs] + handlers + "\n      " + text[he:]

must_replace(
    'const baseIncome = Math.round(5 * specs.penalties.mineralMultiplier * huntingGround.multiplier);',
    'const baseIncome = Math.round((huntingGround.mineralBase || 5 * huntingGround.multiplier) * specs.penalties.mineralMultiplier * (1 + incomeBonusRate));',
    "manual mining",
)

path.write_text(text, encoding="utf-8")
print("OK", "OMG" in text, len(text))
