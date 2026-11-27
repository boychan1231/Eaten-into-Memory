// js/core/penalty.js
// 處決規則結算、護盾／GP 扣除、吞噬判定與回合末檢查（由 game.js 拆出）



function handleDiceDeduction(player) {
    let gearCardDeducted = false;
    if (typeof player.d6Die === 'number' && player.d6Die > 0) {
        player.d6Die--;
        player.triggerShieldAnim = true;

        if (player.d6Die < 1) {
            player.gearCards--;
            player.lastShieldOutcome = 'broken';

            if (player.mana > player.gearCards) {
                player.mana = Math.max(0, player.gearCards);
            }
            gearCardDeducted = true;
            appLogger.log(`【${player.type}】護盾耗盡，扣除 1 齒局。`);

            if (player.gearCards < 0) {
                player.d6Die = 0;
            } else if (player.type === '時之惡') {
                player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 5));
            } else if (player.type === '受詛者') {
                player.d6Die = Math.max(1, Math.min(player.gearCards, 3));
            } else {
                player.d6Die = Math.max(1, Math.min(player.gearCards, 6));
            }
        } else {
            player.lastShieldOutcome = 'blocked';
            appLogger.log(`⛨【${player.name}】護盾抵消懲罰 (剩餘: ${player.d6Die})`);
        }
    } else {
        player.gearCards--;
        player.lastShieldOutcome = 'broken';
        if (player.mana > player.gearCards) {
            player.mana = Math.max(0, player.gearCards);
        }
        gearCardDeducted = true;
        appLogger.log(`【${player.type}】無可用護盾，扣除 1 齒局。`);
    }
    return gearCardDeducted;
}

// --- 5. 扣除齒局卡邏輯 (確認版) ---
function deductGearCards(gameState) {
    const targetingMode = gameState.sinTargetingMode || 'default';
    const modeText = targetingMode === 'sin' ? '距離時之惡最近' : '數值最大(接近12)';
    const currentMode = gameState.gameMode || getGameMode();
    const isPure = typeof currentMode === 'string' && currentMode.startsWith('PURE');

    appLogger.log(`--扣除齒局/護盾 (當前規則: ${isPure ? '數值最大(接近12)' : modeText}) --`);

    if (isPure) {
        const candidates = gameState.players.filter(p => !p.isEjected && typeof p.currentClockPosition === 'number');
        if (candidates.length > 0) {
            const maxPos = Math.max(...candidates.map(p => p.currentClockPosition));
            const targets = candidates.filter(p => p.currentClockPosition === maxPos);
            targets.forEach(player => {
                player.gearCards--;
                appLogger.log(`【純競標】${player.name} 位於最高刻度 ${maxPos}，扣除 1 GP (剩餘: ${player.gearCards})。`);
            });
        }
        checkEjectionAndWinCondition(gameState);
        return;
    }
    
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    // 若時之惡不在場且非 3P 模式，無人受罰 (直接檢查勝利條件)
    if (currentMode !== '3P' && (!sinPlayer || !sinPlayer.currentClockPosition)) {
        checkEjectionAndWinCondition(gameState);
        return;
    }
    
    const sinPosition = sinPlayer?.currentClockPosition ?? null;
    let playersToDeduct = [];

    // 1. 決定受罰對象
    if (targetingMode === 'default' || currentMode === '3P') {
        const candidates = gameState.players.filter(p => {
            const allowedTypes = (currentMode === '3P') ? (p.type === '時魔') : (p.type === '時魔' || p.type === '受詛者' || p.type === '時之惡');
            return allowedTypes && !p.isEjected && p.currentClockPosition;
        });

        if (candidates.length > 0) {
            let maxPos = 0;
            candidates.forEach(p => {
                if (p.currentClockPosition > maxPos) maxPos = p.currentClockPosition;
            });
            playersToDeduct = candidates.filter(p => p.currentClockPosition === maxPos);
        }
    } else {
        const targets = gameState.players.filter(p =>
            (p.type === '時魔' || p.type === '受詛者') &&
            !p.isEjected &&
            p.currentClockPosition
        );
        if (targets.length > 0) {
            let closestDistance = 7; 
            targets.forEach(player => {
                const distance = getCircularDistance(player.currentClockPosition, sinPosition);
                if (distance < closestDistance) closestDistance = distance;
            });
            playersToDeduct = targets.filter(player =>
                getCircularDistance(player.currentClockPosition, sinPosition) === closestDistance
            );
        }
    }

    const isSinAloneTarget = (currentMode !== '3P' && sinPlayer && playersToDeduct.length === 1 && playersToDeduct[0] === sinPlayer);
    const isNoOneTargetedInSin = (currentMode !== '3P' && sinPlayer && targetingMode === 'sin' && playersToDeduct.length === 0);

    // 2. 執行扣除
    playersToDeduct.forEach(player => {
        if (player.type === '時魔') {
            // 檢查是否為「幼體」 (只有幼體有護盾)
            const isYoungTimeDemon = typeof player.roleCard === 'string' && player.roleCard.includes('幼');

            // 【幼體防禦】：若是幼體、未用過盾、且 MP 足夠，則擋下傷害
            if (isYoungTimeDemon && !player.shieldUsed && player.mana >= 3) {
                const spent = player.mana;
                player.shieldUsed = true;
                player.mana = 0;
                appLogger.log(`⛨【幼體防禦】${player.name} 耗用所有 ${spent} MP，抵擋本次攻擊。`);
                return; // 成功抵擋，不扣齒局
            }

            // 若已進化 (非幼體) 或 MP 不足，直接扣齒局
            player.gearCards--;
            
            // MP 不能超過當前齒局數
            if (player.mana > player.gearCards) player.mana = Math.max(0, player.gearCards);
            
            appLogger.log(`【時魔】${player.name} (${modeText}) 扣除 1 齒局 (剩餘: ${player.gearCards})。`);

        } else if (player.type === '受詛者' || player.type === '時之惡') {
            handleDiceDeduction(player);
        }
    });

    // 2.5 時之惡單獨受罰回能機制：
    // 若全場無其他角色受罰（時之惡單獨受罰），時之惡如常先扣盾／GP 並重置，若仍存活再恢復 1 點 MP（上限為當前 GP）
    if ((isSinAloneTarget || isNoOneTargetedInSin) && sinPlayer && sinPlayer.gearCards >= 0) {
        const maxMP = Math.max(0, sinPlayer.gearCards);
        const oldMP = sinPlayer.mana || 0;
        if (oldMP < maxMP) {
            sinPlayer.mana = oldMP + 1;
            appLogger.log(`◆【時之惡】單獨適用受罰規則，結算後恢復 1 點 MP (目前: ${sinPlayer.mana}/${maxMP})。`);
        } else {
            appLogger.log(`◆【時之惡】單獨適用受罰規則，結算後 MP 已達上限 (${sinPlayer.mana}/${maxMP})。`);
        }
    }
	
    // 3. 檢查是否有人因此死亡
    checkEjectionAndWinCondition(gameState);
}

// --- 檢查吞噬與勝利條件 (確認版) ---
function checkEjectionAndWinCondition(gameState) {
    if (!gameState || !gameState.players) return;

    // 1. 檢查齒輪 < 0（即 -1）才被吞噬。 0 是安全的。
    gameState.players.forEach(player => {
        if (!player.isEjected && player.gearCards < 0) {
            player.isEjected = true;
            player.hasEverBeenEjected = true;
            player.ejectionCount = (player.ejectionCount || 0) + 1;
            player.gearCards = 0; // 歸零僅為了 UI 顯示好看
            player.mana = 0;
            player.currentClockPosition = null;
            if (typeof player.d6Die === 'number') player.d6Die = 0;

            // 標記本局有時魔被吞噬 (影響時之惡懲罰判定)
            if (player.type === '時魔') {
                gameState.roundHadTimeDemonEjection = true;
            }

            appLogger.log(`☠【吞噬】${player.name} 的齒輪耗盡 (${player.gearCards})，被吞噬出局。`);
        }
    });

	// 2. 勝利判定
	const currentMode = gameState.gameMode || getGameMode();
	if (typeof currentMode === 'string' && currentMode.startsWith('PURE')) {
	    const alivePure = gameState.players.filter(p => !p.isEjected);
	    if (alivePure.length <= 1) {
	        appLogger.log('✦【純競標】場上僅剩 1 名（或以下）存活者，本局提前結束並結算積分。');
	        endGameRound(gameState);
	        return;
	    }
	    moveRoundMarker(gameState);
	    return;
	}

	const aliveTimeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
    const sinAlive = gameState.players.some(p => p.type === '時之惡' && !p.isEjected);

    // 檢查是否「所有時魔都曾被吞噬過」（完全狩獵：改為獎勵分，不再直接結束遊戲）
    const allTimeDemons = gameState.players.filter(p => p.type === '時魔');
    const allDemonsEverEjected = allTimeDemons.length > 0 && allTimeDemons.every(p => p.hasEverBeenEjected);
    if (allDemonsEverEjected && sinAlive && !gameState.sinHuntLogged) {
        gameState.sinHuntLogged = true;
        appLogger.log('✦【時之惡】完成「完全狩獵」（所有時魔皆曾被吞噬）！將於本局結算時獲得獎勵分！');
    }

    // 判斷：時之惡陣亡 OR 時魔當下全滅
    if (currentMode === '3P') {
        if (aliveTimeDemons.length === 0) {
            gameState.gameEnded = true;
            appLogger.log('✦ 遊戲結束：所有時魔皆被吞噬。');
        }
    } else if (!sinAlive || aliveTimeDemons.length === 0) {
        gameState.gameEnded = true;
        if (!sinAlive && aliveTimeDemons.length > 0) {
            appLogger.log('✦ 遊戲結束：時之惡被吞噬，時魔陣營勝利！');
        } else if (sinAlive && aliveTimeDemons.length === 0) {
            appLogger.log('✦ 遊戲結束：場上時魔已全數陣亡，時之惡陣營勝利！');
        } else {
            appLogger.log('✦ 遊戲結束。');
        }
    }

    if (!gameState.gameEnded) {
        inRoundEndActions(gameState);
    } else {
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function inRoundEndActions(gameState) {

	const shouldCollectHourCards = (gameState.gameMode === '3P');
	gameState.players.filter(p =>
		p.type === '時魔' &&
		!p.isEjected &&
		p.currentClockPosition &&
		(shouldCollectHourCards || (typeof p.roleCard === 'string' && p.roleCard.includes('幼')))
	  )
	  .forEach(player => {
		const currentSpot = gameState.clockFace.find(s => s.position === player.currentClockPosition);
		if (!currentSpot || currentSpot.cards.length <= 1) return;

		const collectedCard = currentSpot.cards.pop();

		if (!Array.isArray(player.hourCards)) player.hourCards = [];

		const alreadyHas = player.hourCards.some(c => c.number === collectedCard.number);
		if (alreadyHas) {
		  // 不應收就放回去，避免卡被吃掉
		  currentSpot.cards.push(collectedCard);
		  return;
		}

		player.hourCards.push(collectedCard);
		appLogger.log(`【時魔】${player.name} 取得小時卡 (${collectedCard.number})。`);
	  });


    //舊 時之惡封印能力
    //const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
	// 判斷是否為 AI
    //const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
    //const isAI = sinPlayer && sinPlayer.id !== humanId;
    // 計算場上「已進化」的時魔數量 (時針、分針、秒針)
    //const evolvedCount = gameState.players.filter(p => 
    //    p.type === '時魔' && 
    //    !p.isEjected && 
    //    ['時針', '分針', '秒針'].includes(p.roleCard)
    //).length;
	// 條件：
    // 1. MP >= 3
    // 2. 進化時魔 >= 2
    // 3. 機率 50% (0.5)
	//const COST = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;//讀取mana設定
    //if (GAME_CONFIG.enableAbilities && 
    //    sinPlayer && 
    //    sinPlayer.mana >= COST && 
    //    evolvedCount >= 2 && 
    //    checkChance(0.5)
    //) { 
    //    sinPlayer.mana -= COST; 
    //    gameState.abilityMarker = true; 
    //    appLogger.log(`◆【時之惡】耗用 ${COST} MP 封印全場特殊能力！`);
    //}

    // 受詛者保護卡片
	// 受詛者保護卡片
    const sczPlayer = gameState.players.find(p => p.type === '受詛者' && !p.isEjected);
    if (sczPlayer && sczPlayer.currentClockPosition) {
        const currentSpot = gameState.clockFace.find(s => s.position === sczPlayer.currentClockPosition);
        // ✅ 加上 currentSpot 與其陣列的安全防護
        if (currentSpot && currentSpot.cards) {
            const preciousCardIndex = currentSpot.cards.findIndex(c => c.isPrecious);
            if (preciousCardIndex !== -1) {
                const preciousCard = currentSpot.cards.splice(preciousCardIndex, 1)[0];
                currentSpot.cards.unshift(preciousCard); 
                appLogger.log(`◈【受詛者】將珍貴小時卡 [${preciousCard.number}] 移至鐘面最底部保護。`);
            }
        }
    }

    // 角色升級嘗試
    
    // 角色升級嘗試
    gameState.players.filter(p => p.type === '時魔' && !p.isEjected).forEach(player => {
        if (typeof attemptRoleUpgrade === 'function') {
            attemptRoleUpgrade(player, gameState);
        }
    });

    moveRoundMarker(gameState);
}

