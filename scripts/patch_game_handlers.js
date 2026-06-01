      // ----------------------------------------------------------------------
      // 7. V1.2.9 원작 강화 (Normal 코인)
      // ----------------------------------------------------------------------
      const getUpgradeCost = (type, level, part) => OMG.getUpgradeCost(type, level, part || { type });
      const getUpgradeProbability = (type, level, part) => OMG.getUpgradeProbability(type, level, part || { type }, probBonusRate);

      const handlePurchaseScaItem = (item) => {
        const bought = scaUpgrades[item.id] || 0;
        if (bought >= item.maxPurchases) { alert('최대 구매 횟수 도달'); return; }
        if (scaCoins < item.cost) { alert('SCA 코인 부족'); return; }
        setScaCoins((prev) => prev - item.cost);
        setScaUpgrades((prev) => ({ ...prev, [item.id]: bought + 1 }));
      };

      const handleBuyComponentPack = (type) => {
        const buyMeta = { type, manufacturer: type === 'cpu' ? cpuBuyManufacturer : undefined, coolerKind: type === 'cooler' ? coolerBuyKind : undefined, storageKind: type === 'storage' ? storageBuyKind : undefined };
        const cost = OMG.getUpgradeCost(type, 0, buyMeta);
        if (normalCoins < cost) { alert('Normal 코인 부족 (미네랄 10,000원 = 1코인)'); return; }
        setNormalCoins((prev) => prev - cost);
        const newId = `inv-${type}-${Math.random().toString(36).substring(2, 9)}`;
        let newPart = { id: newId, type, level: 1 };
        if (type === 'cpu') { newPart.manufacturer = cpuBuyManufacturer; newPart.ddrGeneration = 'DDR4'; }
        else if (type === 'ram') { const t = OMG.getTier('ram', newPart, 1); newPart.clockMhz = t.clockMhz; newPart.capacityGb = t.capacityGb; newPart.ddrGeneration = t.ddrGeneration; }
        else if (type === 'cooler') { newPart.coolerKind = coolerBuyKind; newPart.coolingCapacity = OMG.getTier('cooler', newPart, 1).coolingCapacity; }
        else if (type === 'storage') { newPart.storageKind = storageBuyKind; const t = OMG.getTier('storage', newPart, 1); newPart.storageType = t.storageType; newPart.capacityGb = t.capacityGb; }
        setInventory((prev) => [...prev, newPart]);
        setUpgradeStatus('success');
        setUpgradeMessage(`📦 [구매] ${type.toUpperCase()} 1강 (-${cost}C)`);
        setTimeout(() => { setUpgradeStatus(null); setUpgradeMessage(''); }, 2500);
      };

      const handleSellComponent = (itemId) => {
        const part = inventory.find(p => p.id === itemId);
        if (!part) return;
        const sellPrice = Math.max(1, Math.floor(OMG.getUpgradeCost(part.type, Math.max(0, part.level - 1), part) * 0.5));
        setNormalCoins((prev) => prev + sellPrice);
        setInventory((prev) => prev.filter(p => p.id !== itemId));
      };

      const handleInventoryUpgrade = (itemId) => {
        if (isUpgrading) return;
        const partToUpgrade = inventory.find(p => p.id === itemId);
        if (!partToUpgrade) return;
        const currentLevel = partToUpgrade.level;
        const cost = OMG.getUpgradeCost(partToUpgrade.type, currentLevel, partToUpgrade);
        if (normalCoins < cost) { alert('Normal 코인 부족'); return; }
        setNormalCoins((prev) => prev - cost);
        setIsUpgrading(true);
        setUpgradeStatus('upgrading');
        setTimeout(() => {
          const prob = OMG.getUpgradeProbability(partToUpgrade.type, currentLevel, partToUpgrade, probBonusRate);
          let result = Math.random() <= prob ? 'success' : (currentLevel <= 4 ? 'fail_keep' : currentLevel <= 6 ? 'fail_drop' : (Math.random() <= 0.5 ? 'exploded' : 'fail_drop'));
          setIsUpgrading(false);
          setUpgradeStatus(result);
          if (result === 'success') setInventory(prev => prev.map(p => p.id === itemId ? OMG.applyTierStats(p, currentLevel + 1) : p));
          else if (result === 'fail_drop') setInventory(prev => prev.map(p => p.id === itemId ? OMG.applyTierStats(p, Math.max(1, currentLevel - 1)) : p));
          else if (result === 'exploded') setInventory(prev => prev.filter(p => p.id !== itemId));
          setTimeout(() => { setUpgradeStatus(null); setUpgradeMessage(''); }, 3000);
        }, 600);
      };

      const handleRebirth = () => {
        if (gpu.level < 10) { alert('GPU 10강 필요'); return; }
        if (!confirm('환생: 부품·미네랄·Normal 코인 초기화 / SCA 유지')) return;
        const scaReward = OMG.calcRebirthScaReward(gpu.level, rebirthCount);
        setScaCoins(p => p + scaReward);
        setRebirthCount(p => p + 1);
        setMinerals(OMG.calcRebirthStartMinerals(scaUpgrades));
        setNormalCoins(0);
        setCpu({ manufacturer: 'Intel', level: 1, ddrGeneration: 'DDR4' });
        setGpu({ level: 1 });
        setRam({ level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' });
        setCooler({ level: 1, coolingCapacity: 100, coolerKind: 'air' });
        setMotherboard({ socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 300 });
        setStorage({ type: 'HDD', capacityGb: 60, level: 1, storageKind: 'hdd' });
        const g0 = OMG.WORK_HUNTING_GROUNDS[0];
        setHuntingGround({ name: g0.name, multiplier: g0.multiplier, mineralBase: g0.mineralBase, groundIndex: 0 });
        const dt = OMG.DOWNLOAD_TARGETS[0];
        setDownloadTarget({ name: dt.name, sizeMb: dt.sizeMb, requiredGb: dt.requiredGb, groundIndex: dt.groundIndex });
      };

      const handlePurchaseMotherboard = (board) => {
        if (normalCoins < board.cost) { alert('Normal 코인 부족'); return; }
        setNormalCoins(p => p - board.cost);
        setMotherboard({ socketManufacturer: board.socketManufacturer, supportedDdrGeneration: board.supportedDdrGeneration, shieldIncrease: board.shieldIncrease });
      };
