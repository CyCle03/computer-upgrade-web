#!/usr/bin/env python3
"""원작 확인 가능 기능: 환생수치, SCA 환생미네랄, 자동강화 목표"""
from pathlib import Path

p = Path("/workspace/public/index.html")
t = p.read_text(encoding="utf-8")

def rep(label, old, new):
    global t
    if old not in t:
        raise SystemExit(f"NOT FOUND: {label}")
    t = t.replace(old, new, 1)
    print(f"OK: {label}")

# 1. rebirthStat + autoTargetLevels state
rep("rebirthStat state",
"""      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
""",
"""      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const [rebirthStat, setRebirthStat] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthStat');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const defaultAutoTargets = { cpu: 1, gpu: 1, ram: 1, cooler: 1, storage: 1 };
      const [autoTargetLevels, setAutoTargetLevels] = useState(() => {
        try {
          return { ...defaultAutoTargets, ...JSON.parse(localStorage.getItem('sca_autoTargetLevels') || '{}') };
        } catch (e) { return defaultAutoTargets; }
      });
""")

# 2. income multiplier memo
rep("income memo",
"""      const incomeBonusRate = useMemo(() => OMG.calcIncomeBonus(scaUpgrades), [scaUpgrades]);
      const probBonusRate = useMemo(() => OMG.calcProbBonus(scaUpgrades), [scaUpgrades]);
""",
"""      const incomeBonusRate = useMemo(() => OMG.calcIncomeBonus(scaUpgrades), [scaUpgrades]);
      const probBonusRate = useMemo(() => OMG.calcProbBonus(scaUpgrades), [scaUpgrades]);
      const rebirthIncomeMult = useMemo(() => OMG.calcRebirthIncomeMultiplier(rebirthStat), [rebirthStat]);
""")

# 3. Replace rebirthCount buff with rebirthIncomeMult
t = t.replace("(1 + rebirthCount * 0.5)", "rebirthIncomeMult")
t = t.replace("rebirthCount * 0.5", "(rebirthIncomeMult - 1)")
print("OK: income mult replacements")

# 4. localStorage
rep("localStorage rebirthStat",
"""        localStorage.setItem('sca_rebirthCount', rebirthCount.toString());
        localStorage.setItem('sca_scaUpgrades', JSON.stringify(scaUpgrades));
""",
"""        localStorage.setItem('sca_rebirthCount', rebirthCount.toString());
        localStorage.setItem('sca_rebirthStat', rebirthStat.toString());
        localStorage.setItem('sca_autoTargetLevels', JSON.stringify(autoTargetLevels));
        localStorage.setItem('sca_scaUpgrades', JSON.stringify(scaUpgrades));
""")

rep("localStorage deps",
"""      }, [minerals, normalCoins, scaCoins, rebirthCount, scaUpgrades, partyHuntingTier, cpu, gpu, ram, cooler, motherboard, storage, huntingGround, downloadTarget, inventory, autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage]);
""",
"""      }, [minerals, normalCoins, scaCoins, rebirthCount, rebirthStat, autoTargetLevels, scaUpgrades, partyHuntingTier, cpu, gpu, ram, cooler, motherboard, storage, huntingGround, downloadTarget, inventory, autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage]);
""")

# 5. work income effect deps
t = t.replace(
    "}, [specs, huntingGround, rebirthCount, incomeBonusRate, isPartyHunting]);",
    "}, [specs, huntingGround, rebirthIncomeMult, incomeBonusRate, isPartyHunting]);",
)
t = t.replace(
    "}, [cpu.level, specs, huntingGround, rebirthCount, incomeBonusRate, isPartyHunting, partyHuntingTier]);",
    "}, [cpu.level, specs, huntingGround, rebirthIncomeMult, incomeBonusRate, isPartyHunting, partyHuntingTier]);",
)

# 6. auto buy loop — target level
rep("auto loop filter",
"""              const target = owned.filter(p => p.level < OMG.getMaxLevel(type, p)).sort((a, b) => b.level - a.level)[0];
              if (target) {
                const cost = OMG.getUpgradeCost(target.type, target.level, target);
                if (normalCoins >= cost) { handleInventoryUpgrade(target.id); break; }
                setAuto(false); break;
              } else {
                // 더 이상 10강 미만의 예비 부품이 없을 경우 완성 정지
                setAuto(false);
                setCombatLogs(prev => [...prev.slice(-7), `🎉 [SYSTEM] 인벤토리에 이미 10강 이상의 ${type.toUpperCase()} 부품이 있어 자동 강화를 마칩니다.`]);
                break;
              }""",
"""              const goal = autoTargetLevels[type] || 1;
              const target = owned.filter(p => p.level < goal && p.level < OMG.getMaxLevel(type, p)).sort((a, b) => b.level - a.level)[0];
              if (target) {
                const cost = OMG.getUpgradeCost(target.type, target.level, target);
                if (normalCoins >= cost) { handleInventoryUpgrade(target.id); break; }
                setAuto(false); break;
              } else {
                setAuto(false);
                setCombatLogs(prev => [...prev.slice(-7), `🎉 [SYSTEM] ${type.toUpperCase()} 자동강화 목표 ${goal}강 달성.`]);
                break;
              }""")

rep("auto loop deps",
"""      }, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, isUpgrading, inventory, normalCoins, cpuBuyManufacturer, coolerBuyKind, storageBuyKind]);
""",
"""      }, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, autoTargetLevels, isUpgrading, inventory, normalCoins, cpuBuyManufacturer, coolerBuyKind, storageBuyKind]);
""")

# 7. adjustAutoTarget helper before handlePurchaseScaItem
rep("adjustAutoTarget",
"""      const getUpgradeCost = (type, level, part) => OMG.getUpgradeCost(type, level, part || { type });
      const getUpgradeProbability = (type, level, part) => OMG.getUpgradeProbability(type, level, part || { type }, probBonusRate);

      const handlePurchaseScaItem = (item) => {
""",
"""      const getUpgradeCost = (type, level, part) => OMG.getUpgradeCost(type, level, part || { type });
      const getUpgradeProbability = (type, level, part) => OMG.getUpgradeProbability(type, level, part || { type }, probBonusRate);

      const adjustAutoTarget = (type, delta) => {
        setAutoTargetLevels(prev => {
          const sample = inventory.find(p => p.type === type) || { type };
          const maxLv = OMG.getMaxLevel(type, sample);
          const next = Math.max(1, Math.min(maxLv, (prev[type] || 1) + delta));
          return { ...prev, [type]: next };
        });
      };

      const handlePurchaseScaItem = (item) => {
""")

# 8. handleRebirth
rep("handleRebirth",
"""      const handleRebirth = () => {
        if (gpu.level < 10) { alert('GPU 10강 필요'); return; }
        if (!confirm('환생 시 부품·미네랄·Normal 코인이 초기화됩니다. SCA 코인/센터 효과는 유지됩니다.')) return;
        const scaReward = OMG.calcRebirthScaReward(gpu.level, rebirthCount);
        setScaCoins((prev) => prev + scaReward);
        setRebirthCount((prev) => prev + 1);
        setMinerals(OMG.calcRebirthStartMinerals(scaUpgrades));
""",
"""      const handleRebirth = () => {
        if (gpu.level < 10) { alert('GPU 10강 필요'); return; }
        if (!confirm('환생 시 부품·미네랄·Normal 코인이 초기화됩니다. SCA 코인/센터·환생 수치는 유지됩니다.')) return;
        const parts = { cpu, gpu, ram, cooler, storage };
        const statGain = OMG.calcRebirthStatGain(parts);
        const scaReward = OMG.calcRebirthScaReward(parts);
        const startMinerals = OMG.rollRebirthStartMinerals(scaUpgrades);
        setScaCoins((prev) => prev + scaReward);
        setRebirthStat((prev) => prev + statGain);
        setRebirthCount((prev) => prev + 1);
        setMinerals(startMinerals);
""")

rep("handleRebirth message",
"""        setUpgradeMessage(`✨ 환생 완료 — SCA +${scaReward}C`);
        setUpgradeStatus('success');
      };""",
"""        const mineralRange = OMG.calcRebirthMineralRange(scaUpgrades);
        setUpgradeMessage(`✨ 환생 +${statGain.toLocaleString()} 환생수치 · SCA +${scaReward}C · 미네랄 ${startMinerals.toLocaleString()}원 (${mineralRange.min}~${mineralRange.max})`);
        setUpgradeStatus('success');
      };""")

# 9. Header display
rep("header rebirth",
"""                <p className="text-xs text-emerald-500 font-mono">REBIRTH LEVEL: {rebirthCount} (x{(1 + rebirthCount * 0.5).toFixed(1)} BUFF)</p>
""",
"""                <p className="text-xs text-emerald-500 font-mono">환생 {rebirthCount}회 · 환생수치 {rebirthStat.toLocaleString()} · 수입 x{rebirthIncomeMult.toFixed(2)}</p>
""")

# Fix if already replaced by step 3
t = t.replace(
    "환생 {rebirthCount}회 · 환생수치 {rebirthStat.toLocaleString()} · 수입 x{rebirthIncomeMult.toFixed(2)}",
    "환생 {rebirthCount}회 · 환생수ích {rebirthStat.toLocaleString()} · 수입 x{rebirthIncomeMult.toFixed(2)}",
)
# undo typo - the header replace might have already worked with rebirthIncomeMult from step 3
t = t.replace("환생수ích", "환생수치")

# 10. SCA shop UI with purchase count
rep("sca shop ui",
"""              {OMG.SCA_SHOP_ITEMS.map(item => (
                <button key={item.id} onClick={() => handlePurchaseScaItem(item)} className="p-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-left">
                  <div>{item.name}</div><div className="text-cyan-400">{item.cost} SCA</div>
                </button>
              ))}""",
"""              {OMG.SCA_SHOP_ITEMS.map(item => {
                const bought = scaUpgrades[item.id] || 0;
                const soldOut = bought >= item.maxPurchases;
                return (
                  <button key={item.id} onClick={() => handlePurchaseScaItem(item)} disabled={soldOut} className={`p-2 bg-slate-950 border rounded text-[10px] font-mono text-left ${soldOut ? 'border-slate-900 opacity-40' : 'border-slate-800 hover:border-cyan-500/40'}`}>
                    <div>{item.name}</div>
                    <div className="text-cyan-400">{item.cost} SCA</div>
                    <div className="text-slate-500 mt-1">{bought}/{item.maxPurchases}</div>
                  </button>
                );
              })}""")

# 11. Auto target UI — helper block to inject after each AUTO OFF button
auto_target_tpl = """
                        <div className="flex items-center justify-center gap-0.5 text-[8px] font-mono text-slate-500">
                          <button type="button" onClick={() => adjustAutoTarget('{type}', -1)} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded hover:text-slate-300">−</button>
                          <span className="text-slate-400">목표 {autoTargetLevels.{type}}강</span>
                          <button type="button" onClick={() => adjustAutoTarget('{type}', 1)} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded hover:text-slate-300">+</button>
                        </div>"""

for part in ['cpu', 'gpu', 'ram', 'cooler', 'storage']:
    marker = f"""                          <span>{{autoBuy{part.capitalize() if part != 'cpu' else 'Cpu'} ? 'AUTO ON' : 'AUTO OFF'}}</span>
                        </button>
                      </div>"""
    # Fix capitalization - autoBuyCpu, autoBuyGpu, etc.
    names = {'cpu': 'Cpu', 'gpu': 'Gpu', 'ram': 'Ram', 'cooler': 'Cooler', 'storage': 'Storage'}
    var = f"autoBuy{names[part]}"
    old_block = f"""                          <span>{{{var} ? 'AUTO ON' : 'AUTO OFF'}}</span>
                        </button>
                      </div>"""
    new_block = f"""                          <span>{{{var} ? 'AUTO ON' : 'AUTO OFF'}}</span>
                        </button>
{auto_target_tpl.format(type=part)}
                      </div>"""
    if old_block not in t:
        raise SystemExit(f"auto target block not found: {part}")
    t = t.replace(old_block, new_block, 1)
print("OK: auto target UI x5")

# sanity
for bad in ["calcRebirthStartMinerals", "rebirthCount * 0.5"]:
    if bad in t:
        print(f"WARN: still contains {bad}")

p.write_text(t, encoding="utf-8")
print("DONE")
