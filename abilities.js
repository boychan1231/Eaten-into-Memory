// abilities.js (特殊能力定義檔 - 新版進化規則)
var appLogger = window.appLogger || {
    log: (...args) => console.log(...args)
};

// 定義可進化的目標身份 (僅保留名稱，不再綁定特定數字)
const AVAILABLE_ROLES = ['時針', '分針', '秒針'];

// --- 輔助：檢查是否滿足進化條件 (3選1) ---
function checkEvolutionCondition(player) {
    if (!player || !Array.isArray(player.hourCards)) return { met: false, type: null };

    const cards = player.hourCards;
    const preciousCount = cards.filter(c => c.isPrecious).length;
    
    // 條件 1: 3張不同時代 (少年/青年/中年)，至少 1 張珍貴
    const ageGroups = new Set(cards.map(c => c.ageGroup).filter(g => g));
    if (ageGroups.size >= 3 && preciousCount >= 1) {
        return { met: true, type: '久遠一生 (3時代 + 1珍貴)' };
    }

    // 條件 2: 4張不同數字，至少 1 張珍貴
    const uniqueNumbers = new Set(cards.map(c => c.number));
    if (uniqueNumbers.size >= 4 && preciousCount >= 1) {
        return { met: true, type: '命途節錄(4不同數 + 1珍貴)' };
    }

    // 條件 3: 5張任意卡，至少 2 張珍貴
    if (cards.length >= 5 && preciousCount >= 2) {
        return { met: true, type: '漫長生涯 (5張卡 + 2珍貴)' };
    }
	
	// 條件 4: 3 張任意珍貴卡
    if (preciousCount >= 3) {
        return { met: true, type: '銘記珍重 (3張珍貴)' };
    }

    return { met: false, type: null };
}

// --- 特殊能力函式 ---

function activatesinPreRoundAbility(gameState) { return false; }

function activateHourHandAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;
    const hourHandPlayer = gameState.players.find(p => p.roleCard === '時針' && !p.isEjected);
    if (gameState.abilityMarker) return;
    
    if (hourHandPlayer && hourHandPlayer.mana >= 1) {
        const random = (typeof getRandom === 'function') ? getRandom : Math.random;
        if (random() < 0.5) { 
            if (gameState.hourDeck.length < 2) return;
			
            const card1 = gameState.hourDeck[gameState.hourDeck.length - 1]; 
            const card2 = gameState.hourDeck[gameState.hourDeck.length - 2]; 
            
            if (hourHandPlayer.mana >= 1 && random() < 0.5) {
                hourHandPlayer.mana--;
                const cardToMove = (card1.number < card2.number) ? card1 : card2;
                let cardIndex = gameState.hourDeck.findIndex(c => c === cardToMove);
                if (cardIndex === -1) cardIndex = gameState.hourDeck.length - 1; 
                
                const movedCard = gameState.hourDeck.splice(cardIndex, 1)[0];
                gameState.hourDeck.unshift(movedCard); 
                appLogger.log(`【時針】將卡牌 [${movedCard.number}${movedCard.isPrecious ? 'P' : ''}] 移到牌庫底部。`);
            }
        }
    }
}

// 分針能力
function activateMinuteHandAbility(gameState, playerId, direction) {
    if (!GAME_CONFIG.enableAbilities) return false;
    
    // 取得玩家
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.isEjected) return false;

    // 基本檢查
    if (gameState.abilityMarker) {
        appLogger.log("【分針】能力被封鎖，無法發動。");
        return false;
    }
    const COST = window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE || 2;
    if (player.mana < COST) {
        appLogger.log(`【分針】Mana 不足 (需要 ${COST})，無法發動。`);
        return false;
    }
    
    const oldPos = player.currentClockPosition;
    if (typeof oldPos !== 'number' || !Number.isFinite(oldPos)) {
        appLogger.log("【分針】尚未在鐘面上定位，無法發動移動能力。");
        return false;
    }
    let checkPos = oldPos;
    let newPos = null;
    let found = false;

    // 搜尋迴圈：最多找 11 次 (排除自己原本的位置)
    for (let i = 0; i < 11; i++) {
        if (direction === 'ccw') {
            // 逆時針 -1
            checkPos--;
            if (checkPos < 1) checkPos = 12;
        } else {
            // 順時針 +1
            checkPos++;
            if (checkPos > 12) checkPos = 1;
        }

        // 檢查該鐘面位置是否有卡片
        const spot = gameState.clockFace.find(s => s.position === checkPos);
        if (spot && spot.cards && spot.cards.length > 0) {
            newPos = checkPos;
            found = true;
            break; // 找到了，跳出迴圈
        }
    }

    if (!found) {
        appLogger.log(`【分針】發動失敗：${direction === 'ccw' ? '逆' : '順'}時針方向找不到其他有牌的格子。`);
        return false;
    }

    // 執行消耗與移動
    player.mana -= COST;
    player.specialAbilityUsed = true; // 標記本回合已用過
    player.currentClockPosition = newPos;
	
	if (window.gameAudio) window.gameAudio.playAbility();

    const dirText = direction === 'ccw' ? '逆時針' : '順時針';
    appLogger.log(`⏱️【分針能力】${player.name} 耗用 ${COST} Mana，${dirText}移至下一個有小時卡的位置 (${oldPos} ➝ ${newPos})。`);

    return true;
}

// 確保掛載到 window
if (typeof window !== 'undefined') {
    window.activateMinuteHandAbility = activateMinuteHandAbility;
}


// 進化檢查
function attemptRoleUpgrade(player, gameState) {
    if (!player || !gameState) return false;

    // 1. 基本資格檢查
    if (player.type !== '時魔' || player.isEjected) return false;
    const roleText = String(player.roleCard || '');
    if (!roleText.includes('幼體')) return false;
    if (!Array.isArray(player.hourCards) || player.hourCards.length === 0) return false;

    // 2. 檢查是否滿足 3 種條件之一
    const checkResult = checkEvolutionCondition(player);
    if (!checkResult.met) return false;

    // 3. 決定目標身份
    // 人類玩家：讀取 UI 設定的 targetRoleName，若無則預設 '時針'
    // AI 玩家：隨機挑選一個還沒被佔用的身份
    let targetRole = null;
    
    // 判斷是否為人類 (或是透過某些標記)
    const isHuman = (typeof getEffectiveHumanPlayerId === 'function' && player.id === getEffectiveHumanPlayerId());
    
    if (isHuman && player.targetRoleName && AVAILABLE_ROLES.includes(player.targetRoleName)) {
        targetRole = player.targetRoleName;
    }

    // 找出目前已被佔用的身份
    const takenRoles = gameState.players
        .filter(p => p !== player && !p.isEjected && p.type === '時魔')
        .map(p => p.roleCard);

    // 如果沒指定，或指定的已被搶走，則自動尋找剩下的
    if (!targetRole || takenRoles.includes(targetRole)) {
        const available = AVAILABLE_ROLES.filter(r => !takenRoles.includes(r));
        if (available.length === 0) return false; // 沒位置了，無法進化
        
        // 如果原本想進化的被搶了，人類玩家自動遞補，AI 隨機
        targetRole = available[0]; 
    }

    // 4. 執行進化
    const oldRole = player.roleCard;
    player.roleCard = targetRole;

    // 解析編號 (維持原邏輯)
    const name = String(player.name || '').trim();
    let m = name.match(/時魔\s*幼體\s*(\d+)/);
    if (!m) m = name.match(/時魔\s*(\d+)/);
    if (!m) m = String(player.id || '').match(/SM_(\d+)/);
    const idxText = m ? m[1] : (String(player.id || '').replace(/^SM_/, '') || '');

    player.name = `時魔 ${idxText} (${targetRole})`;

    if (window.gameAudio) window.gameAudio.playEvolve();

    appLogger.log(`🎉【進化成功】${oldRole} 達成條件「${checkResult.type}」！變身為：${targetRole}`);

    // 5. 歸還小時卡 (珍貴放上層，普通放下層)
    player.hourCards.forEach(card => {
        const clockSpot = gameState.clockFace.find(s => s.position === card.number);
        if (!clockSpot) return;
        if (card.isPrecious) clockSpot.cards.push(card);
        else clockSpot.cards.unshift(card);
    });

    player.hourCards = [];
	
	// ✅ 新增：進化歸還卡片後，檢查是否有卡片落到了受詛者腳下
    checkAndLockPreciousCards(gameState);
	
    return true;
}

// 為了讓 UI 使用條件檢查函式，掛載到 window (如果是瀏覽器環境)
if (typeof window !== 'undefined') {
    window.checkEvolutionCondition = checkEvolutionCondition;
    window.AVAILABLE_ROLES = AVAILABLE_ROLES;
}

// === 時針能力：頂牌放到底 (1 Mana 消耗) ===
function hourHandMoveTopToBottom(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // 1. 計算當前是第幾次使用 (0=尚未, 1=已用一次)
    const moveCount = player.hourHandMoveCount || 0;

    // 2. 設定消耗：第1次 1 Mana，第2次 2 Mana
    const baseCost = window.GAME_DATA?.ABILITY_COSTS?.TIME_HAND_MOVE || 1;
    const currentCost = (moveCount === 0) ? baseCost : 2;

    // 3. 檢查限制
    if (moveCount >= 2) {
        console.warn("時針能力每回合限用 2 次。");
        return false;
    }
    if (player.mana < currentCost) {
        console.warn(`Mana 不足 (需 ${currentCost})`);
        return false;
    }
    if (!Array.isArray(gameState.hourDeck) || gameState.hourDeck.length < 1) {
        console.warn("牌庫中沒有卡可移動。");
        return false;
    }

    // 4. 執行移動
    const topCard = gameState.hourDeck.pop();
    gameState.hourDeck.unshift(topCard);
    
    // 5. 扣除消耗並更新計數
    player.mana -= currentCost;
    player.hourHandMoveCount = moveCount + 1;
	
	if (window.gameAudio) window.gameAudio.playAbility(); //音效

    // ✅ 關鍵：如果是第 2 次使用，才將 specialAbilityUsed 設為 true (鎖定)
    // 如果是第 1 次使用，保持 false，讓 UI 允許玩家按第二次
    if (player.hourHandMoveCount >= 2) {
        player.specialAbilityUsed = true;
    } else {
        player.specialAbilityUsed = false; 
    }

    const logSuffix = (player.hourHandMoveCount === 1) ? " (可再消耗 2 Mana 發動一次)" : " (次數已達上限)";
    appLogger.log(`🕒【時針能力】${player.name} 消耗 ${currentCost} Mana，將頂牌 (${topCard.number}${topCard.isPrecious ? '★' : ''}) 移至底部。${logSuffix}`);
    
    return true;
}

// 掛載至 window
if (typeof window !== 'undefined') {
    window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
}

//時之惡能力
function activateSinAbility(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.isEjected || player.type !== '時之惡') return false;

    // 檢查限制
    if (player.specialAbilityUsed) {
        appLogger.log("本回合已經發動過能力了。");
        return false;
    }
	const COST = window.GAME_DATA?.ABILITY_COSTS?.SIN_PULL || 2;
    if (player.mana < COST) {
        appLogger.log("Mana 不足，無法發動。");
        return false;
    }

    // 執行能力
    player.mana -= COST;
	if (window.gameAudio) window.gameAudio.playAbility();
    player.specialAbilityUsed = true; // 標記已使用
    gameState.sinTargetingMode = 'sin'; // ✅ 改變全域變數：懲罰模式改為「距離最近」

    appLogger.log(`😈【時之惡】發動能力！消耗 ${COST} Mana。`);
    appLogger.log(`⚠️ 本回合懲罰規則變更為：距離「時之惡」最近者受罰。`);

    return true;
}

// 掛載到 window
if (typeof window !== 'undefined') {
    window.activateSinAbility = activateSinAbility;
}

// abilities.js (請加在檔案最下方)

// === 時之惡能力：封鎖 ===
function activateSinSealAbility(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.isEjected || player.type !== '時之惡') return false;

    // 1. 基本檢查
    if (player.specialAbilityUsed) {
        appLogger.log("本回合已經發動過能力了。");
        return false;
    }
    
    // 2. 讀取消耗 (預設 3 Mana)
    const COST = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;
    if (player.mana < COST) {
        appLogger.log(`Mana 不足 (需 ${COST})，無法發動封印。`);
        return false;
    }

    // 3. 條件檢查：場上必須有 2 名以上已進化的時魔 (保留原本 game.js 的設計精隨)
    //const evolvedCount = gameState.players.filter(p => 
    //    p.type === '時魔' && 
    //    !p.isEjected && 
    //    ['時針', '分針', '秒針'].includes(p.roleCard)
    //).length;
    //if (evolvedCount < 2) {
    //    appLogger.log(`條件未達成：場上已進化時魔僅 ${evolvedCount} 名 (需 >= 2)。`);
    //    return false;}

    // 4. 執行效果
    player.mana -= COST;
	if (window.gameAudio) window.gameAudio.playAbility();
    player.specialAbilityUsed = true;
    gameState.abilityMarker = true; // ✅ 開啟封印標記

    appLogger.log(`😈【時之惡】耗用 ${COST} Mana 發動「封鎖」！本回合所有時魔能力已被封印。`);
    return true;
}

// 掛載到 window
if (typeof window !== 'undefined') {
    window.activateSinSealAbility = activateSinSealAbility;
}
