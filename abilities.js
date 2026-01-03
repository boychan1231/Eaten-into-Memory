// abilities.js

// -------------------------------------------------------------
// 角色升級需求（5 選 3）
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
    requiredCards: [3, 5, 7, 12, 10],
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

	function activatesinPreRoundAbility(gameState) {
    // 【已移除】舊設定：時之惡於每輪第 1 回合開始前自動耗用資源棄牌／干擾其他玩家手牌。
    // 保留此空函式僅為相容舊呼叫點，避免破壞既有流程。
	return;
}

// -------------------------------------------------------------
// 時針：頂牌放到底（每回合一次，僅限 preMinute）
// -------------------------------------------------------------
function hourHandMoveTopToBottom(gameState, playerId) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState) return false;

  // 若你希望「封印」連被動視覺都禁止，UI 會處理顯示；這裡主動技能仍禁止
  if (gameState.abilityMarker) return false;

  // 僅限出分鐘卡前
  if (gameState.phase !== 'preMinute') return false;

  const player = _getPlayerById(gameState, playerId);
  if (_hasEjected(player)) return false;
  if (player.roleCard !== '時針') return false;

  const top = _topHourDeckCard(gameState);
  if (!top) return false;

  if (player.specialAbilityUsed) return false; // 每回合一次
  if (typeof player.mana !== 'number' || player.mana < 1) return false;

  player.mana -= 1;

  const moved = gameState.hourDeck.pop(); // 頂
  gameState.hourDeck.unshift(moved);      // 底

  player.specialAbilityUsed = true;

  console.log(`【時針】${player.name} 耗用 1 Mana，將頂牌 ${moved.number}${moved.isPrecious ? '★' : ''} 移到小時卡庫最底。`);
  return true;
}

// AI 時針：在 preMinute 階段以簡單策略決定要不要放到底
function hourHandPreMinuteAI(gameState) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState || gameState.gameEnded) return false;
  if (gameState.abilityMarker) return false;
  if (gameState.phase !== 'preMinute') return false;

  const top = _topHourDeckCard(gameState);
  if (!top) return false;

  let acted = false;

  (gameState.players || []).forEach(p => {
    if (!p || p.isEjected) return;
    if (p.id === (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : null)) return;
    if (p.roleCard !== '時針') return;

    if (p.specialAbilityUsed) return;
    if (typeof p.mana !== 'number' || p.mana < 1) return;

    // 策略：若頂牌數字已在自己持有的小時卡中（幼體期可能有），傾向放到底；否則小機率放到底增加變化
    const alreadyHasNumber = Array.isArray(p.hourCards) && p.hourCards.some(c => c.number === top.number);
    const shouldBury = alreadyHasNumber || (!top.isPrecious && Math.random() < 0.15);

    if (shouldBury) {
      const ok = hourHandMoveTopToBottom(gameState, p.id);
      if (ok) acted = true;
    }
  });

  return acted;
}

// -------------------------------------------------------------
// 分針：移動到「本回合較小小時卡 - 1」（扣 2 Mana，每回合一次，不繞回 12）
// -------------------------------------------------------------
function activateMinuteHandAbility(gameState, playerId) {
  if (!_isAbilitiesEnabled()) return false;
  if (!gameState) return false;
  if (gameState.abilityMarker) return false;

  const player = _getPlayerById(gameState, playerId);
  if (_hasEjected(player)) return false;
  if (player.roleCard !== '分針') return false;

  if (player.specialAbilityUsed) return false;
  if (typeof player.mana !== 'number' || player.mana < 2) return false;

  const base =
    (typeof gameState.waitingAbilityBaseNumber === 'number')
      ? gameState.waitingAbilityBaseNumber
      : (typeof player.pickedHourCardThisTurnNumber === 'number')
        ? player.pickedHourCardThisTurnNumber
        : null;

  if (typeof base !== 'number') return false;
  if (base <= 1) return false; // 規則：不可移到 12

  const targetPos = base - 1;

  player.mana -= 2;
  player.specialAbilityUsed = true;
  player.currentClockPosition = targetPos;

  console.log(`【分針】${player.name} 耗用 2 Mana，移動到 ${targetPos}（由小時卡 ${base} 觸發）。`);
  return true;
}

// -------------------------------------------------------------
// 幼體時魔：升級（5 選 3 + 至少 1 張珍貴★；身份唯一）
// -------------------------------------------------------------
function attemptRoleUpgrade(player, gameState) {
  if (!player || !gameState) return false;

  if (player.type !== '時魔' || player.isEjected) return false;

  const roleText = String(player.roleCard || '');
  const isYoungTimeDemon = roleText.includes('幼體');
  if (!isYoungTimeDemon) return false;

  if (!Array.isArray(player.hourCards) || player.hourCards.length === 0) return false;

  const collectedNumbers = player.hourCards.map(c => c.number);
  const hasPreciousCard = player.hourCards.some(c => c.isPrecious);
  if (!hasPreciousCard) return false;

  const getTimeDemonIndex = () => {
    const name = String(player.name || '').trim();
    let m = name.match(/時魔\s*幼體\s*(\d+)/);
    if (!m) m = name.match(/時魔\s*(\d+)/);
    if (!m) m = String(player.id || '').match(/SM_(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const timeDemonIndex = getTimeDemonIndex();

  const roleOrder = Object.keys(ROLE_UPGRADE_REQUIREMENTS);

  for (const roleName of roleOrder) {
    const req = ROLE_UPGRADE_REQUIREMENTS[roleName];
    const matchedCount = req.requiredCards.filter(n => collectedNumbers.includes(n)).length;

    // ✅ 升級規則：5 選 3
    if (matchedCount < 3) continue;

    // 身份唯一
    const alreadyTaken = (gameState.players || []).some(p =>
      p &&
      p.id !== player.id &&
      p.type === '時魔' &&
      !p.isEjected &&
      String(p.roleCard || '') === roleName
    );
    if (alreadyTaken) continue;

    // 升級成功
    player.roleCard = roleName;
    if (timeDemonIndex !== null) {
      player.name = `時魔 ${timeDemonIndex} (${roleName})`;
    } else {
      player.name = `${String(player.name || '時魔').replace('幼體', '').trim()} (${roleName})`;
    }

    console.log(`🎉【進化】${player.id} 升級為：${roleName}（命中 ${matchedCount}/5 + 珍貴★）`);

    // 進化後：把持有小時卡放回鐘面；珍貴放上層、普通放下層
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
// 掛到 window（供 game.js / ui.js 呼叫）
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.ROLE_UPGRADE_REQUIREMENTS = ROLE_UPGRADE_REQUIREMENTS;

  window.activatesinPreRoundAbility = activatesinPreRoundAbility;

  window.hourHandMoveTopToBottom = hourHandMoveTopToBottom;
  window.hourHandPreMinuteAI = hourHandPreMinuteAI;

  window.activateMinuteHandAbility = activateMinuteHandAbility;

  window.attemptRoleUpgrade = attemptRoleUpgrade;
}
