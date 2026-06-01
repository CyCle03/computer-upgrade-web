#!/usr/bin/env python3
"""Final cleanup patches for index.html"""
from pathlib import Path
import re

path = Path("/workspace/public/index.html")
text = path.read_text(encoding="utf-8")

# Remove duplicate old handlers between equip and startDownload
start = text.index("      // 2.5. 인벤토리 부품 판매 핸들러")
end = text.index("      // ----------------------------------------------------------------------\n      // 8. 상위 사냥터(게임) 다운로드 진행도 시뮬레이션")
text = text[:start] + text[end:]

# Auto-buy loop
text = text.replace(
    """            if (owned.length === 0) {
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
              } else {""",
    """            if (owned.length === 0) {
              const buyMeta = { type, manufacturer: type === 'cpu' ? cpuBuyManufacturer : undefined, coolerKind: type === 'cooler' ? coolerBuyKind : undefined, storageKind: type === 'storage' ? storageBuyKind : undefined };
              if (normalCoins >= OMG.getUpgradeCost(type, 0, buyMeta)) { handleBuyComponentPack(type); break; }
              setAuto(false); break;
            } else {
              const target = owned.filter(p => p.level < OMG.getMaxLevel(type, p)).sort((a, b) => b.level - a.level)[0];
              if (target) {
                const cost = OMG.getUpgradeCost(target.type, target.level, target);
                if (normalCoins >= cost) { handleInventoryUpgrade(target.id); break; }
                setAuto(false); break;
              } else {""",
    1,
)
text = text.replace(
    "}, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, isUpgrading, inventory, minerals]);",
    "}, [autoBuyCpu, autoBuyGpu, autoBuyRam, autoBuyCooler, autoBuyStorage, isUpgrading, inventory, normalCoins, cpuBuyManufacturer, coolerBuyKind, storageBuyKind]);",
    1,
)

# Download complete
text = text.replace(
    """              setHuntingGround({
                name: downloadTarget.name,
                multiplier: downloadTarget.multiplier
              });
              setDownloadTarget({
                name: '데이터 웜홀 센터 (3단계)',
                sizeMb: 25000,
                requiredGb: 1000,
                multiplier: 5.0
              });""",
    """              const ground = OMG.WORK_HUNTING_GROUNDS[downloadTarget.groundIndex];
              setHuntingGround({ name: ground.name, multiplier: ground.multiplier, mineralBase: ground.mineralBase, groundIndex: downloadTarget.groundIndex });
              const nextTarget = OMG.DOWNLOAD_TARGETS.find(t => t.groundIndex === downloadTarget.groundIndex + 1);
              if (nextTarget) setDownloadTarget({ name: nextTarget.name, sizeMb: nextTarget.sizeMb, requiredGb: nextTarget.requiredGb, groundIndex: nextTarget.groundIndex });""",
    1,
)

# Header + SCA + party UI
text = text.replace(
    '              <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">MINERALS</span>',
    '              <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">MINERALS (원)</span>', 1)
text = text.replace(
    '<span className="text-xs text-emerald-500/60 ml-1">M</span>',
    '<span className="text-xs text-emerald-500/60 ml-1">/10k→1C</span>', 1)
text = text.replace(
    '              <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">NORMAL COINS</span>',
    '              <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">NORMAL COINS (가스)</span>', 1)
text = text.replace(
    "          </header>\n\n          {/* ================================================================== */}\n          {/* 강화 플래시 스크린 */}",
    """          </header>
          <div className="mb-4 flex gap-2 flex-wrap">
            <button onClick={() => setShowScaCenter(v => !v)} className="px-3 py-2 text-xs font-mono border border-cyan-500/30 rounded text-cyan-300">🏛️ SCA 센터</button>
            <button onClick={() => setIsPartyHunting(v => !v)} className="px-3 py-2 text-xs font-mono border border-emerald-500/30 rounded text-emerald-300">👥 파티 사냥 {isPartyHunting ? 'ON' : 'OFF'}</button>
          </div>
          {showScaCenter && (
            <section className="mb-4 p-4 border border-cyan-500/20 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-2">
              {OMG.SCA_SHOP_ITEMS.map(item => (
                <button key={item.id} onClick={() => handlePurchaseScaItem(item)} className="p-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-left">
                  <div>{item.name}</div><div className="text-cyan-400">{item.cost} SCA</div>
                </button>
              ))}
            </section>
          )}
          {isPartyHunting && (
            <section className="mb-4 p-4 border border-emerald-500/20 rounded-xl grid grid-cols-3 md:grid-cols-5 gap-2">
              {OMG.PARTY_HUNTING_TIERS.map((tier, idx) => (
                <button key={tier.name} onClick={() => setPartyHuntingTier(idx)} className={`p-2 rounded border text-[9px] font-mono ${partyHuntingTier===idx?'border-emerald-500':'border-slate-800'}`}>
                  {tier.name}<br/>+{tier.mineralPerTick}원 / +{tier.scaCoins}SCA
                </button>
              ))}
            </section>
          )}

          {/* ================================================================== */}
          {/* 강화 플래시 스크린 */}""",
    1,
)

# Shop description
text = text.replace(
    "미네랄을 지불하여 1강 스펙의 부품 상자를 조달받아",
    "미네랄 10,000원이 Normal 코인(가스)으로 자동 환전됩니다. 코인으로",
    1,
)

# Motherboard UI block
mb_pat = r'                    <div className="grid grid-cols-3 gap-2\.5 pt-2\.5 border-t border-slate-900">[\s\S]*?                    </div>\n                  </div>\n\n                  /\* 저장장치'
mb_rep = '''                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-900">
                      {OMG.MOTHERBOARDS.map(board => (
                        <button key={board.name} onClick={() => handlePurchaseMotherboard(board)} className="p-2 bg-slate-900 border border-slate-800 rounded text-center">
                          <span className="text-[10px] font-bold text-slate-200">{board.name}</span>
                          <span className="text-[9px] text-cyan-400 font-mono block">{board.cost} C</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 저장장치'''
text = re.sub(mb_pat, mb_rep, text, count=1)

# Storage buttons
text = text.replace(
    """                      <button 
                        onClick={() => {
                          if (minerals >= 600) {
                            setMinerals(p => p - 600);
                            setStorage(prev => ({ ...prev, type: 'SSD', capacityGb: prev.capacityGb + 500 }));
                          } else alert('미네랄이 부족합니다.');
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded flex flex-col items-center transition"
                      >
                        <span className="text-[10px] font-bold text-slate-300">SSD 교체</span>
                        <span className="text-[9px] text-emerald-400 font-bold mt-1">600 M</span>
                      </button>
                      <button 
                        onClick={() => handleUpgrade(storage, setStorage, 'storage')}
                        disabled={isUpgrading}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 rounded flex flex-col items-center justify-center transition disabled:opacity-50"
                      >
                        <span className="text-[10px] font-bold">용량 강화</span>
                        <span className="text-[9px] mt-1">{getUpgradeCost(storage.level || 1).toLocaleString()} M</span>
                      </button>""",
    """                      <button onClick={() => { const c = OMG.getUpgradeCost('storage', 0, { type: 'storage', storageKind: 'nvme' }); if (normalCoins >= c) { setNormalCoins(p=>p-c); setStorage({ type: 'SSD', storageKind: 'nvme', level: 1, capacityGb: 250 }); } else alert('Normal 코인 부족'); }} className="px-3 py-2 bg-slate-900 border border-slate-800 rounded flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-300">NVMe 1강</span>
                        <span className="text-[9px] text-cyan-400 font-bold mt-1">{OMG.getUpgradeCost('storage', 0, { type: 'storage', storageKind: 'nvme' })} C</span>
                      </button>
                      <button onClick={() => { const sl = storage.level||1; const kind = storage.storageKind||'hdd'; const c = OMG.getUpgradeCost('storage', sl, { type: 'storage', storageKind: kind }); if (normalCoins < c) return alert('Normal 코인 부족'); setNormalCoins(p=>p-c); const u = OMG.applyTierStats({ type: 'storage', storageKind: kind, storageType: storage.type, level: sl }, sl+1); setStorage({ type: u.storageType, storageKind: kind, level: u.level, capacityGb: u.capacityGb }); }} className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded flex flex-col items-center text-emerald-400">
                        <span className="text-[10px] font-bold">용량 강화</span>
                        <span className="text-[9px] mt-1">{OMG.getUpgradeCost('storage', storage.level || 1, { type: 'storage', storageKind: storage.storageKind || 'hdd' })} C</span>
                      </button>""",
    1,
)

# Inventory cost display - simple replace for getUpgradeCost(p.level)
text = text.replace(
    "                          const cost = getUpgradeCost(p.level);\n                          const prob = getUpgradeProbability(p.level);",
    "                          const cost = p.level >= OMG.getMaxLevel(p.type, p) ? null : getUpgradeCost(p.type, p.level, p);\n                          const prob = cost ? getUpgradeProbability(p.type, p.level, p) : 0;",
    1,
)
text = text.replace("                                  강화: {cost.toLocaleString()}M", "                                  {cost ? `강화: ${cost}C` : '최고강'}", 1)
text = text.replace(
    "                            partName = getCpuName(p.level);",
    "                            partName = getCpuName(p.level, p.manufacturer);", 1)
text = text.replace(
    "                            partName = getRamName(p.level);",
    "                            partName = getRamName(p.level, p);", 1)
text = text.replace(
    "                            partName = getCoolerName(p.level);",
    "                            partName = getCoolerName(p.level, p);", 1)

path.write_text(text, encoding="utf-8")
print("cleanup OK", len(text))
