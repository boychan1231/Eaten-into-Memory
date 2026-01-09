// abilities.js (特殊能力定義檔 - 新版進化規則)

// 定義可進化的目標身份 (僅保留名稱，不再綁定特定數字)
const AVAILABLE_ROLES = ['時針', '分針', '秒針'];

// --- 輔助：檢查是否滿足進化條件 (3選1) ---
function checkEvolutionCondition(player) {
    if (!player || !Array.isArray(player.hourCards)) return { met: false, type: null };

    const cards = player.hourCards;
    const preciousCount = cards.filter(c => c.isPrecious).length;
    
    // 條件 1: 3張不同時代 (少年/中年/老年)，至少 1 張珍貴
    const ageGroups = new Set(cards.map(c => c.ageGroup).filter(g => g));
    if (ageGroups.size >= 3 && preciousCount >= 1) {
        return { met: true, type: '久遠的一生 (3時代 + 1珍貴)' };
    }

    // 條件 2: 4張不同數字，至少 1 張珍貴
    const uniqueNumbers = new Set(cards.map(c => c.number));
    if (uniqueNumbers.size >= 4 && preciousCount >= 1) {
        return { met: true, type: ' 憶無數經歷(4不同數 + 1珍貴)' };
    }

    // 條件 3: 5張任意卡，至少 2 張珍貴
    if (cards.length >= 5 && preciousCount >= 2) {
        return { met: true, type: '淩亂的結束 (5張卡 + 2珍貴)' };
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
        if (Math.random() < 0.5) { 
            if (gameState.hourDeck.length < 2) return;
			
            const card1 = gameState.hourDeck[gameState.hourDeck.length - 1]; 
            const card2 = gameState.hourDeck[gameState.hourDeck.length - 2]; 
            
            if (hourHandPlayer.mana >= 1 && Math.random() < 0.5) { 
                hourHandPlayer.mana--;
                const cardToMove = (card1.number < card2.number) ? card1 : card2;
                let cardIndex = gameState.hourDeck.findIndex(c => c === cardToMove);
                if (cardIndex === -1) cardIndex = gameState.hourDeck.length - 1; 
                
                const movedCard = gameState.hourDeck.splice(cardIndex, 1)[0];
                gameState.hourDeck.unshift(movedCard); 
                console.log(`【時針】將卡牌 [${movedCard.number}${movedCard.isPrecious ? 'P' : ''}] 移到牌庫底部。`);
            }
        }
    }
}


function activateMinuteHandAbility(gameState, playerId, direction) {
    if (!GAME_CONFIG.enableAbilities) return false;
    
    // 取得玩家
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.isEjected) return false;

    // 基本檢查
    if (gameState.abilityMarker) {
        console.log("【分針】能力被封鎖，無法發動。");
        return false;
    }
    if (player.mana < 2) {
        console.log("【分針】Mana 不足 (需要 2)，無法發動。");
        return false;
    }
    
    // 執行消耗
    player.mana -= 2;
    player.specialAbilityUsed = true; // 標記本回合已用過

    const oldPos = player.currentClockPosition;
    let newPos = oldPos;

    if (direction === 'ccw') {
        // 逆時針 (Counter-Clockwise) -1
        newPos = oldPos - 1;
        if (newPos < 1) newPos = 12;
        console.log(`⏱️【分針能力】${player.name} 耗用 2 Mana，逆時針移動 (${oldPos} ➝ ${newPos})。`);
    } else {
        // 順時針 (Clockwise) +1
        newPos = oldPos + 1;
        if (newPos > 12) newPos = 1;
        console.log(`⏱️【分針能力】${player.name} 耗用 2 Mana，順時針移動 (${oldPos} ➝ ${newPos})。`);
    }

    player.currentClockPosition = newPos;
    return true;
}

// 確保掛載到 window
if (typeof window !== 'undefined') {
    window.activateMinuteHandAbility = activateMinuteHandAbility;
}

// -----------------------------------------------------------
// 核心修改：嘗試進化
// -----------------------------------------------------------
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

    console.log(`🎉【進化成功】${oldRole} 達成條件「${checkResult.type}」！變身為：${targetRole}`);

    // 5. 歸還小時卡 (珍貴放上層，普通放下層)
    player.hourCards.forEach(card => {
        const clockSpot = gameState.clockFace.find(s => s.position === card.number);
        if (!clockSpot) return;
        if (card.isPrecious) clockSpot.cards.push(card);
        else clockSpot.cards.unshift(card);
    });

    player.hourCards = [];
    return true;
}

// 為了讓 UI 使用條件檢查函式，掛載到 window (如果是瀏覽器環境)
if (typeof window !== 'undefined') {
    window.checkEvolutionCondition = checkEvolutionCondition;
    window.AVAILABLE_ROLES = AVAILABLE_ROLES;
}

// === 時針能力：頂牌放到底 (2 Mana 消耗) ===
function hourHandMoveTopToBottom(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.mana < 2) {
        console.warn("Mana 不足，無法使用時針能力。");
        return false;
    }
    if (!Array.isArray(gameState.hourDeck) || gameState.hourDeck.length < 1) {
        console.warn("牌庫中沒有卡可移動。");
        return false;
    }

    const topCard = gameState.hourDeck.shift();
    gameState.hourDeck.push(topCard);
    player.mana -= 2;

    console.log(`🕒【時針能力】${player.name} 消耗 2 Mana，將頂牌 (${topCard.number}${topCard.ageGroup || ''}${topCard.isPrecious ? '★' : ''}) 移至底部。`);
    return true;
}

// 掛載至 window
if (typeof window !== 'undefined') {
    window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
}

// abilities.js - 新增時之惡手動發動函式

function activateSinAbility(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.isEjected || player.type !== '時之惡') return false;

    // 檢查限制
    if (player.specialAbilityUsed) {
        console.log("本回合已經發動過能力了。");
        return false;
    }
    if (player.mana < 2) {
        console.log("Mana 不足 (需要 2)，無法發動。");
        return false;
    }

    // 執行能力
    player.mana -= 2;
    player.specialAbilityUsed = true; // 標記已使用
    gameState.sinTargetingMode = 'sin'; // ✅ 改變全域變數：懲罰模式改為「距離最近」

    console.log(`😈【時之惡】玩家發動能力！消耗 2 Mana。`);
    console.log(`⚠️ 本回合懲罰規則已變更為：距離「時之惡」最近者受罰。`);

    return true;
}

// 掛載到 window
if (typeof window !== 'undefined') {
    window.activateSinAbility = activateSinAbility;
}
