// abilities.js (最終整合版：移除時之惡能力 + 自由升級 + UI 互動支援)

// =============================================================
// 1. 角色升級需求設定 (自由選擇制)
// =============================================================
const ROLE_UPGRADE_REQUIREMENTS = {
    '時針': { 
        id: '時針', cardName: '時針', 
        requiredCards: [1, 4, 9, 10, 12], identityCard: true
    },
    '秒針': { 
        id: '秒針', cardName: '秒針', 
        requiredCards: [2, 6, 8, 11, 12], identityCard: true
    },
    '分針': { 
        id: '分針', cardName: '分針', 
        requiredCards: [3, 5, 7, 12, 10], identityCard: true
    }
};


// =============================================================
// 2. 時針能力 (UI 互動用)
// =============================================================

// 被動：查看頂牌 (UI 呼叫用，不耗 Mana)
function hourHandPeekTop(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return null;
    if (!gameState || !Array.isArray(gameState.hourDeck)) return null;
    if (gameState.abilityMarker) return null; // 被封印

    const player = gameState.players?.find(p => p.id === playerId);
    if (!player || player.isEjected || player.roleCard !== '時針') return null;

    // 取得頂牌 (陣列最後一張)
    const topCard = gameState.hourDeck[gameState.hourDeck.length - 1];
    
    // 記錄這回合已經看過了
    gameState.lastHourHandPeek = {
        by: playerId,
        number: topCard.number,
        isPrecious: topCard.isPrecious,
        gameRound: gameState.gameRound,
        roundMarker: gameState.roundMarker
    };
    
    return topCard;
}

// 主動：將頂牌移到底部 (按鈕呼叫，耗 1 Mana)
function hourHandMoveTopToBottom(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;
    const player = gameState.players?.find(p => p.id === playerId);
    
    if (!player || player.roleCard !== '時針' || player.isEjected) return false;
    if (gameState.abilityMarker) return false; // 被封印
    if (player.specialAbilityUsed) return false; // 每回合限一次
    if (player.mana < 1) return false;
    if (!gameState.hourDeck || gameState.hourDeck.length < 2) return false;

    // 執行移動
    player.mana -= 1;
    player.specialAbilityUsed = true;
    
    const topCard = gameState.hourDeck.pop();
    gameState.hourDeck.unshift(topCard); // 移到底部 (陣列開頭)

    console.log(`🕒【時針】${player.name} 耗用 1 Mana，將小時卡庫頂牌移至底部。`);
    
    // 清除偷看紀錄，因為頂牌變了
    gameState.lastHourHandPeek = null;
    
    return true;
}

// =============================================================
// 3. 分針能力 (UI 互動用)
// =============================================================

// 主動：移動到 [當前數字 - 1] (按鈕呼叫，耗 2 Mana)
function activateMinuteHandAbility(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.roleCard !== '分針' || player.isEjected) return false;
    if (gameState.abilityMarker) return false;
    if (player.specialAbilityUsed) return false;
    if (player.mana < 2) return false;

    // 取得原本打算移動的目標 (由 UI 傳入或從 gameState 讀取)
    const base = gameState.waitingAbilityBaseNumber;
    if (typeof base !== 'number' || base <= 1) return false; // 1 不能移到 0 (或 12)

    // 執行移動
    player.mana -= 2;
    player.specialAbilityUsed = true;
    player.currentClockPosition = base - 1; // 修正位置

    console.log(`⏱️【分針】${player.name} 耗用 2 Mana，發動能力移動到 ${base - 1}。`);
    return true;
}

// =============================================================
// 4. 角色升級判定 (核心邏輯：自由選擇)
// =============================================================
function attemptRoleUpgrade(player, gameState) {
    // 只有還沒升級過的玩家 (名字與 roleCard 相同，或者 roleCard 含 "幼") 可以嘗試
    // 這裡使用更寬鬆的判斷：只要目前 roleCard 不是 '時針'/'分針'/'秒針' 就可
    const currentRole = player.roleCard;
    if (['時針', '分針', '秒針'].includes(currentRole)) return; 

    // 如果玩家已經設定了「目標身份」(由 UI 下拉選單設定)，就優先檢查該身份
    // 如果沒有，則遍歷所有可能 (AI 用)
    let targetRolesToCheck = [];
    if (player.targetRoleName && ROLE_UPGRADE_REQUIREMENTS[player.targetRoleName]) {
        targetRolesToCheck.push(player.targetRoleName);
    } else {
        targetRolesToCheck = Object.keys(ROLE_UPGRADE_REQUIREMENTS);
    }

    const collectedNumbers = player.hourCards.map(c => c.number);
    const hasPreciousCard = player.hourCards.some(c => c.isPrecious);

    for (const roleName of targetRolesToCheck) {
        const req = ROLE_UPGRADE_REQUIREMENTS[roleName];
        
        // 1. 檢查該身份是否已被佔用 (有人已經升級成這個了)
        const isRoleTaken = gameState.players.some(p => 
            !p.isEjected && p.id !== player.id && p.roleCard === roleName
        );
        if (isRoleTaken) continue;

        // 2. 檢查卡牌需求
        // 規則：指定 5 張數字中，收集到 >= 3 張，且必須持有至少 1 張珍貴卡
        let matchCount = 0;
        req.requiredCards.forEach(num => {
            if (collectedNumbers.includes(num)) matchCount++;
        });

        if (matchCount >= 3 && hasPreciousCard) {
            // --- 升級成功 ---
            player.roleCard = req.cardName;
            
            // 更新顯示名稱，保留識別度 (例如 "時魔幼體 1" -> "時魔 1 (時針)")
            if (player.name.includes('幼體')) {
                player.name = player.name.replace('幼體', `(${req.cardName})`);
            } else {
                player.name = `${player.name} (${req.cardName})`;
            }

            console.log(`🎉【進化】${player.id} 成功升級為：${req.cardName}！(命中 ${matchCount} 張指定卡 + 珍貴卡)`);

            // 3. 繳回卡牌到鐘面
            // 規則：珍貴卡放該格最上面 (push)，普通卡放最下面 (unshift)
            player.hourCards.forEach(card => {
                const spot = gameState.clockFace.find(s => s.position === card.number);
                if (spot) {
                    if (card.isPrecious) spot.cards.push(card);
                    else spot.cards.unshift(card);
                }
            });
            player.hourCards = []; // 清空手上的小時卡
            
            return; // 升級完成，跳出函式
        }
    }
}

// 綁定到 window 供其他模組呼叫
if (typeof window !== 'undefined') {
    window.activatesinPreRoundAbility = activatesinPreRoundAbility;
    window.hourHandPeekTop = hourHandPeekTop;
    window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
    window.activateMinuteHandAbility = activateMinuteHandAbility;
    window.attemptRoleUpgrade = attemptRoleUpgrade;
    window.ROLE_UPGRADE_REQUIREMENTS = ROLE_UPGRADE_REQUIREMENTS;
}