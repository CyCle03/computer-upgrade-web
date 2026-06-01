#!/usr/bin/env python3
from pathlib import Path

p = Path("/workspace/public/index.html")
t = p.read_text(encoding="utf-8")

def must_find(label, old):
    if old not in t:
        raise SystemExit(f"NOT FOUND: {label}")

def rep(label, old, new):
    global t
    must_find(label, old)
    t = t.replace(old, new, 1)
    print(f"OK: {label}")

rep("cooler default",
    "return saved !== null ? JSON.parse(saved) : { level: 1, coolingCapacity: 30 };",
    "return saved !== null ? JSON.parse(saved) : { level: 1, coolingCapacity: 100, coolerKind: 'air' };")

rep("inv cooler",
    "{ id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 30 },",
    "{ id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 100, coolerKind: 'air' },")

rep("cooler migrate",
    "      useEffect(() => {\n        if (minerals >= OMG.MINERAL_PER_COIN) {",
    """      useEffect(() => {
        if (cooler.level === 1 && cooler.coolingCapacity === 30) {
          setCooler(c => ({ ...c, coolingCapacity: 100, coolerKind: c.coolerKind || 'air' }));
        }
      }, []);

      useEffect(() => {
        if (minerals >= OMG.MINERAL_PER_COIN) {""")

rep("workerType state",
    """      const [workerType, setWorkerType] = useState(() => {
        return localStorage.getItem('sca_workerType') || 'SCV';
      });
""", "")

rep("miningMessage state", "      const [miningMessage, setMiningMessage] = useState('');\n", "")

rep("handleManualMining", """      const handleManualMining = () => {
        const baseIncome = Math.round((huntingGround.mineralBase || 5 * huntingGround.multiplier) * specs.penalties.mineralMultiplier * (1 + incomeBonusRate));
        const income = Math.round(baseIncome * (1 + rebirthCount * 0.5));
        setMinerals(prev => prev + income);

        const actions = {
          SCV: [
            `🛠️ [SCV] 지지직... 융합 절단기로 미네랄 결정을 조각내어 커맨드 센터로 전송! (+${income}M)`,
            `🛠️ [SCV] "SCV 좋은데~" 융합 절단기 오버클럭 가동 완료! (+${income}M)`,
            `🛠️ [SCV] 지이잉- 광물 채굴 집게 가동! 광석을 커맨드 센터로 운반합니다. (+${income}M)`
          ],
          Probe: [
            `🔮 [Probe] 삐비빅! 사이오닉 에너지 동력장을 활성화해 광물을 넥서스로 즉시 소환! (+${income}M)`,
            `🔮 [Probe] 웅- 탐사정이 미네랄 주변에 미세 차원 워프 게이트를 개방했습니다! (+${income}M)`,
            `🔮 [Probe] 삐-익! 고주파 빔으로 광석의 핵을 정밀 분리해 넥서스로 전송 완료! (+${income}M)`
          ],
          Drone: [
            `🧬 [Drone] 쿠르릉... 날카로운 턱발톱으로 미네랄 층을 긁어 해처리로 이송! (+${income}M)`,
            `🧬 [Drone] 쉭쉭- 드론이 광석 베이스를 갉아 해처리 배양액에 누적합니다! (+${income}M)`,
            `🧬 [Drone] 크르르... 군락지의 산성 타액으로 광물을 녹여 유기 재화로 환원! (+${income}M)`
          ]
        };
        const activeList = actions[workerType];
        const randomAction = activeList[Math.floor(Math.random() * activeList.length)];
        setMiningMessage(randomAction);
      };

""", "")

rep("handleManualClick", """      const handleManualClick = () => {
        const baseIncome = Math.round(5 * specs.penalties.mineralMultiplier * huntingGround.multiplier);
        const income = Math.round(baseIncome * (1 + rebirthCount * 0.5));
        setMinerals(prev => prev + income);
      };

""", "")

rep("worker localStorage", "        localStorage.setItem('sca_workerType', workerType);\n", "")
t = t.replace(", workerType", "")

rep("work income pause",
"""      useEffect(() => {
        const interval = setInterval(() => {
          const base = huntingGround.mineralBase || 10 * huntingGround.multiplier;
          setMinerals(p => p + Math.round(base * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate)));
        }, 1000);
        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount, incomeBonusRate]);""",
"""      useEffect(() => {
        if (isPartyHunting) return;
        const interval = setInterval(() => {
          const base = huntingGround.mineralBase || 10 * huntingGround.multiplier;
          setMinerals(p => p + Math.round(base * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate)));
        }, 1000);
        return () => clearInterval(interval);
      }, [specs, huntingGround, rebirthCount, incomeBonusRate, isPartyHunting]);""")

rep("combat log",
"""      useEffect(() => {
        const interval = setInterval(() => {
          const summon = getSummonUnit(cpu.level);
          const enemies = ['카카루 (Cacaru)', '스커지 (Scourge)', '벵갈라스 (Bengalaas)', '우르사돈 (Ursadon)', '라그나로크 (Lagnasaur)', '파괴자 (Reaver)', '공허의 파편'];
          const enemy = enemies[Math.floor(Math.random() * enemies.length)];
          const earn = Math.round(10 * specs.penalties.mineralMultiplier * huntingGround.multiplier * (1 + rebirthCount * 0.5));
          const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
          
          const newLog = `[${time}] 🔫 배틀 기동 :: ${summon.emoji} ${summon.name.split(' ')[1]} ${specs.unitLimit}기가 '${enemy}'를 격퇴하고 +${earn}M 획득!`;
          
          setCombatLogs(prev => {
            const nextLogs = [...prev, newLog];
            if (nextLogs.length > 8) {
              nextLogs.shift();
            }
            return nextLogs;
          });
        }, 1500);

        return () => clearInterval(interval);
      }, [cpu.level, specs, huntingGround, rebirthCount]);""",
"""      useEffect(() => {
        const interval = setInterval(() => {
          const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
          let newLog;
          if (isPartyHunting) {
            const tier = OMG.PARTY_HUNTING_TIERS[partyHuntingTier];
            if (!tier) return;
            const mEarn = Math.round(tier.mineralPerTick * (1 + incomeBonusRate));
            newLog = `[${time}] 👥 파티 :: ${tier.name} +${mEarn}원 +${tier.scaCoins}C`;
          } else {
            const base = huntingGround.mineralBase || 10 * huntingGround.multiplier;
            const earn = Math.round(base * specs.penalties.mineralMultiplier * (1 + rebirthCount * 0.5) * (1 + incomeBonusRate));
            newLog = `[${time}] 💼 작업 :: ${huntingGround.name} 자동 수입 +${earn}원`;
          }
          setCombatLogs(prev => {
            const nextLogs = [...prev, newLog];
            if (nextLogs.length > 8) nextLogs.shift();
            return nextLogs;
          });
        }, 1500);
        return () => clearInterval(interval);
      }, [cpu.level, specs, huntingGround, rebirthCount, incomeBonusRate, isPartyHunting, partyHuntingTier]);""")

rep("top party",
"""          <div className="mb-4 flex gap-2 flex-wrap">
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
          )}""",
"""          <div className="mb-4 flex gap-2 flex-wrap">
            <button onClick={() => setShowScaCenter(v => !v)} className="px-3 py-2 text-xs font-mono border border-cyan-500/30 rounded text-cyan-300">🏛️ SCA 센터</button>
          </div>
          {showScaCenter && (
            <section className="mb-4 p-4 border border-cyan-500/20 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-2">
              {OMG.SCA_SHOP_ITEMS.map(item => (
                <button key={item.id} onClick={() => handlePurchaseScaItem(item)} className="p-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-left">
                  <div>{item.name}</div><div className="text-cyan-400">{item.cost} SCA</div>
                </button>
              ))}
            </section>
          )}""")

# worker UI - read exact from file
worker_start = t.index('              <div className="p-4 bg-slate-950/60 rounded border border-slate-800 space-y-3">')
worker_end = t.index('            </section>\n\n            <section className="lg:col-span-7 flex flex-col space-y-6">', worker_start)
worker_old = t[worker_start:worker_end]
worker_new = """              <div className="p-4 bg-slate-950/60 rounded border border-slate-800">
                <button 
                  onClick={joinRaidRoom}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition text-slate-950 font-bold rounded-lg font-mono text-sm shadow-lg shadow-cyan-500/20"
                >
                  <span className="text-sm mr-1">⚔️</span>
                  <span>100층 레이드 참가</span>
                </button>
              </div>
"""
t = t[:worker_start] + worker_new + t[worker_end:]
print("OK: worker UI")

bottom_start = t.index('              {/* ---------------------------------------------------------------- */}\n              {/* 하단 - 사냥터 상태 및 상위 사냥터(게임) 다운로드 인터랙션 */}')
bottom_end = t.index('            </section>\n          </main>', bottom_start)
bottom_new = """              {/* ---------------------------------------------------------------- */}
              {/* 하단 - 작업 사냥터 / 파티 사냥터 */}
              {/* ---------------------------------------------------------------- */}
              <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800 flex flex-col space-y-4">
                <h2 className="text-md uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <span className="text-emerald-400 text-lg mr-1.5">💼</span>
                  <span>작업 사냥터</span>
                </h2>
                <p className="text-xs text-slate-400">미네랄 자동 수입 · 게임 다운로드 (원작 작업)</p>
                <div className="flex flex-wrap gap-2">
                  {OMG.WORK_HUNTING_GROUNDS.map((g, idx) => (
                    <button key={g.name} onClick={() => setHuntingGround({ name: g.name, multiplier: g.multiplier, mineralBase: g.mineralBase, groundIndex: idx })} className={`text-[10px] px-2 py-1 rounded font-mono border ${(huntingGround.groundIndex ?? 0) === idx ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>{g.name}</button>
                  ))}
                </div>
                <div className="p-4 bg-slate-950/60 rounded border border-slate-800 flex flex-col space-y-4 md:flex-row md:space-y-0 md:justify-between md:items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">현재 작업</span>
                    <p className="text-md font-bold text-emerald-400">{huntingGround.name}</p>
                    <p className="text-xs text-slate-400 mt-1">틱당 약 <strong className="text-emerald-400">{huntingGround.mineralBase || Math.round(10 * huntingGround.multiplier)}</strong>원 · 배율 x{huntingGround.multiplier.toFixed(1)}{isPartyHunting ? ' · 파티 ON — 작업 수입 중단' : ''}</p>
                  </div>
                  <div className="flex flex-col space-y-2 min-w-[50%]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">다음 작업 다운로드: <strong>{downloadTarget.name}</strong></span>
                      <span className="text-slate-500 font-mono">요구: {downloadTarget.requiredGb}GB</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 p-0.5">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-100 flex justify-end items-center pr-1.5" style={{ width: `${downloadProgress}%` }}>
                        <span className="text-[8px] font-bold text-slate-950 font-mono">{Math.round(downloadProgress)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                      <span className="text-slate-500">속도: {specs.downloadSpeedMb} MB/s ({storage.type})</span>
                      {!isDownloading ? (
                        <button onClick={startDownload} className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 border border-cyan-500/20 rounded font-bold transition text-[10px]">다운로드 시작</button>
                      ) : (
                        <span className="text-cyan-400 animate-pulse">다운로드 진행 중...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 p-6 rounded-xl border border-purple-900/40 flex flex-col space-y-4">
                <h2 className="text-md uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <span className="text-purple-400 text-lg mr-1.5">👥</span>
                  <span>파티 사냥터</span>
                </h2>
                <p className="text-xs text-slate-400">원 + SCA 코인 · 파티 ON 시 작업 수입 중단</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setIsPartyHunting(v => !v)} className={`text-sm px-3 py-1.5 rounded font-mono font-bold border ${isPartyHunting ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{isPartyHunting ? '파티 ON' : '파티 OFF'}</button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {OMG.PARTY_HUNTING_TIERS.map((tier, idx) => (
                    <button key={tier.name} onClick={() => { setPartyHuntingTier(idx); setIsPartyHunting(true); }} disabled={!isPartyHunting} className={`p-2 rounded border text-[9px] font-mono text-left disabled:opacity-40 ${partyHuntingTier === idx && isPartyHunting ? 'border-purple-500 bg-purple-950/30' : 'border-slate-800 bg-slate-950'}`}>{tier.name}<br/>+{tier.mineralPerTick}원 / +{tier.scaCoins}SCA</button>
                  ))}
                </div>
                {isPartyHunting && OMG.PARTY_HUNTING_TIERS[partyHuntingTier] && (
                  <p className="text-xs text-purple-300 font-mono">선택: {OMG.PARTY_HUNTING_TIERS[partyHuntingTier].name} · 3초당 +{OMG.PARTY_HUNTING_TIERS[partyHuntingTier].mineralPerTick}원 +{OMG.PARTY_HUNTING_TIERS[partyHuntingTier].scaCoins}C</p>
                )}
              </div>

              <div className="p-4 bg-slate-950/90 rounded border border-emerald-500/30 neon-border-emerald flex flex-col space-y-2.5">
                <div className="flex justify-between items-center border-b border-emerald-950 pb-2">
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase flex items-center space-x-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>수입 로그</span>
                  </span>
                  <span className="text-[9px] text-emerald-600 font-mono">{isPartyHunting ? 'PARTY' : 'WORK'}</span>
                </div>
                <div className="h-36 overflow-y-auto font-mono text-[10px] text-emerald-400/90 space-y-1.5 select-text leading-relaxed">
                  {combatLogs.map((log, idx) => (
                    <div key={idx} className="transition-all duration-300 hover:text-emerald-300">{log}</div>
                  ))}
                </div>
              </div>
"""
t = t[:bottom_start] + bottom_new + t[bottom_end:]
print("OK: bottom sections")

# sanity
for bad in ["handleManualMining", "workerType", "miningMessage", "coolingCapacity: 30"]:
    if bad in t and bad != "coolingCapacity: 30":
        print(f"WARN still has {bad}")
    elif bad == "coolingCapacity: 30" and "coolingCapacity: 30" in t:
        print("NOTE: coolingCapacity: 30 still in file (migration check only)")

must_find("OMG", "const OMG = window.OriginalMapGame;")
must_find("originalMapData", "/originalMapData.js")

p.write_text(t, encoding="utf-8")
print("DONE", len(t))
