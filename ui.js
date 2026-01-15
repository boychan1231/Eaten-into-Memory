// ui.js 
const originalLog = console.log;
const logList = document.getElementById('log-list');
let globalGameState = null;
// 新增：記錄玩家上一狀態，用於比對數值變化
let lastPlayerStats = {}; 

// 日誌佇列系統變數

const logQueue = [];
let isLogProcessing = false;
// ✅ 修改：讀取 config.js

let currentLogSpeed = window.UI_CONFIG?.LOG_SPEED || 360; 
let isSkippingLogs = false; // 是否正在進行「瞬間顯示」

// ✅ 保險：避免 GAME_CONFIG 未定義導致 UI 事件中斷
try {
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
} catch (_) {}

// 核心函式：處理日誌佇列
// ui.js (取代原本的 processLogQueue)

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

        const logContainer = document.getElementById('game-log-container');
        if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }

    // 決定下一條訊息的延遲時間
    // 1. 如果開啟略過 (isSkippingLogs) -> 0ms (瞬間)
    // 2. 如果佇列堆積太多 (>5) -> 30ms (加速消化)
    // 3. 否則 -> 使用滑桿設定的速度 (currentLogSpeed)
    let nextDelay = currentLogSpeed;
    if (isSkippingLogs) nextDelay = 0;
    else if (logQueue.length > 5) nextDelay = 30;

    setTimeout(() => {
        isLogProcessing = false;
        processLogQueue();
    }, nextDelay);
}

console.log = function(...args) {
    originalLog.apply(console, args); 
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    logQueue.push(message);
    processLogQueue();
};

// 1. 錯誤監控
window.addEventListener("error", (e) => {
    try {
        originalLog("[JS Error]", e.message);
        const li = document.createElement('li');
        li.style.color = '#ff6b6b';
        li.textContent = `❌ 錯誤: ${e.message}`;
        if (logList) logList.appendChild(li);
    } catch (_) {}
});

// 2. 定義玩家顏色和變數
let selectedCardValue = null;         
let selectedCardValues = [];          
let isSecondHandSelectingTwo = false; 

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

function renderMinuteHistory(gameState) {
    const list = document.getElementById('player-history-list');
    if (!list) return;
    list.innerHTML = '';

    const orderedPlayers = (gameState.players || []).slice().reverse();
    orderedPlayers.forEach(p => {
        const row = document.createElement('div');
        row.className = 'player-history-row';
        const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
        const color = ROLE_COLORS[roleKey] || '#ccc';

        const nameEl = document.createElement('span');
        nameEl.className = 'player-history-name';
        nameEl.style.color = color;
        nameEl.textContent = p.name;

        const cardsEl = document.createElement('div');
        cardsEl.className = 'player-history-cards';
        const arr = uiMinuteHistory[p.id] || [];
        for (let i = 0; i < UI_HISTORY_LIMIT; i++) {
            const val = arr[i];
            const chip = document.createElement('span');
            chip.className = 'minute-chip' + (val == null ? ' empty' : '');
            chip.textContent = (val == null ? '—' : String(val));
            cardsEl.appendChild(chip);
        }
        row.appendChild(nameEl);
        row.appendChild(cardsEl);
        list.appendChild(row);
    });
}

function resetRightPanels(gameState) {
    uiLastRecordedTurnKey = null;
    lastPlayerStats = {}; 
    for (const k of Object.keys(uiMinuteHistory)) delete uiMinuteHistory[k];
    if (!gameState) return;
    gameState.players.forEach(p => { uiMinuteHistory[p.id] = []; });
    const histEl = document.getElementById('player-history-list');
    if (histEl) histEl.innerHTML = '';
}

// ==========================================
// 3. 核心繪圖函式：主控台 (Orchestrator)
// ==========================================
function updateUI(gameState) {
    if (!gameState) return;
	
	// 檢查是否進入新的一輪 (例如從 第1輪 變 第2輪)
    // 若是，則清空右側的出牌歷史記錄
    if (gameState.gameRound > uiTrackedGameRound) {
        resetMinuteHistory(gameState);
        uiTrackedGameRound = gameState.gameRound;
        console.log(`[UI] 檢測到新輪次 (Round ${uiTrackedGameRound})，已重置出牌歷史。`);
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
    } else if (flags.isWaitingMinuteInput || flags.isWaitingHourInput || flags.isWaitingAbilityChoice || flags.isWaitingSecondFinalChoice) {
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
    const roundInfo = document.getElementById('round-info');
    if (roundInfo) roundInfo.textContent = `第 ${gameState.gameRound} 輪`;
    
    // 將回合數顯示在側邊欄的新位置
    const roundMarkerEl = document.getElementById('round-count-num');
    if (roundMarkerEl) roundMarkerEl.textContent = gameState.roundMarker;
    
    const deckNumEl = document.getElementById('deck-count-num');
    if (deckNumEl) deckNumEl.textContent = gameState.hourDeck.length;
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


// --- B. 鐘面繪製 (含 Stack Inspector) ---
// ui.js

// --- B. 鐘面繪製 (修改版：箭頭指向玩家) ---
function renderClockFace(gameState, flags) {
    const radius = 190;
    const centerX = 250;
    const centerY = 250;
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
        const x = centerX + radius * Math.cos(angleRad);
        const y = centerY + radius * Math.sin(angleRad);

        const spotEl = document.createElement('div');
        spotEl.className = 'clock-spot';
        spotEl.style.left = `${x}px`;
        spotEl.style.top = `${y}px`;

        // ✅ 修改：浮標箭頭現在指向「人類玩家的位置」
        if (humanPos !== null && spot.position === humanPos) {
            spotEl.classList.add('active-round'); // 借用這個 class 來做高亮效果
            
            // 繪製箭頭
            const arrowEl = document.createElement('div');
            arrowEl.className = 'active-round-arrow';
            const arrowRadius = 240;
            const arrowX = centerX + arrowRadius * Math.cos(angleRad);
            const arrowY = centerY + arrowRadius * Math.sin(angleRad);
            arrowEl.style.left = `${arrowX}px`;
            arrowEl.style.top = `${arrowY}px`;
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
                const prefix = isTop ? '🔝 ' : '';
                const star = card.isPrecious ? '★' : '';
                const age = card.ageGroup ? `<span class="age-tag">(${card.ageGroup})</span>` : '';
                item.innerHTML = `${prefix}${card.number}${star}${age}`;
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
    
    if (humanHandEl) {
        humanHandEl.innerHTML = '';
        const sortedHand = [...humanPlayer.hand].sort((a, b) => a.value - b.value);

        sortedHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'minute-card';
            cardEl.setAttribute('data-value', card.value);
            cardEl.innerHTML = `<div>${card.value}</div><div class="card-gear">${card.gear}</div>`;

            if (flags.isWaitingMinuteInput) {
                cardEl.addEventListener('click', function() {
                    const v = card.value;
                    if (isSecondHandSelectingTwo) {
                        if (selectedCardValues.includes(v)) {
                            selectedCardValues = selectedCardValues.filter(x => x !== v);
                            this.classList.remove('selected');
                        } else {
                            if (selectedCardValues.length >= 2) return;
                            selectedCardValues.push(v);
                            this.classList.add('selected');
                        }
                        selectedCardValue = null;
                        confirmBtn.disabled = (selectedCardValues.length !== 2);
                    } else {
                        document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedCardValue = v;
                        selectedCardValues = [];
                        confirmBtn.disabled = false;
                    }
                });
            } else {
                cardEl.style.cursor = 'default';
                cardEl.style.opacity = '0.7';
            }

            if (!isSecondHandSelectingTwo && selectedCardValue === card.value) cardEl.classList.add('selected');
            if (isSecondHandSelectingTwo && selectedCardValues.includes(card.value)) cardEl.classList.add('selected');
            humanHandEl.appendChild(cardEl);
        });

        // 確認出牌按鈕狀態
        if (flags.isWaitingMinuteInput) {
            confirmBtn.disabled = isSecondHandSelectingTwo ? (selectedCardValues.length !== 2) : (selectedCardValue === null);
        } else {
            confirmBtn.disabled = true;
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

    if (sWrap) sWrap.style.display = (canUseSecondHand || isSecondHandSelectingTwo) ? 'block' : 'none';
    if (sBtn) {
        sBtn.style.display = (canUseSecondHand || isSecondHandSelectingTwo) ? 'inline-block' : 'none';
        sBtn.disabled = !canUseSecondHand || isSecondHandSelectingTwo;
    }
    if (sCancel) {
        sCancel.style.display = isSecondHandSelectingTwo ? 'inline-block' : 'none';
        sCancel.disabled = false;
    }
    if (sHint) sHint.style.display = isSecondHandSelectingTwo ? 'block' : 'none';

    // 二選一彈窗
    if (overlay) {
        if (flags.isWaitingSecondFinalChoice && gameState.secondHandPendingCards && gameState.secondHandPendingCards.length === 2) {
            overlay.style.display = 'flex';
            const [a, b] = gameState.secondHandPendingCards;
            const btnA = document.getElementById('seconds-choice-a');
            const btnB = document.getElementById('seconds-choice-b');
            if (btnA) { btnA.textContent = String(a.value); btnA.dataset.value = String(a.value); }
            if (btnB) { btnB.textContent = String(b.value); btnB.dataset.value = String(b.value); }
        } else {
            overlay.style.display = 'none';
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
		
        const isReady = cond1 || cond2 || cond3|| cond4;
		
        const currentTarget = humanPlayer.targetRoleName || '時針';

        const roleDescriptions = {
            '時針': `<div style="color:#ff9ff3; margin-top:4px;">👁️預知牌頂 + ⚡1 Mana：牌頂移底</div>`,
            '分針': `<div style="color:#f368e0; margin-top:4px;">⚡2 Mana：取卡後移動 1 格</div>`,
            '秒針': `<div style="color:#00d2d3; margin-top:4px;">⚡3 Mana：出牌二選一</div>`
        };

        let html = `
            <div class="target-role-header">
                <label class="target-role-label">目標身份：</label>
                <select id="target-role-select" class="target-role-select">
                    <option value="時針" ${currentTarget === '時針' ? 'selected' : ''}>時針</option>
                    <option value="分針" ${currentTarget === '分針' ? 'selected' : ''}>分針</option>
                    <option value="秒針" ${currentTarget === '秒針' ? 'selected' : ''}>秒針</option>
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

    if (role === '時針') {
		const baseCost = window.GAME_DATA?.ABILITY_COSTS?.TIME_HAND_MOVE || 1;
        
        // --- 預知牌頂 (保持原本代碼不變) ---
        const topCard = (Array.isArray(gameState.hourDeck) && gameState.hourDeck.length > 0) 
            ? gameState.hourDeck[gameState.hourDeck.length - 1] : null;
        // ... (預知顯示代碼省略，保持不變) ...
        // ... (passiveContainer 代碼省略，保持不變) ...

        // --- ✅ 修改：主動技能按鈕邏輯 ---
        
        // 1. 取得當前使用次數與對應消耗
        const moveCount = humanPlayer.hourHandMoveCount || 0;
        const currentCost = (moveCount === 0) ? baseCost : 2;

        // 2. 判斷是否可用 (未封印 + Mana夠 + 牌庫有牌 + (沒用過 OR 只用過1次))
        const isAbilityLocked = !!gameState.abilityMarker; // 被時之惡封印
        const canUse = !gameState.gameEnded && 
                       !isAbilityLocked &&
                       humanPlayer.mana >= currentCost && 
                       gameState.hourDeck.length > 0 &&
                       (!humanPlayer.specialAbilityUsed && moveCount < 2);

        const btn = document.createElement('button');
        btn.className = 'evo-btn';
        btn.style.backgroundColor = '#ff9ff3';
        
        // 3. 動態按鈕文字
        let btnHtml = "";
        if (isAbilityLocked) {
             btnHtml = `🚫 能力被封鎖`;
        } else if (moveCount === 0) {
             btnHtml = `${currentCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>`;
        } else {
             btnHtml = `${currentCost} Mana<br><span style="font-size:0.8rem; font-weight:bold;">🔄 再移動一次 (剩1次)</span>`;
        }

        btn.innerHTML = btnHtml;
        btn.disabled = !canUse;
        
        btn.onclick = () => {
            if (typeof hourHandMoveTopToBottom === 'function') {
                hourHandMoveTopToBottom(globalGameState, humanPlayer.id);
                updateUI(globalGameState); // 更新 UI 以顯示新狀態(變為2Mana按鈕)
            }
        };
        container.appendChild(btn);

    } else if (role === '分針') {
		const COST = window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE || 2;
        if (gameState.waitingMinuteHandChoice) {
            const desc = document.createElement('div');
            desc.className = 'evo-desc';
            desc.innerHTML = `<span style="color:#f368e0">⚡請選擇移動方向：`;
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
        } else {
            const info = document.createElement('div');
            info.className = 'evo-desc';
            info.innerHTML = `取得小時卡時，可消耗 ${COST} Mana 移動一步。`;
            container.appendChild(info);
        }

    } else if (role === '秒針') {
		const COST = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT || 3;
        const isWaitingMinute = gameState.currentRoundAIChoices !== null; 
        const isWaitingFinal = !!gameState.waitingSecondHandFinalChoice; 
        const canUse = window.GAME_CONFIG.enableAbilities && isWaitingMinute && !isWaitingFinal && 
                       !humanPlayer.specialAbilityUsed && humanPlayer.mana >= COST && humanPlayer.hand.length >= 2;

        if (isWaitingFinal) {
            const desc = document.createElement('div');
            desc.className = 'evo-desc';
            desc.textContent = '請選擇一張牌...';
            container.appendChild(desc);
        } else {
            const btn = document.createElement('button');
            btn.className = 'evo-btn';
            btn.style.backgroundColor = '#00d2d3';
            btn.innerHTML = `${COST} Mana<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>`;
            if (isSecondHandSelectingTwo) {
                btn.style.backgroundColor = '#ff6b6b';
                btn.style.color = '#fff';
                btn.textContent = '取消選擇';
                btn.onclick = () => { isSecondHandSelectingTwo = false; selectedCardValues = []; updateUI(globalGameState); };
            } else {
                btn.disabled = !canUse;
                btn.onclick = () => { isSecondHandSelectingTwo = true; selectedCardValue = null; selectedCardValues = []; updateUI(globalGameState); };
            }
            container.appendChild(btn);
            if (isSecondHandSelectingTwo) {
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

    // --- 按鈕 B：時間凍結/封印 (4 Mana) ---
	
    // 計算已進化數量
    //const evolvedCount = gameState.players.filter(p => 
    //    p.type === '時魔' && !p.isEjected && ['時針', '分針', '秒針'].includes(p.roleCard)
    //).length;
    
    const sealCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 4;
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
    } 
	//else if (evolvedCount < 2) {
    //    btnSeal.innerHTML = `時間凍結 (鎖)<br><span style="font-size:0.75rem; font-weight:normal;">需場上 2 名進化時魔 (目前 ${evolvedCount})</span>`;
    //    btnSeal.disabled = true;
    //    btnSeal.style.backgroundColor = '#444';
    //    btnSeal.style.color = '#888';} 
	else if (humanPlayer.mana < sealCost) {
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

// F-4. 受詛者
function renderSczMissionPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:#54a0ff">⚠️ 珍貴卡流失監控</div>`;

    const theftList = document.createElement('div');
    theftList.style.textAlign = 'left';
    theftList.style.marginTop = '8px';
    
    let totalStolenCount = 0;
    const timeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);

    timeDemons.forEach(demon => {
        const heldPrecious = (demon.hourCards || []).filter(c => c.isPrecious);
        if (heldPrecious.length > 0) {
            totalStolenCount += heldPrecious.length;
            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;';
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'font-size:0.85rem; color:#ccc; margin-bottom:2px;';
            nameDiv.textContent = `${demon.name} (${heldPrecious.length}張)`;
            const cardsDiv = document.createElement('div');
            cardsDiv.innerHTML = heldPrecious.map(c => 
                `<span style="display:inline-block; background:rgba(255, 210, 127, 0.1); border:1px solid #ffd27f; color:#ffd27f; border-radius:3px; padding:0 4px; margin-right:4px; font-weight:bold; font-size:0.85rem;">${c.number}★</span>`
            ).join('');
            row.appendChild(nameDiv);
            row.appendChild(cardsDiv);
            theftList.appendChild(row);
        }
    });

    if (totalStolenCount === 0) {
        theftList.innerHTML = `<div style="text-align:center; padding:15px 0; color:#4cd137;"><div style="font-size:1.5rem; margin-bottom:5px;">🛡️</div><div style="font-size:0.9rem;">目前無珍貴卡遺失</div></div>`;
    }
    container.appendChild(theftList);
    
    if (totalStolenCount > 0) {
        const summary = document.createElement('div');
        summary.className = 'evo-desc';
        summary.style.color = '#ff6b6b';
        summary.style.marginTop = '5px';
        summary.style.textAlign = 'center';
        summary.textContent = `⚠️ 共計遺失 ${totalStolenCount} 張珍貴卡`;
        container.appendChild(summary);
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
    try { console.log('[UI] 已載入，等待開始遊戲。'); } catch (_) {}
	
	 setupTabNavigation('.tab-btn', '.tab-content', 'active', 'active-tab');

	// 4A. 出牌（分鐘卡）
	const confirmMoveBtn = document.getElementById('confirm-move-btn');
	if (confirmMoveBtn) {
		confirmMoveBtn.addEventListener('click', () => {
			if (!globalGameState) {
				console.log('請先按「開始遊戲」。');
				return;
			}
			const waitingSecondFinal = !!globalGameState.waitingSecondHandFinalChoice && globalGameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;
			if (waitingSecondFinal) {
				console.log('請先完成「秒針二選一」。');
				return;
			}
			// 秒針選 2 張
			if (isSecondHandSelectingTwo) {
				if (!Array.isArray(selectedCardValues) || selectedCardValues.length !== 2) {
					console.log('秒針能力：請先選擇 2 張分鐘卡！');
					return;
				}
				if (typeof handleHumanSecondHandCommit !== 'function') {
					console.error("找不到 handleHumanSecondHandCommit 函式");
					return;
				}
				confirmMoveBtn.disabled = true;
				const ok = handleHumanSecondHandCommit(globalGameState, selectedCardValues);
				if (ok) {
					document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
					selectedCardValue = null;
					selectedCardValues = [];
					isSecondHandSelectingTwo = false;
					confirmMoveBtn.textContent = '本回合出牌';
					updateUI(globalGameState);
				} else {
					confirmMoveBtn.disabled = false;
				}
				return;
			}
			// 一般出牌
			if (selectedCardValue === null) {
				console.log('請先選擇一張分鐘卡！');
				return;
			}
			if (typeof handleHumanChoice !== 'function') {
				console.error("找不到 handleHumanChoice 函式");
				return;
			}
			confirmMoveBtn.disabled = true;
			const success = handleHumanChoice(globalGameState, selectedCardValue);
			if (success) {
				document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
				selectedCardValue = null;
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
		isSecondHandSelectingTwo = true;
		selectedCardValue = null;
		selectedCardValues = [];
		updateUI(globalGameState);
	  });
	}
	if (secondsCancelBtn) {
	  secondsCancelBtn.addEventListener('click', () => {
		if (!globalGameState) return;
		isSecondHandSelectingTwo = false;
		selectedCardValues = [];
		selectedCardValue = null;
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
            const humanId = getCurrentHumanPlayerId();
            const waitingMinute = globalGameState.currentRoundAIChoices !== null;
            const waitingHour = !!globalGameState.waitingHourChoice && globalGameState.waitingHourChoicePlayerId === humanId;
            const waitingAbility = !!globalGameState.waitingAbilityChoice && globalGameState.waitingAbilityChoicePlayerId === humanId;
            const waitingSecondFinal = !!globalGameState.waitingSecondHandFinalChoice && globalGameState.waitingSecondHandFinalChoicePlayerId === humanId;

            if (isSecondHandSelectingTwo || waitingMinute || waitingHour || waitingAbility || waitingSecondFinal) {
                console.log('【UI】仍在等待人類輸入，請先完成當前步驟。');
                updateUI(globalGameState);
                return;
            }

            if (!globalGameState.gameEnded) {
                startRound(globalGameState);
                updateUI(globalGameState);
            } else {
                console.log("遊戲已結束。");
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
					selectedCardValue = null;
					selectedCardValues = [];
					isSecondHandSelectingTwo = false;
					const humanId = getCurrentHumanPlayerId();
					const humanPlayer = globalGameState.players.find(p => p.id === humanId);
					if (humanPlayer) console.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);
					updateUI(globalGameState);
					bindNextStepButton();
				};

				const roleOverlay = document.getElementById('role-choice-overlay');
				const btnTimeDemon = document.getElementById('role-choice-timeDemon');
				const btnSin = document.getElementById('role-choice-sin');
				const btnScz = document.getElementById('role-choice-scz');

				const startWithRole = (roleId) => {
					if (roleOverlay) roleOverlay.style.display = 'none';
					if (typeof window.setHumanPlayerId === 'function') {
						window.setHumanPlayerId(roleId);
					} else {
						try { window.HUMAN_PLAYER_ID = roleId; } catch (_) {}
					}
					doInitialize();
				};

				if (roleOverlay && btnTimeDemon && btnSin && btnScz) {
					roleOverlay.style.display = 'flex';
					btnTimeDemon.onclick = () => startWithRole('SM_1');
					btnSin.onclick = () => startWithRole('sin');
					btnScz.onclick = () => startWithRole('SCZ');
					return;
				}
				startWithRole((typeof window.getEffectiveHumanPlayerId === 'function') ? window.getEffectiveHumanPlayerId() : 'SM_1');
			} catch (err) {
				console.log('[UI] 開始遊戲時發生錯誤：', err);
			}
		});
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
});

// --- 處理數值變動漂浮文字 ---
function processFloatingText(gameState) {
    if (!gameState || !gameState.players) return;
    gameState.players.forEach(player => {
        const last = lastPlayerStats[player.id];
        if (last) {
            const manaDiff = player.mana - last.mana;
            if (manaDiff !== 0) {
                const text = (manaDiff > 0 ? '+' : '') + manaDiff + ' Mana';
                const color = manaDiff > 0 ? '#4cd137' : '#e17055';
                triggerFloat(player.id, text, color, 'mana');
            }
            const gearDiff = player.gearCards - last.gearCards;
            if (gearDiff !== 0) {
                const text = (gearDiff > 0 ? '+' : '') + gearDiff + ' ⚙';
                const color = gearDiff > 0 ? '#00d2d3' : '#ff4757';
                triggerFloat(player.id, text, color, 'gear');
            }
        }
        lastPlayerStats[player.id] = { mana: player.mana, gearCards: player.gearCards };
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