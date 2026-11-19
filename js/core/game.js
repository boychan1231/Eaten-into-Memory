




var GAME_CONFIG = (typeof window !== 'undefined' && window.GAME_CONFIG) ? window.GAME_CONFIG : (typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG : { enableAbilities: false });

// --- 6. 遊戲流程控制 ---

function startRound(gameState) {
	if (window.AutoNextRoundTimer && typeof window.AutoNextRoundTimer.stop === 'function') {
		window.AutoNextRoundTimer.stop();
	}
	const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
	// 當仍在等待人類輸入或小時卡挑選尚未結束時，不允許進入下一回合（避免「未選牌也能按下一回合」）
    const waitingMinute = gameState && gameState.currentRoundAIChoices !== null;
    const isHourSelectionActive = gameState && (
        !!gameState.waitingHourChoice ||
        (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) ||
        (Array.isArray(gameState.hourPickOrder) && gameState.hourPickOrder.length > 0)
    );
    const waitingAbility = gameState && (
        (!!gameState.waitingAbilityChoice && gameState.waitingAbilityChoicePlayerId === humanId) ||
        !!gameState.waitingMinuteHandChoice
    );
    const waitingSecondFinal = gameState && !!gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId;
    const playingClash = gameState && !!gameState.isPlayingMinuteClash;

    //防呆：若仍在等待操作（出牌/比牌動畫/小時卡挑選/能力/秒針最終選擇），禁止直接進入下一回合
    if (waitingMinute || isHourSelectionActive || waitingAbility || waitingSecondFinal || playingClash) {
        appLogger.log("[Game] 仍在等待操作（出牌/比牌動畫/小時卡挑選/能力/秒針最終選擇），不能開始下一回合。");
        return;
    }
	
	const isPure = typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE');

	// ✅ 新增：第 4 局開局平衡機制 (僅在第4局且第1回合時觸發)
    // 若牌庫 > 26 張，優先移除「非珍貴的 1」
    if (gameState.gameMode === '5P' && gameState.gameRound === 4 && gameState.roundMarker === 1) {
        if (gameState.hourDeck.length > 26) {
            
            // 1. 找出所有「非珍貴」且數字為「1」的卡
            const candidates = gameState.hourDeck.filter(c => !c.isPrecious && c.number === 1);
            
            // 2. 固定移除 2 張
            const countToRemove = Math.min(2, candidates.length);
            const cardsToRemove = candidates.slice(0, countToRemove);
            
            // 3. 執行移除
            cardsToRemove.forEach(card => {
                const idx = gameState.hourDeck.indexOf(card);
                if (idx !== -1) {
                    gameState.hourDeck.splice(idx, 1);
                }
            });
            
            // 4. 重新洗牌
            if (cardsToRemove.length > 0) {
                shuffle(gameState.hourDeck);
                appLogger.log(`§【第4局平衡】牌庫>26，強制移除 ${cardsToRemove.length} 張「非珍貴 1 號卡」。`);
            }
        }
    }
	
		// 第 5 局開局平衡機制 (僅在第5局且第1回合時觸發)
    // 如果牌庫大於 24 張，優先移除數字小的非珍貴卡，直到剩下 24 張
    if (gameState.gameMode === '5P' && gameState.gameRound === 5 && gameState.roundMarker === 1) {
        if (gameState.hourDeck.length > 24) {
            const targetCount = 24;
            const removeCount = gameState.hourDeck.length - targetCount;
            
            // 1. 找出所有非珍貴卡 (候選名單)
            const nonPreciousCandidates = gameState.hourDeck.filter(c => !c.isPrecious);
            
            // 2. 依照數字由小到大排序 (1, 1, 2, 2, 3...)
            nonPreciousCandidates.sort((a, b) => a.number - b.number);
            
            // 3. 鎖定要移除的卡片 (取前 N 張)
            const cardsToRemove = nonPreciousCandidates.slice(0, removeCount);
            
            // 4. 執行移除
            cardsToRemove.forEach(card => {
                const idx = gameState.hourDeck.indexOf(card);
                if (idx !== -1) {
                    gameState.hourDeck.splice(idx, 1);
                }
            });
            
            // 5. 重新洗牌 (確保剩餘卡片的隨機性)
            shuffle(gameState.hourDeck);
            
            const maxRemovedNum = cardsToRemove.length > 0 ? cardsToRemove[cardsToRemove.length - 1].number : '?';
            appLogger.log(`§【第5局平衡】牌庫過厚 (${gameState.hourDeck.length + cardsToRemove.length}張)，系統已移除 ${cardsToRemove.length} 張非珍貴卡 (數字 1~${maxRemovedNum})，修正為 24 張。`);
        }
    }
	
    gameState.currentMinuteChoices = null;
	
	// 每回合開始：重置「每回合一次」能力使用狀態（含時針頂牌放底）
	gameState.players.forEach(p => { p.specialAbilityUsed = false; });

    appLogger.log(`--- 開始第 ${gameState.gameRound} 局 第 ${gameState.roundMarker} 回合 ---`);

	// === 每回合重置：特殊能力使用狀態 & 本回合拿到的小時卡記錄 ===
	gameState.abilityMarker = false; 
	gameState.sinTargetingMode = 'default';
	gameState.players.forEach(p => {
		p.specialAbilityUsed = false;        
		p.pickedHourThisTurn = false;         
		p.pickedHourCardThisTurnNumber = null;
        p.pickedMinHourThisTurn = false;
        p.hourHandMoveCount = 0;
	});

    if (!isPure) {
        // ✅ 2. 先嘗試判定「封印全場」(消耗較高，優先判定)
        if (typeof activateSinSealAI === 'function') {
            activateSinSealAI(gameState);
        }

        // ✅ 3. 若沒封印(沒耗魔)，再嘗試判定「惡之牽引」
        const sinPlayer = gameState.players.find(p => p.type === '時之惡');
        if (sinPlayer && !sinPlayer.specialAbilityUsed) { // 確保沒有一回合放兩招
            if (typeof activateSinTargetingAbility === 'function') {
                activateSinTargetingAbility(gameState);
            }
        }
    }
	
    const drawnCards = [];
    if (gameState.hourDeck.length === 0) {
        appLogger.log("※ 小時卡牌庫已空，提早進入局末結算。");
        endGameRound(gameState);
        return;
    }
    while (drawnCards.length < 2 && gameState.hourDeck.length > 0) {
        drawnCards.push(gameState.hourDeck.pop());
    }
    gameState.currentDrawnHourCards = drawnCards; 
	
	const nums = drawnCards.map(c => c?.number).filter(n => typeof n === 'number');
	gameState.roundMinHourNumber = nums.length ? Math.min(...nums) : null;

	
// 進入「出分鐘卡前」階段（時針能力可用）
	gameState.phase = 'preMinute';

	// AI 時針：回合前自動偷看/決策（人類時針由 UI 按鈕觸發）
	if (!isPure && typeof hourHandPreMinuteAI === 'function') {
		hourHandPreMinuteAI(gameState);
    }

	// ✅ 修改：每個「新遊戲局」(也就是第 1 回合) 開始時才播放鐘聲
    if (gameState.roundMarker === 1) {
        if (window.gameAudio) window.gameAudio.playChime();
    }
        
    appLogger.log(`抽出的小時卡：[${drawnCards.map(c => c?.number ?? 'X').join(', ')}]`);
    appLogger.log("等待玩家打出分鐘卡...");
    processMinuteCardSelection(gameState); 
}



function processMinuteCardSelection(gameState) {
    const choices = [];
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId);

    // 1. 讓所有 AI 決定出牌
    gameState.players.filter(p => p.id !== humanId && !p.isEjected).forEach(player => {
        const card = makeAIChoice(player, gameState);
        if (card) {
            choices.push({ playerId: player.id, playerName: player.name, card, roleType: player.type });
            // 刪除了原本這裡的 appLogger.log(`${player.name} (AI) 已蓋牌。`);
        }
    });

    // 新增：如果 AI 有出牌，統一在這裡顯示一行精簡的訊息
    if (choices.length > 0) {
        appLogger.log("其他玩家 (AI) 已蓋牌。");
    }

    // 2. 判斷人類玩家狀態
    if (humanPlayer && !humanPlayer.isEjected && humanPlayer.hand.length > 0) {
        appLogger.log(`\n▶ ${humanPlayer.name} 回合！請選擇您的卡牌。`);
        gameState.currentRoundAIChoices = choices; 
        const nextStepBtn = document.getElementById('next-step-btn');
        if (nextStepBtn) nextStepBtn.disabled = true;
        return; 
    } else if (humanPlayer && humanPlayer.hand.length === 0) {
        appLogger.log(`\n※ ${humanPlayer.name} 已無手牌，本回合自動略過。`);
    }
    
    resolveMinuteCardSelection(gameState, choices);
}

function handleHumanSecondHandCommit(gameState, chosenCardValues) {
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId);
    if (!humanPlayer || humanPlayer.isEjected) return false;

    if (!GAME_CONFIG.enableAbilities || humanPlayer.roleCard !== '秒針') {
        console.warn("目前不能使用秒針能力。");
        return false;
    }
    if (gameState.abilityMarker) {
        console.warn("本回合能力被封鎖，不能使用秒針能力。");
        return false;
    }
    if (humanPlayer.specialAbilityUsed) {
        console.warn("本回合已使用過特殊能力。");
        return false;
    }
	//讀取秒針能力消耗
	const COST = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT || 3;
    if (humanPlayer.mana < COST) {
        console.warn("MP 不足，不能使用秒針能力。");
        return false;
    }
    if (!Array.isArray(chosenCardValues) || chosenCardValues.length !== 2) {
        console.warn("秒針能力必須選 2 張分鐘卡。");
        return false;
    }

    const [v1, v2] = chosenCardValues;

    const idx1 = humanPlayer.hand.findIndex(c => c.value === v1);
    if (idx1 === -1) return false;
    const card1 = humanPlayer.hand.splice(idx1, 1)[0];

    const idx2 = humanPlayer.hand.findIndex(c => c.value === v2);
    if (idx2 === -1) {
        humanPlayer.hand.push(card1);
        return false;
    }
    const card2 = humanPlayer.hand.splice(idx2, 1)[0];

    // ✅ 只在成功蓋牌後扣 MP
    humanPlayer.mana -= COST;
	
	if (window.gameAudio) window.gameAudio.playAbility();
	
    humanPlayer.specialAbilityUsed = true;

    gameState.phase = 'postMinute';

    // 保存兩張備選卡
    gameState.secondHandPendingCards = [card1, card2];
    gameState.waitingSecondHandFinalChoice = true;
    gameState.waitingSecondHandFinalChoicePlayerId = humanId;

    // 翻開其他玩家（AI）的牌
    const aiChoices = gameState.currentRoundAIChoices || [];
    gameState.secondHandRevealedChoices = [...aiChoices];

    // ✅ 修正：UI 的「本回合出牌」加入秒針的待選狀態，這樣介面上會顯示 "??"
    gameState.currentMinuteChoices = [...aiChoices, {
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        card: { type: 'seconds_pending' },
        roleType: humanPlayer.type
    }];

    // 清掉等待出牌（人類已完成「蓋牌」）
    gameState.currentRoundAIChoices = null;

    appLogger.log(`⧖【秒針】您耗用 ${COST} MP，蓋放 2 張分鐘卡（翻牌後二選一）。`);
    appLogger.log("--- ✦ 翻牌時刻！ ✦ ---");
    aiChoices.forEach(c => {
        if (c.card && c.card.type === 'seconds_pending') {
            appLogger.log(`◈ ${c.playerName} (秒針) 蓋放了 2 張卡牌。`);
        } else {
            appLogger.log(`◈ ${c.playerName} 翻開了：[ ${c.card.value} ]`);
        }
    });
    appLogger.log("⧖【秒針】請從 2 張蓋牌中選 1 張打出。");

    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}

function handleHumanSecondHandFinalChoice(gameState, chosenValue) {
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId);
    if (!humanPlayer || humanPlayer.isEjected) return false;

    if (!gameState.waitingSecondHandFinalChoice || gameState.waitingSecondHandFinalChoicePlayerId !== humanId) {
        return false;
    }

    const pending = gameState.secondHandPendingCards || [];
    if (pending.length !== 2) {
        console.warn("秒針備選卡不存在。");
        return false;
    }

    const [a, b] = pending;
    const chosen = (a.value === chosenValue) ? a : (b.value === chosenValue ? b : null);
    if (!chosen) {
        console.warn("無效的秒針選擇。");
        return false;
    }
    const other = (chosen === a) ? b : a;

    // 未選擇的卡回手牌
    humanPlayer.hand.push(other);

    // 即時更新人類最後打出的卡牌（供手牌旁棄牌區頂牌顯示）
    gameState.lastPlayedCard = {
        value: chosen.value,
        gear: chosen.gear,
        card: chosen,
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        roleType: humanPlayer.type,
        gameRound: gameState.gameRound,
        roundMarker: gameState.roundMarker,
        isHuman: true
    };

    const baseChoices = gameState.secondHandRevealedChoices || [];
    const allChoices = [...baseChoices, {
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        card: chosen,
        roleType: humanPlayer.type
    }];

    gameState.currentMinuteChoices = allChoices;

    // 清理狀態
    gameState.waitingSecondHandFinalChoice = false;
    gameState.waitingSecondHandFinalChoicePlayerId = null;
    gameState.secondHandPendingCards = null;
    gameState.secondHandRevealedChoices = null;

    appLogger.log(`◈ ${humanPlayer.name} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);

    // ✅ 進入既有流程，但跳過翻牌 log（避免重複顯示）
    resolveMinuteCardSelection(gameState, allChoices, { skipRevealLog: true });

    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}


function handleHumanChoice(gameState, chosenCardValue) {
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = (gameState && Array.isArray(gameState.players))
        ? (gameState.players.find(p => p.id === humanId) || gameState.players[0])
        : null;
    if (!humanPlayer || !Array.isArray(humanPlayer.hand)) {
        console.warn("無法取得人類玩家手牌。");
        return false;
    }
    const chosenCardIndex = humanPlayer.hand.findIndex(c => c.value === chosenCardValue);
    if (chosenCardIndex === -1) {
        console.warn("無效卡牌選擇，請重新選擇。");
        return false; 
    }
    const chosenCard = humanPlayer.hand.splice(chosenCardIndex, 1)[0];
    gameState.lastPlayedCard = {
        value: chosenCard.value,
        gear: chosenCard.gear,
        card: chosenCard,
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        roleType: humanPlayer.type,
        gameRound: gameState.gameRound,
        roundMarker: gameState.roundMarker,
        isHuman: true
    };

    const allChoices = gameState.currentRoundAIChoices || [];
    allChoices.push({ 
        playerId: humanPlayer.id, 
        playerName: humanPlayer.name, 
        card: chosenCard, 
        roleType: humanPlayer.type 
    });
    appLogger.log(`你打出了 ${chosenCard.value} 號分鐘卡。`);

    gameState.currentRoundAIChoices = null;
    resolveMinuteCardSelection(gameState, allChoices);
    return true; 
}

function resolveMinuteCardSelection(gameState, choices, options = {}) {
    gameState.phase = 'postMinute';
    const skipRevealLog = !!options.skipRevealLog;

    if (!choices || choices.length === 0) {
        deductGearCards(gameState);
        return;
    }

    if (!skipRevealLog) {
        appLogger.log("--- ✦ 翻牌時刻！ ✦ ---");
        choices.forEach(c => {
            if (c.card && c.card.type === 'seconds_pending') {
                appLogger.log(`◈ ${c.playerName} (秒針) 蓋放了 2 張卡牌。`);
            } else {
                appLogger.log(`◈ ${c.playerName} 翻開了：[ ${c.card.value} ]`);
            }
        });
    }

    // === 秒針能力（AI）：翻牌後二選一（在排序/選小時卡前完成）===
    const pendingChoices = choices.filter(c => c.card && c.card.type === 'seconds_pending');
    if (pendingChoices.length > 0) {
        pendingChoices.forEach(pc => {
            const player = gameState.players.find(p => p.id === pc.playerId);
            const opts = pc.card.options || [];
            if (opts.length !== 2) return;

            const [a, b] = opts;

            // AI 策略：依據當前翻出的小時卡及自身位置進行智能二選一
            const drawnHours = gameState.currentDrawnHourCards || [];
            const myPos = player ? player.currentClockPosition : null;
            let wantsHourCard = true;

            if (gameState.gameMode === '3P') {
                // === 3P 秒針專屬翻牌二選一意向判定 ===
                const otherAlive = (gameState.players || []).filter(p => p.id !== player.id && !p.isEjected);
                const otherPositions = otherAlive
                    .map(p => p.currentClockPosition)
                    .filter(pos => typeof pos === 'number');
                const maxOtherPos = otherPositions.length > 0 ? Math.max(...otherPositions) : null;
                const minDrawn = drawnHours.length > 0 ? Math.min(...drawnHours.map(c => c.number)) : 6;

                // 毒牌陷阱判定：場上所有小時卡皆大於其他對手當前位置，且自己目前比翻出的小時卡安全
                const isPoisonTrap = (maxOtherPos !== null && drawnHours.length > 0 &&
                    drawnHours.every(c => c.number > maxOtherPos) &&
                    (myPos === null || myPos < minDrawn));

                if (isPoisonTrap) {
                    wantsHourCard = false; // 故意不要小時卡，爭取第 3 名！
                } else if (myPos !== null && maxOtherPos !== null && myPos >= maxOtherPos && minDrawn < myPos) {
                    wantsHourCard = true; // 緊急逃生，務必拿下前 2 名
                } else if (myPos !== null && myPos <= 4 && maxOtherPos !== null && maxOtherPos > myPos && minDrawn >= 6) {
                    wantsHourCard = false; // 當前位置極優，場上牌沒自己好，不強求拿牌
                } else {
                    wantsHourCard = true;
                }
            } else {
                if (myPos !== null && drawnHours.length > 0 && drawnHours.every(c => c.number < myPos)) {
                    // 全部小時卡都小於目前位置，拿了無法推進且易受罰，傾向選小牌防守
                    wantsHourCard = false;
                }
                if (drawnHours.some(c => c.isPrecious)) {
                    // 有珍貴卡，強烈想要搶先選牌
                    wantsHourCard = true;
                }
            }

            const isEasy = (window.GAME_CONFIG?.aiDifficulty === 'easy');
            let chosen = null;

            if (isEasy) {
                chosen = wantsHourCard
                    ? ((a.value >= b.value) ? a : b)
                    : ((a.value < b.value) ? a : b);
            } else {
                // 新改良演算法：檢視其他玩家已揭曉分鐘牌，評估排位競爭力
                const higherCard = (a.value >= b.value) ? a : b;
                const lowerCard = (a.value < b.value) ? a : b;
                const otherValues = choices
                    .filter(c => c !== pc && c.card && typeof c.card.value === 'number')
                    .map(c => c.card.value)
                    .sort((x, y) => y - x);

                if (wantsHourCard) {
                    // 場上前 2 名有選牌權 (5P/3P 模式每回合 2 張小時卡)
                    const secondHighestOther = otherValues.length >= 2 ? otherValues[1] : (otherValues[0] ?? 0);
                    if (lowerCard.value > secondHighestOther) {
                        // 小牌就足以擠進前 2 名，保送出線並省下大牌！
                        chosen = lowerCard;
                    } else if (higherCard.value <= secondHighestOther && otherValues.length >= 2) {
                        // 即使出大牌也擠不進前 2 名，認賠保留大牌給下一輪
                        chosen = lowerCard;
                    } else {
                        chosen = higherCard;
                    }
                } else {
                    chosen = lowerCard;
                }
            }
            const other = (chosen === a) ? b : a;

            // 未選擇者回到手牌
            if (player && Array.isArray(player.hand)) player.hand.push(other);

            pc.card = chosen;

            if (!skipRevealLog) {
                appLogger.log(`◈ ${pc.playerName} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);
            }
        });
    }

    // 保留翻牌後的原始玩家出牌順序，供「分鐘卡比大小與次序排列動畫」對比換位使用
    const preSortChoices = choices.map(c => ({
        playerId: c.playerId,
        playerName: c.playerName,
        card: c.card,
        roleType: c.roleType
    }));

    choices.sort((a, b) => b.card.value - a.card.value);

    const drawnCards = gameState.currentDrawnHourCards || [];

    const _roundHourNums = (drawnCards || [])
        .map(c => c?.number)
        .filter(n => typeof n === 'number');
    gameState.roundMinHourNumber = _roundHourNums.length ? Math.min(..._roundHourNums) : null;

    gameState.currentMinuteChoices = choices;
	
	// ✅ 新增：把「這批分鐘卡」所屬回合鎖定下來
	// 之後 moveRoundMarker() 先 roundMarker++ 再 updateUI() 時，UI 也不會誤以為是下一回合的新資料
	gameState.uiMinuteChoicesTurnKey = `${gameState.gameRound}-${gameState.roundMarker}`;

    if (!drawnCards || drawnCards.length === 0) {
        gameState.currentDrawnHourCards = null;
        recordMinuteDiscard(gameState, choices);
        deductGearCards(gameState);
        return;
    }

    const pickers = choices.slice(0, drawnCards.length);

    gameState.hourPickOrder = pickers;
    gameState.nextHourPickerIndex = 0;
    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;

    // 若處於瀏覽器互動模式且存在「分鐘卡比大小與次序排列動畫」播放器，先演繹三階段比大小動畫再進入選小時卡
    if (typeof window !== 'undefined' && typeof window.playMinuteClashAnimation === 'function') {
        const clashEl = document.getElementById('minute-clash-overlay');
        if (clashEl && clashEl.nodeType === 1) {
            gameState.isPlayingMinuteClash = true;
            if (typeof updateUI === 'function') updateUI(gameState);
            window.playMinuteClashAnimation(gameState, preSortChoices, choices, () => {
                gameState.isPlayingMinuteClash = false;
                processNextHourPicker(gameState);
            });
            return;
        }
    }

    processNextHourPicker(gameState);
}


function processNextHourPicker(gameState) {
    const drawnCards = gameState.currentDrawnHourCards || [];
    const pickers = gameState.hourPickOrder || [];

    if (!pickers || drawnCards.length === 0 || gameState.nextHourPickerIndex >= pickers.length) {
        finishHourSelection(gameState);
        return;
    }

    const pickerInfo = pickers[gameState.nextHourPickerIndex];
    const player = gameState.players.find(p => p.id === pickerInfo.playerId);

    if (!player || player.isEjected) {
        gameState.nextHourPickerIndex++;
        setTimeout(() => processNextHourPicker(gameState), 0);
        return;
    }

    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    if (player.id === humanId) {
        gameState.waitingHourChoice = true;
        gameState.waitingHourChoicePlayerId = player.id;
        appLogger.log(`▶ ${player.name} 請在右側選擇一張小時卡。`);
        if (typeof updateUI === 'function') {
            updateUI(gameState);
        }
        return; 
    }

    const chosenCard = chooseHourCardForAI(gameState, player, drawnCards);
	
    if (!chosenCard) {
        finishHourSelection(gameState);
        return;
    }

    placeHourCardForPlayer(gameState, player, chosenCard, pickerInfo.playerName);

	if (typeof updateUI === 'function') {
        updateUI(gameState); 
    }

    gameState.nextHourPickerIndex++;
    const pickDelay = (typeof window !== 'undefined' && window.EffectQueue && window.EffectQueue.isEnabled())
        ? (window.EffectQueue.getIntervalMs() || 260)
        : 50;
    setTimeout(() => {
        processNextHourPicker(gameState);
    }, pickDelay); 
}

// --- 新增輔助函式：受詛者鎖定機制 ---
// game.js - 輔助函式區

// --- 新增輔助函式：受詛者鎖定機制 (接觸即鎖定) ---
function checkAndLockPreciousCards(gameState) {
    const sczPlayer = gameState.players.find(p => p.type === '受詛者' && !p.isEjected);
    if (!sczPlayer || !sczPlayer.currentClockPosition) return;

    // 找出受詛者所在的格子
    const currentSpot = gameState.clockFace.find(s => s.position === sczPlayer.currentClockPosition);
    if (!currentSpot || currentSpot.cards.length === 0) return;

    let newLockedCount = 0;
    
    // 遍歷該格子的所有卡片
    currentSpot.cards.forEach(card => {
        // 只要是珍貴卡，且尚未被鎖定，就執行鎖定
        if (card.isPrecious && !card.isLocked) {
            card.isLocked = true; // 加上鎖定標記 (永久保留在鐘面)
            newLockedCount++;
            appLogger.log(`◈【受詛者】接觸並固定了珍貴小時卡 [${card.number}★]！`);
        }
    });
}

// game.js - placeHourCardForPlayer 修正版

function placeHourCardForPlayer(gameState, player, cardToPlace, playerNameForLog) {
    if (!gameState || !player || !cardToPlace) return;

    // 1) 更新玩家位置
    player.currentClockPosition = cardToPlace.number;

    // 記錄本回合資訊
    player.pickedHourThisTurn = true;
    player.pickedHourCardThisTurnNumber = cardToPlace.number;
    player.pickedMinHourThisTurn =
        (player.roleCard === '分針' &&
         gameState.roundMinHourNumber !== null &&
         cardToPlace.number === gameState.roundMinHourNumber);

    const label = playerNameForLog || player.name;
    appLogger.log(`${label} 挑選小時卡 [${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}]，移動到 ${cardToPlace.number} 格。`);

    // 2) 幼體時魔：持有卡片
    const isTimeDemon = player.type === '時魔' && !player.isEjected;
    const roleText = String(player.roleCard || '');
    const isYoungTimeDemon = isTimeDemon && roleText.includes('幼');

    if (!Array.isArray(player.hourCards)) player.hourCards = [];

    if (isYoungTimeDemon) {
        player.hourCards.push(cardToPlace);
        appLogger.log(`${label} 取得小時卡 ${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}`);
        return;
    }

    // 3) 其他角色 (含受詛者)：留在鐘面
    const clockSpot = gameState.clockFace.find(s => s.position === cardToPlace.number);
    if (clockSpot) {
        clockSpot.cards.push(cardToPlace);
        
        // 這樣受詛者一拿到卡片 (一踩上去)，卡片就會立刻被鎖定
        if (typeof checkAndLockPreciousCards === 'function') {
            checkAndLockPreciousCards(gameState);
        }

        return; 
    }

    // 4) 防呆
    gameState.hourDeck.push(cardToPlace);
    console.warn(`※ 找不到鐘面位置 ${cardToPlace.number}，已將小時卡退回牌庫避免遺失。`);
}

function handleHumanHourCardChoice(gameState, chosenIndex) {
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    if (!gameState || !gameState.waitingHourChoice || gameState.waitingHourChoicePlayerId !== humanId) {
        return;
    }

    const humanPlayer = gameState.players.find(p => p.id === humanId);
    if (!humanPlayer) return;

    const drawnCards = gameState.currentDrawnHourCards || [];
    if (chosenIndex < 0 || chosenIndex >= drawnCards.length) {
        console.warn("所選小時卡不存在或已被拿走。");
        return;
    }

    const cardToPlace = drawnCards.splice(chosenIndex, 1)[0];
    placeHourCardForPlayer(gameState, humanPlayer, cardToPlace, humanPlayer.name);

    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.nextHourPickerIndex++;

    processNextHourPicker(gameState);

    if (typeof updateUI === 'function') {
        updateUI(gameState);
    }
}

// game.js - finishHourSelection 函式 (已修改：分針取得任意小時卡皆可觸發)

function recordMinuteDiscard(gameState, choices) {
    if (!gameState) return;
    if (!Array.isArray(gameState.minuteDiscard)) gameState.minuteDiscard = [];
    if (!choices || !Array.isArray(choices) || choices.length === 0) return;

    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : 'SM_1');

    // 過濾尚未決定的秒針暫態卡或無效資料，避免寫入 undefined
    const validChoices = choices.filter(c => c && c.card && c.card.type !== 'seconds_pending' && typeof c.card.value === 'number');
    if (validChoices.length === 0) return;

    // 依序記錄：非人類玩家先入堆，人類玩家卡牌最後入堆，使最上一張為人類打出的卡牌
    const sortedChoices = [...validChoices].sort((a, b) => {
        const aIsHuman = (a.playerId === humanId);
        const bIsHuman = (b.playerId === humanId);
        if (aIsHuman && !bIsHuman) return 1;
        if (!aIsHuman && bIsHuman) return -1;
        return 0;
    });

    sortedChoices.forEach(c => {
        const entry = {
            value: c.card.value,
            gear: c.card.gear,
            card: c.card,
            playerId: c.playerId,
            playerName: c.playerName,
            roleType: c.roleType,
            gameRound: gameState.gameRound,
            roundMarker: gameState.roundMarker,
            isHuman: (c.playerId === humanId)
        };
        gameState.minuteDiscard.push(entry);
    });

    // 若本回合含人類出牌，或尚無 lastPlayedCard 時，更新最上一張牌快取
    const topChoice = sortedChoices[sortedChoices.length - 1];
    if (topChoice.playerId === humanId || !gameState.lastPlayedCard) {
        gameState.lastPlayedCard = {
            value: topChoice.card.value,
            gear: topChoice.card.gear,
            card: topChoice.card,
            playerId: topChoice.playerId,
            playerName: topChoice.playerName,
            roleType: topChoice.roleType,
            gameRound: gameState.gameRound,
            roundMarker: gameState.roundMarker,
            isHuman: (topChoice.playerId === humanId)
        };
    }
}

function finishHourSelection(gameState) {
    // 1. 清理上一階段狀態
    gameState.currentDrawnHourCards = null;
    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.hourPickOrder = null;
    gameState.nextHourPickerIndex = 0;

    // 丟棄本回合分鐘卡
    const choices = gameState.currentMinuteChoices || [];
    recordMinuteDiscard(gameState, choices);

    if (typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE')) {
        deductGearCards(gameState);
        return;
    }

    // 1.5 AI 分針能力判定
    if (typeof minuteHandPostHourAI === 'function') {
        minuteHandPostHourAI(gameState);
    }

    // 2. 檢查分針觸發條件
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId);
    
    // 定義基礎條件
    const isMinuteHand = humanPlayer && humanPlayer.roleCard === '分針';
    const isAlive = humanPlayer && !humanPlayer.isEjected;
    const hasMP = humanPlayer && humanPlayer.mana >= 2;
    const notBlocked = !gameState.abilityMarker;
    const notUsed = humanPlayer && !humanPlayer.specialAbilityUsed;
    
    // ✅ 修改重點：只要「本回合有取得小時卡」即可 (移除 roundMinHourNumber 的比對)
    const gotCard = 
        humanPlayer &&
        humanPlayer.pickedHourThisTurn === true &&
        typeof humanPlayer.pickedHourCardThisTurnNumber === 'number';

    // 綜合判斷
    if (GAME_CONFIG.enableAbilities && isMinuteHand && isAlive && hasMP && notBlocked && notUsed && gotCard) {
        
        // 設定專屬等待狀態
        gameState.waitingMinuteHandChoice = true;
        
        appLogger.log(`⧖【分針觸發】條件達成 (取得小時卡 ${humanPlayer.pickedHourCardThisTurnNumber})，暫停遊戲，顯示能力面板。`);

        if (typeof updateUI === 'function') updateUI(gameState);
        return; // 暫停流程，等待玩家操作
    }

    // 若沒觸發，直接進入扣血階段
    deductGearCards(gameState);
}

// 處理人類玩家的能力選擇結果
function handleHumanAbilityChoice(gameState, choice) {
    // 如果不是在等待分針選擇，就忽略
    if (!gameState || !gameState.waitingMinuteHandChoice) return;

    appLogger.log(`收到分針選擇: ${choice}`);

    if (choice === 'ccw' || choice === 'cw') {
        // 呼叫 abilities.js 的函式 (需確保已載入)
        if (typeof activateMinuteHandAbility === 'function') {
            const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
            activateMinuteHandAbility(gameState, humanId, choice);
        }
    } else {
        appLogger.log("分針選擇略過能力。");
    }

    // ✅ 清除等待狀態
    gameState.waitingMinuteHandChoice = false;

    // ✅ 恢復遊戲流程
    deductGearCards(gameState);

    if (typeof updateUI === 'function') updateUI(gameState);
}


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

    // 1.5 時之惡庇護與回能機制：
    // 若沒有任何角色受罰（即時之惡為受罰規則的唯一適用角色），則時之惡免受處罰，並恢復 1 點 MP（上限為齒輪數）
    if (currentMode !== '3P' && sinPlayer) {
        const isSinAloneTarget = (playersToDeduct.length === 1 && playersToDeduct[0] === sinPlayer);
        const isNoOneTargetedInSin = (targetingMode === 'sin' && playersToDeduct.length === 0);

        if (isSinAloneTarget || isNoOneTargetedInSin) {
            const maxMP = sinPlayer.gearCards;
            const oldMP = sinPlayer.mana || 0;
            if (oldMP < maxMP) {
                sinPlayer.mana = oldMP + 1;
                appLogger.log(`◆【時之惡】為受罰規則適用角色（全場無其他角色受罰），免受處罰並恢復 1 點 MP (目前: ${sinPlayer.mana}/${maxMP})。`);
            } else {
                appLogger.log(`◆【時之惡】為受罰規則適用角色（全場無其他角色受罰），免受處罰 (MP 已達上限: ${sinPlayer.mana})。`);
            }
            // 清空受罰名單，確保時之惡不扣除護盾或齒輪
            playersToDeduct = [];
        }
    }

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

	// 檢查是否「所有時魔都曾被吞噬過」
    const allTimeDemons = gameState.players.filter(p => p.type === '時魔');
    const allDemonsEverEjected = allTimeDemons.length > 0 && allTimeDemons.every(p => p.hasEverBeenEjected);
	
	// 判斷：時之惡陣亡 OR 時魔全滅 (當下全滅) OR 時魔皆曾被吞噬 (累計全滅)
    if (currentMode === '3P') {
        if (aliveTimeDemons.length === 0) {
            gameState.gameEnded = true;
            appLogger.log('✦ 遊戲結束：所有時魔皆被吞噬。');
        }
    } else if (!sinAlive || aliveTimeDemons.length === 0 || allDemonsEverEjected) {
        gameState.gameEnded = true;
        if (!sinAlive && aliveTimeDemons.length > 0) {
            appLogger.log('✦ 遊戲結束：時之惡被吞噬，時魔陣營勝利！');
        } else if (sinAlive && (aliveTimeDemons.length === 0 || allDemonsEverEjected)) {
            // ✅ 修改訊息：明確指出獲勝原因
            if (allDemonsEverEjected) {
                appLogger.log('✦ 遊戲結束：所有時魔皆曾被吞噬，時之惡完成「完全狩獵」，時之惡陣營勝利！');
            } else {
                appLogger.log('✦ 遊戲結束：場上時魔已全數陣亡，時之惡陣營勝利！');
            }
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

function moveRoundMarker(gameState) {
    gameState.roundMarker++; 
    gameState.sinTargetingMode = 'default';
	gameState.phase = 'idle';

    if (gameState.roundMarker > 12) {
        endGameRound(gameState);
    } else {
        appLogger.log(`--- 回合結束，準備進入第 ${gameState.roundMarker} 回合 ---`);
        if (typeof updateUI === 'function') updateUI(gameState);
        if (window.AutoNextRoundTimer && typeof window.AutoNextRoundTimer.start === 'function') {
            window.AutoNextRoundTimer.start(gameState);
        }
    }
}

// 檢查受詛者任務
function checkSCZMissionSuccess(gameState) {
    let lockedPreciousCount = 0;
    gameState.clockFace.forEach(spot => {
        // ✅ 修正：必須只計算「已鎖定 (isLocked)」的珍貴卡
        // 否則回合結束前(尚未清理鐘面時)，暫留在場上的未鎖定珍貴卡會被誤算
        lockedPreciousCount += spot.cards.filter(c => c.isPrecious && c.isLocked).length;
    });
    return (lockedPreciousCount >= 12); 
}

function endGameRound(gameState) {
    appLogger.log(`=== 第 ${gameState.gameRound} 局結束 ===`);
    const numPlayers = gameState.players.length;
    const isPure = typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE');

    // 1. 「時之惡飢餓懲罰」判定：若該局無時魔被吞噬，將因飢餓從該局得分中扣除 2 齒輪（如扣至負數則達成 吞噬時之惡）
    const sinPlayer = !isPure ? gameState.players.find(p => p.type === '時之惡' && !p.isEjected) : null;
    const noDemonDevouredThisRound = !gameState.roundHadTimeDemonEjection;

    if (sinPlayer && noDemonDevouredThisRound) {
        sinPlayer.gearCards -= 2;
        appLogger.log(`※【時之惡懲罰】本局無時魔被吞噬，${sinPlayer.name} 因飢餓從該局得分中扣除 2 GP（剩餘 ${sinPlayer.gearCards} GP）。`);

        if (sinPlayer.gearCards < 0) {
            sinPlayer.isEjected = true;
            sinPlayer.hasEverBeenEjected = true;
            sinPlayer.gearCards = 0;
            sinPlayer.mana = 0;
            sinPlayer.currentClockPosition = null;
            if (typeof sinPlayer.d6Die === 'number') sinPlayer.d6Die = 0;
            appLogger.log(`☠【吞噬】${sinPlayer.name} 因飢餓扣至負數，被吞噬出局！`);
            appLogger.log('✦ 遊戲結束：時之惡被吞噬，時魔陣營勝利！');
            gameState.gameEnded = true;
        } else {
            if (sinPlayer.mana > sinPlayer.gearCards) sinPlayer.mana = sinPlayer.gearCards;
            if (sinPlayer.mana < 0) sinPlayer.mana = 0;
        }
    }

    // 重置本局時魔被吞噬標記
    gameState.roundHadTimeDemonEjection = false;

    // 2. 計算分數（以本局結束時的齒輪數為準，出局/被吞噬者為 0 分）
    const roundSummary = gameState.players.map(player => {
        const wasEjected = !!player.isEjected;
        const roundEarned = wasEjected ? 0 : Math.max(0, player.gearCards);
        player.score += roundEarned;
        player.bestRoundGear = Math.max(player.bestRoundGear || 0, roundEarned);
        appLogger.log(`【${player.name}】得分: ${roundEarned}. 總分: ${player.score}`);
        return {
            id: player.id,
            name: player.name,
            roleCard: player.roleCard,
            type: player.type,
            wasEjected: wasEjected,
            roundScore: roundEarned,
            totalScore: player.score
        };
    });
    gameState.lastRoundSummary = roundSummary;

    // 若時之惡因飢餓被吞噬導致遊戲結束，立即進入 endGame
    if (sinPlayer && sinPlayer.isEjected && gameState.gameEnded) {
        endGame(gameState);
        return;
    }
	
	// 受詛者任務檢查
	const sczPlayer = !isPure ? gameState.players.find(p => p.type === '受詛者') : null;
    if (sczPlayer && !sczPlayer.isEjected) {
        const isMissionSuccess = checkSCZMissionSuccess(gameState);
        
        if (isMissionSuccess) {
            if (gameState.gameRound === 2) {
                sczPlayer.score += 9;
                appLogger.log("✦【受詛者】第 2 局任務達成！獲得額外 9 分！");
            } else if (gameState.gameRound === 3) {
                sczPlayer.score += 5;
                appLogger.log("✦【受詛者】第 3 局任務達成！獲得額外 5 分！");
            } else if (gameState.gameRound === 4) {
                sczPlayer.score += 2;
                appLogger.log("✦【受詛者】第 4 局任務達成！獲得額外 2 分！");
            }
        }
	
        // 【5P 專用】第 5 局結算
        if (numPlayers === 5 && gameState.gameRound === 5) {
            if (isMissionSuccess) {
                appLogger.log("✦【受詛者】最終任務達成！");
            } else {
                appLogger.log("※【受詛者】最終任務失敗。");
                sczPlayer.score -= 999;
            }
        }
    }

    // 同步局結算快照中的總分，確保受詛者任務額外得分或扣分正確反映於結算彈窗中
    if (Array.isArray(gameState.lastRoundSummary)) {
        gameState.lastRoundSummary.forEach(item => {
            const p = gameState.players.find(x => x.id === item.id);
            if (p) item.totalScore = p.score;
        });
    }

    // 記錄局得分歷程快照 (Score History)
    if (!Array.isArray(gameState.scoreHistory)) {
        gameState.scoreHistory = [];
    }
    const currentFinishedRound = gameState.gameRound;
    const historyEntry = {
        round: currentFinishedRound,
        timestamp: Date.now(),
        players: gameState.lastRoundSummary.map(item => ({
            id: item.id,
            name: item.name,
            roleCard: item.roleCard,
            type: item.type,
            wasEjected: item.wasEjected,
            roundScore: item.roundScore,
            totalScore: item.totalScore
        }))
    };
    const existingIndex = gameState.scoreHistory.findIndex(h => h.round === currentFinishedRound);
    if (existingIndex >= 0) {
        gameState.scoreHistory[existingIndex] = historyEntry;
    } else {
        gameState.scoreHistory.push(historyEntry);
    }

    // ✅ 重點修正 1：在此處檢查是否達到最後一局 (例如第 5 局結束)
    // 如果是，直接結束遊戲，不再進行後續的手牌分發 (避免 Bug)
    if (gameState.gameRound >= numPlayers) {
        endGame(gameState);
        return;
    }

    // --- 以下為「準備下一局」的邏輯 (只有遊戲繼續時才執行) ---

	// 2.5 幼體時魔交還小時卡
	let returnedFromYoungDemons = [];
	gameState.players.forEach(player => {
	  const shouldReturnHourCards = (gameState.gameMode === '3P') || (typeof player.roleCard === 'string' && player.roleCard.includes('幼'));
	  if (player.type === '時魔' && shouldReturnHourCards && Array.isArray(player.hourCards) && player.hourCards.length > 0) {
		returnedFromYoungDemons.push(...player.hourCards);
		player.hourCards = [];
	  }
	});

	if (returnedFromYoungDemons.length > 0) {
	  shuffle(returnedFromYoungDemons);
	  gameState.hourDeck.push(...returnedFromYoungDemons);
	  appLogger.log(`↻ 幼體時魔交還 ${returnedFromYoungDemons.length} 張小時卡。`);
	}

    // 3. 重置鐘面
    const cardsToReturnToDeck = [];
    gameState.clockFace.forEach(spot => {
        if (spot.cards.length === 0) return;

        // 分離「鎖定卡」與「非鎖定卡」
        const lockedCards = spot.cards.filter(c => c.isLocked);
        const unlockedCards = spot.cards.filter(c => !c.isLocked);
        
        // 針對非鎖定卡：執行原本的規則 (只留最上面一張珍貴卡? 或者全部回收?)
        // 為了簡化與配合新規則，這裡設定為：
        // 「鎖定的卡」全部保留，「沒鎖定的卡」全部回收 (或者您可以保留原本邏輯)
        
        // 這裡採用最有利受詛者的規則：鎖定的全留，沒鎖定的全收
        // (這樣受詛者就需要努力去「摸」每一張卡)
        
        // 將該格子的卡片重置為「僅包含鎖定卡」
        spot.cards = lockedCards;
        
        // 其他卡片回收
        if (unlockedCards.length > 0) {
            cardsToReturnToDeck.push(...unlockedCards);
        }
    });
    
    if (cardsToReturnToDeck.length > 0) {
        // 重置鎖定狀態？不，新規則是永久固定，所以回收的卡片必定是沒被鎖過的，不用清除 isLocked
        shuffle(cardsToReturnToDeck);
        gameState.hourDeck.push(...cardsToReturnToDeck);
        appLogger.log(`↻ 回收了 ${cardsToReturnToDeck.length} 張鐘面卡片回牌庫。`);
    }
    
    // 4. 傳遞狀態 (手牌/齒局)
    gameState.players.forEach((player, index) => {
        // ✅ 重點修正 2：修復 JavaScript 負數取餘數的 Bug
        // 原本的寫法在特定情況下會產生負數索引導致崩潰
        const shift = index - gameState.gameRound; 
        const handSetIndex = ((shift % numPlayers) + numPlayers) % numPlayers;

        const initialGear = gameState.originalGearSets[handSetIndex];
        player.gearCards = initialGear; 
        player.mana = isPure ? 0 : player.gearCards;
        player.hand = gameState.originalHandSets[handSetIndex].map(c => ({ ...c }));
        
        player.specialAbilityUsed = false; 

        if (player.type !== '時之惡' && player.type !== '受詛者') {
            player.currentClockPosition = null;
        }
        
        player.isEjected = false;
        player.hourCards = []; 
    });
    appLogger.log("↻ 玩家已接收新一局的手牌與齒局。");

    // 5. 重置護盾
    gameState.players.forEach(player => {
        if (player.type === '時之惡') {
            player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 5)); 
        } else if (player.type === '受詛者') {
            player.d6Die = Math.max(1, Math.min(player.gearCards, 3)); 
        }
    });

    // 6. 進入下一局
	// --- 先記下剛結束的局數，給動畫使用 ---
    const finishedRound = gameState.gameRound; 
    // ----------------------------------------
	gameState.gameRound++;
    gameState.roundMarker = 1;
    gameState.currentRoundAIChoices = null;
    gameState.currentMinuteChoices = null; 
    gameState.uiMinuteChoicesTurnKey = null;
    gameState.sinTargetingMode = 'default';
    gameState.minuteDiscard = [];
    gameState.lastPlayedCard = null;
    
    appLogger.log(`--- 準備開始第 ${gameState.gameRound} 局遊戲 ---`);
	
	if (typeof window.showRoundReadyModal === 'function') {
        window.showRoundReadyModal(
            `第 ${finishedRound} 局結算`, 
            `已重新分配手牌，準備進入第 ${gameState.gameRound} 局`, 
            () => {
                // 玩家點擊「準備完成」後，這段才會執行
                // 此時畫面才會瞬間刷新成下一局的狀態，手牌直接動態發牌飛入！
                gameState.needsHandDealAnimation = true;
                if (typeof updateUI === 'function') updateUI(gameState);
            },
            gameState
        );
    } else {
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function endGame(gameState) {
    appLogger.log("=== 遊戲結束 ===");
    const isPure = typeof gameState?.gameMode === 'string' && gameState.gameMode.startsWith('PURE');
    if (gameState.gameMode !== '3P' && !isPure) {
        gameState.players
            .filter(p => p.type === '時魔' && !p.isEjected && ['時針', '分針', '秒針'].includes(p.roleCard))
            .forEach(player => {
			    player.score += 3;
            });
    }

    // 若有時魔陣營額外加分，同步至最後一筆歷程的總分
    if (Array.isArray(gameState.scoreHistory) && gameState.scoreHistory.length > 0) {
        const lastEntry = gameState.scoreHistory[gameState.scoreHistory.length - 1];
        if (lastEntry && Array.isArray(lastEntry.players)) {
            lastEntry.players.forEach(item => {
                const p = gameState.players.find(x => x.id === item.id);
                if (p) item.totalScore = p.score;
            });
        }
    }
		
    const finalScores = gameState.players.slice().sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (isPure) {
            const ejectDiff = (a.ejectionCount || 0) - (b.ejectionCount || 0);
            if (ejectDiff !== 0) return ejectDiff;
            return (b.bestRoundGear || 0) - (a.bestRoundGear || 0);
        }
        return 0;
    });
    finalScores.forEach((p, index) => {
        appLogger.log(`#${index + 1}: ${p.name} (總分: ${p.score})`);
    });

    gameState.gameEnded = true;
	
	if (window.gameAudio) {
        // 判斷人類玩家是否獲勝
        const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
        const human = gameState.players.find(p => p.id === humanId);
        
        const isWin = isPure
            ? Boolean(human && finalScores[0] && (finalScores[0].id === human.id || finalScores[0].score === human.score))
            : Boolean(human && !human.isEjected);
        
        window.gameAudio.playGameOver(isWin);
    }
	
    if (typeof updateUI === 'function') updateUI(gameState);
}

// ✅ 對 UI 暴露必要 API（避免 scope/載入差異導致 initializeGame 不可見）
try {
    if (typeof window !== 'undefined') {
        if (typeof initializeGame !== 'undefined') window.initializeGame = initializeGame;
        window.startRound = startRound;
        window.handleHumanChoice = handleHumanChoice;
        window.handleHumanHourCardChoice = handleHumanHourCardChoice;
        window.handleHumanAbilityChoice = handleHumanAbilityChoice;
        window.handleHumanSecondHandCommit = handleHumanSecondHandCommit;
        window.handleHumanSecondHandFinalChoice = handleHumanSecondHandFinalChoice;
        window.getEffectiveHumanPlayerId = getEffectiveHumanPlayerId;
		
		if (typeof updateUI !== 'undefined') {
            window.updateUI = updateUI;
        }
    }
} catch (e) {
    console.error("[game.js] API 暴露失敗:", e);
}