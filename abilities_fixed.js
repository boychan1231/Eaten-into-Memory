// abilities.js (整合修正版：時針/分針能力 + 升級判定)

// ============================
// 角色升級設定
// ============================
const ROLE_UPGRADE_REQUIREMENTS = {
    // 你目前的規則：集齊「指定四張一般小時卡」中的任意 3 張 + 1 張珍貴小時卡（共 3/5）
    // 備註：此處的 requiredCards 仍列出 4 張，判定採 >= 3 張 + hasPreciousCard
    '時魔幼體 1': { requiredCards: [1, 2, 3, 4], nextRole: '時魔 1 (時針)' },
    '時魔幼體 2': { requiredCards: [5, 6, 7, 8], nextRole: '時魔 2 (分針)' },
    '時魔幼體 3': { requiredCards: [9, 10, 11, 12], nextRole: '時魔 3 (秒針)' }
};

// ============================
// 時針（新能力）
// - 被動：一直看見小時卡庫頂牌（若未被封印）
// - 主動：出分鐘卡前，可耗 1 Mana 將頂牌移到牌庫底（每回合一次）
// ============================

function hourHandPeekTop(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return null;
    if (!gameState || !Array.isArray(gameState.hourDeck)) return null;
    if (gameState.abilityMarker) return null;

    const player = gameState.players?.find(p => p.id === playerId);
    if (!player || player.isEjected || player.roleCard !== '時針') return null;

    const topCard = gameState.hourDeck[gameState.hourDeck.length - 1] || null;
    gameState.lastHourHandPeek = topCard
        ? { number: topCard.number, isPrecious: !!topCard.isPrecious }
        : null;

    return topCard;
}

function hourHandMoveTopToBottom(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;
    if (!gameState || !Array.isArray(gameState.hourDeck)) return false;
    if (gameState.abilityMarker) return false;

    const player = gameState.players?.find(p => p.id === playerId);
    if (!player || player.isEjected || player.roleCard !== '時針') return false;

    // 需在出分鐘卡前
    if (gameState.phase !== 'preMinute') return false;

    // 每回合一次
    if (player.specialAbilityUsed) return false;

    if (player.mana < 1) return false;
    if (gameState.hourDeck.length < 1) return false;

    const top = gameState.hourDeck.pop();       // 頂牌：陣列尾端
    gameState.hourDeck.unshift(top);            // 放到底：陣列前端

    player.mana -= 1;
    player.specialAbilityUsed = true;

    const topNow = gameState.hourDeck[gameState.hourDeck.length - 1] || null;
    gameState.lastHourHandPeek = topNow
        ? { number: topNow.number, isPrecious: !!topNow.isPrecious }
        : null;

    console.log(`【時針】${player.name} 耗用 1 Mana，將小時卡庫頂牌移到牌庫底。`);
    return true;
}

// AI 時針：在回合開始前（preMinute）有機率使用「頂牌放到底」
function hourHandPreMinuteAI(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;
    if (!gameState || gameState.phase !== 'preMinute') return;
    if (!Array.isArray(gameState.players)) return;
    if (!Array.isArray(gameState.hourDeck)) return;
    if (gameState.abilityMarker) return;

    const hourHand = gameState.players.find(p => p.roleCard === '時針' && !p.isEjected);
    if (!hourHand) return;

    // 人類時針由 UI 控制（若有 setHumanPlayerId / getHumanPlayerId）
    if (typeof getHumanPlayerId === 'function' && hourHand.id === getHumanPlayerId()) return;

    if (hourHand.specialAbilityUsed) return;
    if (hourHand.mana < 1) return;
    if (gameState.hourDeck.length < 1) return;

    const top = gameState.hourDeck[gameState.hourDeck.length - 1];
    if (!top) return;

    // 簡單策略：若頂牌是珍貴卡，通常保留；否則 30% 機率放到底
    if (top.isPrecious) {
        gameState.lastHourHandPeek = { number: top.number, isPrecious: true };
        return;
    }

    if (Math.random() < 0.3) {
        hourHandMoveTopToBottom(gameState, hourHand.id);
    } else {
        gameState.lastHourHandPeek = { number: top.number, isPrecious: !!top.isPrecious };
    }
}

// ============================
// 分針（新能力）
// - 觸發：人類玩家在「取得本回合較小小時卡」後，由 UI 問是否發動
// - 效果：耗 2 Mana，位置移動到 (較小小時卡數值 - 1)
// - 例外：較小值為 1 不能移動到 12
// ============================

function activateMinuteHandAbility(gameState, playerId) {
    if (!GAME_CONFIG.enableAbilities) return false;
    if (!gameState) return false;
    if (gameState.abilityMarker) return false;

    const player = gameState.players?.find(p => p.id === playerId);
    if (!player || player.isEjected || player.roleCard !== '分針') return false;

    if (player.specialAbilityUsed) return false;
    if (player.mana < 2) return false;

    const base = gameState.waitingAbilityBaseNumber;
    if (typeof base !== 'number' || base <= 1) return false;

    player.mana -= 2;
    player.specialAbilityUsed = true;
    player.currentClockPosition = base - 1;

    console.log(`⏱️【分針】${player.name} 耗用 2 Mana，移動到 ${base - 1}。`);
    return true;
}

// ============================
// 角色升級
// ============================

function attemptRoleUpgrade(player, gameState) {
    if (!player || player.isEjected) return;

    const req = ROLE_UPGRADE_REQUIREMENTS[player.roleCard];
    if (!req) return;

    const collectedHourNumbers = (player.hourCards || [])
        .map(c => c?.number)
        .filter(n => typeof n === 'number');

    const hasPreciousCard = (player.hourCards || []).some(c => !!c?.isPrecious);

    const collectedCount = req.requiredCards.filter(num => collectedHourNumbers.includes(num)).length;

    // ✅ 3/5：四張指定一般卡中集到 >= 3 + 任意 1 張珍貴卡
    if (collectedCount >= 3 && hasPreciousCard) {
        console.log(`🎉【升級】${player.name} 集齊 ${collectedCount}/4 指定小時卡 + 珍貴卡，升級為 ${req.nextRole}！`);
        player.roleCard = req.nextRole;
        player.specialAbilityUsed = false;
    }
}

// 方便其他檔案呼叫
window.hourHandPeekTop = hourHandPeekTop;
window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
window.hourHandPreMinuteAI = hourHandPreMinuteAI;
window.activateMinuteHandAbility = activateMinuteHandAbility;
window.attemptRoleUpgrade = attemptRoleUpgrade;
