const modalFocusMap = new WeakMap();
const modalOpenOrder = [];

let _wasPlayerAway = false;

// 判斷玩家當前是否處於「查看非遊戲內容」狀態（如打開收集視窗、切換至設定頁或規則頁）
function isPlayerAwayFromGame() {
    if (typeof document === 'undefined') return false;

    // 1. 檢查是否打開了「收集」視窗
    const colOverlay = document.getElementById('collection-overlay');
    const isColOpen = Boolean(
        colOverlay &&
        !colOverlay.classList.contains('hidden') &&
        colOverlay.style.display !== 'none'
    );

    // 2. 檢查當前標籤頁是否為「遊戲」頁（若不是遊戲頁，即代表切換至設定頁或規則頁）
    const gameTabBtn = document.querySelector('.tab-btn[data-target="game-content"]');
    const isGameTabActive = gameTabBtn ? gameTabBtn.classList.contains('active') : true;

    // 3. 檢查設定頁與規則頁內容區塊是否處於啟用狀態
    const settingsEl = document.getElementById('settings-content');
    const rulesEl = document.getElementById('rules-content');
    const isSettingsOrRulesActive = Boolean(
        (settingsEl && (settingsEl.classList.contains('active-tab') || settingsEl.classList.contains('active'))) ||
        (rulesEl && (rulesEl.classList.contains('active-tab') || rulesEl.classList.contains('active')))
    );

    return isColOpen || !isGameTabActive || isSettingsOrRulesActive;
}

// 根據玩家當前所在畫面，動態暫停或重新開始所有自動倒數
function checkGameCountdownState() {
    const isAway = isPlayerAwayFromGame();

    if (isAway && !_wasPlayerAway) {
        _wasPlayerAway = true;
        if (typeof appLogger !== 'undefined') {
            appLogger.log('⏱️ [計時器] 玩家進入收集/設定/規則頁，暫停所有自動倒數。');
        }
        if (typeof window !== 'undefined' && window.AutoNextRoundTimer && typeof window.AutoNextRoundTimer.pause === 'function') {
            window.AutoNextRoundTimer.pause();
        }
        if (typeof window !== 'undefined' && window.AnimationController && typeof window.AnimationController.pauseAll === 'function') {
            window.AnimationController.pauseAll();
        }
    } else if (!isAway && _wasPlayerAway) {
        _wasPlayerAway = false;
        if (typeof appLogger !== 'undefined') {
            appLogger.log('⏱️ [計時器] 玩家返回遊戲畫面，重新開始自動倒數。');
        }
        if (typeof window !== 'undefined' && window.AutoNextRoundTimer && typeof window.AutoNextRoundTimer.resume === 'function') {
            window.AutoNextRoundTimer.resume();
        }
        if (typeof window !== 'undefined' && window.AnimationController && typeof window.AnimationController.resumeAll === 'function') {
            window.AnimationController.resumeAll();
        }
    }
}

function getFocusableElement(root) {
    if (!root) return null;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return root.querySelector(selector);
}

function openModal(overlay, focusTarget) {
    if (!overlay) return;
    if (!modalFocusMap.has(overlay)) {
        modalFocusMap.set(overlay, document.activeElement);
    }

    // ✅ 修正：強制設定為 flex 以顯示視窗 (覆蓋 CSS 的 display: none)
    overlay.style.display = 'flex';

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
    }
    overlay.setAttribute('aria-hidden', 'false');

    if (!modalOpenOrder.includes(overlay)) {
        modalOpenOrder.push(overlay);
    }
    const focusEl = focusTarget || document.getElementById('btn-restart-game') || getFocusableElement(overlay);
    if (focusEl && typeof focusEl.focus === 'function') {
        focusEl.focus();
    }

    checkGameCountdownState();
}

function closeModal(overlay) {
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    const previousFocus = modalFocusMap.get(overlay);
    if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
    }
    modalFocusMap.delete(overlay);
    const idx = modalOpenOrder.indexOf(overlay);
    if (idx >= 0) modalOpenOrder.splice(idx, 1);

    checkGameCountdownState();
}

function closeTopModal() {
    const overlay = modalOpenOrder[modalOpenOrder.length - 1];
    if (overlay) closeModal(overlay);
}

if (typeof window !== 'undefined') {
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.closeTopModal = closeTopModal;
    window.isPlayerAwayFromGame = isPlayerAwayFromGame;
    window.checkGameCountdownState = checkGameCountdownState;
}
