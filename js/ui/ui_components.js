
function safeStringify(value) {
    if (typeof value !== 'object' || value === null) return String(value);
    try {
        return JSON.stringify(value);
    } catch (error) {
        return `[Unserializable: ${error?.message || 'unknown error'}]`;
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}

if (typeof appLogger !== 'undefined' && typeof appLogger.setUiSink === 'function') {
    appLogger.setUiSink((args) => {
        const message = args.map(arg => safeStringify(arg)).join(' ');
        if (typeof logToUI === 'function') {
            logToUI(message);
        } else if (typeof window !== 'undefined' && typeof window.logToUI === 'function') {
            window.logToUI(message);
        }
    });
}


// 1. 錯誤監控
window.addEventListener("error", (e) => {
    try {
        appLogger.logToConsole("[JS Error]", e.message);
        const li = document.createElement('li');
        li.style.color = '#ff6b6b';
        li.textContent = `[錯誤] 錯誤: ${e.message}`;
        if (logList) {
            logList.appendChild(li);
            enforceLogRetention(logList);
        }
    } catch (_) { }
});

// 2. 定義玩家顏色和變數
const uiState = {
    selectedCardValue: null,
    selectedCardValues: [],
    isSecondHandSelectingTwo: false
};

// 修改：優先使用 config.js 的設定，若無則使用預設值
const ROLE_COLORS = window.UI_CONFIG?.ROLE_COLORS || {
    '時魔': '#ff6b6b',
    '時之惡': '#feca57',
    '受詛者': '#54a0ff',
    '時針': '#ff9ff3',
    '分針': '#f368e0',
    '秒針': '#00d2d3'
};

// ==== 戰術評估輔助函式（小時格即時風險與收益預警） ====
function assessHourCardTactics(gameState, card, humanPlayer) {
    if (!gameState || !card) return { riskLevel: 'neutral', riskText: '', isRecipe: false, isPrecious: false, badgeText: '' };
    const currentMode = gameState.gameMode || '5P';
    const is3P = currentMode === '3P';
    const isPure = typeof currentMode === 'string' && currentMode.startsWith('PURE');
    const sinMode = gameState.sinTargetingMode === 'sin' && !is3P && !isPure;
    const sinPlayer = (gameState.players || []).find(p => p.type === '時之惡' && !p.isEjected);
    const targetSpot = Number(card.number);

    let riskLevel = 'safe';
    let riskText = (window.i18n ? window.i18n.t('ui.tactics.safe') : null) || '⛨ 安全';

    if (is3P || isPure || !sinMode) {
        // 最高小時值受罰判定
        const otherPlayers = (gameState.players || []).filter(p => p.id !== humanPlayer.id && !p.isEjected && p.currentClockPosition !== null && p.currentClockPosition !== undefined);
        if (otherPlayers.length > 0) {
            const otherMax = Math.max(...otherPlayers.map(p => Number(p.currentClockPosition)));
            if (targetSpot > otherMax) {
                riskLevel = 'danger';
                riskText = (window.i18n ? window.i18n.t('ui.tactics.danger_max') : null) || '▲ 高危 (受罰預警)';
            } else if (targetSpot === otherMax) {
                riskLevel = 'warning';
                riskText = (window.i18n ? window.i18n.t('ui.tactics.danger') : null) || '▲ 平手危險';
            } else {
                riskLevel = 'safe';
                riskText = (window.i18n ? window.i18n.t('ui.tactics.safe') : null) || '⛨ 安全';
            }
        }
    } else if (sinMode && sinPlayer && sinPlayer.currentClockPosition !== null && sinPlayer.currentClockPosition !== undefined) {
        // 距離時之惡最近受罰判定
        const getDist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 12 - d); };
        const myDist = getDist(targetSpot, Number(sinPlayer.currentClockPosition));
        const otherTargets = (gameState.players || []).filter(p => (p.type === '時魔' || p.type === '受詛者') && p.id !== humanPlayer.id && !p.isEjected && p.currentClockPosition !== null && p.currentClockPosition !== undefined);
        if (otherTargets.length > 0) {
            const otherMinDist = Math.min(...otherTargets.map(p => getDist(Number(p.currentClockPosition), Number(sinPlayer.currentClockPosition))));
            if (myDist <= otherMinDist) {
                riskLevel = 'danger';
                riskText = (window.i18n ? window.i18n.t('ui.tactics.danger_sin') : null) || '▲ 高危 (接近時之惡)';
            } else {
                riskLevel = 'safe';
                riskText = (window.i18n ? window.i18n.t('ui.tactics.safe') : null) || '⛨ 安全';
            }
        }
    }

    // 檢查進化配方或珍貴回憶
    let isRecipe = false;
    let isPrecious = !!card.isPrecious;
    if (humanPlayer && humanPlayer.type === '時魔' && typeof humanPlayer.roleCard === 'string' && humanPlayer.roleCard.includes('幼')) {
        const mem = humanPlayer.hourCards || [];
        const sameAgeCount = mem.filter(c => c.ageGroup === card.ageGroup).length;
        const currentSum = mem.reduce((sum, c) => sum + (c.number || 0), 0);
        if (sameAgeCount >= 1 || (currentSum + targetSpot >= 14)) {
            isRecipe = true;
        }
    }

    let badgeText = '';
    if (isPrecious && humanPlayer && humanPlayer.type === '受詛者') {
        badgeText = (window.i18n ? window.i18n.t('ui.tactics.precious') : null) || '◆ 珍貴回憶';
    } else if (isRecipe) {
        badgeText = (window.i18n ? window.i18n.t('ui.tactics.recipe') : null) || '★ 契合配方';
    } else {
        badgeText = riskText;
    }

    return { riskLevel, riskText, isRecipe, isPrecious, badgeText };
}
if (typeof window !== 'undefined') {
    window.assessHourCardTactics = assessHourCardTactics;
}

let uiTrackedGameRound = 1;// 追蹤目前輪數，用於偵測換輪時重置歷史
let uiTokenMemory = {}; // 用來記憶棋子動畫的時間戳記
let trackedEnteredClockPlayerIds = new Set(); // 追蹤各角色是否首次進入鐘面


// 3. 核心繪圖函式：主控台 (Orchestrator)
// ==========================================
function updateUI(gameState) {
    if (!gameState) return;
    if (typeof window !== 'undefined' && window.HumanTurnTimeoutGuard && typeof window.HumanTurnTimeoutGuard.sync === 'function') {
        window.HumanTurnTimeoutGuard.sync(gameState);
    }

    // 檢查是否進入新的一輪 (例如從 第1輪 變 第2輪)
    // 若是，則清空右側的出牌歷史記錄
    if (gameState.gameRound !== uiTrackedGameRound) {
        resetMinuteHistory(gameState);
        uiTrackedGameRound = gameState.gameRound;
        trackedEnteredClockPlayerIds.clear();
        if (typeof window !== 'undefined' && typeof window.resetPlayerStatsTracking === 'function') {
            window.resetPlayerStatsTracking();
        }
        //appLogger.log(`[UI] 檢測到新輪次 (Round ${uiTrackedGameRound})，已重置出牌歷史與進場追蹤。`);
    }

    // 1. 準備共用變數
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : 'SM_1'));

    // 全域變數更新 (供事件使用)
    if (typeof window.setHumanPlayerId === 'function') {
        window.setHumanPlayerId(humanId);
    } else {
        window.HUMAN_PLAYER_ID = humanId;
    }

    const humanPlayer = gameState.players.find(p => p.id === humanId);

    // 2. 計算等待狀態 (Flags)
    const isHourSelectionActive = !!(
        gameState.waitingHourChoice ||
        (Array.isArray(gameState.hourPickOrder) && gameState.hourPickOrder.length > 0)
    );

    const flags = {
        isWaitingMinuteInput: gameState.currentRoundAIChoices !== null,
        isWaitingHourInput: !!gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId,
        isHourSelectionActive: isHourSelectionActive,
        isWaitingAbilityChoice: !!gameState.waitingAbilityChoice && gameState.waitingAbilityChoicePlayerId === humanId,
        isWaitingSecondFinalChoice: !!gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId,
        isPlayingMinuteClash: !!gameState.isPlayingMinuteClash,
        gameEnded: gameState.gameEnded
    };

    // 如果遊戲結束，顯示結算面板 (只顯示一次，避免重複彈出)
    if (gameState.gameEnded && !gameState.hasShownGameOverPanel) {
        renderGameOverPanel(gameState);
        gameState.hasShownGameOverPanel = true; // 標記已顯示，防止 updateUI 重複觸發
    }


    // 3. 呼叫各個子函式進行繪製
    updateNextStepButton(gameState, flags);        // 按鈕狀態
    renderTopInfo(gameState);                      // A. 頂部資訊
    renderRoundPhaseTracker(gameState, flags);     // 本回合行動序列與競標階段進度條
    renderPlayedCardsPanel(gameState);             // A-2. 出牌列表與歷史
    renderScorePanel(gameState);                   // 呼叫積分榜渲染
    renderClockFace(gameState, flags);             // B. 鐘面 (含堆疊查看器)
    renderAIPlayers(gameState, humanId);           // C. AI 玩家 (含 ID for 漂浮文字)
    renderHumanPlayerArea(gameState, humanPlayer, flags); // D. 人類操作區 (手牌/數據)
    renderDrawnHourCards(gameState, flags);        // E. 中央小時卡
    renderEvolutionPanel(gameState, humanPlayer);  // F. 進化/能力/任務面板

    // 4. 特效處理
    if (typeof processFloatingText === 'function') {
        processFloatingText(gameState);
    } else if (typeof window !== 'undefined' && typeof window.processFloatingText === 'function') {
        window.processFloatingText(gameState);
    }

    if (typeof drawSinTargetLines === 'function') {
        drawSinTargetLines(gameState);
    } else if (typeof window !== 'undefined' && typeof window.drawSinTargetLines === 'function') {
        window.drawSinTargetLines(gameState);
    }

    // 5. 新手教學模式：自動調度動態引導與高亮指標
    if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function') {
        window.TutorialModeManager.updateTutorialPointers(gameState);
    }

    // 6. PixiJS 畫布渲染器同步更新 (若當前頁面有 Pixi 渲染器)
    if (window.PixiClockRenderer && typeof window.PixiClockRenderer.render === 'function') {
        window.PixiClockRenderer.render(gameState);
    }

    // 7. 棄牌記錄彈窗實時同步（若處於打開狀態）
    const discardOverlay = document.getElementById('discard-pile-overlay');
    if (discardOverlay && !discardOverlay.classList.contains('hidden') && discardOverlay.style.display !== 'none') {
        renderDiscardPileModal(gameState);
    }
}

// ==========================================
// 子函式群 (Sub-functions)
// ==========================================

// --- 更新「下一回合」按鈕狀態 ---
function updateNextStepButton(gameState, flags) {
    const nextStepBtn = document.getElementById('next-step-btn');
    if (!nextStepBtn) return;

    if (!nextStepBtn.onclick && typeof window.bindNextStepButton === 'function') {
        window.bindNextStepButton();
    }

    if (flags.gameEnded) {
        nextStepBtn.disabled = true;
        nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.game_over') : '遊戲結束';
        return;
    }

    // 分針能力等待時，允許點擊按鈕 (視為略過)
    if (gameState.waitingMinuteHandChoice) {
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round_skip') : "下一回合 (略過能力)";
        return; // 直接返回，不執行下方的 disable 邏輯
    }

    if (flags.isWaitingMinuteInput || flags.isWaitingHourInput || flags.isHourSelectionActive || flags.isWaitingAbilityChoice || flags.isWaitingSecondFinalChoice || flags.isPlayingMinuteClash) {
        nextStepBtn.disabled = true;
        if (flags.isPlayingMinuteClash) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.comparing_minute') : "比較分鐘數值中...";
        } else if (flags.isWaitingSecondFinalChoice) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.waiting_second_final') : "請完成秒針二選一...";
        } else if (flags.isWaitingMinuteInput) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.waiting_input') : "請出牌...";
        } else if (flags.isWaitingAbilityChoice) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.waiting_ability_choice') : "請決定是否使用特殊能力...";
        } else if (flags.isWaitingHourInput) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.waiting_hour_choice') : "請選擇小時卡...";
        } else if (flags.isHourSelectionActive) {
            nextStepBtn.textContent = window.i18n ? (window.i18n.t('ui.hints.waiting_opponents') || "等待對手挑選小時卡...") : "等待對手挑選小時卡...";
        } else {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.hints.waiting_input') : "請出牌...";
        }
    } else {
        nextStepBtn.disabled = false;
        if (window.AutoNextRoundTimer && window.AutoNextRoundTimer.timerId && window.AutoNextRoundTimer.remainingSeconds > 0) {
            const sec = window.AutoNextRoundTimer.remainingSeconds;
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round_countdown', { sec }) : `下一回合 (${sec}s)`;
        } else {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round') : "下一回合";
        }
    }
}

// --- A. 頂部資訊 ---
function renderTopInfo(gameState) {

    // 將回合數顯示在側邊欄的新位置
    const roundMarkerEl = document.getElementById('round-count-num');
    if (roundMarkerEl) roundMarkerEl.textContent = gameState.roundMarker;

    const deckNumEl = document.getElementById('deck-count-num');
    if (deckNumEl) deckNumEl.textContent = gameState.hourDeck.length;

    // ✅ 新增：更新中間的「遊戲輪次」數值
    const gameRoundEl = document.getElementById('game-round-num');
    if (gameRoundEl) gameRoundEl.textContent = gameState.gameRound;
}

// --- 初始化本回合行動序列與流程提示收合功能 ---
function initRoundPhaseTrackerToggle() {
    const trackerEl = document.getElementById('round-phase-tracker');
    const toggleBtn = document.getElementById('phase-tracker-toggle-btn');
    if (!trackerEl || !toggleBtn) return;

    if (trackerEl.dataset.collapseInitialized) return;
    trackerEl.dataset.collapseInitialized = 'true';

    const STORAGE_KEY = 'phase_tracker_collapsed';
    let isCollapsed = false;
    try {
        isCollapsed = (localStorage.getItem(STORAGE_KEY) === 'true');
    } catch (_) {}

    const updateTrackerState = (collapsed) => {
        trackerEl.classList.toggle('is-collapsed', collapsed);
        const iconEl = toggleBtn.querySelector('.toggle-icon');
        if (iconEl) {
            iconEl.textContent = collapsed ? '▾' : '▴';
        } else {
            toggleBtn.textContent = collapsed ? '▾' : '▴';
        }
        toggleBtn.setAttribute('title', collapsed ? '展開完整流程 (點擊展開)' : '收合完整流程 (只顯示現時流程)');
        toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    updateTrackerState(isCollapsed);

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willCollapse = !trackerEl.classList.contains('is-collapsed');
        updateTrackerState(willCollapse);
        try {
            localStorage.setItem(STORAGE_KEY, willCollapse ? 'true' : 'false');
        } catch (_) {}
    });

    // 若處於收合狀態，點擊流程提示本體亦可快速展開
    trackerEl.addEventListener('click', (e) => {
        if (trackerEl.classList.contains('is-collapsed') && !e.target.closest('#phase-tracker-toggle-btn')) {
            updateTrackerState(false);
            try {
                localStorage.setItem(STORAGE_KEY, 'false');
            } catch (_) {}
        }
    });
}

// 掛載 DOMContentLoaded 監聽
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRoundPhaseTrackerToggle);
    } else {
        initRoundPhaseTrackerToggle();
    }
}

// --- 渲染本回合行動序列與競標階段進度條 (Round Phase & Bid Tracker) ---
function renderRoundPhaseTracker(gameState, flags) {
    const trackerEl = document.getElementById('round-phase-tracker');
    if (!trackerEl) return;

    initRoundPhaseTrackerToggle();

    if (!gameState) {
        trackerEl.style.display = 'none';
        return;
    }
    trackerEl.style.display = 'flex';

    // 評判當前階段
    let currentPhase = 'bid';
    let statusText = '';
    let pickSub = '';

    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : 'SM_1';

    const isBiddingPhase = flags.isWaitingMinuteInput || (gameState.currentRoundAIChoices !== null && !flags.isPlayingMinuteClash && (!gameState.currentMinuteChoices || gameState.currentMinuteChoices.length === 0));

    if (isBiddingPhase) {
        currentPhase = 'bid';
        statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_bid') : '請挑選 1 張分鐘卡出牌';
    } else if (flags.isPlayingMinuteClash) {
        currentPhase = 'reveal';
        statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_reveal') : '揭開分鐘卡 · 比較大小排序中';
    } else if (gameState.waitingHourChoice || gameState.waitingMinuteHandChoice || gameState.waitingSecondHandFinalChoice || (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0 && gameState.currentMinuteChoices && gameState.currentMinuteChoices.length > 0)) {
        currentPhase = 'pick';
        if (gameState.waitingMinuteHandChoice) {
            pickSub = '分針躍遷';
            statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_minute_jump') : '◈ 分針能力：決定是否躍遷刻度';
        } else if (gameState.waitingSecondHandFinalChoice) {
            pickSub = '秒針二選一';
            statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_second_choice') : '◈ 秒針能力：二選一決定打出卡牌';
        } else if (gameState.waitingHourChoice) {
            const isHuman = (gameState.waitingHourChoicePlayerId === humanId);
            const rankLabel = (gameState.nextHourPickerIndex === 0) ? '第 1 順位' : '第 2 順位';
            pickSub = rankLabel;
            if (isHuman) {
                statusText = window.i18n
                    ? window.i18n.t('ui.phase_tracker.status_your_pick', { rank: rankLabel })
                    : `▶ 【${rankLabel}】輪到您挑選小時卡`;
            } else {
                const picker = (gameState.players || []).find(p => p.id === gameState.waitingHourChoicePlayerId);
                const pName = picker?.name || '對手';
                statusText = window.i18n
                    ? window.i18n.t('ui.phase_tracker.status_ai_pick', { name: pName, rank: rankLabel })
                    : `⧖ 【${rankLabel}】${pName} 正在挑選小時卡`;
            }
        } else {
            pickSub = '選卡中';
            statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_pick') : '依名次順序挑選小時卡';
        }
    } else {
        // 回合結算 / 等待點擊下一回合
        currentPhase = 'resolve';
        const nextBtn = document.getElementById('next-step-btn');
        if (nextBtn && !nextBtn.disabled) {
            statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_resolve') : '回合結算完畢 · 請點擊「下一回合」';
        } else {
            statusText = window.i18n ? window.i18n.t('ui.phase_tracker.status_round_end') : '回合結算中';
        }
    }

    // 順序權重：bid (1) -> reveal (2) -> pick (3) -> resolve (4)
    const phaseWeights = { bid: 1, reveal: 2, pick: 3, resolve: 4 };
    const currWeight = phaseWeights[currentPhase] || 1;

    // 更新各步驟節點
    const steps = trackerEl.querySelectorAll('.phase-step');
    steps.forEach(stepEl => {
        const p = stepEl.getAttribute('data-phase');
        const w = phaseWeights[p] || 1;
        const isActive = (p === currentPhase);
        const isCompleted = (w < currWeight);

        stepEl.classList.toggle('active', isActive);
        stepEl.classList.toggle('completed', isCompleted);
    });

    // 更新順位標籤
    const pickSubEl = document.getElementById('phase-step-pick-sub');
    if (pickSubEl) {
        pickSubEl.textContent = pickSub ? `(${pickSub})` : '';
    }

    // 更新動態狀態提示
    const statusTextEl = document.getElementById('phase-status-text');
    if (statusTextEl && statusText) {
        statusTextEl.textContent = statusText;
    }
}

// --- B. 鐘面繪製 ---
function renderClockFace(gameState, flags) {
    // 檢測角色首次進入鐘面：觸發「模糊浮現 (Blur In Letters)」
    checkAndTriggerClockBlurIn(gameState);

    // 移除舊的像素設定
    // const radius = 190;
    // const centerX = 250;
    // const centerY = 250;
    // ✅ 改用百分比設定 (基於 500px 容器：190/500 = 38%, 240/500 = 48%)
    const radiusPercent = 38;
    const arrowRadiusPercent = 48;

    const clockFaceEl = document.getElementById('clock-face');
    if (!clockFaceEl) return;

    // 清理舊元素
    const existingSpots = clockFaceEl.querySelectorAll('.clock-spot');
    const existingArrows = clockFaceEl.querySelectorAll('.active-round-arrow');
    existingSpots.forEach(el => el.remove());
    existingArrows.forEach(el => el.remove());

    // ✅ 取得人類玩家位置
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
    const humanPlayer = gameState.players.find(p => p.id === humanId);
    const humanPos = humanPlayer ? humanPlayer.currentClockPosition : null;
	
	// 取得目前畫面上「可挑選的小時卡數字」 
    const drawnNumbers = (flags.isWaitingHourInput && gameState.currentDrawnHourCards) 
        ? gameState.currentDrawnHourCards.map(c => c.number) 
        : [];
	
    gameState.clockFace.forEach((spot) => {
        const angleDeg = spot.position * 30 - 90;
        const angleRad = angleDeg * (Math.PI / 180);

        // ✅ 計算百分比座標 (50% 是中心點)
        const leftPercent = 50 + radiusPercent * Math.cos(angleRad);
        const topPercent = 50 + radiusPercent * Math.sin(angleRad);

        //const x = centerX + radius * Math.cos(angleRad);
        //const y = centerY + radius * Math.sin(angleRad);

        const spotEl = document.createElement('div');
        spotEl.className = 'clock-spot';

        // ✅ 使用百分比定位
        spotEl.style.left = `${leftPercent}%`;
        spotEl.style.top = `${topPercent}%`;

		// 如果這個格子的數字在可選名單內，加上發光 Class 
        if (drawnNumbers.includes(spot.position)) {
            spotEl.classList.add('highlight-target');
				
			// 讓滑鼠游標變成手指狀，提示可以點擊
            spotEl.style.cursor = 'pointer';

            const card = (gameState.currentDrawnHourCards || []).find(c => c.number === spot.position);
            if (card && flags.isWaitingHourInput) {
                const tactics = assessHourCardTactics(gameState, card, humanPlayer);
                spotEl.classList.add(`tactics-${tactics.riskLevel}`);
                if (tactics.isRecipe) spotEl.classList.add('tactics-recipe');
                if (tactics.isPrecious) spotEl.classList.add('tactics-precious');
                const badgeEl = document.createElement('div');
                badgeEl.className = `spot-tactics-badge ${tactics.riskLevel} ${tactics.isRecipe ? 'recipe' : ''}`;
                badgeEl.textContent = tactics.badgeText;
                spotEl.appendChild(badgeEl);
            }
            
            // 點擊事件處理
            spotEl.onclick = () => {
                // 尋找當前抽出的小時卡中，哪一張的數字符合這個格子的位置
                const cardIndex = gameState.currentDrawnHourCards.findIndex(c => c.number === spot.position);
                
                if (cardIndex !== -1) {
                    const chosenCard = gameState.currentDrawnHourCards[cardIndex];
                    const fn = (typeof window.handleHumanHourCardChoice === 'function')
                        ? window.handleHumanHourCardChoice
                        : (typeof handleHumanHourCardChoice === 'function' ? handleHumanHourCardChoice : null);
                    if (!fn) return;

                    fn(gameState, cardIndex);
                }
            };
		}
		
        // 人類玩家的位置
        if (humanPos !== null && spot.position === humanPos) {
            spotEl.classList.add('active-round'); // 借用這個 class 來做高亮效果
        }

        // 卡牌顯示 (含 Stack Inspector)
        if (spot.cards.length > 0) {
            const topCard = spot.cards[spot.cards.length - 1];

            // 頂牌預覽
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-preview';

            // 若頂牌被鎖定，顯示鎖頭
            const lockDisplay = topCard.isLocked ? '<div class="material-symbols-outlined" style="font-size:0.75rem;">lock</div>' : '';

            cardDiv.innerHTML = `
                <div class="cp-num">${topCard.number}</div>
                <div class="cp-age">${topCard.ageGroup || ''}</div>
                <div class="cp-star">${topCard.isPrecious ? '★' : ''}</div>
            `;
            if (topCard.isPrecious) {
                cardDiv.style.color = '#d4af37';
                cardDiv.style.border = '1px solid gold';
            }
            spotEl.appendChild(cardDiv);

            // 堆疊查看器
            const inspector = document.createElement('div');
            inspector.className = 'stack-inspector';
            const title = document.createElement('div');
            title.className = 'stack-title';
            title.textContent = `堆疊 (${spot.cards.length}張)`;
            inspector.appendChild(title);

            [...spot.cards].reverse().forEach((card, i) => {
                const item = document.createElement('div');
                item.className = 'stack-item';
                if (card.isPrecious) item.classList.add('precious');
                const isTop = (i === 0);
                const star = card.isPrecious ? '★' : '';
                const lockIcon = card.isLocked ? '<span class="material-symbols-outlined icon-inline" style="font-size:0.85em;">lock</span>' : '';// 鎖定圖示
                const age = card.ageGroup ? `<span class="age-tag">(${card.ageGroup})</span>` : '';
                item.innerHTML = `${lockIcon}${card.number}${star}${age}`;
                inspector.appendChild(item);
            });
            spotEl.appendChild(inspector);
        }

        // 棋子
        const tokensContainer = document.createElement('div');
        tokensContainer.className = 'tokens';
        gameState.players.forEach(player => {
            if (player.currentClockPosition === spot.position && !player.isEjected) {
                const token = document.createElement('div');
                token.className = 'token';
                token.title = player.name;

                // 1. 判斷角色，加入對應的 CSS 圖片類別 (區分玩家與 NPC)
                const isHuman = (player.id === humanId);
                let roleClass = isHuman ? 'token-player-demon' : 'token-demon'; // 預設：幼體時魔
                if (player.type === '時之惡') roleClass = isHuman ? 'token-player-sin' : 'token-sin';
                else if (player.type === '受詛者') roleClass = isHuman ? 'token-player-scz' : 'token-scz';
                else if (player.roleCard === '時針') roleClass = isHuman ? 'token-player-hour' : 'token-hour';
                else if (player.roleCard === '分針') roleClass = isHuman ? 'token-player-min' : 'token-min';
                else if (player.roleCard === '秒針') roleClass = isHuman ? 'token-player-sec' : 'token-sec';

                token.classList.add(roleClass);

                // ---動畫條件判定 ---
                const mem = uiTokenMemory[player.id];
                const now = Date.now();

                // 如果是新出現，或是位置改變了，紀錄新的動畫結束時間
                if (!mem || mem.pos !== player.currentClockPosition) {
                    uiTokenMemory[player.id] = {
                        pos: player.currentClockPosition,
                        animEndTime: now + 600 // 動畫長度需對應 CSS 的 0.6s (600ms)
                    };
                }

                // 檢查是否在動畫有效期間內
                const currentMem = uiTokenMemory[player.id];
                if (now < currentMem.animEndTime) {
                    token.classList.add('token-animate');
                    // 計算已流逝時間，利用負 delay 讓新建的 DOM 接續播放動畫，避免重製造成的閃爍！
                    const elapsed = 600 - (currentMem.animEndTime - now);
                    token.style.animationDelay = `-${elapsed}ms`;
                } else {
                    // 若動畫已播完，確保殘留的 delay 設定被清除
                    token.style.animationDelay = '0ms';
                }


                // 2. 移除原本的實心背景，改用 filter 幫 GIF 加上陣營專屬的發光特效
                const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
                const glowColor = ROLE_COLORS[roleKey] || '#ccc';
                token.style.filter = `drop-shadow(0 0 5px ${glowColor})`;

                tokensContainer.appendChild(token);
            }
        });
        spotEl.appendChild(tokensContainer);

        clockFaceEl.appendChild(spotEl);
    });
	
	// --- 回合受罰標示器邏輯 (簡化為只顯示當前受罰方式) ---
    const penaltyDisplay = document.getElementById('round-penalty-display');
    if (penaltyDisplay) {
        // 只要抽出小時卡就顯示
        if (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) {
            penaltyDisplay.classList.remove('hidden'); 
            
            // 清空舊內容
            penaltyDisplay.innerHTML = '';
            
            // 創建單一項目的列表
            const listEl = document.createElement('ul');
            listEl.className = 'penalty-list';
            const itemEl = document.createElement('li');
            itemEl.className = 'penalty-item';
            
            // ✅ 核心修改：判斷全域受罰模式，二選一顯示
            if (gameState.sinTargetingMode === 'sin' && gameState.gameMode !== '3P') {
                // 如果時之惡發動牽引：顯示距離受罰
                itemEl.innerHTML = `<span class="penalty-action">受罰：距離最近</span>`;
            } else {
                // 預設模式：顯示時間受罰
                itemEl.innerHTML = `<span class="penalty-time">受罰：最高小時值</span>`;
            }
            
            listEl.appendChild(itemEl);
            penaltyDisplay.appendChild(listEl);
            
        } else {
            // 不在回合進行中（例如回合結算時），隱藏
            penaltyDisplay.classList.add('hidden');
        }
    }
}

// --- ⚙️ 擬物化儀表生成函式：機芯齒輪鏈 (Gear Life Chain) & MP 真空發條能量管 (MP Gauge) ---
function createGearChainHtml(count, isCompact = false, idVal = '') {
    const gearCount = Math.max(0, Number(count) || 0);
    const idAttr = idVal ? `id="${idVal}"` : '';
    const maxVisualCogs = isCompact ? 3 : 5;
    const visualCount = Math.min(gearCount, maxVisualCogs);
    
    let cogsHtml = '';
    if (gearCount === 0) {
        cogsHtml = `
            <span class="gear-cog gear-cog--shattered" title="機芯停擺 / 齒輪崩毀">
                <svg viewBox="0 0 24 24" class="gear-cog-svg shattered" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" class="gear-hole-broken" />
                    <path class="gear-crack-line" d="M12 2 L12 7 M12 17 L12 22 M2 12 L7 12 M17 12 L22 12 M5 5 L8 8 M16 16 L19 19" />
                    <circle cx="12" cy="12" r="1.8" class="gear-axle-broken" />
                </svg>
            </span>`;
    } else {
        for (let i = 0; i < visualCount; i++) {
            const isOdd = (i % 2 === 1);
            const offsetClass = isOdd ? 'gear-cog--offset' : '';
            cogsHtml += `
                <span class="gear-cog ${offsetClass}" title="機芯咬合齒輪 #${i + 1}">
                    <svg viewBox="0 0 24 24" class="gear-cog-svg" aria-hidden="true">
                        <path class="gear-teeth" d="M10.5 1 h3 l0.6 2.6 a7.5 7.5 0 0 1 1.8 0.7 l2.2 -1.4 l2.1 2.1 l-1.4 2.2 a7.5 7.5 0 0 1 0.7 1.8 l2.6 0.6 v3 l-2.6 0.6 a7.5 7.5 0 0 1 -0.7 1.8 l1.4 2.2 l-2.1 2.1 l-2.2 -1.4 a7.5 7.5 0 0 1 -1.8 0.7 l-0.6 2.6 h-3 l-0.6 -2.6 a7.5 7.5 0 0 1 -1.8 -0.7 l-2.2 1.4 l-2.1 -2.1 l1.4 -2.2 a7.5 7.5 0 0 1 -0.7 -1.8 l-2.6 -0.6 v-3 l2.6 -0.6 a7.5 7.5 0 0 1 0.7 -1.8 l-1.4 -2.2 l2.1 -2.1 l2.2 1.4 a7.5 7.5 0 0 1 1.8 -0.7 z" />
                        <circle cx="12" cy="12" r="5.2" class="gear-rim-line" />
                        <circle cx="12" cy="12" r="3.2" class="gear-axle-hole" />
                        <circle cx="12" cy="12" r="1.3" class="gear-axle-pin" />
                    </svg>
                </span>`;
        }
    }

    const compactModifier = isCompact ? 'mech-gear-gauge--compact' : '';
    const dangerClass = (gearCount <= 1) ? 'is-danger' : '';
    const labelText = 'GP';

    return `
        <div class="mech-gear-gauge ${compactModifier} ${dangerClass}" title="機芯 GP：${gearCount}">
            <span class="mech-gauge-label">${labelText}</span>
            <div class="mech-gear-track">
                ${cogsHtml}
            </div>
            <div class="mech-counter-dial">
                <strong class="mech-gear-val" ${idAttr}>${gearCount}</strong>
            </div>
        </div>`;
}

function createManaGaugeHtml(mana, maxCapacity = 0, isCompact = false, idVal = '') {
    const val = Math.max(0, Number(mana) || 0);
    const cap = Math.max(val, Number(maxCapacity) || 0, 1);
    const fillPercent = (val > 0) ? Math.min(100, Math.max(12, Math.round((val / cap) * 100))) : 0;
    const idAttr = idVal ? `id="${idVal}"` : '';

    const maxTicks = isCompact ? 3 : 5;
    const ticksCount = Math.min(cap, maxTicks);
    let ticksHtml = '';
    for (let i = 1; i < ticksCount; i++) {
        const leftPercent = (i / ticksCount) * 100;
        ticksHtml += `<span class="vial-tick" style="left: ${leftPercent.toFixed(1)}%;"></span>`;
    }

    const compactModifier = isCompact ? 'mech-mana-gauge--compact' : '';
    const glowClass = (val > 0) ? 'is-energized' : 'is-depleted';
    const labelText = 'MP';

    return `
        <div class="mech-mana-gauge ${compactModifier} ${glowClass}" title="法力發條管 (MP): ${val}/${cap}">
            <span class="mech-gauge-label">${labelText}</span>
            <div class="aether-vial">
                <div class="vial-cap vial-cap--left">
                    <span class="vial-cap-knob"></span>
                </div>
                <div class="vial-glass">
                    <div class="vial-plasma" style="width: ${fillPercent}%;"></div>
                    <div class="vial-ticks">${ticksHtml}</div>
                    <div class="vial-specular"></div>
                </div>
                <div class="vial-cap vial-cap--right">
                    <span class="vial-cap-knob"></span>
                </div>
            </div>
            <div class="mech-counter-dial aether-dial">
                <strong class="aether-val" ${idAttr}>${val}</strong>
            </div>
        </div>`;
}

// --- C. AI 玩家列表 ---
function renderAIPlayers(gameState, humanId) {
    const playersContainer = document.getElementById('players-section');
    if (!playersContainer) return;
    playersContainer.innerHTML = '';

    gameState.players.filter(p => p.id !== humanId).forEach(player => {
        const pCard = document.createElement('div');
        pCard.className = 'player-card';
        pCard.dataset.id = player.id; // ID for Floating Text
        if (player.isEjected) pCard.classList.add('ejected');

        // 護盾可視化邏輯
        // 條件：是幼體時魔 + MP >= 3 + 護盾未使用
        const isYoung = player.roleCard && player.roleCard.includes('幼');
        // 讀取 config 中的護盾消耗，預設為 3
        const shieldCost = (window.GAME_DATA?.ABILITY_COSTS?.YOUNG_SHIELD) || 3;

        if (isYoung && player.mana >= shieldCost && !player.shieldUsed && !player.isEjected) {
            const shieldEl = document.createElement('div');
            shieldEl.className = 'shield-indicator';
            shieldEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1em; vertical-align:-0.15em;">shield</span>';
            shieldEl.title = `護盾就緒！(MP ≥ ${shieldCost}，可抵擋傷害)`;
            pCard.appendChild(shieldEl);
        }

        const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
        const color = ROLE_COLORS[roleKey] || '#fff';
        const isHuman = (player.id === humanId);

        let diceChip = '';
        if (player.d6Die !== null) {
            diceChip = `
                <div class="resource-chip resource-chip--shield" title="受詛者/時之惡護盾值">
                    <span class="resource-chip__icon icon-shield-css" aria-hidden="true"></span>
                    護盾: <strong>${player.d6Die}</strong>
                </div>`;
        }
        const posDisplay = player.isEjected ? '被吞噬' : (player.currentClockPosition !== null && player.currentClockPosition !== undefined ? `${player.currentClockPosition} 點` : '未上場');

        // 齒輪生命顯示：數字為主，佐以單一齒輪圖示，超過 0 顆不橫向溢出
        const gearCount = Math.max(0, player.gearCards || 0);

        // 建立卡片內層內容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'player-card-inner';

        contentDiv.innerHTML = `
            <div class="player-card-header">
                <div class="player-card-name-group">
                    <h4 style="color:${color}; margin:0;" class="player-card-name">
                        ${player.name}
                        ${isHuman ? '<span class="player-you-pill">你</span>' : ''}
                    </h4>
                </div>
                <div class="player-card-pos ${player.isEjected ? 'is-ejected' : ''}">
                    <span class="pos-label">位置</span>
                    <strong class="pos-val">${posDisplay}</strong>
                </div>
            </div>

            <div class="player-stats-grid">
                <div class="resource-chip resource-chip--mana has-mech-gauge" title="目前法力值：${player.mana}">
                    ${createManaGaugeHtml(player.mana, player.gearCards, true)}
                </div>
                <div class="resource-chip resource-chip--gear has-mech-gauge" title="齒輪生命數：${gearCount}">
                    ${createGearChainHtml(gearCount, true)}
                </div>
                ${diceChip}
                <div class="stat-pill stat-pill--hours" title="已收集的小時卡張數">
                    <span class="stat-icon material-symbols-outlined">hourglass_bottom</span>
                    小時卡: <strong>${player.hourCards.length}</strong>
                </div>
                <div class="stat-pill stat-pill--score" title="當前總得分">
                    <span class="stat-icon material-symbols-outlined">trophy</span>
                    分數: <strong>${player.score}</strong>
                </div>
            </div>
        `;
        pCard.appendChild(contentDiv);

        playersContainer.appendChild(pCard);
    });
}

// --- E. 中央小時卡 ---
function renderDrawnHourCards(gameState, flags) {
    const clockCenterEl = document.querySelector('.clock-center');
    if (!clockCenterEl) return;
    clockCenterEl.innerHTML = '';

    if (flags.isWaitingHourInput) {
        const tipEl = document.createElement('div');
        tipEl.className = 'hour-choice-tip';
        tipEl.textContent = '請選擇小時卡';
        clockCenterEl.appendChild(tipEl);
    }

    if (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) {
        gameState.currentDrawnHourCards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'drawn-hour-card';
            if (card.isPrecious) cardEl.classList.add('precious');

            cardEl.innerHTML = `
                <div class="hour-num">${card.number}</div>
                <div class="hour-age">${card.ageGroup || '&nbsp;'}</div>
                <div class="hour-star">${card.isPrecious ? '★' : '&nbsp;'}</div>
            `;

            if (flags.isWaitingHourInput) {
                cardEl.classList.add('clickable');
                const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';
                const humanPlayer = (gameState.players || []).find(p => p.id === humanId);
                const tactics = assessHourCardTactics(gameState, card, humanPlayer);
                cardEl.classList.add(`tactics-${tactics.riskLevel}`);
                if (tactics.isRecipe) cardEl.classList.add('tactics-recipe');
                if (tactics.isPrecious) cardEl.classList.add('tactics-precious');
                const tagEl = document.createElement('div');
                tagEl.className = `hour-tactics-tag ${tactics.riskLevel} ${tactics.isRecipe ? 'recipe' : ''}`;
                tagEl.textContent = tactics.badgeText;
                cardEl.appendChild(tagEl);

                cardEl.addEventListener('click', () => {
                    const idx = gameState.currentDrawnHourCards.indexOf(card);
                    const fn = (typeof window.handleHumanHourCardChoice === 'function')
                        ? window.handleHumanHourCardChoice
                        : (typeof handleHumanHourCardChoice === 'function' ? handleHumanHourCardChoice : null);
                    if (!fn) return;

                    fn(globalGameState, idx);
                });
            }
            clockCenterEl.appendChild(cardEl);
        });
    }
}

function setupTabNavigation(btnSelector, contentSelector, activeBtnClass, activeContentClass) {
    const buttons = document.querySelectorAll(btnSelector);
    const contents = document.querySelectorAll(contentSelector);

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. 移除所有按鈕與內容的 active 狀態
            buttons.forEach(b => b.classList.remove(activeBtnClass));
            contents.forEach(c => c.classList.remove(activeContentClass));

            // 2. 啟用當前點擊的按鈕
            btn.classList.add(activeBtnClass);

            // 3. 顯示對應的內容區塊
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.classList.add(activeContentClass);
                }
            }

            // 4. 切換至設定/規則或返回遊戲時即時調度自動倒數
            if (typeof window !== 'undefined' && typeof window.checkGameCountdownState === 'function') {
                window.checkGameCountdownState();
            }
        });
    });
}

if (typeof window !== 'undefined') {
    window.createGearChainHtml = createGearChainHtml;
    window.createManaGaugeHtml = createManaGaugeHtml;
    window.renderAIPlayers = renderAIPlayers;
}
