// ui.js 
if (typeof window !== 'undefined') {
    window.appLogger = window.appLogger || {
        log: (...args) => console.log(...args)
    };
}

(function extendLogger() {
    const logger = window.appLogger;
    
    if (!logger.logToConsole) {
        logger.logToConsole = (...args) => console.log(...args);
    }

    if (!logger.setUiSink) {
        logger.setUiSink = (sink) => {
            // 攔截原本的 log 函式，加入 UI 輸出
            const originalLog = logger.log;
            logger.log = (...args) => {
                originalLog(...args); // 照常輸出到 console
                if (sink) sink(args); // 額外輸出到 UI
            };
        };
    }
})();

const logList = document.getElementById('log-list');
let globalGameState = null;
// 新增：記錄玩家上一狀態，用於比對數值變化
let lastPlayerStats = {}; 

// 日誌佇列系統變數
const logQueue = [];
let isLogProcessing = false;
// ✅ 修改：讀取 config.js
let currentLogSpeed = window.UI_CONFIG?.LOG_SPEED || 360;
let currentLogRetentionLimit = window.UI_CONFIG?.LOG_RETENTION_LIMIT || 200;
const LOG_ACCEL_THRESHOLD = window.UI_CONFIG?.LOG_ACCEL_THRESHOLD ?? 5;
const LOG_ACCEL_DELAY = window.UI_CONFIG?.LOG_ACCEL_DELAY ?? 30;
let isSkippingLogs = false; // 是否正在進行「瞬間顯示」
const modalFocusMap = new WeakMap();
const modalOpenOrder = [];

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
}

function closeTopModal() {
    const overlay = modalOpenOrder[modalOpenOrder.length - 1];
    if (overlay) closeModal(overlay);
}

// ✅ 保險：避免 GAME_CONFIG 未定義導致 UI 事件中斷
try {
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
} catch (_) {}

function enforceLogRetention(list) {
    if (!list) return;
    while (list.children.length > currentLogRetentionLimit) {
        list.removeChild(list.firstChild);
    }
}

function logToUI(message) {
    logQueue.push(message);
    processLogQueue();
}

// 核心函式：處理日誌佇列 (含動態變速與略過功能)
function processLogQueue() {
    if (isLogProcessing || logQueue.length === 0) {
        // 如果佇列空了，重置略過狀態，恢復正常速度
        if (logQueue.length === 0) {
            isSkippingLogs = false;
        }
        return;
    }
    isLogProcessing = true;
    
    const message = logQueue.shift();
    const list = document.getElementById('log-list');

    if (list) {
        const li = document.createElement('li');
        li.textContent = message;
        li.className = 'log-entry-new';
        
        // 如果正在略過模式，移除動畫 class 以便瞬間顯示
        if (isSkippingLogs) {
            li.style.animation = 'none';
            li.style.opacity = '1';
        }
        
        list.appendChild(li);
        enforceLogRetention(list);

        const logContainer = document.getElementById('game-log-container');
        if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }

    // 決定下一條訊息的延遲時間
    // 1. 如果開啟略過 (isSkippingLogs) -> 0ms (瞬間)
    // 2. 如果佇列堆積太多 -> 加速消化
    // 3. 否則 -> 使用滑桿設定的速度 (currentLogSpeed)
    let nextDelay = currentLogSpeed;
    if (isSkippingLogs) nextDelay = 0;
    else if (logQueue.length > LOG_ACCEL_THRESHOLD) nextDelay = LOG_ACCEL_DELAY;

    setTimeout(() => {
        isLogProcessing = false;
        processLogQueue();
    }, nextDelay);
}

function safeStringify(value) {
    if (typeof value !== 'object' || value === null) return String(value);
    try {
        return JSON.stringify(value);
    } catch (error) {
        return `[Unserializable: ${error?.message || 'unknown error'}]`;
    }
}

if (typeof appLogger.setUiSink === 'function') {
    appLogger.setUiSink((args) => {
        const message = args.map(arg => safeStringify(arg)).join(' ');
        logToUI(message);
    });
}


// 1. 錯誤監控
window.addEventListener("error", (e) => {
    try {
        appLogger.logToConsole("[JS Error]", e.message);
        const li = document.createElement('li');
        li.style.color = '#ff6b6b';
        li.textContent = `❌ 錯誤: ${e.message}`;
        if (logList) {
            logList.appendChild(li);
            enforceLogRetention(logList);
        }
    } catch (_) {}
});

// 2. 定義玩家顏色和變數
const uiState = {
    selectedCardValue: null,
    selectedCardValues: [],
    isSecondHandSelectingTwo: false
};

// ✅ 修改：優先使用 config.js 的設定，若無則使用預設值
const ROLE_COLORS = window.UI_CONFIG?.ROLE_COLORS || {
    '時魔': '#ff6b6b',
    '時之惡': '#feca57',
    '受詛者': '#54a0ff',
    '時針': '#ff9ff3',
    '分針': '#f368e0',
    '秒針': '#00d2d3'
};

// ==== 右側資訊面板（UI 狀態） ====
const UI_HISTORY_LIMIT = window.UI_CONFIG?.HISTORY_LIMIT || 12;
let uiMinuteHistory = {};
let uiLastRecordedTurnKey = null;
const minuteHistoryRenderCache = {
    order: [],
    rows: new Map(),
    historySignature: new Map()
};
// 追蹤目前輪數，用於偵測換輪時重置歷史
let uiTrackedGameRound = 1;

function resetMinuteHistory(gameState) {
    uiMinuteHistory = {};
    uiLastRecordedTurnKey = null;
    if (gameState && Array.isArray(gameState.players)) {
        gameState.players.forEach(p => { uiMinuteHistory[p.id] = []; });
    }
    const el = document.getElementById('player-history-list');
    if (el) el.innerHTML = '';
}

function recordMinuteHistoryIfNew(gameState, choices) {
    if (!gameState || !Array.isArray(choices) || choices.length === 0) return;
    const turnKey = gameState.uiMinuteChoicesTurnKey || `${gameState.gameRound}-${gameState.roundMarker}`;
    if (uiLastRecordedTurnKey === turnKey) return;
    uiLastRecordedTurnKey = turnKey;

    (gameState.players || []).forEach(p => {
        if (!uiMinuteHistory[p.id]) uiMinuteHistory[p.id] = [];
    });

    const playedSet = new Set();
    choices.forEach(c => {
        playedSet.add(c.playerId);
        const v = c?.card?.value;
        if (typeof v !== 'number') return;
        uiMinuteHistory[c.playerId].unshift(v);
        uiMinuteHistory[c.playerId] = uiMinuteHistory[c.playerId].slice(0, UI_HISTORY_LIMIT);
    });

    (gameState.players || []).forEach(p => {
        if (p.isEjected) return;
        if (!playedSet.has(p.id)) {
            uiMinuteHistory[p.id].unshift(null);
            uiMinuteHistory[p.id] = uiMinuteHistory[p.id].slice(0, UI_HISTORY_LIMIT);
        }
    });
}

function buildMinuteHistoryRow(player) {
    const row = document.createElement('div');
    row.className = 'player-history-row';
    row.dataset.playerId = player.id;

    const nameEl = document.createElement('span');
    nameEl.className = 'player-history-name';

    const cardsEl = document.createElement('div');
    cardsEl.className = 'player-history-cards';

    const chips = [];
    for (let i = 0; i < UI_HISTORY_LIMIT; i++) {
        const chip = document.createElement('span');
        chip.className = 'minute-chip empty';
        chip.textContent = '—';
        cardsEl.appendChild(chip);
        chips.push(chip);
    }

    row.appendChild(nameEl);
    row.appendChild(cardsEl);

    return { row, nameEl, chips };
}

function getMinuteHistorySignature(arr) {
    return arr.map(val => (val == null ? '—' : String(val))).join('|');
}

function renderMinuteHistory(gameState) {
    const list = document.getElementById('player-history-list');
    if (!list) return;

    const orderedPlayers = (gameState.players || []).slice().reverse();
    const orderedIds = orderedPlayers.map(player => player.id);
    const activeIds = new Set(orderedIds);

    for (const [playerId, entry] of minuteHistoryRenderCache.rows.entries()) {
        if (!activeIds.has(playerId)) {
            entry.row.remove();
            minuteHistoryRenderCache.rows.delete(playerId);
            minuteHistoryRenderCache.historySignature.delete(playerId);
        }
    }

    orderedPlayers.forEach(player => {
        let entry = minuteHistoryRenderCache.rows.get(player.id);
        if (!entry) {
            entry = buildMinuteHistoryRow(player);
            minuteHistoryRenderCache.rows.set(player.id, entry);
        }

        const roleKey = (player.roleCard && player.roleCard.includes('時魔')) ? '時魔' : player.roleCard;
        const color = ROLE_COLORS[roleKey] || '#ccc';
        if (entry.nameEl.textContent !== player.name) {
            entry.nameEl.textContent = player.name;
        }
        if (entry.nameEl.style.color !== color) {
            entry.nameEl.style.color = color;
        }

        const historyArr = uiMinuteHistory[player.id] || [];
        const signature = getMinuteHistorySignature(historyArr);
        if (minuteHistoryRenderCache.historySignature.get(player.id) !== signature) {
            for (let i = 0; i < UI_HISTORY_LIMIT; i++) {
                const val = historyArr[i];
                const chip = entry.chips[i];
                const isEmpty = val == null;
                const nextText = isEmpty ? '—' : String(val);
                if (chip.textContent !== nextText) {
                    chip.textContent = nextText;
                }
                chip.classList.toggle('empty', isEmpty);
            }
            minuteHistoryRenderCache.historySignature.set(player.id, signature);
        }
    });

    const fragment = document.createDocumentFragment();
    orderedIds.forEach(id => {
        const entry = minuteHistoryRenderCache.rows.get(id);
        if (entry) fragment.appendChild(entry.row);
    });
    list.appendChild(fragment);
    minuteHistoryRenderCache.order = orderedIds;
}

function resetRightPanels(gameState) {
    uiLastRecordedTurnKey = null;
    lastPlayerStats = {}; 
    for (const k of Object.keys(uiMinuteHistory)) delete uiMinuteHistory[k];
    minuteHistoryRenderCache.order = [];
    minuteHistoryRenderCache.rows.clear();
    minuteHistoryRenderCache.historySignature.clear();
    if (!gameState) return;
    gameState.players.forEach(p => { uiMinuteHistory[p.id] = []; });
    const histEl = document.getElementById('player-history-list');
    if (histEl) histEl.innerHTML = '';
}

// 3. 核心繪圖函式：主控台 (Orchestrator)
// ==========================================
function updateUI(gameState) {
    if (!gameState) return;
	
	// 檢查是否進入新的一輪 (例如從 第1輪 變 第2輪)
    // 若是，則清空右側的出牌歷史記錄
    if (gameState.gameRound > uiTrackedGameRound) {
        resetMinuteHistory(gameState);
        uiTrackedGameRound = gameState.gameRound;
        appLogger.log(`[UI] 檢測到新輪次 (Round ${uiTrackedGameRound})，已重置出牌歷史。`);
    }
	
    // 1. 準備共用變數
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : 'SM_1'));
    
    // 全域變數更新 (供事件使用)
    window.HUMAN_PLAYER_ID = humanId; 
    
    const humanPlayer = gameState.players.find(p => p.id === humanId);

    // 2. 計算等待狀態 (Flags)
    const flags = {
        isWaitingMinuteInput: gameState.currentRoundAIChoices !== null,
        isWaitingHourInput: !!gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId,
        isWaitingAbilityChoice: !!gameState.waitingAbilityChoice && gameState.waitingAbilityChoicePlayerId === humanId,
        isWaitingSecondFinalChoice: !!gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId,
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
    renderPlayedCardsPanel(gameState);             // A-2. 出牌列表與歷史
	renderScorePanel(gameState);                   // 呼叫積分榜渲染
    renderClockFace(gameState, flags);             // B. 鐘面 (含堆疊查看器)
    renderAIPlayers(gameState, humanId);           // C. AI 玩家 (含 ID for 漂浮文字)
    renderHumanPlayerArea(gameState, humanPlayer, flags); // D. 人類操作區 (手牌/數據)
    renderDrawnHourCards(gameState, flags);        // E. 中央小時卡
    renderEvolutionPanel(gameState, humanPlayer);  // F. 進化/能力/任務面板

    // 4. 特效處理
    processFloatingText(gameState); // 漂浮文字
    drawSinTargetLines(gameState);  // 時之惡紅線
}

// ==========================================
// 子函式群 (Sub-functions)
// ==========================================

// --- 更新「下一回合」按鈕狀態 ---
function updateNextStepButton(gameState, flags) {
    const nextStepBtn = document.getElementById('next-step-btn');
    if (!nextStepBtn) return;

    if (flags.gameEnded) {
        nextStepBtn.disabled = true;
        nextStepBtn.textContent = '遊戲結束';
    } 
	
	// 分針能力等待時，允許點擊按鈕 (視為略過)
    if (gameState.waitingMinuteHandChoice) {
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = "下一回合 (略過能力)";
        return; // 直接返回，不執行下方的 disable 邏輯
    }
		
	if (flags.isWaitingMinuteInput || flags.isWaitingHourInput || flags.isWaitingAbilityChoice || flags.isWaitingSecondFinalChoice) {
        nextStepBtn.disabled = true;
        if (flags.isWaitingHourInput) nextStepBtn.textContent = "請選擇小時卡...";
        else if (flags.isWaitingAbilityChoice) nextStepBtn.textContent = "請決定是否使用特殊能力...";
        else if (flags.isWaitingSecondFinalChoice) nextStepBtn.textContent = "請完成秒針二選一...";
        else nextStepBtn.textContent = "請出牌...";
    } else {
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = "下一回合";
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

// --- A-2. 出牌列表與歷史 ---
function renderPlayedCardsPanel(gameState) {
    const playedList = document.getElementById('played-cards-list');
    const choices = Array.isArray(gameState.currentMinuteChoices) ? gameState.currentMinuteChoices : [];

    // 記錄歷史
    recordMinuteHistoryIfNew(gameState, choices);
    renderMinuteHistory(gameState);

    if (playedList) {
        playedList.innerHTML = '';
        if (choices.length > 0) {
            const sortedChoices = [...choices].sort((a, b) => b.card.value - a.card.value);
            sortedChoices.forEach(choice => {
                const row = document.createElement('div');
                row.className = 'played-card-row';
                const displayValue = (choice.card.type === 'seconds_pending') ? '??' : choice.card.value;
                const roleKey = (choice.roleType && choice.roleType.includes('時魔')) ? '時魔' : choice.roleType;
                const color = ROLE_COLORS[roleKey] || '#ccc';

                row.innerHTML = `
                    <span class="p-name" style="color:${color}" title="${choice.playerName}">${choice.playerName}</span>
                    <span class="p-val">${displayValue}</span>
                `;
                playedList.appendChild(row);
            });
        } else {
            if (gameState.currentRoundAIChoices !== null) {
                playedList.innerHTML = `<div class="played-placeholder">（等待確認出牌）</div>`;
            } else {
                playedList.innerHTML = `<div class="played-placeholder">（未翻牌）</div>`;
            }
        }
    }
}

// ✅ 新增：渲染右側積分榜
function renderScorePanel(gameState) {
    const list = document.getElementById('score-list');
    if (!list) return;
    list.innerHTML = '';

    // 依分數高低排序 (高分在前)
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const maxScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : -999;

    sortedPlayers.forEach(p => {
        const row = document.createElement('div');
        row.className = 'score-row';
        
        // 若是最高分且分數 > 0，標記為領先者
        if (p.score === maxScore && p.score > 0) {
            row.classList.add('leader');
        }
        // 若被逐出，降低透明度
        if (p.isEjected) {
            row.style.opacity = '0.5';
            row.style.textDecoration = 'line-through';
        }

        const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
        // 使用 config 定義的顏色，若無則預設灰色
        const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey]) 
                      ? window.UI_CONFIG.ROLE_COLORS[roleKey] 
                      : '#ccc';

        row.innerHTML = `
            <span class="score-name" style="color:${color}">${p.name}</span>
            <span class="score-val">${p.score}</span>
        `;
        list.appendChild(row);
    });
}



// --- B. 鐘面繪製 (修改版：箭頭指向玩家) ---
function renderClockFace(gameState, flags) {
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

        // 浮標箭頭現在指向「人類玩家的位置」
        if (humanPos !== null && spot.position === humanPos) {
            spotEl.classList.add('active-round'); // 借用這個 class 來做高亮效果
            
            // 繪製箭頭
            const arrowEl = document.createElement('div');
            arrowEl.className = 'active-round-arrow';
            
			//const arrowRadius = 240;
            //const arrowX = centerX + arrowRadius * Math.cos(angleRad);
            //const arrowY = centerY + arrowRadius * Math.sin(angleRad);
			
			// ✅ 箭頭也改用百分比定位
            const arrowLeftPct = 50 + arrowRadiusPercent * Math.cos(angleRad);
            const arrowTopPct = 50 + arrowRadiusPercent * Math.sin(angleRad);
            
			//arrowEl.style.left = `${arrowX}px`;
            //arrowEl.style.top = `${arrowY}px`;
			
			arrowEl.style.left = `${arrowLeftPct}%`;
            arrowEl.style.top = `${arrowTopPct}%`;
            
			const rotation = angleDeg + 90;
            arrowEl.style.setProperty('--arrow-rotation', `${rotation}deg`);
            arrowEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
            clockFaceEl.appendChild(arrowEl);
        }

        // 卡牌顯示 (含 Stack Inspector)
        if (spot.cards.length > 0) {
            const topCard = spot.cards[spot.cards.length - 1];
            
            // 頂牌預覽
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-preview';
			
			// 若頂牌被鎖定，顯示鎖頭
            const lockDisplay = topCard.isLocked ? '<div style="font-size:0.6rem;">🔒</div>' : '';
			
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
                const lockIcon = card.isLocked ? '🔒' : '';// 鎖定圖示
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
                const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
                token.style.backgroundColor = ROLE_COLORS[roleKey] || '#ccc';
                tokensContainer.appendChild(token);
            }
        });
        spotEl.appendChild(tokensContainer);

        clockFaceEl.appendChild(spotEl);
    });
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

        // ✅ 新增：護盾可視化邏輯
        // 條件：是幼體時魔 + Mana >= 3 + 護盾未使用
        const isYoung = player.roleCard && player.roleCard.includes('幼');
        // 讀取 config 中的護盾消耗，預設為 3
        const shieldCost = (window.GAME_DATA?.ABILITY_COSTS?.YOUNG_SHIELD) || 3;
        
        if (isYoung && player.mana >= shieldCost && !player.shieldUsed && !player.isEjected) {
            const shieldEl = document.createElement('div');
            shieldEl.className = 'shield-indicator';
            shieldEl.textContent = '🛡️';
            shieldEl.title = `護盾就緒！(Mana ≥ ${shieldCost}，可抵擋傷害)`;
            pCard.appendChild(shieldEl);
        }

        const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
        const color = ROLE_COLORS[roleKey] || '#fff';
        
        let diceInfo = '';
        if (player.d6Die !== null) {
            diceInfo = `<div>護盾: <strong>${player.d6Die}</strong></div>`;
        }
        const posDisplay = player.isEjected ? '驅逐' : (player.currentClockPosition || '未上場');
		
		// ✅ 1. 新增：判斷頭像樣式 (Avatar Logic)
        let avatarClass = 'avatar-demon'; // 預設：幼體時魔
        if (player.type === '時之惡') avatarClass = 'avatar-sin';
        else if (player.type === '受詛者') avatarClass = 'avatar-scz';
        else if (player.roleCard === '時針') avatarClass = 'avatar-evo-hour';
        else if (player.roleCard === '分針') avatarClass = 'avatar-evo-min';
        else if (player.roleCard === '秒針') avatarClass = 'avatar-evo-sec';

        // 注意：這裡使用 += 附加內容，以免覆蓋掉剛加的 shieldEl
        // 但為了排版簡單，我們將內容包在一個 div 裡，或者直接 append HTML
        const contentDiv = document.createElement('div');
		
		// ✅ 2. 調整 HTML 結構，加入頭像 div
        // 注意：我們把原本 absolute定位的 role-badge 改為 static，讓它乖乖排在名字旁邊
        contentDiv.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:5px;">
                <div class="avatar-circle ${avatarClass}"></div>
                <div style="flex:1;">
                    <div class="role-badge" style="color:${color}; position:static; display:inline-block; margin-bottom:2px;">${player.roleCard}</div>
                    <h4 style="color:${color}; margin:0; font-size:1rem; line-height:1.2;">${player.name}</h4>
                </div>
            </div>

            <div class="player-stats">
                <div>手牌: ${player.hand.length}</div>
                <div>Mana / 齒輪: ${player.mana} / ${player.gearCards}</div>
                <div>分數: ${player.score}</div>
                ${diceInfo}
                <div>位置: ${posDisplay}</div>
                <div>收集小時卡: ${player.hourCards.length}</div>
            </div>
        `;
        pCard.appendChild(contentDiv);
        
        playersContainer.appendChild(pCard);
    });
}

// --- D. 人類操作區 ---
function renderHumanPlayerArea(gameState, humanPlayer, flags) {
    if (!humanPlayer) return;

    // 1. 更新數據
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    const humanRoleEl = document.getElementById('human-role-display');
    if (humanRoleEl) {
        // ✅ 新增：人類玩家護盾顯示
        const isYoung = humanPlayer.roleCard && humanPlayer.roleCard.includes('幼');
        const shieldCost = (window.GAME_DATA?.ABILITY_COSTS?.YOUNG_SHIELD) || 3;
        const hasShield = isYoung && humanPlayer.mana >= shieldCost && !humanPlayer.shieldUsed && !humanPlayer.isEjected;
        
        // 使用 innerHTML 插入圖示
        const shieldHtml = hasShield 
            ? `<span class="shield-indicator" title="護盾就緒！受到傷害時自動消耗 Mana 抵擋">🛡️</span>` 
            : '';
            
        humanRoleEl.innerHTML = `您是：${humanPlayer.roleCard} ${shieldHtml}`;
    }

    setText('h-hand-count', String(humanPlayer.hand.length));
    setText('h-mana', `${humanPlayer.mana} / ${humanPlayer.gearCards}`);
    setText('h-gear', String(humanPlayer.gearCards));
    setText('h-score', String(humanPlayer.score));
    setText('h-pos', humanPlayer.isEjected ? '驅逐' : String(humanPlayer.currentClockPosition || '未上場'));
    setText('h-hour', String(humanPlayer.hourCards.length));
    
    const diceEl = document.getElementById('h-dice');
    if (diceEl) diceEl.textContent = (humanPlayer.d6Die === null) ? '--' : String(humanPlayer.d6Die);

    // 2. 更新收集列表 (小時卡) - 帶有分類樣式
    const hourCollectionEl = document.getElementById('human-hour-collection');
    if (hourCollectionEl) {
        hourCollectionEl.innerHTML = '';
        const hourCards = humanPlayer.hourCards || [];
        if (hourCards.length === 0) {
            const ph = document.createElement('div');
            ph.className = 'hour-collection-placeholder';
            ph.textContent = '尚未收集';
            hourCollectionEl.appendChild(ph);
        } else {
            const groups = { '少年': [], '青年': [], '中年': [] };
            [...hourCards].sort((a, b) => a.number - b.number).forEach(card => {
                const g = card.ageGroup || '未知';
                if (!groups[g]) groups[g] = [];
                groups[g].push(`${card.number}${card.isPrecious ? '★' : ''}`);
            });
            ['少年', '青年', '中年'].forEach(label => {
                if (groups[label] && groups[label].length > 0) {
                    const row = document.createElement('div');
                    row.className = 'collection-text-row';
                    row.innerHTML = `<span class="col-label">${label}：</span><span class="col-values">${groups[label].join(', ')}</span>`;
                    hourCollectionEl.appendChild(row);
                }
            });
        }
    }

    // 3. 更新手牌 (分鐘卡)
    const humanHandEl = document.getElementById('human-hand');
    const confirmBtn = document.getElementById('confirm-move-btn');
    const actionHint = document.getElementById('action-hint');
    
    if (humanHandEl) {
        humanHandEl.innerHTML = '';
		const sortOrder = window.UI_CONFIG?.HAND_SORT_ORDER || 'asc'; //根據設定決定排序方向
        const sortedHand = [...humanPlayer.hand].sort((a, b) => a.value - b.value);

        sortedHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'minute-card';
            cardEl.setAttribute('data-value', card.value);
            cardEl.innerHTML = `<div>${card.value}</div><div class="card-gear">${card.gear}</div>`;

            if (flags.isWaitingMinuteInput) {
                cardEl.addEventListener('click', function() {
                    const v = card.value;
                    if (uiState.isSecondHandSelectingTwo) {
                        if (uiState.selectedCardValues.includes(v)) {
                            uiState.selectedCardValues = uiState.selectedCardValues.filter(x => x !== v);
                            this.classList.remove('selected');
                        } else {
                            if (uiState.selectedCardValues.length >= 2) return;
                            uiState.selectedCardValues.push(v);
                            this.classList.add('selected');
                        }
                        uiState.selectedCardValue = null;
                        confirmBtn.disabled = (uiState.selectedCardValues.length !== 2);
                    } else {
                        document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
                        this.classList.add('selected');
                        uiState.selectedCardValue = v;
                        uiState.selectedCardValues = [];
                        confirmBtn.disabled = false;
                    }
                });
            } else {
                cardEl.style.cursor = 'default';
                cardEl.style.opacity = '0.7';
            }

            if (!uiState.isSecondHandSelectingTwo && uiState.selectedCardValue === card.value) cardEl.classList.add('selected');
            if (uiState.isSecondHandSelectingTwo && uiState.selectedCardValues.includes(card.value)) cardEl.classList.add('selected');
            humanHandEl.appendChild(cardEl);
        });

        // 確認出牌按鈕狀態
        if (flags.isWaitingMinuteInput) {
            confirmBtn.disabled = uiState.isSecondHandSelectingTwo ? (uiState.selectedCardValues.length !== 2) : (uiState.selectedCardValue === null);
        } else {
            confirmBtn.disabled = true;
        }

        if (actionHint) {
            let hintText = '';
            if (flags.gameEnded) {
                hintText = '遊戲已結束，可查看盤面或重新開始。';
            } else if (flags.isWaitingSecondFinalChoice) {
                hintText = '請完成秒針二選一選擇。';
            } else if (flags.isWaitingAbilityChoice) {
                hintText = '請選擇是否使用特殊能力。';
            } else if (flags.isWaitingHourInput) {
                hintText = '請在鐘面選擇小時卡。';
            } else if (flags.isWaitingMinuteInput) {
                if (uiState.isSecondHandSelectingTwo) {
                    hintText = uiState.selectedCardValues.length < 2
                        ? '請選擇 2 張分鐘卡。'
                        : '已選擇 2 張卡牌，請確認出牌。';
                } else {
                    hintText = uiState.selectedCardValue === null
                        ? '請選擇 1 張分鐘卡。'
                        : '已選擇卡牌，請確認出牌。';
                }
            } else {
                hintText = '準備完成，點擊「下一回合」繼續遊戲。';
            }
            actionHint.textContent = hintText;
        }
    }

    // 4. 秒針能力按鈕與彈窗控制
    updateSecondHandControls(gameState, humanPlayer, flags);
}

// --- 秒針 UI 控制 (輔助函式) ---
function updateSecondHandControls(gameState, humanPlayer, flags) {
    const sWrap = document.getElementById('seconds-ability-controls');
    const sBtn = document.getElementById('seconds-ability-btn');
    const sCancel = document.getElementById('seconds-ability-cancel-btn');
    const sHint = document.getElementById('seconds-ability-hint');
    const overlay = document.getElementById('seconds-choice-overlay');

    const canUseSecondHand = window.GAME_CONFIG.enableAbilities && humanPlayer && humanPlayer.roleCard === '秒針' &&
        flags.isWaitingMinuteInput && !flags.isWaitingSecondFinalChoice && !gameState.gameEnded && !gameState.abilityMarker &&
        !humanPlayer.specialAbilityUsed && humanPlayer.mana >= 3 && humanPlayer.hand.length >= 2;

    if (sWrap) sWrap.style.display = (canUseSecondHand || uiState.isSecondHandSelectingTwo) ? 'block' : 'none';
    if (sBtn) {
        sBtn.style.display = (canUseSecondHand || uiState.isSecondHandSelectingTwo) ? 'inline-block' : 'none';
        sBtn.disabled = !canUseSecondHand || uiState.isSecondHandSelectingTwo;
    }
    if (sCancel) {
        sCancel.style.display = uiState.isSecondHandSelectingTwo ? 'inline-block' : 'none';
        sCancel.disabled = false;
    }
    if (sHint) sHint.style.display = uiState.isSecondHandSelectingTwo ? 'block' : 'none';

    // 二選一彈窗
    if (overlay) {
        if (flags.isWaitingSecondFinalChoice && gameState.secondHandPendingCards && gameState.secondHandPendingCards.length === 2) {
            const [a, b] = gameState.secondHandPendingCards;
            const btnA = document.getElementById('seconds-choice-a');
            const btnB = document.getElementById('seconds-choice-b');
            if (btnA) { btnA.textContent = String(a.value); btnA.dataset.value = String(a.value); }
            if (btnB) { btnB.textContent = String(b.value); btnB.dataset.value = String(b.value); }
            if (overlay.classList.contains('hidden')) {
                openModal(overlay, btnA || undefined);
            }
        } else if (!overlay.classList.contains('hidden')) {
            closeModal(overlay);
        }
    }
}

// --- E. 中央小時卡 ---
function renderDrawnHourCards(gameState, flags) {
    const clockCenterEl = document.querySelector('.clock-center');
    if (!clockCenterEl) return;
    clockCenterEl.innerHTML = '';

    if (flags.isWaitingHourInput) {
        const tipEl = document.createElement('div');
        tipEl.className = 'hour-choice-tip';
        tipEl.textContent = '👇 點擊卡牌 👇';
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
                cardEl.addEventListener('click', () => {
                    const idx = gameState.currentDrawnHourCards.indexOf(card);
                    handleHumanHourCardChoice(globalGameState, idx);
                });
            }
            clockCenterEl.appendChild(cardEl);
        });
    }
}

// --- F. 進化 / 能力 / 任務面板 ---
function renderEvolutionPanel(gameState, humanPlayer) {
    const progressArea = document.getElementById('evolution-progress-area');
    if (!progressArea) return;
    progressArea.innerHTML = '';

    if (!humanPlayer || humanPlayer.isEjected) return;

    // 1. 幼體時魔：顯示進化進度
    if (humanPlayer.type === '時魔' && humanPlayer.roleCard.includes('幼')) {
        renderYoungTimeDemonProgress(gameState, humanPlayer, progressArea);
    } 
    // 2. 已進化時魔：顯示能力按鈕
    else if (['時針', '分針', '秒針'].includes(humanPlayer.roleCard)) {
        renderEvolvedAbilityPanel(gameState, humanPlayer, progressArea);
    } 
    // 3. 時之惡：顯示抓人能力
    else if (humanPlayer.type === '時之惡') {
        renderSinAbilityPanel(gameState, humanPlayer, progressArea);
    }
    // 4. 受詛者：顯示任務監控
    else if (humanPlayer.type === '受詛者') {
        renderSczMissionPanel(gameState, humanPlayer, progressArea);
    }
}

// F-1. 幼體時魔
function renderYoungTimeDemonProgress(gameState, humanPlayer, container) {
    if (typeof window.checkEvolutionCondition === 'function') {
        const cards = humanPlayer.hourCards || [];
        const preciousCount = cards.filter(c => c.isPrecious).length;
        const uniqueAges = new Set(cards.map(c => c.ageGroup).filter(g => g)).size;
        const uniqueNumbers = new Set(cards.map(c => c.number)).size;
        const totalCount = cards.length;

        const cond1 = (uniqueAges >= 3 && preciousCount >= 1);
        const cond2 = (uniqueNumbers >= 4 && preciousCount >= 1);
        const cond3 = (totalCount >= 5 && preciousCount >= 2);
        const cond4 = (preciousCount >= 3);
        
        const isReady = cond1 || cond2 || cond3 || cond4;
        
        //過濾已被佔用的身份 ---
        // 1. 找出已被「其他存活玩家」佔用的身份
        const takenRoles = gameState.players
            .filter(p => p.id !== humanPlayer.id && !p.isEjected)
            .map(p => p.roleCard);

        // 2. 定義所有可能的身份
        const allRoles = ['時針', '分針', '秒針'];

        // 3. 決定當前目標 (若原目標已被搶走，嘗試切換到第一個可用的)
        let currentTarget = humanPlayer.targetRoleName || '時針';
        const availableRoles = allRoles.filter(r => !takenRoles.includes(r));
        
        // 如果當前選的已經被搶走了，且還有其他選擇，暫時顯示為第一個可用的 (視覺上)
        if (takenRoles.includes(currentTarget) && availableRoles.length > 0) {
            currentTarget = availableRoles[0];
            // 這裡可以選擇是否直接更新玩家狀態，建議讓 change 事件去觸發實際更新，
            // 但為了讓下方的 roleDescriptions 顯示正確，這裡先用 effective target。
        }

        // 4. 動態生成下拉選單 HTML
        let optionsHtml = '';
        allRoles.forEach(role => {
            // 如果該身份已被其他人佔用，就跳過 (不生成 option)
            if (takenRoles.includes(role)) return;

            const selected = (currentTarget === role) ? 'selected' : '';
            optionsHtml += `<option value="${role}" ${selected}>${role}</option>`;
        });

        // 若全部被搶光 (極端狀況)
        if (optionsHtml === '') {
            optionsHtml = `<option disabled selected>無可用身份</option>`;
        }
        
        // --- 修改結束 ---

        const roleDescriptions = {
            '時針': `<div style="color:#ff9ff3; margin-top:4px;">👁️預知牌頂 + ⚡1 Mana：牌頂移底</div>`,
            '分針': `<div style="color:#f368e0; margin-top:4px;">⚡2 Mana：移至下一個有小時卡的格子</div>`,
            '秒針': `<div style="color:#00d2d3; margin-top:4px;">⚡3 Mana：出牌二選一</div>`
        };

        // 將 optionsHtml 放入 select 中
        let html = `
            <div class="target-role-header">
                <label class="target-role-label">目標身份：</label>
                <select id="target-role-select" class="target-role-select">
                    ${optionsHtml}
                </select>
                <div style="font-size:0.8rem; line-height:1.4; color:#ddd;">${roleDescriptions[currentTarget] || ''}</div>
            </div>
            <div style="margin-top:10px;">
                ${renderConditionRow(cond1, `1. 時代 ${uniqueAges}/3, 珍貴 ${preciousCount}/1`)}
                ${renderConditionRow(cond2, `2. 數字 ${uniqueNumbers}/4, 珍貴 ${preciousCount}/1`)}
                ${renderConditionRow(cond3, `3. 總數 ${totalCount}/5, 珍貴 ${preciousCount}/2`)}
                ${renderConditionRow(cond4, `4. 珍貴 ${preciousCount}/3 (任意)`)}
            </div>
        `;
        if (isReady) {
            html += `<div style="margin-top:8px; color:#ffd27f; text-align:center; font-weight:bold; border:1px dashed #ffd27f; padding:4px;">✨ 條件達成！回合結束時進化</div>`;
        }
        container.innerHTML = html;

        const selectEl = document.getElementById('target-role-select');
        if (selectEl) {
            selectEl.addEventListener('change', (e) => {
                humanPlayer.targetRoleName = e.target.value;
                updateUI(globalGameState);
            });
            
            // 如果發現當前記憶的 targetRoleName 其實已經被隱藏了(不合法)，
            // 且 select 已經自動跳到第一個合法選項，我們需要同步更新回 humanPlayer
            // 這樣下一幀繪製時描述文字才會正確
            if (selectEl.value && selectEl.value !== humanPlayer.targetRoleName) {
                 humanPlayer.targetRoleName = selectEl.value;
                 // 不用急著 updateUI，等下次循環或玩家操作即可，
                 // 或是這裡可以手動呼叫一次 updateUI(globalGameState) 來即時刷新描述文字
            }
        }
    }
}

function renderConditionRow(isMet, text) {
    return `<div class="condition-row ${isMet ? 'met' : ''}"><div class="condition-icon"></div><div class="condition-text">${text}</div></div>`;
}

// F-2. 已進化時魔
function renderEvolvedAbilityPanel(gameState, humanPlayer, parent) {
    const role = humanPlayer.roleCard;
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:${ROLE_COLORS[role]}">${role}</div>`;

    // 1. 檢查封印狀態
    const isAbilityLocked = !!gameState.abilityMarker;

    // --- 時針 (Time Hand) ---
    if (role === '時針') {
        const baseCost = window.GAME_DATA?.ABILITY_COSTS?.TIME_HAND_MOVE || 1;
        
        // 顯示牌庫頂資訊
        const topCard = (Array.isArray(gameState.hourDeck) && gameState.hourDeck.length > 0) 
            ? gameState.hourDeck[gameState.hourDeck.length - 1] : null;
        
        let contentHtml = '';
        if (isAbilityLocked) {
            contentHtml = '<div style="color:#ff6b6b; font-weight:bold;">🚫 預知能力失效</div>';
        } else if (!topCard) {
            contentHtml = '<div style="color:#aaa;">(牌庫已空)</div>';
        } else {
            const star = topCard.isPrecious ? '<span style="color:#ffd27f; font-size:1.2rem;">★</span>' : '';
            contentHtml = `<div style="font-size:0.9rem; margin-bottom:6px; border-bottom:1px dashed #666; padding-bottom:4px; color:#fff;">👁️ 牌庫頂：<strong>${topCard.number}</strong> <span style="font-size:0.8rem; color:#ccc;">${topCard.ageGroup || ''}</span> ${star}</div>`;
        }

        const passiveContainer = document.createElement('div');
        passiveContainer.style.cssText = 'background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #555; text-align:center;';
        passiveContainer.innerHTML = contentHtml;
        container.appendChild(passiveContainer);

        // 按鈕邏輯
        const moveCount = humanPlayer.hourHandMoveCount || 0;
        const currentCost = (moveCount === 0) ? baseCost : 2;
        
        // 判斷是否可用 (增加 !isAbilityLocked 檢查)
        const canUse = !gameState.gameEnded && 
                       !isAbilityLocked &&
                       humanPlayer.mana >= currentCost && 
                       gameState.hourDeck.length > 0 &&
                       (!humanPlayer.specialAbilityUsed && moveCount < 2);

        const btn = document.createElement('button');
        btn.className = 'evo-btn';

        if (isAbilityLocked) {
            // ✅ 封鎖狀態樣式
            btn.innerHTML = `🚫 能力被封鎖`;
            btn.style.backgroundColor = '#555'; 
            btn.style.color = '#999';
            btn.disabled = true;
        } else {
            // 正常狀態
            btn.style.backgroundColor = '#ff9ff3';
            if (moveCount === 0) {
                 btn.innerHTML = `${currentCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>`;
            } else {
                 btn.innerHTML = `${currentCost} Mana<br><span style="font-size:0.8rem; font-weight:bold;">🔄 再移動一次 (剩1次)</span>`;
            }
            btn.disabled = !canUse;
            btn.onclick = () => {
                if (typeof hourHandMoveTopToBottom === 'function') {
                    hourHandMoveTopToBottom(globalGameState, humanPlayer.id);
                    updateUI(globalGameState);
                }
            };
        }
        container.appendChild(btn);

    // --- 分針 (Minute Hand) ---
    } else if (role === '分針') {
        const COST = window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE || 2;
        
        if (gameState.waitingMinuteHandChoice) {
            // 只有當觸發條件達成且未被封鎖時，才會進入此區塊 (邏輯由 game.js 控制)
            // 但為了保險，這裡也可以擋一下 UI
            if (isAbilityLocked) {
                container.innerHTML += `<div style="color:#ff6b6b">異常：封鎖狀態下不應顯示選擇面板。</div>`;
            } else {
                const desc = document.createElement('div');
                desc.className = 'evo-desc';
                desc.innerHTML = `<span style="color:#f368e0">⚡請選擇移動方向 (將跳至下一個有卡片的格子)：`;
                container.appendChild(desc);

                const btnGroup = document.createElement('div');
                btnGroup.style.display = 'flex';
                btnGroup.style.gap = '5px';
                const makeBtn = (txt, val, color) => {
                    const b = document.createElement('button');
                    b.className = 'evo-btn';
                    b.style.background = color;
                    b.textContent = txt;
                    b.onclick = () => handleHumanAbilityChoice(globalGameState, val);
                    return b;
                }
                btnGroup.appendChild(makeBtn('↺ 逆時針', 'ccw', '#00d2d3'));
                btnGroup.appendChild(makeBtn('↻ 順時針', 'cw', '#ff9ff3'));
                btnGroup.appendChild(makeBtn('略過', false, '#777'));
                container.appendChild(btnGroup);
            }
        } else {
            // 靜態描述 (被動觸發)
            const info = document.createElement('div');
            info.className = 'evo-desc';
            
            if (isAbilityLocked) {
                // ✅ 封鎖狀態提示
                info.innerHTML = `<span style="color:#888; text-decoration:line-through;">取得小時卡時，可消耗 ${COST} Mana 移動。</span><br><span style="color:#ff6b6b; font-weight:bold;">(🚫 本回合失效)</span>`;
            } else {
                info.innerHTML = `取得小時卡時，可消耗 ${COST} Mana 跳躍至順/逆時針下一個有卡片的格子。`;
            }
            container.appendChild(info);
        }

    // --- 秒針 (Second Hand) ---
    } else if (role === '秒針') {
        const COST = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT || 3;
        const isWaitingMinute = gameState.currentRoundAIChoices !== null; 
        const isWaitingFinal = !!gameState.waitingSecondHandFinalChoice; 

        // 判斷是否可用 (增加 !isAbilityLocked 檢查)
        const canUse = window.GAME_CONFIG.enableAbilities && 
                       !isAbilityLocked &&
                       isWaitingMinute && 
                       !isWaitingFinal && 
                       !humanPlayer.specialAbilityUsed && 
                       humanPlayer.mana >= COST && 
                       humanPlayer.hand.length >= 2;

        if (isWaitingFinal) {
            const desc = document.createElement('div');
            desc.className = 'evo-desc';
            desc.textContent = '請選擇一張牌...';
            container.appendChild(desc);
        } else {
            const btn = document.createElement('button');
            btn.className = 'evo-btn';

            if (isAbilityLocked) {
                // ✅ 封鎖狀態樣式
                btn.innerHTML = `🚫 能力被封鎖`;
                btn.style.backgroundColor = '#555';
                btn.style.color = '#999';
                btn.disabled = true;
            } else {
                // 正常 / 取消選擇狀態
                if (uiState.isSecondHandSelectingTwo) {
                    btn.style.backgroundColor = '#ff6b6b';
                    btn.style.color = '#fff';
                    btn.textContent = '取消選擇';
                    btn.onclick = () => { uiState.isSecondHandSelectingTwo = false; uiState.selectedCardValues = []; updateUI(globalGameState); };
                } else {
                    btn.style.backgroundColor = '#00d2d3';
                    btn.innerHTML = `${COST} Mana<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>`;
                    btn.disabled = !canUse;
                    btn.onclick = () => { uiState.isSecondHandSelectingTwo = true; uiState.selectedCardValue = null; uiState.selectedCardValues = []; updateUI(globalGameState); };
                }
            }
            container.appendChild(btn);
            
            if (uiState.isSecondHandSelectingTwo) {
                const hint = document.createElement('div');
                hint.className = 'evo-desc';
                hint.style.color = '#00d2d3';
                hint.textContent = '👆 請點擊上方 2 張手牌';
                container.appendChild(hint);
            }
        }
    }
    parent.appendChild(container);
}


// F-3. 時之惡 (已更新：新增封印按鈕)
function renderSinAbilityPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:#feca57">時之惡</div>`;

    // 1. 顯示當前規則狀態
    const currentMode = gameState.sinTargetingMode === 'sin' ? '距離最近 (已變更)' : '數值最大 (預設)';
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'font-size:0.85rem; color:#aaa; margin-bottom:8px;';
    statusDiv.innerHTML = `<span style="color:${gameState.sinTargetingMode === 'sin' ? '#ff6b6b' : '#fff'}">${currentMode}</span>`;
    container.appendChild(statusDiv);

    // 共用變數
    const canAct = window.GAME_CONFIG.enableAbilities && !gameState.gameEnded && !humanPlayer.specialAbilityUsed;
    
    // --- 按鈕 A：惡之牽引 (2 Mana) ---
    const pullCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_PULL || 2;
    const btnPull = document.createElement('button');
    btnPull.className = 'evo-btn';
    btnPull.style.marginBottom = '5px'; // 按鈕間距
    btnPull.style.backgroundColor = '#feca57';
    btnPull.style.color = '#000';

    if (humanPlayer.specialAbilityUsed) {
        btnPull.textContent = "本回合已發動能力";
        btnPull.disabled = true;
    } else if (humanPlayer.mana < pullCost) {
        btnPull.textContent = `Mana 不足 (${humanPlayer.mana}/${pullCost})`;
        btnPull.disabled = true;
    } else {
        btnPull.innerHTML = `${pullCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">改為懲罰「距離最近」者</span>`;
        btnPull.onclick = () => {
            if (typeof activateSinAbility === 'function') {
                const success = activateSinAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    container.appendChild(btnPull);

    // --- 按鈕 B：封鎖 (4 Mana) ---
	
    // 計算已進化數量
    //const evolvedCount = gameState.players.filter(p => 
    //    p.type === '時魔' && !p.isEjected && ['時針', '分針', '秒針'].includes(p.roleCard)
    //).length;
    
    const sealCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;
    const btnSeal = document.createElement('button');
    btnSeal.className = 'evo-btn';
    btnSeal.style.backgroundColor = '#ff6b6b'; // 紅色系，代表危險/封印
    btnSeal.style.color = '#fff';

    if (gameState.abilityMarker) {
        btnSeal.textContent = "🚫 全場能力已封印";
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.specialAbilityUsed) {
        btnSeal.textContent = "本回合已發動能力";
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.mana < sealCost) {
        btnSeal.textContent = `Mana 不足 (${humanPlayer.mana}/${sealCost})`;
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else {
        btnSeal.innerHTML = `${sealCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">本回合封印所有時魔技能</span>`;
        btnSeal.onclick = () => {
            if (typeof activateSinSealAbility === 'function') {
                const success = activateSinSealAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    container.appendChild(btnSeal);

    parent.appendChild(container);
}


// F-4. 受詛者專用面板：顯示「已固定」與「敵人持有」的珍貴卡
function renderSczMissionPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:#54a0ff">📊 珍貴卡分佈監控</div>`;

    // --- 區塊 1: 受詛者已固定 (Locked) ---
    const lockedCards = [];
	    // 定義已進化的角色名稱，用於排除
    const evolvedRoles = ['時針', '分針', '秒針'];
	
    gameState.clockFace.forEach(spot => {
        spot.cards.forEach(c => {
            if (c.isPrecious && c.isLocked) {
                lockedCards.push(c.number);
            }
        });
    });
    lockedCards.sort((a, b) => a - b);

    const lockedSection = document.createElement('div');
    lockedSection.style.cssText = 'background:rgba(84, 160, 255, 0.1); border:1px solid #54a0ff; border-radius:6px; padding:8px; margin-bottom:8px;';
    
    let lockedHtml = `<div style="color:#54a0ff; font-weight:bold; font-size:0.9rem; margin-bottom:5px;">🔒 已固定 (${lockedCards.length}/12)</div>`;
    if (lockedCards.length === 0) {
        lockedHtml += `<div style="color:#888; font-size:0.85rem;">尚未固定任何卡片</div>`;
    } else {
        lockedHtml += `<div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        lockedCards.forEach(num => {
            lockedHtml += `<span style="background:#54a0ff; color:#000; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.9rem;">${num}★</span>`;
        });
        lockedHtml += `</div>`;
    }
    lockedSection.innerHTML = lockedHtml;
    container.appendChild(lockedSection);


    // --- 區塊 2: 幼體時魔已收集 (Held by Young Demons) ---
    const enemyHoldings = [];

    gameState.players.forEach(p => {
        // 條件：是時魔 + 未被逐出
        if (p.type === '時魔' && !p.isEjected) {
            
            // 判定是否為幼體：
            // 1. roleCard 包含 '幼' (最準確)
            // 2. 或者 roleCard 不在已進化名單中 (防呆後備)
            const roleName = String(p.roleCard || '');
            const isYoung = roleName.includes('幼') || !evolvedRoles.includes(roleName);

            if (isYoung && Array.isArray(p.hourCards) && p.hourCards.length > 0) {
                // 篩選出該玩家持有的「珍貴」卡片
                const heldPrecious = p.hourCards
                    .filter(c => c && c.isPrecious)
                    .map(c => c.number);
                
                if (heldPrecious.length > 0) {
                    heldPrecious.sort((a, b) => a - b);
                    enemyHoldings.push({ name: p.name, cards: heldPrecious });
                }
            }
        }
    });

    const enemySection = document.createElement('div');
    enemySection.style.cssText = 'background:rgba(255, 107, 107, 0.1); border:1px solid #ff6b6b; border-radius:6px; padding:8px;';
    
    let enemyHtml = `<div style="color:#ff6b6b; font-weight:bold; font-size:0.9rem; margin-bottom:5px;">🎒 幼體時魔持有</div>`;
    
    if (enemyHoldings.length === 0) {
        enemyHtml += `<div style="color:#888; font-size:0.85rem;">目前無威脅 (或是持有卡皆非珍貴)</div>`;
    } else {
        enemyHoldings.forEach(item => {
            enemyHtml += `<div style="margin-top:4px; font-size:0.85rem; color:#ccc;">`;
            enemyHtml += `<span style="color:#fff;">${item.name}</span>: `;
            item.cards.forEach(num => {
                enemyHtml += `<span style="color:#ff6b6b; border:1px solid #ff6b6b; padding:0 3px; border-radius:3px; margin-left:3px;">${num}★</span>`;
            });
            enemyHtml += `</div>`;
        });
    }
    enemySection.innerHTML = enemyHtml;
    container.appendChild(enemySection);

    // --- 勝利提示 ---
    if (lockedCards.length >= 12) {
        const winMsg = document.createElement('div');
        winMsg.style.cssText = 'margin-top:8px; text-align:center; color:#ffd27f; font-weight:bold; animation: tipPulse 1s infinite;';
        winMsg.innerHTML = '🎉 條件達成！請繼續努力保護手中齒輪！';
        container.appendChild(winMsg);
    }

    parent.appendChild(container);
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
        });
    });
}

// 4. 綁定按鈕事件
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (modalOpenOrder.length > 0) {
            event.preventDefault();
            closeTopModal();
        }
    });
    try { appLogger.log('[UI] 已載入，等待開始遊戲。'); } catch (_) {}
	
	 setupTabNavigation('.tab-btn', '.tab-content', 'active', 'active-tab');

	// 4A. 出牌（分鐘卡）按鈕事件修正
    const confirmMoveBtn = document.getElementById('confirm-move-btn');
    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', () => {
            if (!globalGameState) {
                appLogger.log('請先按「開始遊戲」。');
                return;
            }
            
            // 檢查是否處於等待秒針最終選擇階段
            const waitingSecondFinal = !!globalGameState.waitingSecondHandFinalChoice && globalGameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;
            if (waitingSecondFinal) {
                appLogger.log('請先完成「秒針二選一」。');
                return;
            }

            // --- 分支 1：秒針能力 (選 2 張) ---
            if (uiState.isSecondHandSelectingTwo) {
                if (!Array.isArray(uiState.selectedCardValues) || uiState.selectedCardValues.length !== 2) {
                    appLogger.log('秒針能力：請先選擇 2 張分鐘卡！');
                    return;
                }
                if (typeof handleHumanSecondHandCommit !== 'function') {
                    console.error("找不到 handleHumanSecondHandCommit 函式");
                    return;
                }
                
                confirmMoveBtn.disabled = true;
                
                const ok = handleHumanSecondHandCommit(globalGameState, uiState.selectedCardValues);
                if (ok) {
                    document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
                    uiState.selectedCardValue = null;
                    uiState.selectedCardValues = [];
                    uiState.isSecondHandSelectingTwo = false;
                    
                    confirmMoveBtn.textContent = '本回合出牌';
                    updateUI(globalGameState);
                } else {
                    confirmMoveBtn.disabled = false;
                }
                return; // ✅ 秒針邏輯結束，直接返回
            }

            // --- 分支 2：一般出牌 (選 1 張) ---
            if (uiState.selectedCardValue === null) {
                appLogger.log('請先選擇一張分鐘卡！');
                return;
            }
            if (typeof handleHumanChoice !== 'function') {
                console.error("找不到 handleHumanChoice 函式");
                return;
            }
            
            confirmMoveBtn.disabled = true;
            const success = handleHumanChoice(globalGameState, uiState.selectedCardValue);
            
            if (success) {
                document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
                uiState.selectedCardValue = null;
                confirmMoveBtn.textContent = '本回合出牌';
                updateUI(globalGameState);
            } else {
                confirmMoveBtn.disabled = false;
            }
        });
    }

	// 秒針能力按鈕
	const secondsBtn = document.getElementById('seconds-ability-btn');
	const secondsCancelBtn = document.getElementById('seconds-ability-cancel-btn');
	if (secondsBtn) {
	  secondsBtn.addEventListener('click', () => {
		if (!globalGameState) return;
		uiState.isSecondHandSelectingTwo = true;
		uiState.selectedCardValue = null;
		uiState.selectedCardValues = [];
		updateUI(globalGameState);
	  });
	}
	if (secondsCancelBtn) {
	  secondsCancelBtn.addEventListener('click', () => {
		if (!globalGameState) return;
		uiState.isSecondHandSelectingTwo = false;
		uiState.selectedCardValues = [];
		uiState.selectedCardValue = null;
		updateUI(globalGameState);
	  });
	}

	// 秒針二選一
	const secChoiceA = document.getElementById('seconds-choice-a');
	const secChoiceB = document.getElementById('seconds-choice-b');
	function onPickSeconds(e) {
	  if (!globalGameState) return;
	  const v = Number(e.currentTarget.dataset.value);
	  handleHumanSecondHandFinalChoice(globalGameState, v);
	  updateUI(globalGameState);
	}
	if (secChoiceA) secChoiceA.addEventListener('click', onPickSeconds);
	if (secChoiceB) secChoiceB.addEventListener('click', onPickSeconds);

    // 人類分頁
    const humanTabButtons = document.querySelectorAll('.human-tab-btn');
    const humanTabPanels = document.querySelectorAll('.human-tab-panel');
    function switchHumanTab(targetId) {
        humanTabButtons.forEach(btn => btn.classList.remove('active'));
        humanTabPanels.forEach(panel => panel.classList.remove('active'));
        const activeBtn = document.querySelector(`.human-tab-btn[data-target="${targetId}"]`);
        const targetEl = document.getElementById(targetId);
        if (activeBtn) activeBtn.classList.add('active');
        if (targetEl) targetEl.classList.add('active');
    }
    humanTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            switchHumanTab(targetId);
        });
    });
	
	// 右側面板切換
    const btnPlayed = document.getElementById('btn-show-played');
    const btnScore = document.getElementById('btn-show-score');   // 新增
    const btnHistory = document.getElementById('btn-show-history');
    
    const panelPlayed = document.getElementById('played-cards-panel');
    const panelScore = document.getElementById('score-panel');    // 新增
    const panelHistory = document.getElementById('player-history-panel');

    // 統一的切換函式
    function switchSideTab(target) {
        // 1. 重置所有按鈕狀態
        [btnPlayed, btnScore, btnHistory].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // 2. 隱藏所有面板
        [panelPlayed, panelScore, panelHistory].forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // 3. 啟用目標
        if (target === 'played') {
            if (btnPlayed) btnPlayed.classList.add('active');
            if (panelPlayed) panelPlayed.style.display = 'block';
        } else if (target === 'score') {
            if (btnScore) btnScore.classList.add('active');
            if (panelScore) panelScore.style.display = 'block';
        } else if (target === 'history') {
            if (btnHistory) btnHistory.classList.add('active');
            if (panelHistory) panelHistory.style.display = 'block';
        }
    }

    // 綁定點擊事件
    if (btnPlayed) btnPlayed.addEventListener('click', () => switchSideTab('played'));
    if (btnScore) btnScore.addEventListener('click', () => switchSideTab('score'));
    if (btnHistory) btnHistory.addEventListener('click', () => switchSideTab('history'));


   // 開始遊戲與選角
    function getCurrentHumanPlayerId() {
        if (typeof window.getEffectiveHumanPlayerId === 'function') return window.getEffectiveHumanPlayerId();
        if (typeof window.HUMAN_PLAYER_ID !== 'undefined') return window.HUMAN_PLAYER_ID;
        return 'SM_1';
    }

    function bindNextStepButton() {
        const nextBtn = document.getElementById('next-step-btn');
        if (!nextBtn) return;
        nextBtn.disabled = false;
        nextBtn.textContent = "下一回合";
        nextBtn.onclick = () => {
            if (!globalGameState) return;
			
			// 若處於「分針能力選擇中」，點擊此按鈕等同於「略過」
            if (globalGameState.waitingMinuteHandChoice) {
                appLogger.log("【UI】玩家直接點擊下一回合，視為略過分針能力。");
                if (typeof handleHumanAbilityChoice === 'function') {
                    handleHumanAbilityChoice(globalGameState, 'skip');
                }
				// 略過後，若遊戲未結束，自動執行 startRound 進入下一回合
                // 這樣玩家就不需要再按一次按鈕了
                if (!globalGameState.gameEnded) {
                    startRound(globalGameState);
                    updateUI(globalGameState);
                }

                return; // 執行完略過後就結束，不繼續執行 startRound
            }
			
            const humanId = getCurrentHumanPlayerId();
            const waitingMinute = globalGameState.currentRoundAIChoices !== null;
            const waitingHour = !!globalGameState.waitingHourChoice && globalGameState.waitingHourChoicePlayerId === humanId;
            const waitingAbility = !!globalGameState.waitingAbilityChoice && globalGameState.waitingAbilityChoicePlayerId === humanId;
            const waitingSecondFinal = !!globalGameState.waitingSecondHandFinalChoice && globalGameState.waitingSecondHandFinalChoicePlayerId === humanId;

            if (uiState.isSecondHandSelectingTwo || waitingMinute || waitingHour || waitingAbility || waitingSecondFinal) {
                appLogger.log('【UI】仍在等待人類輸入，請先完成當前步驟。');
                updateUI(globalGameState);
                return;
            }

            if (!globalGameState.gameEnded) {
                startRound(globalGameState);
                updateUI(globalGameState);
				
            } else {
                appLogger.log("遊戲已結束。");
                nextBtn.disabled = true;
            }
        };
    }

    const startGameBtn = document.getElementById('start-game-btn');
    const roleOverlay = document.getElementById('role-choice-overlay');

    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
			try {
				window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
				const abilityToggleEl = document.getElementById('ability-toggle');
				const testToggleEl = document.getElementById('test-toggle');
				const cfgEnableAbilities = !!abilityToggleEl?.checked;
				const cfgTestMode = !!testToggleEl?.checked;
				window.GAME_CONFIG.enableAbilities = cfgEnableAbilities;
				window.GAME_CONFIG.testMode = cfgTestMode;
                if (typeof GAME_CONFIG !== 'undefined') {
                    GAME_CONFIG.enableAbilities = cfgEnableAbilities;
                    GAME_CONFIG.testMode = cfgTestMode;
                }

				const doInitialize = () => {
					const logListEl = document.getElementById('log-list');
					if (logListEl) logListEl.innerHTML = '';
					const initFn = (typeof window.initializeGame === 'function') ? window.initializeGame : (typeof initializeGame === 'function' ? initializeGame : null);
					if (!initFn) throw new ReferenceError('initializeGame is not defined');
					globalGameState = initFn();
					resetMinuteHistory(globalGameState);
					resetRightPanels(globalGameState);
                    uiTrackedGameRound = 1;// 重置輪數追蹤變數
					uiState.selectedCardValue = null;
					uiState.selectedCardValues = [];
					uiState.isSecondHandSelectingTwo = false;
					const humanId = getCurrentHumanPlayerId();
					const humanPlayer = globalGameState.players.find(p => p.id === humanId);
					if (humanPlayer) appLogger.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);
					updateUI(globalGameState);
					bindNextStepButton();
				};

				const roleOverlay = document.getElementById('role-choice-overlay');
				const btnTimeDemon = document.getElementById('role-choice-timeDemon');
				const btnSin = document.getElementById('role-choice-sin');
				const btnScz = document.getElementById('role-choice-scz');

					const startWithRole = (roleId) => {
						if (roleOverlay) closeModal(roleOverlay);
						if (typeof window.setHumanPlayerId === 'function') {
							window.setHumanPlayerId(roleId);
						} else {
						try { window.HUMAN_PLAYER_ID = roleId; } catch (_) {}
					}
					doInitialize();
				};

					if (roleOverlay && btnTimeDemon && btnSin && btnScz) {
						openModal(roleOverlay, btnTimeDemon);
						btnTimeDemon.onclick = () => startWithRole('SM_1');
						btnSin.onclick = () => startWithRole('sin');
						btnScz.onclick = () => startWithRole('SCZ');
					return;
				}
				startWithRole((typeof window.getEffectiveHumanPlayerId === 'function') ? window.getEffectiveHumanPlayerId() : 'SM_1');
			} catch (err) {
				appLogger.log('[UI] 開始遊戲時發生錯誤：', err);
			}
		});
		
		// ✅ 綁定「選擇角色」視窗的關閉按鈕事件
		const roleCloseBtn = document.getElementById('role-choice-close-btn');
		const roleOverlayEl = document.getElementById('role-choice-overlay');
		
			if (roleCloseBtn && roleOverlayEl) {
				roleCloseBtn.addEventListener('click', () => {
					closeModal(roleOverlayEl);
				});
			}
		
    }

    // 分針能力按鈕
    const btnMinCCW = document.getElementById('btn-minute-ccw');
    const btnMinCW = document.getElementById('btn-minute-cw');
    const btnMinSkip = document.getElementById('btn-minute-skip');
    if (btnMinCCW) btnMinCCW.addEventListener('click', () => { if (globalGameState) handleHumanAbilityChoice(globalGameState, 'ccw'); });
    if (btnMinCW) btnMinCW.addEventListener('click', () => { if (globalGameState) handleHumanAbilityChoice(globalGameState, 'cw'); });
    if (btnMinSkip) btnMinSkip.addEventListener('click', () => { if (globalGameState) handleHumanAbilityChoice(globalGameState, 'skip'); });

    // 時之惡能力按鈕
    const btnSinActivate = document.getElementById('btn-sin-activate');
    if (btnSinActivate) {
        btnSinActivate.addEventListener('click', () => {
            if (!globalGameState) return;
            const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'sin';
            if (typeof activateSinAbility === 'function') {
                const success = activateSinAbility(globalGameState, humanId);
                if (success) updateUI(globalGameState);
            }
        });
    }
	
    // ✅ 新增：日誌速度滑桿控制
    const speedSlider = document.getElementById('log-speed-slider');
    const speedValDisplay = document.getElementById('log-speed-value');
    
    if (speedSlider && speedValDisplay) {
        // 初始化滑桿位置
        speedSlider.value = currentLogSpeed;
        
        // 更新顯示文字輔助函式
        const updateSpeedText = (val) => {
            val = Number(val);
            let text = `${val} ms`;
            if (val === 0) text = "⚡ 瞬間 (0ms)";
            else if (val <= 100) text = "⏩ 極快";
            else if (val <= 300) text = "▶ 一般";
            else text = "🐢 慢速阅读";
            speedValDisplay.textContent = `${text} (${val}ms)`;
            
            // 如果滑桿被拖動，取消目前的略過狀態，改用新速度
            isSkippingLogs = false; 
            currentLogSpeed = val;
        };

        // 初始化文字
        updateSpeedText(currentLogSpeed);

        // 監聽滑動
        speedSlider.addEventListener('input', (e) => {
            updateSpeedText(e.target.value);
        });
		
		
		// ✅ 新增：手牌排序設定監聽
		const handSortRadios = document.querySelectorAll('input[name="hand-sort"]');
		if (handSortRadios.length > 0) {
			// 1. 初始化選取狀態
			const currentSort = window.UI_CONFIG?.HAND_SORT_ORDER || 'asc';
			handSortRadios.forEach(radio => {
				if (radio.value === currentSort) radio.checked = true;
				
				// 2. 監聽變更
				radio.addEventListener('change', (e) => {
					if (e.target.checked) {
						// 更新設定
						if (window.UI_CONFIG) window.UI_CONFIG.HAND_SORT_ORDER = e.target.value;
						
						appLogger.log(`[UI] 手牌排序已切換為: ${e.target.value}`);
						
						// 如果遊戲正在進行中，立即刷新 UI 以套用新排序
						if (globalGameState) {
							updateUI(globalGameState);
						}
					}
				});
			});
		}
    }

    // ✅ 新增：日誌保留量滑桿控制
    const retentionSlider = document.getElementById('log-retention-slider');
    const retentionValDisplay = document.getElementById('log-retention-value');

    if (retentionSlider && retentionValDisplay) {
        retentionSlider.value = currentLogRetentionLimit;

        const updateRetentionText = (val) => {
            const parsed = Math.max(1, Number(val));
            currentLogRetentionLimit = parsed;
            retentionValDisplay.textContent = `${parsed} 則`;
            enforceLogRetention(document.getElementById('log-list'));
        };

        updateRetentionText(currentLogRetentionLimit);

        retentionSlider.addEventListener('input', (e) => {
            updateRetentionText(e.target.value);
        });
    }

    // ✅ 新增：點擊日誌區域「瞬間顯示」
    const logContainer = document.getElementById('game-log-container');
    if (logContainer) {
        logContainer.addEventListener('click', () => {
            if (logQueue.length > 0) {
                // 開啟略過模式
                isSkippingLogs = true;
                // 若當前沒有在跑 (例如卡住)，手動推一下
                if (!isLogProcessing) processLogQueue();
            }
        });
        // 改變滑鼠游標提示可點擊
        logContainer.style.cursor = "pointer";
        logContainer.title = "點擊可瞬間顯示剩餘訊息";
    }

    // 已收集小時卡彈窗控制
    const btnViewCol = document.getElementById('btn-view-collection');
    const colOverlay = document.getElementById('collection-overlay');
    const colClose = document.getElementById('collection-close-btn');

    if (btnViewCol && colOverlay) {
        btnViewCol.addEventListener('click', () => {
            openModal(colOverlay, colClose || undefined);
        });
    }

    if (colClose && colOverlay) {
        colClose.addEventListener('click', () => {
            closeModal(colOverlay);
        });
    }

    // 點擊視窗外部也可以關閉 (選用)
    if (colOverlay) {
        colOverlay.addEventListener('click', (e) => {
            if (e.target === colOverlay) {
                closeModal(colOverlay);
            }
        });
    }
});

// --- 處理數值變動漂浮文字 (Mana / 齒輪 / 護盾) ---
function processFloatingText(gameState) {
    if (!gameState || !gameState.players) return;
    gameState.players.forEach(player => {
        const last = lastPlayerStats[player.id];
        if (last) {
            // 1. Mana 變動
            const manaDiff = player.mana - last.mana;
            if (manaDiff !== 0) {
                const text = (manaDiff > 0 ? '+' : '') + manaDiff + ' Mana';
                const color = manaDiff > 0 ? '#4cd137' : '#e17055';
                triggerFloat(player.id, text, color, 'mana');
            }
            // 2. 齒輪變動
            const gearDiff = player.gearCards - last.gearCards;
            if (gearDiff !== 0) {
                const text = (gearDiff > 0 ? '+' : '') + gearDiff + ' ⚙';
                const color = gearDiff > 0 ? '#00d2d3' : '#ff4757';
                triggerFloat(player.id, text, color, 'gear');
            }
            // ✅ 3. 新增：護盾變動 (與 Mana 特效一致)
            const currentShield = (typeof player.d6Die === 'number') ? player.d6Die : 0;
            const lastShield = (typeof last.d6Die === 'number') ? last.d6Die : 0;
            const shieldDiff = currentShield - lastShield;
            
            if (shieldDiff !== 0) {
                const text = (shieldDiff > 0 ? '+' : '') + shieldDiff + ' 🛡️';
                // 扣除時使用與 Mana 扣除相同的紅色 (#e17055)，增加時使用綠色
                const color = shieldDiff > 0 ? '#4cd137' : '#e17055'; 
                triggerFloat(player.id, text, color, 'shield');
            }
        }
        
        // 更新記錄
        lastPlayerStats[player.id] = { 
            mana: player.mana, 
            gearCards: player.gearCards,
            d6Die: (typeof player.d6Die === 'number') ? player.d6Die : 0
        };
    });
}

function triggerFloat(playerId, text, color, type) {
    let targetEl = null;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';

    if (playerId === humanId) {
        targetEl = (type === 'mana') ? document.getElementById('h-mana') : document.getElementById('h-gear');
        if (!targetEl) targetEl = document.querySelector('.human-top-bar');
    } else {
        targetEl = document.querySelector(`.player-card[data-id="${playerId}"]`);
    }
    if (targetEl) spawnFloatingText(targetEl, text, color);
}

function spawnFloatingText(targetEl, text, color) {
    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top;

    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${centerX}px`;
    el.style.top = `${topY}px`;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1800);
}

// --- 繪製時之惡索命紅線 ---
function drawSinTargetLines(gameState) {
    const svg = document.getElementById('connection-lines');
    if (!svg) return;
    svg.innerHTML = '';

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer || !sinPlayer.currentClockPosition) return;

    const mode = gameState.sinTargetingMode || 'default';
    if (mode !== 'sin') return;

    const sinPos = sinPlayer.currentClockPosition;
    const candidates = gameState.players.filter(p => (p.type === '時魔' || p.type === '受詛者') && !p.isEjected && p.currentClockPosition);
    if (candidates.length === 0) return;

    let minDist = 100;
    candidates.forEach(p => {
        const dist = getUIDistance(sinPos, p.currentClockPosition);
        if (dist < minDist) minDist = dist;
    });

    const radius = 190;
    const centerX = 250;
    const centerY = 250;
    const getCoords = (pos) => {
        const angleDeg = pos * 30 - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        return { x: centerX + radius * Math.cos(angleRad), y: centerY + radius * Math.sin(angleRad) };
    };
    const start = getCoords(sinPos);

    candidates.forEach(p => {
        if (getUIDistance(sinPos, p.currentClockPosition) === minDist) {
            const end = getCoords(p.currentClockPosition);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", start.x);
            line.setAttribute("y1", start.y);
            line.setAttribute("x2", end.x);
            line.setAttribute("y2", end.y);
            line.setAttribute("class", "sin-line");
            svg.appendChild(line);
        }
    });
}

function getUIDistance(pos1, pos2) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff);
}

function renderGameOverPanel(gameState) {
    const overlay = document.getElementById('game-over-overlay');
    const titleEl = document.getElementById('winner-title');
    const subEl = document.getElementById('winner-subtitle');
    const listEl = document.getElementById('game-over-ranking-list');
    
    if (!overlay || !listEl) return;

    // 1. 判斷陣營勝負 (邏輯與 game.js checkEjectionAndWinCondition 一致)
    const sinPlayer = gameState.players.find(p => p.type === '時之惡');
    const timeDemons = gameState.players.filter(p => p.type === '時魔');
    const aliveDemons = timeDemons.filter(p => !p.isEjected);
    // 檢查是否所有時魔都曾被逐出 (累積全滅)
    const allDemonsEverEjected = timeDemons.every(p => p.hasEverBeenEjected);

    let winnerText = "遊戲結束";
    let subText = "";
    let titleColor = "#fff";

    if (sinPlayer && sinPlayer.isEjected) {
        winnerText = "🎉 時魔陣營 獲勝！";
        subText = "時之惡已被逐出";
        titleColor = "#ff6b6b"; // 時魔紅
    } else if (aliveDemons.length === 0 || allDemonsEverEjected) {
        winnerText = "😈 時之惡陣營 獲勝！";
        subText = allDemonsEverEjected ? "完成「完全狩獵」(所有時魔皆曾被逐出)" : "時魔全數陣亡";
        titleColor = "#feca57"; // 時之惡黃
    } else {
        // 時間到 (回合數滿)
        winnerText = "⏳ 遊戲結束";
        subText = "結算最終積分";
    }

    if (titleEl) {
        titleEl.textContent = winnerText;
        titleEl.style.color = titleColor;
        titleEl.style.textShadow = `0 0 15px ${titleColor}`;
    }
    if (subEl) subEl.textContent = subText;

    // 2. 積分排序
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    // 3. 生成列表 HTML
    listEl.innerHTML = '';
    sortedPlayers.forEach((p, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.className = `rank-row rank-${rank}`;
        if (p.isEjected) row.classList.add('dead');

        // 獎牌圖示
        let medal = `#${rank}`;
        if (rank === 1) medal = '🥇';
        if (rank === 2) medal = '🥈';
        if (rank === 3) medal = '🥉';

        // 角色顏色
        const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
        const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey]) || '#ccc';

        row.innerHTML = `
            <div class="rank-medal">${medal}</div>
            <div style="text-align:left; color:${color}; font-weight:bold;">${p.name} ${p.isEjected ? '(💀)' : ''}</div>
            <div style="font-size:0.85rem; color:#aaa;">${p.roleCard}</div>
            <div style="font-family:monospace; font-size:1.2rem; font-weight:bold;">${p.score}</div>
        `;
        listEl.appendChild(row);
    });

    // 顯示視窗
    openModal(overlay, document.getElementById('btn-restart-game') || undefined);
}

// 綁定按鈕事件 (加在 DOMContentLoaded 內)
document.addEventListener('DOMContentLoaded', () => {

    // 綁定遊戲結束面板按鈕
    const btnRestart = document.getElementById('btn-restart-game');
    const btnCloseGO = document.getElementById('btn-close-gameover');
    const goOverlay = document.getElementById('game-over-overlay');

    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            // 重新整理頁面是最乾淨的重置方式
            location.reload(); 
        });
    }

    if (btnCloseGO && goOverlay) {
        btnCloseGO.addEventListener('click', () => {
            closeModal(goOverlay);
        });
    }
});
