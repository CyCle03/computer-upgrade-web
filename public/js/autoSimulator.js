/**
 * AUTO · 방치 수입 시뮬레이터
 * React setState 없이 메모리에서 돌린 뒤 최종 상태만 반환한다.
 */
(function (global) {
  const OMG = global.OriginalMapGame;
  if (!OMG) return;

  const MAX_INCOME_TICKS = 120000;
  const DEFAULT_MAX_AUTO_TICKS = 50000;

  function partMatchesBuyMeta(part, type, buyMeta) {
    if (!part || part.type !== type) return false;
    if (type === 'cpu') return (part.manufacturer || 'Intel') === (buyMeta.manufacturer || 'Intel');
    if (type === 'cooler') return (part.coolerKind || 'air') === (buyMeta.coolerKind || 'air');
    if (type === 'storage') {
      const kind = part.storageKind || (part.storageType === 'SSD' ? 'nvme' : 'hdd');
      return kind === (buyMeta.storageKind || 'hdd');
    }
    return true;
  }

  function buildBuyMetaForVariant(type, variantKey) {
    if (type === 'cpu') return { manufacturer: variantKey };
    if (type === 'cooler') return { coolerKind: variantKey };
    if (type === 'storage') return { storageKind: variantKey };
    return {};
  }

  function getComponentBuyMeta(ctx, type) {
    return {
      type,
      manufacturer: type === 'cpu' ? ctx.cpuBuyManufacturer : undefined,
      coolerKind: type === 'cooler' ? ctx.coolerBuyKind : undefined,
      storageKind: type === 'storage' ? ctx.storageBuyKind : undefined,
    };
  }

  function getAutoBuyLevel(type, goal, buyMeta) {
    const levels = OMG.getPurchasableLevels(type, buyMeta);
    if (!levels.length) return null;
    const target = goal || 1;
    const below = levels.filter((lv) => lv < target);
    if (below.length) return Math.max(...below);
    if (levels.includes(target)) return target;
    return Math.min(...levels);
  }

  function getAutoJobs(ctx) {
    return [
      { type: 'cpu', variantKey: 'Intel', active: ctx.autoBuyCpuByMfr && ctx.autoBuyCpuByMfr.Intel, label: 'Intel CPU' },
      { type: 'cpu', variantKey: 'AMD', active: ctx.autoBuyCpuByMfr && ctx.autoBuyCpuByMfr.AMD, label: 'AMD CPU' },
      { type: 'gpu', variantKey: null, active: ctx.autoBuyGpu, label: 'GPU' },
      { type: 'ram', variantKey: null, active: ctx.autoBuyRam, label: 'RAM' },
      { type: 'cooler', variantKey: 'air', active: ctx.autoBuyCoolerByKind && ctx.autoBuyCoolerByKind.air, label: '공랭' },
      { type: 'cooler', variantKey: 'water', active: ctx.autoBuyCoolerByKind && ctx.autoBuyCoolerByKind.water, label: '수랭' },
      { type: 'storage', variantKey: 'hdd', active: ctx.autoBuyStorageByKind && ctx.autoBuyStorageByKind.hdd, label: 'HDD' },
      { type: 'storage', variantKey: 'nvme', active: ctx.autoBuyStorageByKind && ctx.autoBuyStorageByKind.nvme, label: 'NVMe' },
    ];
  }

  function disableAutoVariant(ctx, type, variantKey, message) {
    if (type === 'cpu') ctx.autoBuyCpuByMfr = { ...ctx.autoBuyCpuByMfr, [variantKey]: false };
    else if (type === 'cooler') ctx.autoBuyCoolerByKind = { ...ctx.autoBuyCoolerByKind, [variantKey]: false };
    else if (type === 'storage') ctx.autoBuyStorageByKind = { ...ctx.autoBuyStorageByKind, [variantKey]: false };
    else if (type === 'gpu') ctx.autoBuyGpu = false;
    else if (type === 'ram') ctx.autoBuyRam = false;
    ctx.autoFlagsDirty = true;
    if (message) ctx.logs.push(message);
  }

  function pushAutoEvent(ctx, event) {
    if (!event) return;
    ctx.autoEvents = ctx.autoEvents || [];
    ctx.autoEvents.push(event);
    ctx.lastAutoEvent = event;
  }

  function simBuy(ctx, type, level, buyMeta, label) {
    const costM = OMG.getShopTierCostMinerals(type, level, buyMeta);
    if (ctx.minerals < costM) return null;
    ctx.minerals -= costM;
    const part = OMG.buildInventoryPart(type, level, buyMeta);
    ctx.inventory.push(part);
    ctx.stats.buys += 1;
    const tierName = OMG.getPartName(type, level, part);
    const event = {
      kind: 'buy',
      type,
      level,
      partId: part.id,
      cost: costM,
      label: label || type.toUpperCase(),
      message: `[AUTO] ${label || type} ${tierName} +${level}강 구매 (−${OMG.formatMineral(costM)})`,
    };
    pushAutoEvent(ctx, event);
    return event;
  }

  function simUpgrade(ctx, partId, label) {
    const idx = ctx.inventory.findIndex((p) => p.id === partId);
    if (idx < 0) return null;
    const part = ctx.inventory[idx];
    const prob = OMG.getUpgradeProbability(part.type, part.level, part, ctx.probBonusRate || 0);
    const partLabel = label || part.type.toUpperCase();
    if (Math.random() <= prob) {
      const nextLevel = part.level + 1;
      ctx.inventory[idx] = OMG.applyTierStats(part, nextLevel);
      ctx.stats.upgrades += 1;
      const event = {
        kind: 'upgrade',
        type: part.type,
        level: nextLevel,
        fromLevel: part.level,
        partId,
        label: partLabel,
        message: `[AUTO] ${partLabel} +${part.level}강 → +${nextLevel}강 성공`,
      };
      pushAutoEvent(ctx, event);
      return event;
    }
    ctx.inventory.splice(idx, 1);
    ctx.stats.explosions += 1;
    const event = {
      kind: 'explosion',
      type: part.type,
      level: part.level,
      partId,
      label: partLabel,
      message: `[AUTO] ${partLabel} +${part.level}강 파괴`,
    };
    pushAutoEvent(ctx, event);
    return event;
  }

  /** AUTO 1스텝 (강화 우선 → 구매). opts.upgradesOnly 이면 구매 생략 */
  function simulateOneAutoStep(ctx, opts) {
    if (ctx.isUpgrading) return { acted: false, reason: 'manual' };
    const upgradesOnly = opts && opts.upgradesOnly;

    let anyActive = false;
    let waitingForMinerals = false;

    for (const job of getAutoJobs(ctx)) {
      if (!job.active) continue;
      anyActive = true;
      const { type, variantKey, label } = job;
      const buyMeta = variantKey != null
        ? buildBuyMetaForVariant(type, variantKey)
        : getComponentBuyMeta(ctx, type);
      const goalVal = ctx.autoTargetLevels[type];
      const goal = variantKey != null && goalVal && typeof goalVal === 'object'
        ? (goalVal[variantKey] || 1)
        : (typeof goalVal === 'number' ? goalVal : 1);
      const levels = OMG.getPurchasableLevels(type, buyMeta);
      if (!levels.length) continue;

      const buyLevel = getAutoBuyLevel(type, goal, buyMeta);
      const owned = ctx.inventory.filter((p) => partMatchesBuyMeta(p, type, buyMeta));
      const maxOwnedLevel = owned.length ? Math.max(...owned.map((p) => p.level)) : 0;
      const upgradeTarget = owned
        .filter((p) => p.level < goal && p.level < OMG.getMaxLevel(type, p))
        .sort((a, b) => b.level - a.level)[0];
      const needsShopBuy = buyLevel != null && (owned.length === 0 || maxOwnedLevel < buyLevel);

      if (buyLevel == null && owned.length === 0) {
        disableAutoVariant(ctx, type, variantKey, `⚠️ [AUTO] ${label} 직접 구매 가능한 강 없음 → 중단`);
        continue;
      }

      if (upgradeTarget) {
        const event = simUpgrade(ctx, upgradeTarget.id, label);
        if (event) {
          ctx.stats.autoActions += 1;
          return { acted: true, event };
        }
        continue;
      }

      if (upgradesOnly) {
        if (!needsShopBuy) {
          disableAutoVariant(ctx, type, variantKey, `🎉 [AUTO] ${label} 목표 ${goal}강 달성`);
        }
        continue;
      }

      if (needsShopBuy) {
        const event = simBuy(ctx, type, buyLevel, buyMeta, label);
        if (event) {
          ctx.stats.autoActions += 1;
          return { acted: true, event };
        }
        waitingForMinerals = true;
        continue;
      }

      disableAutoVariant(ctx, type, variantKey, `🎉 [AUTO] ${label} 목표 ${goal}강 달성`);
    }

    if (!anyActive) return { acted: false, reason: 'off' };
    if (waitingForMinerals) return { acted: false, reason: 'waiting_minerals' };
    return { acted: false, reason: 'idle' };
  }

  function detectAutoStatus(ctx) {
    if (!hasActiveAuto(ctx)) {
      return { code: 'off', message: 'AUTO 꺼짐' };
    }
    if (ctx.isUpgrading) {
      return { code: 'manual', message: '수동 강화 중 — AUTO 일시 정지' };
    }

    let waiting = false;
    let canAct = false;
    for (const job of getAutoJobs(ctx)) {
      if (!job.active) continue;
      const jc = resolveJobContext(ctx, job);
      const target = getJobUpgradeTarget(ctx.inventory, jc.type, jc.buyMeta, jc.goal);
      if (target) {
        canAct = true;
        break;
      }
      if (needsShopBuyForJob(ctx.inventory, jc.buyLevel, jc.type, jc.buyMeta)) {
        if (ctx.minerals >= jc.buyCost) canAct = true;
        else waiting = true;
      }
    }

    if (canAct) return { code: 'running', message: 'AUTO 진행 중' };
    if (waiting) return { code: 'waiting', message: '미네랄 부족 — 수입 대기 중' };
    return { code: 'idle', message: 'AUTO 대기 (목표 달성 또는 작업 없음)' };
  }

  /** 실시간 tick용 — AUTO 간격마다 1스텝씩, 이벤트 수집 */
  function simulateAutoRealtimeSteps(ctx, elapsedMs, options) {
    if (ctx.isUpgrading || !hasActiveAuto(ctx)) {
      ctx.autoStatus = detectAutoStatus(ctx);
      return;
    }
    const autoTickMs = OMG.calcAutoLoopIntervalMs(ctx.scaUpgrades || {});
    const maxSteps = (options && options.maxAutoStepsPerTick) || 1;
    let autoRem = (ctx.remAuto || 0) + elapsedMs;
    const autoConsumed = OMG.consumeElapsedTicks(autoRem, autoTickMs, maxSteps);
    ctx.remAuto = autoConsumed.remainderMs;
    ctx.autoEvents = [];
    for (let i = 0; i < autoConsumed.ticks; i += 1) {
      simulateOneAutoStep(ctx, options);
    }
    ctx.autoStatus = detectAutoStatus(ctx);
    ctx.stats.autoActions = ctx.stats.buys + ctx.stats.upgrades + ctx.stats.explosions;
  }

  function cloneInventory(inv) {
    return JSON.parse(JSON.stringify(inv || []));
  }

  /** 해당 job 부품만 새 인벤으로 교체 (다른 부품 유지) */
  function mergeJobInventory(oldInv, newInv, type, buyMeta) {
    const others = oldInv.filter((p) => !partMatchesBuyMeta(p, type, buyMeta));
    const jobItems = newInv.filter((p) => partMatchesBuyMeta(p, type, buyMeta));
    return others.concat(jobItems);
  }

  function getJobUpgradeTarget(inv, type, buyMeta, goal) {
    return inv
      .filter((p) => partMatchesBuyMeta(p, type, buyMeta) && p.level < goal && p.level < OMG.getMaxLevel(type, p))
      .sort((a, b) => b.level - a.level)[0];
  }

  function resolveJobContext(ctx, job) {
    const { type, variantKey, label } = job;
    const buyMeta = variantKey != null
      ? buildBuyMetaForVariant(type, variantKey)
      : getComponentBuyMeta(ctx, type);
    const goalVal = ctx.autoTargetLevels[type];
    const goal = variantKey != null && goalVal && typeof goalVal === 'object'
      ? (goalVal[variantKey] || 1)
      : (typeof goalVal === 'number' ? goalVal : 1);
    const levels = OMG.getPurchasableLevels(type, buyMeta);
    const buyLevel = levels.length ? getAutoBuyLevel(type, goal, buyMeta) : null;
    const buyCost = buyLevel != null ? OMG.getShopTierCostMinerals(type, buyLevel, buyMeta) : 0;
    return { type, variantKey, label, buyMeta, goal, buyLevel, buyCost };
  }

  function needsShopBuyForJob(inv, buyLevel, type, buyMeta) {
    const owned = inv.filter((p) => partMatchesBuyMeta(p, type, buyMeta));
    const maxOwnedLevel = owned.length ? Math.max(...owned.map((p) => p.level)) : 0;
    return buyLevel != null && (owned.length === 0 || maxOwnedLevel < buyLevel);
  }

  function isJobGoalReached(inv, type, buyMeta, goal) {
    const owned = inv.filter((p) => partMatchesBuyMeta(p, type, buyMeta));
    if (!owned.length) return false;
    return owned.some((p) => p.level >= goal);
  }

  /**
   * 한 job에 대해 최대 maxAttempts번 강화(＋필요 시 구매)를 메모리에서 시뮬.
   * - 강화 1회라도 성공: 그 시점까지 쓴 구매비만 차감, 인벤 반영 후 종료
   * - 전부 실패: 시도한 구매비 전부 차감, 파괴된 상태 반영
   * (강화 자체는 미네랄 0, 구매만 미네랄 소모)
   */
  function simulateJobUpgradeBatch(ctx, job, maxAttempts) {
    if (ctx.isUpgrading) return { success: false };

    const jc = resolveJobContext(ctx, job);
    const { type, variantKey, label, buyMeta, goal, buyLevel, buyCost } = jc;

    if (!OMG.getPurchasableLevels(type, buyMeta).length) return { success: false };

    if (buyLevel == null && !ctx.inventory.some((p) => partMatchesBuyMeta(p, type, buyMeta))) {
      disableAutoVariant(ctx, type, variantKey, `⚠️ [AUTO] ${label} 직접 구매 가능한 강 없음 → 중단`);
      return { success: false };
    }

    if (isJobGoalReached(ctx.inventory, type, buyMeta, goal)) {
      disableAutoVariant(ctx, type, variantKey, `🎉 [AUTO] ${label} 목표 ${goal}강 달성`);
      return { success: true, goalReached: true };
    }

    const cap = Math.max(1, Math.min(maxAttempts || 100, 500));
    let minerals = ctx.minerals;
    let inv = cloneInventory(ctx.inventory);
    let spent = 0;
    let batchBuys = 0;
    let batchUpgrades = 0;
    let batchExplosions = 0;
    let hadSuccess = false;

    for (let attempt = 0; attempt < cap; attempt += 1) {
      if (isJobGoalReached(inv, type, buyMeta, goal)) {
        hadSuccess = true;
        break;
      }

      let target = getJobUpgradeTarget(inv, type, buyMeta, goal);

      if (!target) {
        if (!needsShopBuyForJob(inv, buyLevel, type, buyMeta)) break;
        if (minerals < buyCost) break;
        minerals -= buyCost;
        spent += buyCost;
        batchBuys += 1;
        inv.push(OMG.buildInventoryPart(type, buyLevel, buyMeta));
        target = inv[inv.length - 1];
      }

      if (!target || target.level >= goal) {
        if (target && target.level >= goal) hadSuccess = true;
        break;
      }

      const idx = inv.findIndex((p) => p.id === target.id);
      if (idx < 0) continue;

      const prob = OMG.getUpgradeProbability(target.type, target.level, target, ctx.probBonusRate || 0);
      if (Math.random() <= prob) {
        inv[idx] = OMG.applyTierStats(target, target.level + 1);
        batchUpgrades += 1;
        hadSuccess = true;
        if (inv[idx].level >= goal) {
          disableAutoVariant(ctx, type, variantKey, `🎉 [AUTO] ${label} 목표 ${goal}강 달성`);
          break;
        }
        continue;
      }

      inv.splice(idx, 1);
      batchExplosions += 1;
    }

    const changed = batchBuys + batchUpgrades + batchExplosions > 0;
    if (changed) {
      if (hadSuccess) {
        ctx.minerals -= spent;
      } else if (spent > 0) {
        ctx.minerals -= spent;
      }
      ctx.inventory = mergeJobInventory(ctx.inventory, inv, type, buyMeta);
    }

    if (batchBuys > 0) ctx.stats.buys += batchBuys;
    if (batchUpgrades > 0) ctx.stats.upgrades += batchUpgrades;
    if (batchExplosions > 0) ctx.stats.explosions += batchExplosions;

    return { success: hadSuccess, spent, upgrades: batchUpgrades, explosions: batchExplosions, buys: batchBuys };
  }

  /**
   * tick 1회 AUTO: 활성 job마다 배치 강화 시뮬 (기본 최대 100회).
   */
  function simulateAutoPerTick(ctx, options) {
    if (ctx.isUpgrading || !hasActiveAuto(ctx)) return;

    const maxAttempts = (options && options.maxBatchAttempts) || 100;
    const mineralBudget = ctx.minerals;

    for (const job of getAutoJobs(ctx)) {
      if (!job.active) continue;
      const jc = resolveJobContext(ctx, job);
      if (jc.buyCost > 0 && mineralBudget < jc.buyCost && !getJobUpgradeTarget(ctx.inventory, jc.type, jc.buyMeta, jc.goal)) {
        continue;
      }
      simulateJobUpgradeBatch(ctx, job, maxAttempts);
    }
  }

  function getIncomeCombatCtx(ctx) {
    const unitDamage = (ctx.specs && ctx.specs.unitDamage) || OMG.calcUnitDamageForIncome(ctx.workParts, ctx.scaUpgrades);
    const ramAttackFrames = ctx.ramAttackFrames != null
      ? ctx.ramAttackFrames
      : OMG.calcRamAttackFrames(ctx.workParts && ctx.workParts.ram);
    return { unitDamage, ramAttackFrames };
  }

  function createHuntUnit(maxHp, maxShield) {
    return {
      hp: maxHp,
      shield: maxShield,
      maxHp,
      maxShield,
      respawnMs: 0,
      mobAtkRemMs: 0,
    };
  }

  function ensureHuntUnitPools(ctx) {
    if (!ctx.huntUnitPools) ctx.huntUnitPools = { work: [], hunt: [] };
    if (!ctx.huntUnitPools.work) ctx.huntUnitPools.work = [];
    if (!ctx.huntUnitPools.hunt) ctx.huntUnitPools.hunt = [];
  }

  function huntCombatSignature(ctx, alloc) {
    const s = ctx.specs || {};
    return [
      ctx.workTaskIndex,
      alloc.activeWorkUnits,
      alloc.activeHuntingUnits,
      s.unitHp,
      s.unitShield,
      s.unitDefense,
      ctx.effectiveUnlockedGameIndex != null ? ctx.effectiveUnlockedGameIndex : ctx.unlockedGameIndex,
    ].join(':');
  }

  function syncHuntUnitPool(pool, count, maxHp, maxShield) {
    while (pool.length < count) pool.push(createHuntUnit(maxHp, maxShield));
    while (pool.length > count) pool.pop();
    for (let i = 0; i < pool.length; i += 1) {
      const u = pool[i];
      u.maxHp = maxHp;
      u.maxShield = maxShield;
      if (u.respawnMs <= 0 && u.hp > 0) {
        u.hp = Math.min(u.hp, maxHp);
        u.shield = Math.min(u.shield, maxShield);
      }
    }
  }

  function countFightingUnits(pool) {
    return pool.filter((u) => u.respawnMs <= 0 && u.hp > 0).length;
  }

  function countRespawningUnits(pool) {
    return pool.filter((u) => u.respawnMs > 0).length;
  }

  function tickUnitRespawns(pool, elapsedMs) {
    for (let i = 0; i < pool.length; i += 1) {
      const u = pool[i];
      if (u.respawnMs <= 0) continue;
      u.respawnMs = Math.max(0, u.respawnMs - elapsedMs);
      if (u.respawnMs === 0) {
        u.hp = u.maxHp;
        u.shield = u.maxShield;
        u.mobAtkRemMs = 0;
      }
    }
  }

  function applyMobHitToUnit(unit, mobSpec, playerDefense) {
    const dmg = OMG.getMobAttackPerHit(mobSpec);
    if (unit.shield > 0) {
      unit.shield = Math.max(0, unit.shield - OMG.calcShieldDamagePerHit(dmg, mobSpec.shieldArmor));
    } else {
      unit.hp = Math.max(0, unit.hp - OMG.calcHpDamagePerHit(dmg, playerDefense));
    }
    if (unit.hp <= 0 && unit.shield <= 0) {
      unit.hp = 0;
      unit.respawnMs = OMG.HUNT_UNIT_RESPAWN_MS;
      unit.mobAtkRemMs = 0;
      return true;
    }
    return false;
  }

  function tickMobCounterattacks(pool, mobSpec, playerDefense, attackIntervalMs, elapsedMs) {
    if (!OMG.mobCanCounterattack(mobSpec)) return 0;
    let deaths = 0;
    for (let i = 0; i < pool.length; i += 1) {
      const u = pool[i];
      if (u.respawnMs > 0 || u.hp <= 0) continue;
      u.mobAtkRemMs = (u.mobAtkRemMs || 0) + elapsedMs;
      while (u.mobAtkRemMs >= attackIntervalMs) {
        u.mobAtkRemMs -= attackIntervalMs;
        if (applyMobHitToUnit(u, mobSpec, playerDefense)) deaths += 1;
      }
    }
    return deaths;
  }

  function tickHpDecay(pool, hpDecayRate, elapsedSec) {
    if (!hpDecayRate || hpDecayRate <= 0 || elapsedSec <= 0) return 0;
    let deaths = 0;
    for (let i = 0; i < pool.length; i += 1) {
      const u = pool[i];
      if (u.respawnMs > 0 || u.hp <= 0) continue;
      u.hp = Math.max(0, u.hp - u.maxHp * hpDecayRate * elapsedSec);
      if (u.hp <= 0) {
        u.respawnMs = OMG.HUNT_UNIT_RESPAWN_MS;
        deaths += 1;
      }
    }
    return deaths;
  }

  function updateHuntCombatStatus(ctx, alloc) {
    const workPool = ctx.huntUnitPools.work;
    const huntPool = ctx.huntUnitPools.hunt;
    ctx.huntCombatStatus = {
      workTotal: alloc.activeWorkUnits,
      workActive: alloc.canRunWork ? countFightingUnits(workPool) : 0,
      workRespawning: alloc.canRunWork ? countRespawningUnits(workPool) : 0,
      huntTotal: alloc.activeHuntingUnits,
      huntActive: ctx.isDownloading ? 0 : countFightingUnits(huntPool),
      huntRespawning: ctx.isDownloading ? 0 : countRespawningUnits(huntPool),
    };
  }

  function accumulateKillsFromActive(activeUnits, kps, elapsedSec, remKey, ctx) {
    if (activeUnits <= 0 || kps <= 0) return 0;
    ctx[remKey] = (ctx[remKey] || 0) + kps * elapsedSec;
    const whole = Math.floor(ctx[remKey]);
    if (whole > 0) ctx[remKey] -= whole;
    return whole;
  }

  /** 처치 수입 + 몬스터 반격·사망·1초 리스폰 후 자동 재투입 */
  function applyWorkHuntIncome(ctx, elapsedMs) {
    if (elapsedMs <= 0) return 0;
    OMG.setScaUpgradesRef({ ...(ctx.scaUpgrades || {}), ...(ctx.overclockData || {}) });
    const { unitDamage, ramAttackFrames } = getIncomeCombatCtx(ctx);
    const alloc = OMG.calcRamAllocation(
      ctx.workParts,
      ctx.workTaskIndex,
      ctx.effectiveUnitLimit,
      ctx.effectiveWorkUnits,
      ctx.scaUpgrades || {},
      unitDamage,
      ramAttackFrames
    );
    const specs = ctx.specs || {};
    const playerDefense = specs.unitDefense || 0;
    const maxHp = Math.max(1, specs.unitHp || 100);
    const maxShield = Math.max(0, specs.unitShield || 0);
    const attackIntervalMs = OMG.calcIncomeEventIntervalMs(ctx.scaUpgrades || {}, ramAttackFrames);
    const elapsedSec = elapsedMs / 1000;
    const hpDecayRate = (specs.penalties && specs.penalties.hpDecayRate) || 0;

    ensureHuntUnitPools(ctx);
    const sig = huntCombatSignature(ctx, alloc);
    if (ctx.huntCombatSig !== sig) {
      ctx.huntCombatSig = sig;
      ctx.huntUnitPools.work = [];
      ctx.huntUnitPools.hunt = [];
      ctx.remWorkHitProgress = 0;
      ctx.remHuntHitProgress = 0;
    }

    if (alloc.canRunWork && alloc.activeWorkUnits > 0) {
      syncHuntUnitPool(ctx.huntUnitPools.work, alloc.activeWorkUnits, maxHp, maxShield);
    } else {
      ctx.huntUnitPools.work = [];
    }

    if (!ctx.isDownloading && alloc.activeHuntingUnits > 0) {
      syncHuntUnitPool(ctx.huntUnitPools.hunt, alloc.activeHuntingUnits, maxHp, maxShield);
    } else {
      ctx.huntUnitPools.hunt = [];
    }

    tickUnitRespawns(ctx.huntUnitPools.work, elapsedMs);
    tickUnitRespawns(ctx.huntUnitPools.hunt, elapsedMs);
    tickHpDecay(ctx.huntUnitPools.work, hpDecayRate, elapsedSec);
    tickHpDecay(ctx.huntUnitPools.hunt, hpDecayRate, elapsedSec);

    const workMob = OMG.getWorkMobSpec(ctx.workTaskIndex);
    const gameIndex = ctx.effectiveUnlockedGameIndex != null
      ? ctx.effectiveUnlockedGameIndex
      : OMG.getEffectiveUnlockedGameIndex(ctx.unlockedGameIndex);
    const huntMob = OMG.getGameMobSpec(gameIndex);

    const workDeaths = alloc.canRunWork
      ? tickMobCounterattacks(ctx.huntUnitPools.work, workMob, playerDefense, attackIntervalMs, elapsedMs)
      : 0;
    const huntDeaths = !ctx.isDownloading
      ? tickMobCounterattacks(ctx.huntUnitPools.hunt, huntMob, playerDefense, attackIntervalMs, elapsedMs)
      : 0;

    if (workDeaths > 0 || huntDeaths > 0) {
      if (!ctx.logs) ctx.logs = [];
      const parts = [];
      if (workDeaths > 0) parts.push(`작업 ${workDeaths}기 전멸`);
      if (huntDeaths > 0) parts.push(`사냥 ${huntDeaths}기 전멸`);
      ctx.logs.push(`⚠️ ${parts.join(' · ')} → ${OMG.HUNT_UNIT_RESPAWN_MS / 1000}초 후 자동 재배치`);
      if (ctx.logs.length > 8) ctx.logs.shift();
    }

    updateHuntCombatStatus(ctx, alloc);

    let gained = 0;
    const hitsPerSecPerUnit = OMG.calcHitsPerSecond(ramAttackFrames, ctx.scaUpgrades || {});
    const workActive = ctx.huntCombatStatus.workActive;
    if (workActive > 0 && hitsPerSecPerUnit > 0) {
      const hitsToKill = Math.max(
        1,
        OMG.calcHitsToKillTarget(workMob, unitDamage)
      );
      ctx.remWorkHitProgress = (ctx.remWorkHitProgress || 0) + workActive * hitsPerSecPerUnit * elapsedSec;
      const buildingKills = Math.floor(ctx.remWorkHitProgress / hitsToKill);
      if (buildingKills > 0) {
        ctx.remWorkHitProgress -= buildingKills * hitsToKill;
        const mult = specs.penalties ? specs.penalties.mineralMultiplier : 1;
        const perKillMin = OMG.calcWorkMineralPerKillPerUnit(
          ctx.workTaskIndex, mult, ctx.rebirthIncomeMult, ctx.incomeBonusRate
        );
        const perKillCoin = OMG.calcWorkCoinPerKillPerUnit(
          ctx.workTaskIndex, mult, ctx.rebirthIncomeMult, ctx.incomeBonusRate
        );
        const payoutUnits = workActive;
        if (perKillMin > 0) gained += buildingKills * perKillMin * payoutUnits;
        if (perKillCoin > 0) {
          gained += OMG.coinsToMinerals(buildingKills * perKillCoin * payoutUnits);
        }
        ctx.stats.incomeTicks += buildingKills;
      }
    }

    const huntActive = ctx.huntCombatStatus.huntActive;
    if (huntActive > 0 && hitsPerSecPerUnit > 0) {
      const huntHitsToKill = Math.max(
        1,
        OMG.calcHitsToKillTarget(huntMob, unitDamage)
      );
      ctx.remHuntHitProgress = (ctx.remHuntHitProgress || 0) + huntActive * hitsPerSecPerUnit * elapsedSec;
      const enemyKills = Math.floor(ctx.remHuntHitProgress / huntHitsToKill);
      if (enemyKills > 0) {
        ctx.remHuntHitProgress -= enemyKills * huntHitsToKill;
        const perKill = OMG.calcHuntMineralPerKillPerUnit(gameIndex, ctx.incomeBonusRate);
        gained += enemyKills * perKill * huntActive;
        ctx.stats.incomeTicks += enemyKills;
      }
    }

    return gained;
  }

  function hasActiveAuto(ctx) {
    const c = ctx.autoBuyCpuByMfr || {};
    const cl = ctx.autoBuyCoolerByKind || {};
    const st = ctx.autoBuyStorageByKind || {};
    return !!(ctx.autoBuyGpu || ctx.autoBuyRam || c.Intel || c.AMD
      || cl.air || cl.water || st.hdd || st.nvme);
  }

  /** 파티 티어 — 해금 조건 미충족 시 허용된 최고 티어로 강등 */
  function resolvePartyTier(ctx) {
    if (!ctx.isPartyHunting) return -1;
    const perf = OMG.calcPartyPerformanceScore(ctx.workParts || {}, ctx.scaUpgrades || {});
    const reb = ctx.rebirthStat || 0;
    const mine = OMG.getMiningPower(ctx.scaUpgrades || {});
    return OMG.resolvePartyHuntingTierIndex(ctx.partyHuntingTier, perf, reb, mine);
  }

  /** elapsedMs 만큼 수입만 반영 (AUTO 간격 없음). 추가된 미네랄량 반환 */
  function applyIncomeOnly(ctx, elapsedMs) {
    if (elapsedMs <= 0) return 0;
    let gained = 0;

    if (ctx.isPartyHunting) {
      const tierIdx = resolvePartyTier(ctx);
      const tier = tierIdx >= 0 ? OMG.PARTY_HUNTING_TIERS[tierIdx] : null;
      if (tier) {
        const partyTickMs = OMG.calcGameSpeedTickMs(ctx.scaUpgrades || {}, 3000);
        let partyRem = (ctx.remParty || 0) + elapsedMs;
        const partyConsumed = OMG.consumeElapsedTicks(partyRem, partyTickMs, MAX_INCOME_TICKS);
        ctx.remParty = partyConsumed.remainderMs;
        if (partyConsumed.ticks > 0) {
          const m = OMG.calcPartyMineralPerTick(tier, ctx.incomeBonusRate) * partyConsumed.ticks;
          ctx.minerals += m;
          ctx.scaPartyTicks = (ctx.scaPartyTicks || 0) + partyConsumed.ticks;
          ctx.partyMineralGained = (ctx.partyMineralGained || 0) + m;
          ctx.scaCoinsGain = (ctx.scaCoinsGain || 0) + tier.scaCoins * partyConsumed.ticks;
          ctx.stats.incomeTicks += partyConsumed.ticks;
          gained += m;
        }
      }
    } else {
      const add = applyWorkHuntIncome(ctx, elapsedMs);
      if (add > 0) {
        ctx.minerals += add;
        gained += add;
      }
    }
    return gained;
  }

  /**
   * 일반 게임 tick: 수입 + AUTO (실시간 1스텝씩, 이벤트·상태 반환).
   */
  function simulateGameTick(ctx, elapsedMs, options) {
    if (!ctx.stats) {
      ctx.stats = { incomeMinerals: 0, incomeTicks: 0, autoActions: 0, buys: 0, upgrades: 0, explosions: 0 };
    }
    if (!ctx.logs) ctx.logs = [];
    const mineralsBefore = ctx.minerals;
    ctx.stats.incomeMinerals += applyIncomeOnly(ctx, elapsedMs);
    ctx.tickIncomeDelta = ctx.minerals - mineralsBefore;
    if (hasActiveAuto(ctx) && !(options && options.skipAuto)) {
      simulateAutoRealtimeSteps(ctx, elapsedMs, options);
    } else {
      ctx.autoStatus = detectAutoStatus(ctx);
    }
    return ctx;
  }

  /**
   * 탭 복귀 등 장시간 방치: 구간별 수입 후 AUTO 라운드를 auto 간격만큼 반복.
   */
  function simulateBackgroundCatchUp(ctx, elapsedMs, options) {
    if (!ctx.stats) {
      ctx.stats = { incomeMinerals: 0, incomeTicks: 0, autoActions: 0, buys: 0, upgrades: 0, explosions: 0 };
    }
    if (!ctx.logs) ctx.logs = [];
    if (elapsedMs <= 0) return ctx;

    const chunkMs = (options && options.chunkMs) || 15000;
    const autoTickMs = OMG.calcAutoLoopIntervalMs(ctx.scaUpgrades || {});
    let left = elapsedMs;

    while (left > 0) {
      const chunk = Math.min(left, chunkMs);
      ctx.stats.incomeMinerals += applyIncomeOnly(ctx, chunk);
      if (hasActiveAuto(ctx)) {
        const rounds = Math.min(Math.max(1, Math.floor(chunk / autoTickMs)), 800);
        for (let i = 0; i < rounds; i += 1) {
          simulateAutoPerTick(ctx, options);
        }
      }
      left -= chunk;
    }
    ctx.stats.autoActions = ctx.stats.buys + ctx.stats.upgrades + ctx.stats.explosions;
    return ctx;
  }

  /**
   * @deprecated 방치 전용 — simulateBackgroundCatchUp 또는 simulateGameTick 사용
   */
  function simulateIdleElapsed(ctx, elapsedMs, options) {
    if (!ctx.stats) {
      ctx.stats = { incomeMinerals: 0, incomeTicks: 0, autoActions: 0, buys: 0, upgrades: 0, explosions: 0 };
    }
    if (!ctx.logs) ctx.logs = [];
    if (elapsedMs <= 0) return ctx;

    const maxAutoTicks = (options && options.maxAutoTicks) || DEFAULT_MAX_AUTO_TICKS;
    const mineralsStart = ctx.minerals;

    if (ctx.isPartyHunting) {
      const tierIdx = resolvePartyTier(ctx);
      const tier = tierIdx >= 0 ? OMG.PARTY_HUNTING_TIERS[tierIdx] : null;
      if (tier) {
        const partyTickMs = OMG.calcGameSpeedTickMs(ctx.scaUpgrades || {}, 3000);
        const autoTickMs = OMG.calcAutoLoopIntervalMs(ctx.scaUpgrades || {});
      let partyRem = (ctx.remParty || 0) + elapsedMs;
      let autoRem = (ctx.remAuto || 0) + elapsedMs;
      const partyConsumed = OMG.consumeElapsedTicks(partyRem, partyTickMs, MAX_INCOME_TICKS);
      const autoConsumed = OMG.consumeElapsedTicks(autoRem, autoTickMs, MAX_INCOME_TICKS);
      ctx.remParty = partyConsumed.remainderMs;
      ctx.remAuto = autoConsumed.remainderMs;

      let partyTicks = partyConsumed.ticks;
      let autoTicks = Math.min(autoConsumed.ticks, maxAutoTicks);
      const partyEvery = Math.max(1, Math.round(partyTickMs / autoTickMs));
      let counter = 0;

      while ((partyTicks > 0 || autoTicks > 0) && (partyTicks + autoTicks) < MAX_INCOME_TICKS * 2) {
        if (partyTicks > 0 && (autoTicks === 0 || counter >= partyEvery)) {
          const m = OMG.calcPartyMineralPerTick(tier, ctx.incomeBonusRate);
          ctx.minerals += m;
          ctx.scaPartyTicks = (ctx.scaPartyTicks || 0) + 1;
          ctx.partyMineralGained = (ctx.partyMineralGained || 0) + m;
          ctx.scaCoinsGain = (ctx.scaCoinsGain || 0) + tier.scaCoins;
          ctx.stats.incomeTicks += 1;
          partyTicks -= 1;
          counter = 0;
        } else if (autoTicks > 0) {
          simulateOneAutoStep(ctx);
          autoTicks -= 1;
          counter += 1;
        } else break;
      }
      }
    } else {
      const autoTickMs = OMG.calcAutoLoopIntervalMs(ctx.scaUpgrades || {});
      const incomeAdd = applyWorkHuntIncome(ctx, elapsedMs);
      if (incomeAdd > 0) ctx.minerals += incomeAdd;

      let autoRem = (ctx.remAuto || 0) + elapsedMs;
      const autoConsumed = OMG.consumeElapsedTicks(autoRem, autoTickMs, MAX_INCOME_TICKS);
      ctx.remAuto = autoConsumed.remainderMs;
      let autoTicks = Math.min(autoConsumed.ticks, maxAutoTicks);
      while (autoTicks > 0) {
        simulateOneAutoStep(ctx);
        autoTicks -= 1;
      }
    }

    ctx.stats.incomeMinerals = ctx.minerals - mineralsStart;
    ctx.stats.autoActions = ctx.stats.buys + ctx.stats.upgrades + ctx.stats.explosions;
    return ctx;
  }

  function snapshotFromGameState(s) {
    return {
      minerals: s.minerals ?? 0,
      inventory: JSON.parse(JSON.stringify(s.inventory || [])),
      autoTargetLevels: JSON.parse(JSON.stringify(s.autoTargetLevels || {})),
      autoBuyCpuByMfr: { ...(s.autoBuyCpuByMfr || {}) },
      autoBuyGpu: !!s.autoBuyGpu,
      autoBuyRam: !!s.autoBuyRam,
      autoBuyCoolerByKind: { ...(s.autoBuyCoolerByKind || {}) },
      autoBuyStorageByKind: { ...(s.autoBuyStorageByKind || {}) },
      autoFlagsDirty: false,
      probBonusRate: s.probBonusRate ?? 0,
      cpuBuyManufacturer: s.cpuBuyManufacturer,
      coolerBuyKind: s.coolerBuyKind,
      storageBuyKind: s.storageBuyKind,
      scaUpgrades: s.scaUpgrades || {},
      ramAttackFrames: s.ramAttackFrames,
      workParts: s.workParts,
      workTaskIndex: s.workTaskIndex,
      specs: s.specs,
      rebirthIncomeMult: s.rebirthIncomeMult,
      rebirthStat: s.rebirthStat ?? 0,
      incomeBonusRate: s.incomeBonusRate,
      effectiveUnitLimit: s.effectiveUnitLimit,
      effectiveWorkUnits: s.effectiveWorkUnits,
      unlockedGameIndex: s.unlockedGameIndex,
      effectiveUnlockedGameIndex: s.effectiveUnlockedGameIndex,
      isDownloading: s.isDownloading,
      isPartyHunting: s.isPartyHunting,
      partyHuntingTier: s.partyHuntingTier,
      isUpgrading: s.isUpgrading,
      remWorkHunt: 0,
      remWorkHitProgress: s.remWorkHitProgress ?? s.remWorkKills ?? 0,
      remHuntHitProgress: s.remHuntHitProgress ?? s.remHuntKills ?? 0,
      remAuto: 0,
      remParty: 0,
      huntUnitPools: JSON.parse(JSON.stringify(s.huntUnitPools || { work: [], hunt: [] })),
      huntCombatSig: s.huntCombatSig || '',
      huntCombatStatus: s.huntCombatStatus ? { ...s.huntCombatStatus } : null,
      scaCoinsGain: 0,
      scaPartyTicks: 0,
      logs: [],
      stats: { incomeMinerals: 0, incomeTicks: 0, autoActions: 0, buys: 0, upgrades: 0, explosions: 0 },
    };
  }

  global.AutoSimulator = {
    simulateGameTick,
    simulateBackgroundCatchUp,
    simulateAutoPerTick,
    simulateAutoRealtimeSteps,
    simulateJobUpgradeBatch,
    simulateIdleElapsed,
    simulateOneAutoStep,
    detectAutoStatus,
    hasActiveAuto,
    snapshotFromGameState,
  };
})(window);
