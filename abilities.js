// abilities.js (特殊能力定義檔 - 語法已清理)

// ------------------------------------------------------------
// 相容性保護：舊版曾引用 activatesinPreRoundAbility（已移除）。
// 為避免舊快取/舊檔案導致載入時 ReferenceError，保留空實作。
// ------------------------------------------------------------
function activatesinPreRoundAbility() { return false; }
function activateSinPreRoundAbility() { return false; }

// 角色升級條件 (從 game.js 移動過來)
const ROLE_UPGRADE_REQUIREMENTS = {
    '時針': { 
        id: '時針', cardName: '時針', 
        requiredCards: [1, 4, 9, 10], identityCard: true
    },
    '秒針': { 
        id: '秒針', cardName: '秒針', 
        requiredCards: [2, 6, 8, 11], identityCard: true
    },
    '分針': { 
        id: '分針', cardName: '分針', 
        requiredCards: [3, 5, 7, 12], identityCard: true
    }
};

// --- 特殊能力函式 ---

function activatesinPreRoundAbility(gameState) {
    // 【已刪除】舊版「回合開始前能力」：
    // 先前曾讓「時之惡」在第 1 回合開始前消耗 Mana 並捨棄分鐘卡以觸發效果。
    // 依現行規則，此能力不再存在，故保留空實作避免舊流程報錯。
    return false;
}

function activateHourHandAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;
    const hourHandPlayer = gameState.players.find(p => p.roleCard === '時針' && !p.isEjected);
    if (gameState.abilityMarker) return;
    
    if (hourHandPlayer && hourHandPlayer.mana >= 1) {
        if (Math.random() < 0.5) { 
            if (gameState.hourDeck.length < 2) return;

            hourHandPlayer.mana--; 
            console.log(`【時針】${hourHandPlayer.name} 耗用 1 Mana 觀看牌庫。`);

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

function activateMinuteHandAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;
    const minuteHandPlayer = gameState.players.find(p => p.roleCard === '分針' && !p.isEjected && p.currentClockPosition);
    if (gameState.abilityMarker) return;
    
    if (minuteHandPlayer && minuteHandPlayer.mana >= 2) {
        if (Math.random() < 0.5) { 
            minuteHandPlayer.mana -= 2; 
            console.log(`【分針】${minuteHandPlayer.name} 耗用 2 Mana 發動移動能力。`);

            if (Math.random() < 0.5) {
                minuteHandPlayer.currentClockPosition = minuteHandPlayer.currentClockPosition - 1;
                if (minuteHandPlayer.currentClockPosition < 1) minuteHandPlayer.currentClockPosition = 12;
                console.log(`【分針】將自己逆時針移動一步到 ${minuteHandPlayer.currentClockPosition}`);
            } else {
                const movableTargets = gameState.players.filter(p => 
                    (p.type === '時魔' || p.type === '時之惡') && !p.isEjected && p.currentClockPosition
                );
                if (movableTargets.length > 0) {
                    const target = movableTargets[Math.floor(Math.random() * movableTargets.length)];
                    target.currentClockPosition = target.currentClockPosition % 12 + 1;
                    console.log(`【分針】移動 ${target.name} 順時針一步到 ${target.currentClockPosition}`);
                }
            }
        }
    }
}

function attemptRoleUpgrade(player, gameState) {
    if (!player || !gameState) return false;

    // ✅ 只允許「幼體時魔」嘗試進化
    if (player.type !== '時魔' || player.isEjected) return false;
    const roleText = String(player.roleCard || '');
    const isYoungTimeDemon = roleText.includes('幼體');
    if (!isYoungTimeDemon) return false;

    // 沒有收集小時卡就不用掃
    if (!Array.isArray(player.hourCards) || player.hourCards.length === 0) return false;

    const collectedNumbers = player.hourCards.map(c => c.number);
    const hasPreciousCard = player.hourCards.some(c => c.isPrecious);

    // 依你現行規則：必須至少有 1 張珍貴小時卡才可能進化
    if (!hasPreciousCard) return false;

    // 解析玩家序號：優先從名稱抓，抓不到再從 id (SM_1) 抓
    const getTimeDemonIndex = () => {
        const name = String(player.name || '').trim();
        let m = name.match(/時魔\s*幼體\s*(\d+)/);
        if (!m) m = name.match(/時魔\s*(\d+)/);
        if (!m) m = String(player.id || '').match(/SM_(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    };

    const timeDemonIndex = getTimeDemonIndex();

    // ✅ 三個身份一起掃（依 ROLE_UPGRADE_REQUIREMENTS 的順序）
    for (const roleName of Object.keys(ROLE_UPGRADE_REQUIREMENTS)) {
        const req = ROLE_UPGRADE_REQUIREMENTS[roleName];
        const targetRole = req.cardName || roleName;

        // ✅ 規則：如果該身份已被其他「時魔」佔用，則不能再進化成該身份
        const isRoleTaken = gameState.players.some(p =>
            p &&
            p !== player &&
            !p.isEjected &&
            p.type === '時魔' &&
            p.roleCard === targetRole
        );
        if (isRoleTaken) continue;

        // 計算命中目標數字的張數（>= 3 即符合）
        let collectedCount = 0;
        for (const requiredNum of req.requiredCards) {
            if (collectedNumbers.includes(requiredNum)) collectedCount++;
        }

        if (collectedCount >= 3) {
            // ✅ 進化成功：更新 roleCard 與 name（命名規則：時魔幼體 1 -> 時魔 1 (秒針)）
            player.roleCard = targetRole;

            const idxText = (typeof timeDemonIndex === 'number' && !Number.isNaN(timeDemonIndex))
                ? String(timeDemonIndex)
                : (String(player.id || '').replace(/^SM_/, '') || '');

            player.name = `時魔 ${idxText} (${targetRole})`;

            console.log(`🎉【進化】${player.id} 升級為：${targetRole}！`);

            // ✅ 進化後不再持有小時卡：把已收集的小時卡全部放回鐘面
            //    珍貴放上層（push），普通放下層（unshift）
            player.hourCards.forEach(card => {
                const clockSpot = gameState.clockFace.find(s => s.position === card.number);
                if (!clockSpot) return;
                if (card.isPrecious) clockSpot.cards.push(card);
                else clockSpot.cards.unshift(card);
            });

            player.hourCards = [];
            return true;
        }
    }
    return false;
}