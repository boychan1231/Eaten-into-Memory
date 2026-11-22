// ai_engine.js - 3P / 5P AI 決策與異能判定引擎
var GAME_CONFIG = (typeof window !== 'undefined' && window.GAME_CONFIG) ? window.GAME_CONFIG : (typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG : { enableAbilities: false });

function activateSinTargetingAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer) return;
	
	// 如果是人類扮演時之惡，直接退出，不執行 AI 自動判定(人類玩家需透過 UI 按鈕手動發動)
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
    if (sinPlayer.id === humanId) {
        // ✅ 保險：人類未手動觸發能力時，回合預設規則應回到接近 12
        gameState.sinTargetingMode = 'default';
        return;
    }

    // 場上必須有存活的時魔
    const timeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
    if (timeDemons.length === 0) return;

	const COST = window.GAME_DATA?.ABILITY_COSTS?.SIN_PULL || 2;
    const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');

    if (isEasy) {
        // 原始基礎行為（簡單）：60% 機率直接發動
        if (sinPlayer.mana >= COST && checkChance(0.6)) {
            sinPlayer.mana -= COST;
            gameState.sinTargetingMode = 'sin';
            appLogger.log(`◆【時之惡】(AI-簡單) 發動能力！本回合距離「時之惡」最近者受罰。`);
        } else {
            gameState.sinTargetingMode = 'default';
            appLogger.log(`【時之惡】(AI-簡單) 鐘面數值最大者受罰 (接近12)。`);
        }
        return;
    }

    // 新改良演算法（一般）：依環形鐘面幾何距離智能決策
    if (sinPlayer.mana >= COST) {
        const clockDist = (a, b) => {
            if (typeof a !== 'number' || typeof b !== 'number') return 999;
            const diff = Math.abs(a - b);
            return Math.min(diff, 12 - diff);
        };

        const sinPos = sinPlayer.currentClockPosition;
        const demonsWithPos = timeDemons.filter(d => typeof d.currentClockPosition === 'number');

        let shouldPull = false;
        if (typeof sinPos === 'number' && demonsWithPos.length > 0) {
            const minDemonDist = Math.min(...demonsWithPos.map(d => clockDist(d.currentClockPosition, sinPos)));
            const allPositions = [sinPos, ...demonsWithPos.map(d => d.currentClockPosition)];
            const maxPos = Math.max(...allPositions);

            // 評估預設模式（最大數值受罰）局面：
            const demonsAtMax = demonsWithPos.filter(d => d.currentClockPosition === maxPos);
            const sinTiedAtMax = (sinPos === maxPos && demonsAtMax.length > 0);
            const sinAloneAtMax = (sinPos === maxPos && demonsAtMax.length === 0);

            // 若有時魔緊貼時之惡（距離 <= 2），牽引能精準懲罰時魔
            const demonIsClose = (minDemonDist <= 2);

            // 若時魔本身已在 maxPos 且時之惡安全，不需浪費 MP，讓預設機制懲罰時魔
            const demonAlreadyAtMax = demonsWithPos.some(d => d.currentClockPosition === maxPos && d.currentClockPosition !== sinPos);

            if (sinTiedAtMax) {
                // 與時魔並列最大值時，時之惡會一同受罰，需牽引避險
                shouldPull = true;
            } else if (sinAloneAtMax) {
                // 時之惡獨自處於最大值：預設模式下免罰並回魔 1 點；僅在有時魔近在身邊時考慮主動牽引處決時魔
                shouldPull = (demonIsClose && checkChance(0.6));
            } else if (demonIsClose && (!demonAlreadyAtMax || checkChance(0.5))) {
                shouldPull = true;
            }
        } else {
            shouldPull = checkChance(0.4);
        }

        if (shouldPull) {
            sinPlayer.mana -= COST;
            gameState.sinTargetingMode = 'sin';
            appLogger.log(`◆【時之惡】(AI) 發動惡之牽引！本回合距離「時之惡」最近者受罰。`);
            return;
        }
    }

    gameState.sinTargetingMode = 'default';
    appLogger.log(`【時之惡】(AI) 鐘面數值最大者受罰 (接近12)。`);
}


//新增 AI 封印判定函式
function activateSinSealAI(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer) return;

    // 1. 檢查是否為 AI (人類玩家手動發動，不在此處理)
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
    if (sinPlayer.id === humanId) return;

    // 2. 檢查本回合是否已發動過能力 (避免與惡之牽引衝突，或設定優先順序)
    if (sinPlayer.specialAbilityUsed) return;

    // 3. 條件檢查
    const COST = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;
    
    // 計算場上「已進化」的時魔數量
    const evolvedCount = gameState.players.filter(p => 
        p.type === '時魔' && !p.isEjected && 
        ['時針', '分針', '秒針'].includes(p.roleCard)
    ).length;

    // 觸發條件：MP >= 3, 進化時魔 >= 2, 機率 50%
    if (sinPlayer.mana >= COST && evolvedCount >= 2 && checkChance(0.5)) {
        sinPlayer.mana -= COST;
        sinPlayer.specialAbilityUsed = true; // 標記已使用能力
        gameState.abilityMarker = true;      // ✅ 設定封印標記 (重點)
        
        appLogger.log(`◆【時之惡】(AI) 耗用 ${COST} MP 發動「封鎖」！本回合所有時魔能力已被封印。`);
    }
}

// ✅ AI 時針預知與移牌決策函式
function hourHandPreMinuteAI(gameState) {
    if (typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE')) return;
    if (!GAME_CONFIG.enableAbilities || gameState.abilityMarker) return;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;

    // 找出所有非人類、存活且身分為時針的玩家
    const hourHandAIs = gameState.players.filter(p =>
        p.id !== humanId &&
        !p.isEjected &&
        p.roleCard === '時針'
    );

    if (hourHandAIs.length === 0) return;

    hourHandAIs.forEach(aiPlayer => {
        // 時針每回合最多可發動 2 次
        for (let i = 0; i < 2; i++) {
            if (!Array.isArray(gameState.hourDeck) || gameState.hourDeck.length === 0) break;
            const moveCount = aiPlayer.hourHandMoveCount || 0;
            if (moveCount >= 2) break;

            const baseCost = window.GAME_DATA?.ABILITY_COSTS?.TIME_HAND_MOVE || 1;
            const currentCost = (moveCount === 0) ? baseCost : 2;
            if (aiPlayer.mana < currentCost) break;

            // 查看牌庫頂牌（陣列末端）
            const topCard = gameState.hourDeck[gameState.hourDeck.length - 1];
            if (!topCard) break;

            let shouldMove = false;

            if (gameState.gameMode === '3P') {
                // === 3P 時針專屬移牌判定 ===
                // 3P 模式沒有珍貴卡，純粹依據鐘面安全性調度：
                // 12 與 11 是致命大牌，強烈建議移到底部避險
                if (topCard.number >= 11) {
                    shouldMove = true;
                } else if (topCard.number >= 9 && checkChance(0.7)) {
                    shouldMove = true;
                } else if (aiPlayer.currentClockPosition !== null && topCard.number >= aiPlayer.currentClockPosition && topCard.number >= 8 && checkChance(0.6)) {
                    // 比自己當前位置大且偏高，移開以策安全
                    shouldMove = true;
                } else {
                    // 1~7 號相對安全或具有優良落點價值，保留在牌頂
                    shouldMove = false;
                }
            } else {
                // 決策：
                // 1. 若頂牌是珍貴卡，時魔視為關鍵獲勝目標，保留在牌頂以供下回合奪取
                if (topCard.isPrecious) {
                    shouldMove = false;
                } else if (topCard.number === 12) {
                    // 2. 12 號是最高危險區，極高風險，強烈建議移到底部
                    shouldMove = true;
                } else if (topCard.number >= 10 && checkChance(0.6)) {
                    // 3. 高數值卡偏危險，有較大機率移開
                    shouldMove = true;
                } else if (aiPlayer.currentClockPosition !== null && topCard.number === aiPlayer.currentClockPosition && checkChance(0.5)) {
                    // 4. 與自身位置相同，若抽出無法推進，考慮移開
                    shouldMove = true;
                }
            }

            if (shouldMove && typeof hourHandMoveTopToBottom === 'function') {
                const success = hourHandMoveTopToBottom(gameState, aiPlayer.id);
                if (!success) break;
            } else {
                break; // 頂牌符合預期，不再繼續移
            }
        }
    });
}

if (typeof window !== 'undefined') {
    window.hourHandPreMinuteAI = hourHandPreMinuteAI;
}

// =========================================================
// ⏱️ 3P 競速對抗模式專屬 AI 決策系統 (Dedicated 3P Mode AI)
// =========================================================

function makeAIChoice3P(player, gameState) {
    if (!player.hand || player.hand.length === 0) return null;
    const sortedHand = [...player.hand].sort((a, b) => a.value - b.value);
    const handSize = sortedHand.length;
    const drawnHours = gameState.currentDrawnHourCards || [];
    const myPos = player.currentClockPosition;
    const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');

    function pickIndex(rankA, rankB, isFromSmallest) {
        const chosenRank = checkChance(0.5) ? rankA : rankB;
        if (isFromSmallest) {
            return Math.min(chosenRank - 1, handSize - 1);
        } else {
            return Math.max(handSize - chosenRank, 0);
        }
    }

    let selectedIndex = 0;

    if (isEasy) {
        // === 3P 簡單模式 (基礎啟發式) ===
        // 若自身面臨較高數值 (>= 8)，嘗試出大牌搶翻出的小時卡避險
        if (myPos !== null && myPos >= 8 && drawnHours.some(c => c.number < myPos)) {
            selectedIndex = pickIndex(1, 2, false); // 搶前排
        } else if (drawnHours.every(c => c.number >= 10)) {
            // 場上都是危險大牌，故意出小牌避坑
            selectedIndex = pickIndex(1, 2, true);
        } else {
            // 隨機平均出牌
            selectedIndex = Math.floor(handSize / 2);
        }
    } else {
        // === 3P 一般模式 (新改良三角博弈演算法) ===
        const otherAlive = (gameState.players || []).filter(p => p.id !== player.id && !p.isEjected);
        const otherPositions = otherAlive
            .map(p => p.currentClockPosition)
            .filter(pos => typeof pos === 'number');
        const maxOtherPos = otherPositions.length > 0 ? Math.max(...otherPositions) : null;

        const round = gameState.roundMarker || 1;
        const isEarly = (round <= 4 && handSize >= 5);

        // 輔助函式：出大牌時在前期適度保留王牌 (58-60)
        const pickAggressive = (rankA, rankB, urgent = false) => {
            const rawIdx = pickIndex(rankA, rankB, false);
            if (!urgent && isEarly && rawIdx === handSize - 1) {
                return Math.max(0, handSize - 2);
            }
            return rawIdx;
        };

        const minDrawn = drawnHours.length > 0 ? Math.min(...drawnHours.map(c => c.number)) : 6;

        // 1. 致命毒牌判定 (Poison Hour Check)：
        // 若場上翻出的 2 張小時卡都比其他對手當前位置還要大 (例如對手在 4、6，場上是 10、11)
        // 且自己目前位置安全 (myPos < minDrawn 或尚未落位)
        // 此時若拿小時卡必成最大值受罰，反之拿第 3 名 (不拿牌) 100% 安全！
        const isPoisonTrap = (maxOtherPos !== null && drawnHours.length > 0 &&
            drawnHours.every(c => c.number > maxOtherPos) &&
            (myPos === null || myPos < minDrawn));

        // 2. 救命逃生判定 (Emergency Escape Check)：
        // 若自身當前已經是場上最高位置 (或 >= 9 極高危險)，且場上有更小的小時卡可以逃離
        const isCurrentlyHighest = (maxOtherPos !== null && myPos !== null && myPos >= maxOtherPos);
        const hasEscapeCard = (myPos !== null && minDrawn < myPos);
        const isUrgentEscape = (isCurrentlyHighest || (myPos !== null && myPos >= 9)) && hasEscapeCard;

        // 3. 完美佔點 (Sweet Spot Capture)：
        // 場上有極度安全的低數值卡 (<= 3)，且搶先拿到可以長期處於安全區
        const hasSuperSafeCard = (minDrawn <= 3);

        // 4. 優勢巡航 (Safe Stalling)：
        // 自身當前已在極安全位置 (<= 4)，且其他對手有更高數值擋在前方
        const isComfortablySafe = (myPos !== null && myPos <= 4 && maxOtherPos !== null && maxOtherPos > myPos);

        if (isPoisonTrap) {
            // [陷阱回合]：全力出小牌以求落入第 3 名，讓對手被迫吃毒牌受罰
            selectedIndex = pickIndex(1, 2, true);
        }
        else if (isUrgentEscape) {
            // [逃生回合]：必須擠進前 2 名挑牌以洗掉身上的危險位置
            selectedIndex = pickAggressive(1, 2, true);
        }
        else if (hasSuperSafeCard && (myPos === null || minDrawn < myPos)) {
            // ⭐ 搶佔安全刻度：穩健爭取前 2 名
            selectedIndex = pickAggressive(2, 3, false);
        }
        else if (isComfortablySafe) {
            // [優勢巡航]：自己位置已經很好，出中低牌省大牌，第 2 或第 3 名皆可接受
            selectedIndex = pickIndex(2, 3, true);
        }
        else if (myPos === null) {
            // 開局首輪尚未落點：以中上位牌爭取適中落點
            selectedIndex = pickAggressive(2, 3, false);
        }
        else {
            // 穩健過渡
            selectedIndex = Math.floor(handSize / 2);
        }
    }

    const targetCardValue = sortedHand[selectedIndex].value;
    const originalIndex = player.hand.findIndex(c => c.value === targetCardValue);
    const chosenCard = player.hand.splice(originalIndex, 1)[0];

    // --- 3P 秒針專屬能力判定 ---
    const SEC_COST = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT_3P || 2;
    if (
        GAME_CONFIG.enableAbilities &&
        player.roleCard === '秒針' &&
        !gameState.abilityMarker &&
        !player.specialAbilityUsed &&
        player.mana >= SEC_COST &&
        player.hand.length >= 1
    ) {
        let shouldActivateSec = false;
        if (isEasy) {
            shouldActivateSec = checkChance(0.6);
        } else {
            const hasDangerHour = drawnHours.some(c => c.number >= 9);
            const hasSafeHour = drawnHours.some(c => c.number <= 4);
            const isHighStakes = (hasDangerHour && hasSafeHour) || (myPos !== null && myPos >= 8);
            shouldActivateSec = isHighStakes ? checkChance(0.85) : checkChance(0.5);
        }

        if (shouldActivateSec) {
            const remainingSorted = [...player.hand].sort((a, b) => a.value - b.value);
            const altLow = remainingSorted[0];
            const altHigh = remainingSorted[remainingSorted.length - 1];

            const altCard =
                (Math.abs((altHigh?.value ?? 0) - chosenCard.value) >= Math.abs(chosenCard.value - (altLow?.value ?? 0)))
                    ? altHigh
                    : altLow;

            const altIdx = player.hand.indexOf(altCard);
            if (altIdx !== -1) {
                player.hand.splice(altIdx, 1);
                player.mana -= SEC_COST;
                player.specialAbilityUsed = true;
                if (window.gameAudio) window.gameAudio.playAbility();
                appLogger.log(`⧖【秒針】${player.name} (3P AI) 耗用 ${SEC_COST} MP，蓋放 2 張分鐘卡（翻牌後二選一）。`);
                return {
                    type: 'seconds_pending',
                    options: [chosenCard, altCard]
                };
            }
        }
    }

    return chosenCard;
}

function makeAIChoice(player, gameState) {
    if (player.hand.length === 0) return null;

    // ✅ 3P 與純競標模式分流至純位置避險 AI 決策
    if (gameState.gameMode === '3P' || (typeof gameState.gameMode === 'string' && gameState.gameMode.startsWith('PURE'))) {
        return makeAIChoice3P(player, gameState);
    }
    const sortedHand = [...player.hand].sort((a, b) => a.value - b.value);
    const handSize = sortedHand.length;
    const drawnHours = gameState.currentDrawnHourCards || [];
    const myPos = player.currentClockPosition; 
    const hasPosition = myPos !== null;

    function pickIndex(rankA, rankB, isFromSmallest) {
        const chosenRank = checkChance(0.5) ? rankA : rankB;
        if (isFromSmallest) {
            return Math.min(chosenRank - 1, handSize - 1);
        } else {
            return Math.max(handSize - chosenRank, 0);
        }
    }

    const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');
    let selectedIndex = 0; 

    if (isEasy) {
        // === 原始基礎行為 (簡單) ===
        if (player.type === '時魔') {
            if (!hasPosition && drawnHours.some(c => c.number > 6)) {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
                else selectedIndex = pickIndex(1, 2, true);
            }
            else if (hasPosition && drawnHours.some(c => c.number > myPos)) {
                if (handSize > 8) selectedIndex = pickIndex(2, 3, true);
                else if (handSize >= 5) selectedIndex = pickIndex(1, 2, true);
                else selectedIndex = pickIndex(1, 1, true);
            }
            else if (hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number < myPos)) {
                if (handSize > 8) selectedIndex = pickIndex(2, 3, false);
                else if (handSize >= 5) selectedIndex = pickIndex(1, 2, false);
                else selectedIndex = pickIndex(1, 1, false);
            }
            else if (!hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number < 5)) {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, false);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false);
                else selectedIndex = pickIndex(1, 2, false);
            }
            else {
                selectedIndex = Math.floor(handSize / 2);
            }
        } 
        else if (player.type === '時之惡') {
            const timeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
            const demonsNoPosCount = timeDemons.filter(p => p.currentClockPosition === null).length;
            const demonsLowPosCount = timeDemons.filter(p => p.currentClockPosition !== null && p.currentClockPosition < 4).length;
            
            const hasHourOver6 = drawnHours.some(c => c.number > 6);
            const allHoursUnder6 = drawnHours.length > 0 && drawnHours.every(c => c.number < 6);
            const allHoursOver8 = drawnHours.length > 0 && drawnHours.every(c => c.number > 8);

            if ( (demonsNoPosCount >= 2 && hasHourOver6) || (demonsLowPosCount >= 2) ) {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
                else selectedIndex = pickIndex(1, 2, true);
            }
            else if (allHoursUnder6) {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, false);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false);
                else selectedIndex = pickIndex(1, 2, false);
            }
            else if (allHoursOver8) {
                if (handSize > 8) selectedIndex = pickIndex(2, 3, true);
                else if (handSize >= 5) selectedIndex = pickIndex(1, 2, true);
                else selectedIndex = pickIndex(1, 1, true);
            }
            else {
                selectedIndex = handSize - 1; 
            }
        }
        else if (player.type === '受詛者') {
            const preciousCount = drawnHours.filter(c => c.isPrecious).length;
            if (preciousCount === 2) {
                if (handSize > 8) selectedIndex = pickIndex(2, 3, false); 
                else if (handSize >= 5) selectedIndex = pickIndex(1, 2, false); 
                else selectedIndex = pickIndex(1, 1, false); 
            }
            else if (preciousCount === 0) {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, true); 
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true); 
                else selectedIndex = pickIndex(1, 2, true); 
            }
            else {
                if (handSize > 8) selectedIndex = pickIndex(3, 4, false); 
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false); 
                else selectedIndex = pickIndex(1, 2, false); 
            }
        }
        else {
            selectedIndex = handSize - 1; 
        }
    } else {
        // === 新改良演算法 (一般) ===
        // 手牌長線節奏控制輔助：前 4 回合若非關鍵救命或立即進化，保留最強殺手牌 (58-60)
        const round = gameState.roundMarker || 1;
        const isEarlyGame = (round <= 4 && handSize >= 5);

        const pickHighPaced = (rankA, rankB, urgent = false) => {
            const rawIdx = pickIndex(rankA, rankB, false);
            if (!urgent && isEarlyGame && rawIdx === handSize - 1) {
                // 節奏保留：將王牌留待中後期關鍵局
                return Math.max(0, handSize - 2);
            }
            return rawIdx;
        };

        if (player.type === '時魔') {
            const heldCards = player.hourCards || [];
            const heldPrecious = heldCards.filter(c => c.isPrecious).length;
            const hasPreciousOnBoard = drawnHours.some(c => c.isPrecious);

            // 1. 進化目標渴求判定：翻出的小時卡是否能讓幼體時魔立即達成進化條件？
            let canEvolveNow = false;
            if (typeof checkEvolutionCondition === 'function') {
                canEvolveNow = drawnHours.some(card => {
                    return checkEvolutionCondition({ hourCards: [...heldCards, card] })?.met;
                });
            }

            // 2. 鐘面危害判定
            const activeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
            const demonsWithPos = activeDemons.filter(d => typeof d.currentClockPosition === 'number');
            const maxDemonPos = demonsWithPos.length > 0 ? Math.max(...demonsWithPos.map(d => d.currentClockPosition)) : null;
            const isDemonAtMax = (maxDemonPos !== null && myPos === maxDemonPos);
            const minDrawnHour = drawnHours.length > 0 ? Math.min(...drawnHours.map(c => c.number)) : 6;
            const maxDrawnHour = drawnHours.length > 0 ? Math.max(...drawnHours.map(c => c.number)) : 6;

            if (canEvolveNow) {
                // [頂級優先]：可立即進化！全力爭奪優先挑牌權
                selectedIndex = pickHighPaced(1, 2, true);
            }
            else if (isDemonAtMax && minDrawnHour < myPos) {
                // [救命判定]：當前處於全場最危險鐘面位置，場上有安全小數值牌可轉移
                selectedIndex = pickHighPaced(1, 2, true);
            }
            else if (hasPreciousOnBoard && heldPrecious < 2) {
                // ⭐ 珍貴卡渴求：進化必備珍貴卡，高順位搶奪
                if (handSize > 8) selectedIndex = pickHighPaced(2, 3, false);
                else if (handSize >= 5) selectedIndex = pickHighPaced(1, 2, false);
                else selectedIndex = pickHighPaced(1, 2, true);
            }
            else if (hasPosition && myPos <= 4 && maxDrawnHour > 6) {
                // [守勢避險]：自身已在極安全位置 (<= 4)，場上小時卡數值偏高，故意出小/中牌避免被迫拿大數值
                if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
                else selectedIndex = pickIndex(1, 2, true);
            }
            else if (hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number < myPos)) {
                // 場上牌全部比自己目前位置好，搶先出牌以改善位置
                selectedIndex = pickHighPaced(2, 3, false);
            }
            else if (!hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number <= 5)) {
                // 首次落位且場上都是優質低數值，積極爭取優良落點
                selectedIndex = pickHighPaced(2, 3, false);
            }
            else {
                // 穩健過渡牌
                selectedIndex = Math.floor(handSize / 2);
            }
        }
        else if (player.type === '時之惡') {
            const timeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
            const demonsWithPos = timeDemons.filter(p => typeof p.currentClockPosition === 'number');
            const maxDemonPos = demonsWithPos.length > 0 ? Math.max(...demonsWithPos.map(d => d.currentClockPosition)) : null;
            const minDrawn = drawnHours.length > 0 ? Math.min(...drawnHours.map(c => c.number)) : 6;
            const maxDrawn = drawnHours.length > 0 ? Math.max(...drawnHours.map(c => c.number)) : 6;

            const isSinPenaltyMode = (gameState.sinTargetingMode === 'sin');

            if (isSinPenaltyMode) {
                // 惡之牽引模式：距離時之惡最近者受罰
                selectedIndex = pickHighPaced(2, 3, false);
            }
            else {
                // 預設模式：最大數值 (接近 12) 受罰
                const sinPos = player.currentClockPosition;
                const sinInDanger = (typeof sinPos === 'number' && (sinPos >= 10 || (maxDemonPos !== null && sinPos >= maxDemonPos)));

                if (sinInDanger && minDrawn < (sinPos ?? 12)) {
                    // 時之惡自身受罰危險，搶小牌避險
                    selectedIndex = pickHighPaced(1, 2, true);
                }
                else if (demonsWithPos.length > 0 && maxDrawn >= 8) {
                    // 場上有危險大牌，故意出小牌讓時魔被迫拿走大牌受罰
                    if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
                    else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
                    else selectedIndex = pickIndex(1, 2, true);
                }
                else if (minDrawn <= 4) {
                    // 場上有安全牌，時之惡嘗試掠奪，封死時魔逃生路徑
                    selectedIndex = pickHighPaced(2, 3, false);
                }
                else {
                    selectedIndex = pickHighPaced(2, 3, false);
                }
            }
        }
        else if (player.type === '受詛者') {
            const preciousCount = drawnHours.filter(c => c.isPrecious).length;
            if (preciousCount > 0) {
                // 受詛者接觸珍貴卡即鎖定，全力爭奪！
                selectedIndex = pickHighPaced(1, 2, true);
            } else {
                // 無珍貴卡時積蓄手牌資源
                if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
                else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
                else selectedIndex = pickIndex(1, 2, true);
            }
        }
        else {
            selectedIndex = pickHighPaced(1, 2, false);
        }
    }

    const targetCardValue = sortedHand[selectedIndex].value;
    const originalIndex = player.hand.findIndex(c => c.value === targetCardValue);
    const chosenCard = player.hand.splice(originalIndex, 1)[0];
    
	// ✅ 秒針能力：消耗 3 MP 蓋放 2 張，翻牌後二選一（AI 也可用）
	const COST = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT || 3;	
	if (
		GAME_CONFIG.enableAbilities &&
		player.roleCard === '秒針' &&
		!gameState.abilityMarker &&
		!player.specialAbilityUsed &&
		player.mana >= COST &&
		player.hand.length >= 1 // chosenCard 已拿走後，還要至少 1 張當第二張
	) {
		const useChance = isEasy ? 0.7 : 0.8;
		const usinbility = checkChance(useChance);

		if (usinbility) {
			const remainingSorted = [...player.hand].sort((a, b) => a.value - b.value);
			const altLow = remainingSorted[0];
			const altHigh = remainingSorted[remainingSorted.length - 1];

			// 選跟 chosenCard 差距較大的那張，讓 AI 有彈性
			const altCard =
				(Math.abs((altHigh?.value ?? 0) - chosenCard.value) >= Math.abs(chosenCard.value - (altLow?.value ?? 0)))
					? altHigh
					: altLow;

			const altIdx = player.hand.indexOf(altCard);
			if (altIdx !== -1) {
				player.hand.splice(altIdx, 1);
				player.mana -= COST;
				player.specialAbilityUsed = true;
				if (window.gameAudio) window.gameAudio.playAbility();
				appLogger.log(`⧖【秒針】${player.name} (AI) 耗用 ${COST} MP，蓋放 2 張分鐘卡（翻牌後二選一）。`);
				return {
					type: 'seconds_pending',
					options: [chosenCard, altCard]
				};
			} else {
				appLogger.log("AI 秒針能力發動失敗：找不到第二張牌");
			}
		}
	}
    return chosenCard;
}

// =========================================================
// ⏱️ 3P 模式專屬小時卡挑選演算法 (3P Hour Card Selection)
// =========================================================
function chooseHourCardForAI3P(gameState, player, drawnCards) {
    if (!drawnCards || drawnCards.length === 0) return null;

    const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');
    const otherAlive = (gameState?.players || []).filter(p => p.id !== player.id && !p.isEjected);
    const otherPositions = otherAlive
        .map(p => p.currentClockPosition)
        .filter(pos => typeof pos === 'number');

    if (isEasy || otherPositions.length === 0) {
        // 簡單模式或對手尚未落位：純粹挑選數值最小的小時卡 (離 12 越遠越好)
        const sorted = drawnCards.slice().sort((a, b) => a.number - b.number);
        const target = sorted[0];
        const idx = drawnCards.findIndex(c => c === target);
        if (idx !== -1) return drawnCards.splice(idx, 1)[0];
        return null;
    }

    // === 3P 一般模式：精準避罰與位置控制演算法 ===
    const otherMax = Math.max(...otherPositions);

    // 評估每張候選牌的受罰風險：
    // 若 card.number < otherMax -> 風險 0 (其他對手比我高，本回合絕對安全)
    // 若 card.number === otherMax -> 風險 1 (並列最高，會受罰)
    // 若 card.number > otherMax -> 風險 2 (全場最高，必受罰)
    const scoredCards = drawnCards.slice().map(c => {
        let risk = 0;
        if (c.number > otherMax) risk = 2;
        else if (c.number === otherMax) risk = 1;
        else risk = 0;

        // 分針專屬加權：若身為分針且 MP >= 2，評估跳躍逃生彈性
        if (player.roleCard === '分針' && player.mana >= 2 && risk > 0) {
            risk = 0.5; // 分針可透過技能跳走，風險折半
        }

        return { card: c, risk, number: c.number };
    });

    // 排序優先序：風險低者優先；同風險時數值小者優先 (離 12 越遠越好)
    scoredCards.sort((a, b) => {
        if (a.risk !== b.risk) return a.risk - b.risk;
        return a.number - b.number;
    });

    const chosen = scoredCards[0].card;
    const idx = drawnCards.findIndex(c => c === chosen);
    if (idx !== -1) {
        return drawnCards.splice(idx, 1)[0];
    }
    return null;
}

function chooseHourCardForAI(gameState, player, drawnCards) {
    if (!drawnCards || drawnCards.length === 0) return null;

    // ✅ 3P 與純競標模式分流至專屬挑牌演算法
    if (gameState.gameMode === '3P' || (typeof gameState.gameMode === 'string' && gameState.gameMode.startsWith('PURE'))) {
        return chooseHourCardForAI3P(gameState, player, drawnCards);
    }

    const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');
    if (isEasy) {
        // === 原始基礎行為 (簡單) ===
        const activeTimeDemons = (gameState?.players || [])
            .filter(p => !p.isEjected && typeof p.currentClockPosition === 'number');

        const maxPos = activeTimeDemons.length
            ? Math.max(...activeTimeDemons.map(p => p.currentClockPosition))
            : null;

        const isAtMaxHourValue =
            (maxPos !== null &&
             typeof player?.currentClockPosition === 'number' &&
             player.currentClockPosition === maxPos);

        const heldCards = (player && Array.isArray(player.hourCards)) ? player.hourCards : [];
        const heldNumbers = new Set(heldCards.map(c => c.number));
        const heldPreciousCount = heldCards.filter(c => c.isPrecious).length;

        if (isAtMaxHourValue) {
            const sorted = drawnCards.slice().sort((a, b) => {
                if (a.number !== b.number) return a.number - b.number;
                if (heldPreciousCount < 2) {
                    return (b.isPrecious === true) - (a.isPrecious === true);
                }
                return 0;
            });
            const target = sorted[0];
            const idx = drawnCards.findIndex(c => c === target);
            if (idx === -1) return null;
            return drawnCards.splice(idx, 1)[0];
        }

        let candidate = drawnCards.slice();
        const nonDuplicate = candidate.filter(c => !heldNumbers.has(c.number));
        if (nonDuplicate.length > 0) {
            candidate = nonDuplicate;
        }

        let pool = candidate;
        if (heldPreciousCount < 2) {
            const precious = candidate.filter(c => c.isPrecious);
            if (precious.length > 0) {
                pool = precious;
            }
        }

        const targetCard = pool.slice().sort((a, b) => a.number - b.number)[0];
        const idx = drawnCards.findIndex(c => c === targetCard);
        if (idx === -1) return null;
        return drawnCards.splice(idx, 1)[0];
    }

    // === 新改良演算法 (一般) ===
    const heldCards = (player && Array.isArray(player.hourCards)) ? player.hourCards : [];
    const heldNumbers = new Set(heldCards.map(c => c.number));
    const heldPreciousCount = heldCards.filter(c => c.isPrecious).length;

    // 1. 進化條件立即達成檢查：若有某張卡能立即讓幼體時魔達成進化，最高優先挑選！
    if (typeof checkEvolutionCondition === 'function') {
        const evoCandidate = drawnCards.find(card => {
            return checkEvolutionCondition({ hourCards: [...heldCards, card] })?.met;
        });
        if (evoCandidate) {
            const idx = drawnCards.findIndex(c => c === evoCandidate);
            if (idx !== -1) return drawnCards.splice(idx, 1)[0];
        }
    }

    // 2. 鐘面受罰危險判定
    const targetingMode = gameState.sinTargetingMode || 'default';
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    const sinPos = sinPlayer?.currentClockPosition ?? null;

    const clockDist = (a, b) => {
        if (typeof a !== 'number' || typeof b !== 'number') return 999;
        const diff = Math.abs(a - b);
        return Math.min(diff, 12 - diff);
    };

    const activeDemons = (gameState?.players || [])
        .filter(p => !p.isEjected && typeof p.currentClockPosition === 'number');
    const maxDemonPos = activeDemons.length ? Math.max(...activeDemons.map(p => p.currentClockPosition)) : null;
    const isAtMaxHourValue = (maxDemonPos !== null && player?.currentClockPosition === maxDemonPos);

    if (targetingMode === 'sin' && sinPos !== null) {
        // 惡之牽引模式：避開離時之惡最近的位置，挑選離時之惡最遠的卡牌
        const sorted = drawnCards.slice().sort((a, b) => {
            const distA = clockDist(a.number, sinPos);
            const distB = clockDist(b.number, sinPos);
            if (distA !== distB) return distB - distA; // 距離遠者優先
            if (heldPreciousCount < 2) return (b.isPrecious === true) - (a.isPrecious === true);
            return a.number - b.number;
        });
        const target = sorted[0];
        const idx = drawnCards.findIndex(c => c === target);
        if (idx !== -1) return drawnCards.splice(idx, 1)[0];
    } else if (isAtMaxHourValue) {
        // 預設模式且自身在最高位：優先挑選數值最小的卡牌避險
        const sorted = drawnCards.slice().sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number;
            if (heldPreciousCount < 2) return (b.isPrecious === true) - (a.isPrecious === true);
            return 0;
        });
        const target = sorted[0];
        const idx = drawnCards.findIndex(c => c === target);
        if (idx !== -1) return drawnCards.splice(idx, 1)[0];
    }

    // 3. 常規挑選：珍貴卡優先 (未滿 2 張時)，並儘量挑選不重複數字與補齊時代
    let candidate = drawnCards.slice();
    const nonDuplicate = candidate.filter(c => !heldNumbers.has(c.number));
    if (nonDuplicate.length > 0) {
        candidate = nonDuplicate;
    }

    if (heldPreciousCount < 2) {
        const precious = candidate.filter(c => c.isPrecious);
        if (precious.length > 0) {
            candidate = precious;
        }
    }

    // 時代補齊加權（進化條件 1：3 種不同時代）
    const heldAges = new Set(heldCards.map(c => c.ageGroup).filter(Boolean));
    const sortedByAgeNeed = candidate.slice().sort((a, b) => {
        const aNewAge = !heldAges.has(a.ageGroup) ? 1 : 0;
        const bNewAge = !heldAges.has(b.ageGroup) ? 1 : 0;
        if (aNewAge !== bNewAge) return bNewAge - aNewAge;
        return a.number - b.number;
    });

    const finalTarget = sortedByAgeNeed[0];
    const finalIdx = drawnCards.findIndex(c => c === finalTarget);
    if (finalIdx === -1) return null;
    return drawnCards.splice(finalIdx, 1)[0];
}

// ✅ AI 分針移動能力判定函式
function minuteHandPostHourAI(gameState) {
    if (typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE')) return;
    if (!GAME_CONFIG.enableAbilities || gameState.abilityMarker) return;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const COST = (gameState.gameMode === '3P')
        ? (window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE_3P || 3)
        : (window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE || 2);

    const minuteHandAIs = gameState.players.filter(p =>
        p.id !== humanId &&
        !p.isEjected &&
        p.roleCard === '分針' &&
        p.mana >= COST &&
        !p.specialAbilityUsed &&
        p.pickedHourThisTurn === true &&
        typeof p.currentClockPosition === 'number'
    );

    minuteHandAIs.forEach(aiPlayer => {
        const oldPos = aiPlayer.currentClockPosition;

        // 搜尋指定方向下一個有牌的格子
        const findNextPos = (dir) => {
            let pos = oldPos;
            for (let i = 0; i < 11; i++) {
                if (dir === 'ccw') {
                    pos--;
                    if (pos < 1) pos = 12;
                } else {
                    pos++;
                    if (pos > 12) pos = 1;
                }
                const spot = gameState.clockFace.find(s => s.position === pos);
                if (spot && spot.cards && spot.cards.length > 0) return pos;
            }
            return null;
        };

        const posCW = findNextPos('cw');
        const posCCW = findNextPos('ccw');

        if (posCW === null && posCCW === null) return;

        // 計算受罰風險 (若會被判定為懲罰對象回傳 2，否則回傳 0)
        const evaluatePenaltyRisk = (testPos) => {
            const targetingMode = gameState.sinTargetingMode || 'default';
            const currentMode = gameState.gameMode || (typeof getGameMode === 'function' ? getGameMode() : '5P');
            const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
            const sinPos = sinPlayer?.currentClockPosition ?? null;

            if (targetingMode === 'default' || currentMode === '3P') {
                const candidates = gameState.players.filter(p => {
                    const allowedTypes = (currentMode === '3P') ? (p.type === '時魔') : (p.type === '時魔' || p.type === '受詛者' || p.type === '時之惡');
                    return allowedTypes && !p.isEjected && typeof p.currentClockPosition === 'number';
                });
                const otherMax = candidates.length > 0 ? Math.max(
                    0,
                    ...candidates.filter(p => p !== aiPlayer).map(p => p.currentClockPosition)
                ) : 0;
                return testPos >= otherMax ? 2 : 0;
            } else {
                if (sinPos === null) return 0;
                const myDist = getCircularDistance(testPos, sinPos);
                const targets = gameState.players.filter(p =>
                    (p.type === '時魔' || p.type === '受詛者') &&
                    !p.isEjected &&
                    p !== aiPlayer &&
                    typeof p.currentClockPosition === 'number'
                );
                if (targets.length === 0) return 2;
                const otherMinDist = Math.min(...targets.map(p => getCircularDistance(p.currentClockPosition, sinPos)));
                return myDist <= otherMinDist ? 2 : 0;
            }
        };

        const currentRisk = evaluatePenaltyRisk(oldPos);
        const riskCW = posCW !== null ? evaluatePenaltyRisk(posCW) : 999;
        const riskCCW = posCCW !== null ? evaluatePenaltyRisk(posCCW) : 999;

        let bestChoice = null;

        if (currentRisk > 0) {
            // 目前面臨受罰風險，優先尋找可脫離受罰的方向
            if (riskCCW === 0 && riskCW === 0) {
                // 兩邊都安全，優先選數字較小的（更靠近 1 遠離 12）
                bestChoice = (posCCW < posCW) ? 'ccw' : 'cw';
            } else if (riskCCW < currentRisk) {
                bestChoice = 'ccw';
            } else if (riskCW < currentRisk) {
                bestChoice = 'cw';
            }
        } else {
            // 目前安全：當 MP 充足 (>= 4) 時，若逆時針能移到更小數值且安全的位置，有一定機率主動移以保持優勢
            if (aiPlayer.mana >= 4 && posCCW !== null && posCCW < oldPos && riskCCW === 0 && checkChance(0.4)) {
                bestChoice = 'ccw';
            }
        }

        if (bestChoice && typeof activateMinuteHandAbility === 'function') {
            activateMinuteHandAbility(gameState, aiPlayer.id, bestChoice);
        }
    });
}

if (typeof window !== 'undefined') {
    window.minuteHandPostHourAI = minuteHandPostHourAI;
}
