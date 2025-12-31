// abilities.js
// 《時魔 2025》特殊能力／升級邏輯
// 注意：本檔會在 index.html 中最先載入，因此不要在頂層直接使用尚未宣告的全域常數；
//       只在函式執行時（遊戲開始後）才會讀取 GAME_CONFIG / HUMAN_PLAYER_ID 等。

// -------------------------------------------------------------
// 角色升級條件（時魔幼體 → 時魔 X (時針/分針/秒針)）
// -------------------------------------------------------------
const ROLE_UPGRADE_REQUIREMENTS = {
  '時針': {
    id: '時針',
    cardName: '時針',
    requiredCards: [1, 4, 9, 10, 12],
    identityCard: true
  },
  '秒針': {
    id: '秒針',
    cardName: '秒針',
    requiredCards: [2, 6, 8, 11, 12],
    identityCard: true
  },
  '分針': {
    id: '分針',
    cardName: '分針',
    requiredCards: [3, 5, 7, 11, 12],
    identityCard: true
  }
};

// -------------------------------------------------------------
// 小工具
// -------------------------------------------------------------
function _isAbilitiesEnabled() {
  return typeof GAME_CONFIG === 'object' && !!GAME_CONFIG.enableAbilities;
}

function _getPlayerById(gameState, playerId) {
  if (!gameState || !Array.isArray(gameState.players)) return null;
  return gameState.players.find(p => p && p.id === playerId) || null;
}

function _hasEjected(player) {
  return !player || !!player.isEjected;
}

function _topHourDeckCard(gameState) {
  if (!gameState || !Array.isArray(gameState.hourDeck) || gameState.hourDeck.length < 1) return null;
  return gameState.hourDeck[gameState.hourDeck.length - 1];
}

// -------------------------------------------------------------
// 時之惡：回合開始前能力（保留你現行的機率與捨牌設計）
// - 目前條件：第 1 回合開始前，若 mana >= 2 且手牌 >= 1，有機率捨棄最小分鐘卡
// -------------------------------------------------------------
function activateSeaPreRoundAbility(gameState) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState || !Array.isArray(gameState.players)) return false;

  const seaPlayer = gameState.players.find(p => p && p.type === '時之惡' && !p.isEjected);
  if (!seaPlayer) return false;

  // 你原本的設計：只在 roundMarker === 1 時嘗試
  if (gameState.roundMarker !== 1) return false;

  if (seaPlayer.mana >= 2 && Array.isArray(seaPlayer.hand) && seaPlayer.hand.length >= 1) {
    if (Math.random() < 0.5) {
      seaPlayer.mana -= 2;

      const minVal = Math.min(...seaPlayer.hand.map(c => c.value));
      const idx = seaPlayer.hand.findIndex(c => c.value === minVal);
      const discarded = seaPlayer.hand.splice(idx, 1)[0];

      if (!Array.isArray(gameState.minuteDiscard)) gameState.minuteDiscard = [];
      gameState.minuteDiscard.push(discarded);

      console.log(`【時之惡】耗用 2 Mana 並捨棄 ${discarded.value} 號分鐘卡，發動回合開始前能力。`);
      return true;
    }
  }
  return false;
}

// -------------------------------------------------------------
// 時針（新能力）
// - 觸發時機：打出分鐘卡前（ui.js 以 phase === 'preMinute' 顯示面板）
// - 查看頂牌：消耗 1 mana，記錄在 gameState.lastHourHandPeek，讓 UI 顯示「頂牌：X★」
// - 放到底：每回合一次，消耗 2 mana，把小時卡庫頂牌移到最底（不額外給免費 peek）
// -------------------------------------------------------------
function hourHandPeekTop(gameState, playerId) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState) return false;
  if (gameState.abilityMarker) return false; // 被「時之惡封印」時不可用

  const player = _getPlayerById(gameState, playerId);
  if (_hasEjected(player)) return false;
  if (player.roleCard !== '時針') return false;

  const top = _topHourDeckCard(gameState);
  if (!top) return false;

  if (typeof player.mana !== 'number' || player.mana < 1) {
    console.log(`【時針】Mana 不足，無法查看頂牌。`);
    return false;
  }

  player.mana -= 1;

  gameState.lastHourHandPeek = {
    by: player.id,
    gameRound: gameState.gameRound,
    roundMarker: gameState.roundMarker,
    number: top.number,
    isPrecious: !!top.isPrecious
  };

  console.log(`【時針】${player.name} 耗用 1 Mana 查看小時卡庫頂牌：${top.number}${top.isPrecious ? '★' : ''}`);
  return true;
}

function hourHandMoveTopToBottom(gameState, playerId) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState) return false;
  if (gameState.abilityMarker) return false; // 被封印

  const player = _getPlayerById(gameState, playerId);
  if (_hasEjected(player)) return false;
  if (player.roleCard !== '時針') return false;

  const top = _topHourDeckCard(gameState);
  if (!top) return false;

  // 每回合一次（沿用 specialAbilityUsed，startRound 會重置）
  if (player.specialAbilityUsed) {
    console.log(`【時針】本回合已使用過放到底能力。`);
    return false;
  }

  if (typeof player.mana !== 'number' || player.mana < 2) {
    console.log(`【時針】Mana 不足，無法放到底。`);
    return false;
  }

  player.mana -= 2;

  const moved = gameState.hourDeck.pop();   // 取頂
  gameState.hourDeck.unshift(moved);        // 放底

  player.specialAbilityUsed = true;

  // 避免 UI 顯示過時頂牌（使用者若想知道新頂牌請再按「查看頂牌」）
  gameState.lastHourHandPeek = null;

  console.log(`【時針】${player.name} 耗用 2 Mana，將頂牌 ${moved.number}${moved.isPrecious ? '★' : ''} 移到小時卡庫最底。`);
  return true;
}

// AI 時針：在每回合 preMinute 時機（game.js 會呼叫 hourHandPreMinuteAI）做簡單判斷
function hourHandPreMinuteAI(gameState) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState || gameState.gameEnded) return false;
  if (gameState.abilityMarker) return false;

  const top = _topHourDeckCard(gameState);
  if (!top) return false;

  let acted = false;

  (gameState.players || []).forEach(p => {
    if (!p || p.isEjected) return;
    if (p.id === (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : null)) return; // 只處理 AI
    if (p.roleCard !== '時針') return;

    // 每回合一次的「放到底」才需要 AI 決策
    if (p.specialAbilityUsed) return;
    if (typeof p.mana !== 'number' || p.mana < 2) return;

    const alreadyHasNumber = Array.isArray(p.hourCards) && p.hourCards.some(c => c.number === top.number);

    // 極簡策略：
    // - 若頂牌是「自己已收集過的數字」→ 放到底（避免未來又抽到無效數字）
    // - 其他情況：小機率放到底（保留一點變化）
    const shouldBury = alreadyHasNumber || (!top.isPrecious && Math.random() < 0.15);

    if (shouldBury) {
      const ok = hourHandMoveTopToBottom(gameState, p.id);
      if (ok) acted = true;
    }
  });

  return acted;
}

// -------------------------------------------------------------
// 分針（新能力）
// - 觸發時機由 game.js 控制：
//   1) 分針玩家本回合「實際取得兩張小時卡中較小那張」後
//   2) baseNumber > 1（不可移動到 12）
//   3) UI 顯示面板讓人類選「使用/略過」
// - 本函式只負責「執行效果」：扣 2 mana、移動到 baseNumber - 1、每回合一次
// -------------------------------------------------------------
function activateMinuteHandAbility(gameState, playerId) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState) return false;
  if (gameState.abilityMarker) return false; // 被封印

  const player = _getPlayerById(gameState, playerId);
  if (_hasEjected(player)) return false;
  if (player.roleCard !== '分針') return false;

  if (player.specialAbilityUsed) return false;
  if (typeof player.mana !== 'number' || player.mana < 2) return false;

  // base 優先使用 gameState.waitingAbilityBaseNumber（由 game.js 設定）
  const base =
    (typeof gameState.waitingAbilityBaseNumber === 'number')
      ? gameState.waitingAbilityBaseNumber
      : (typeof player.pickedHourCardThisTurnNumber === 'number')
        ? player.pickedHourCardThisTurnNumber
        : null;

  if (typeof base !== 'number') return false;

  // 規則：base = 1 不可移動到 12
  if (base <= 1) return false;

  const targetPos = base - 1;

  player.mana -= 2;
  player.specialAbilityUsed = true;
  player.currentClockPosition = targetPos;

  console.log(`【分針】${player.name} 耗用 2 Mana，移動到 ${targetPos}（由小時卡 ${base} 觸發）。`);
  return true;
}

// -------------------------------------------------------------
// 時魔幼體：升級（保留你目前的邏輯與命名規則）
// -------------------------------------------------------------
function attemptRoleUpgrade(player, gameState) {
  if (!player || !gameState) return false;

  // 只允許「幼體時魔」嘗試進化
  if (player.type !== '時魔' || player.isEjected) return false;
  const roleText = String(player.roleCard || '');
  const isYoungTimeDemon = roleText.includes('幼體');
  if (!isYoungTimeDemon) return false;

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

  // 依 ROLE_UPGRADE_REQUIREMENTS 的順序掃描
  for (const roleName of Object.keys(ROLE_UPGRADE_REQUIREMENTS)) {
    const req = ROLE_UPGRADE_REQUIREMENTS[roleName];

    const hasAllRequired = req.requiredCards.every(n => collectedNumbers.includes(n));
    if (!hasAllRequired) continue;

    // 規則：如果該身份已被其他「時魔」佔用，則不能再進化成該身份
    const alreadyTaken = (gameState.players || []).some(p =>
      p &&
      p.id !== player.id &&
      p.type === '時魔' &&
      !p.isEjected &&
      String(p.roleCard || '') === roleName
    );
    if (alreadyTaken) continue;

    // 進化成功：更新 roleCard 與 name（命名規則：時魔幼體 1 -> 時魔 1 (秒針)）
    player.roleCard = roleName;
    if (timeDemonIndex !== null) {
      player.name = `時魔 ${timeDemonIndex} (${roleName})`;
    } else {
      // 找不到序號就盡量保留原名，但仍追加身份
      player.name = `${String(player.name || '時魔').replace('幼體', '').trim()} (${roleName})`;
    }

    console.log(`🎉【進化】${player.id} 升級為：${roleName}！`);

    // 進化後不再持有小時卡：把已收集的小時卡全部放回鐘面
    // 珍貴放上層（push），普通放下層（unshift）
    player.hourCards.forEach(card => {
      const clockSpot = (gameState.clockFace || []).find(s => s && s.position === card.number);
      if (!clockSpot) return;
      if (!Array.isArray(clockSpot.cards)) clockSpot.cards = [];
      if (card.isPrecious) clockSpot.cards.push(card);
      else clockSpot.cards.unshift(card);
    });

    player.hourCards = [];
    return true;
  }

  return false;
}

// -------------------------------------------------------------
// 將需要給 game.js / ui.js 呼叫的函式掛到 window（避免作用域問題）
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.activateSeaPreRoundAbility = activateSeaPreRoundAbility;

  window.hourHandPeekTop = hourHandPeekTop;
  window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
  window.hourHandPreMinuteAI = hourHandPreMinuteAI;

  window.activateMinuteHandAbility = activateMinuteHandAbility;

  window.attemptRoleUpgrade = attemptRoleUpgrade;
  
  window.ROLE_UPGRADE_REQUIREMENTS = ROLE_UPGRADE_REQUIREMENTS;
}
