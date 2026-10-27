
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
    } catch (_) { }
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

let uiTrackedGameRound = 1;// 追蹤目前輪數，用於偵測換輪時重置歷史
let uiTokenMemory = {}; // 用來記憶棋子動畫的時間戳記


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

    // ✅ 修正：如果遊戲正處於「等待秒針最終選擇」階段，代表出牌清單還不完整，先不要寫入歷史記錄。
    // 等到秒針選定最後一張牌時，才會將完整的紀錄寫入。
    if (gameState.waitingSecondHandFinalChoice) return;

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
        //appLogger.log(`[UI] 檢測到新輪次 (Round ${uiTrackedGameRound})，已重置出牌歷史。`);
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
    const flags = {
        isWaitingMinuteInput: gameState.currentRoundAIChoices !== null,
        isWaitingHourInput: !!gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId,
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

    // 5. 🎓 新手教學模式：自動調度動態引導與高亮指標
    if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function') {
        window.TutorialModeManager.updateTutorialPointers(gameState);
    }

    // 6. 🎨 PixiJS 畫布渲染器同步更新 (若當前頁面有 Pixi 渲染器)
    if (window.PixiClockRenderer && typeof window.PixiClockRenderer.render === 'function') {
        window.PixiClockRenderer.render(gameState);
    }
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
        return;
    }

    // 分針能力等待時，允許點擊按鈕 (視為略過)
    if (gameState.waitingMinuteHandChoice) {
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = "下一回合 (略過能力)";
        return; // 直接返回，不執行下方的 disable 邏輯
    }

    if (flags.isWaitingMinuteInput || flags.isWaitingHourInput || flags.isWaitingAbilityChoice || flags.isWaitingSecondFinalChoice || flags.isPlayingMinuteClash) {
        nextStepBtn.disabled = true;
        if (flags.isPlayingMinuteClash) nextStepBtn.textContent = "比較分鐘數值中...";
        else if (flags.isWaitingHourInput) nextStepBtn.textContent = "請選擇小時卡...";
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

            // ✅ 修正：排序時加入防呆，避免 pending 卡片 (沒有 value 屬性) 造成排序錯亂 (NaN)
            const sortedChoices = [...choices].sort((a, b) => {
                const valA = typeof a.card.value === 'number' ? a.card.value : 999;
                const valB = typeof b.card.value === 'number' ? b.card.value : 999;
                return valB - valA;
            });

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



// --- B. 鐘面繪製 ---
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
            
            // 點擊事件處理
            spotEl.onclick = () => {
                // 尋找當前抽出的小時卡中，哪一張的數字符合這個格子的位置
                const cardIndex = gameState.currentDrawnHourCards.findIndex(c => c.number === spot.position);
                
                if (cardIndex !== -1) {
                    // 呼叫 game.js 暴露出的選擇函式
                    if (typeof window.handleHumanHourCardChoice === 'function') {
                        window.handleHumanHourCardChoice(gameState, cardIndex);
                    } else if (typeof handleHumanHourCardChoice === 'function') {
                        handleHumanHourCardChoice(gameState, cardIndex);
                    }
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
	
	// 👇👇👇 回合受罰標示器邏輯 (簡化為只顯示當前受罰方式) 👇👇👇
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
        const isHuman = (player.id === humanId);

        let diceChip = '';
        if (player.d6Die !== null) {
            diceChip = `
                <div class="resource-chip resource-chip--shield" title="受詛者/時之惡護盾值">
                    <span class="resource-chip__icon icon-shield-css" aria-hidden="true"></span>
                    護盾: <strong>${player.d6Die}</strong>
                </div>`;
        }
        const posDisplay = player.isEjected ? '驅逐' : (player.currentClockPosition !== null && player.currentClockPosition !== undefined ? `${player.currentClockPosition} 點` : '未上場');

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
                <div class="resource-chip resource-chip--mana" title="目前法力值">
                    <span class="resource-chip__icon icon-mana-css" aria-hidden="true"></span>
                    Mana: <strong>${player.mana}</strong>
                </div>
                <div class="resource-chip resource-chip--gear" title="齒輪生命數">
                    <span class="gear-icon">⚙️</span>
                    齒輪: <strong>${gearCount}</strong>
                </div>
                ${diceChip}
                <div class="stat-pill stat-pill--hours" title="已收集的小時卡張數">
                    <span class="stat-icon">⌛</span>
                    小時卡: <strong>${player.hourCards.length}</strong>
                </div>
                <div class="stat-pill stat-pill--score" title="當前總得分">
                    <span class="stat-icon">🏆</span>
                    分數: <strong>${player.score}</strong>
                </div>
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
    setText('h-mana', String(humanPlayer.mana));
    setText('h-gear', '⚙️'.repeat(Math.max(0, humanPlayer.gearCards)));
    setText('h-score', String(humanPlayer.score));
    setText('h-pos', humanPlayer.isEjected ? '驅逐' : String(humanPlayer.currentClockPosition || '未上場'));
    setText('h-hour', String(humanPlayer.hourCards.length));

    const diceEl = document.getElementById('h-dice');
    if (diceEl) diceEl.textContent = (humanPlayer.d6Die === null) ? '--' : String(humanPlayer.d6Die);
	
	// 動態顯示/隱藏護盾區塊
    const shieldChip = document.querySelector('.human-top-bar .resource-chip--shield');
    if (shieldChip) {
        if (humanPlayer.type === '時魔') {
            shieldChip.style.display = 'none'; // 時魔不需要護盾數值，隱藏
        } else {
            shieldChip.style.display = '';     // 其他身份恢復顯示
        }
    }
    //
	
    // 2. 更新收集列表 (小時卡) - 帶有分類樣式與點擊功能
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

            // 將卡片實體放入群組，而非字串
            [...hourCards].sort((a, b) => a.number - b.number).forEach(card => {
                const g = card.ageGroup || '未知';
                if (!groups[g]) groups[g] = [];
                groups[g].push(card);
            });

            ['少年', '青年', '中年'].forEach(label => {
                if (groups[label] && groups[label].length > 0) {
                    const row = document.createElement('div');
                    row.className = 'collection-text-row';

                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'col-label';
                    labelSpan.textContent = `${label}：`;
                    row.appendChild(labelSpan);

                    const valuesContainer = document.createElement('div');
                    valuesContainer.style.display = 'inline-flex';
                    valuesContainer.style.gap = '8px';
                    valuesContainer.style.flexWrap = 'wrap';
                    valuesContainer.style.marginTop = '4px';

                    // 繪製單張可點擊的卡片
                    groups[label].forEach(card => {
                        const cardBtn = document.createElement('div');
                        cardBtn.className = `hour-collection-card ${card.isPrecious ? 'precious' : ''}`;
                        cardBtn.textContent = `${card.number}${card.isPrecious ? '★' : ''}`;
                        cardBtn.title = '點擊查看故事';

                        // ✅ 綁定點擊事件
                        cardBtn.onclick = () => {
                            if (window.gameAudio) window.gameAudio.playClick(); // 播放點擊音效
                            showCardStory(card);
                        };

                        valuesContainer.appendChild(cardBtn);
                    });

                    row.appendChild(valuesContainer);
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
		
		// 根據角色身份動態設定手牌區背景圖 
        let bgUrl = "url('assets/background_hand.png')"; // 預設背景
        
        if (humanPlayer.type === '時之惡') {
            bgUrl = "url('assets/soul_sin.png')";        // 時之惡專屬背景
        } else if (humanPlayer.type === '受詛者') {
            bgUrl = "url('assets/soul_scz.png')";        // 受詛者專屬背景
        } else if (humanPlayer.roleCard === '時針') {
            bgUrl = "url('assets/soul_hour.png')";       // 進化：時針專屬背景
        } else if (humanPlayer.roleCard === '分針') {
            bgUrl = "url('assets/soul_min.png')";        // 進化：分針專屬背景
        } else if (humanPlayer.roleCard === '秒針') {
            bgUrl = "url('assets/soul_sec.png')";        // 進化：秒針專屬背景
        } else if (humanPlayer.type === '時魔') {
            bgUrl = "url('assets/soul_demon.png')";      // 未進化：幼體時魔專屬背景
        }
        
        // 將圖片路徑寫入 CSS 變數中
        humanHandEl.style.setProperty('--hand-bg-image', bgUrl);
        //
		
        const sortOrder = window.UI_CONFIG?.HAND_SORT_ORDER || 'asc'; //根據設定決定排序方向
        const sortedHand = [...humanPlayer.hand].sort((a, b) => sortOrder === 'asc' ? a.value - b.value : b.value - a.value);

        sortedHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'minute-card';
            cardEl.setAttribute('data-value', card.value);
            cardEl.innerHTML = `<div>${card.value}</div><div class="card-gear">${card.gear}</div>`;

            if (flags.isWaitingMinuteInput) {
                if (uiState.isSecondHandSelectingTwo) {
                    // 【秒針特殊能力模式】：保留「點選 2 張卡牌 + 點擊確認出牌」操作
                    cardEl.addEventListener('click', function () {
                        const v = card.value;
                        if (uiState.selectedCardValues.includes(v)) {
                            uiState.selectedCardValues = uiState.selectedCardValues.filter(x => x !== v);
                            this.classList.remove('selected');
                        } else {
                            if (uiState.selectedCardValues.length >= 2) return;
                            uiState.selectedCardValues.push(v);
                            this.classList.add('selected');
                        }
                        uiState.selectedCardValue = null;
                        if (confirmBtn) confirmBtn.disabled = (uiState.selectedCardValues.length !== 2);
                        if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function') {
                            window.TutorialModeManager.updateTutorialPointers(gameState);
                        }
                    });
                } else {
                    // 【一般出牌模式】：採用拖放（Drag & Drop）至鐘面出牌（同時支援雙擊快速出牌）
                    bindMinuteCardDragToPlay(cardEl, card.value, gameState);
                }
            } else {
                cardEl.style.cursor = 'default';
                cardEl.style.opacity = '0.7';
            }

            if (!uiState.isSecondHandSelectingTwo && uiState.selectedCardValue === card.value) cardEl.classList.add('selected');
            if (uiState.isSecondHandSelectingTwo && uiState.selectedCardValues.includes(card.value)) cardEl.classList.add('selected');
            humanHandEl.appendChild(cardEl);
        });

        // 確認出牌按鈕狀態：一般拖放模式時隱藏，僅在「秒針」蓋 2 張能力時顯示並啟用點選確認
        if (confirmBtn) {
            if (uiState.isSecondHandSelectingTwo) {
                confirmBtn.style.display = 'inline-block';
                confirmBtn.disabled = !flags.isWaitingMinuteInput || (uiState.selectedCardValues.length !== 2);
            } else {
                confirmBtn.style.display = 'none';
                confirmBtn.disabled = true;
            }
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
                        ? '⚡ 秒針能力：請點選 2 張分鐘卡。'
                        : '⚡ 已選 2 張卡牌，請點擊「確認出牌」。';
                } else {
                    hintText = '👆 向上拖曳一張分鐘卡至鐘面即可出牌';
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

// --- 一般分鐘卡拖放（Drag & Drop）出牌控制器 ---
// 遵循三大核心事件架構：
// 1. pointerdown（按下）：提升卡牌 zIndex 至最高層並記錄進入「拖曳中」狀態，註冊全域 Stage (window) 移動與放開事件。
// 2. pointermove（移動）：綁定於整個視窗 Stage (window)，游標快速移動離開卡牌時也不會中斷，並以 !important 即時更新卡牌座標。
// 3. pointerup / pointerupoutside (pointercancel / blur / mouseleave)：綁定於整個視窗 Stage，確保拖出視窗外放開也不會卡死，並恢復圖層與狀態。
function bindMinuteCardDragToPlay(cardEl, cardValue, gameState) {
    if (!cardEl || typeof cardEl.addEventListener !== 'function') return;

    let isDragging = false;
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let isDropReady = false;
    let hasCommitted = false;

    const DROP_UP_THRESHOLD = 75; // 向上拖離超過 75px 即進入可出牌狀態

    const checkIsInsideClock = (clientX, clientY) => {
        const clockEl = document.getElementById('clock-face');
        if (!clockEl || typeof clockEl.getBoundingClientRect !== 'function') return false;
        const r = clockEl.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const setClockDropHighlight = (active) => {
        const clockEl = document.getElementById('clock-face');
        if (clockEl && clockEl.classList) {
            clockEl.classList.toggle('drop-target-active', !!active);
        }
        if (window.ModernBoard && typeof window.ModernBoard.setDropHighlight === 'function') {
            window.ModernBoard.setDropHighlight(!!active);
        }
    };

    const detachStageListeners = () => {
        window.removeEventListener('pointermove', onStagePointerMove);
        window.removeEventListener('pointerup', onStagePointerUp);
        window.removeEventListener('pointercancel', onStagePointerUpOutside);
        window.removeEventListener('blur', onStagePointerUpOutside);
        document.removeEventListener('mouseleave', onStageMouseLeave);
    };

    const commitCardPlay = () => {
        if (hasCommitted) return;
        const gs = window.globalGameState || gameState;
        if (!gs || gs.currentRoundAIChoices === null) return;
        const playFn = (typeof window.handleHumanChoice === 'function')
            ? window.handleHumanChoice
            : (typeof handleHumanChoice === 'function' ? handleHumanChoice : null);
        if (!playFn) return;

        hasCommitted = true;
        setClockDropHighlight(false);

        if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
            window.gameAudio.playConfirm();
        }

        // 飛入鐘面中心動畫後執行出牌
        const clockEl = document.getElementById('clock-face');
        if (clockEl && typeof clockEl.getBoundingClientRect === 'function' && typeof cardEl.getBoundingClientRect === 'function') {
            const clockRect = clockEl.getBoundingClientRect();
            const cardRect = cardEl.getBoundingClientRect();
            const targetDx = (clockRect.left + clockRect.width / 2) - (cardRect.left + cardRect.width / 2);
            const targetDy = (clockRect.top + clockRect.height / 2) - (cardRect.top + cardRect.height / 2);
            const currentDx = parseFloat(cardEl.dataset.dragDx || '0');
            const currentDy = parseFloat(cardEl.dataset.dragDy || '0');
            cardEl.classList.remove('is-dragging', 'is-drop-ready');
            cardEl.classList.add('is-committing');
            cardEl.style.setProperty('z-index', '9999', 'important');
            cardEl.style.setProperty('transform', `translate3d(${currentDx + targetDx}px, ${currentDy + targetDy}px, 0) scale(0.35)`, 'important');
            cardEl.style.opacity = '0';

            setTimeout(() => {
                const ok = playFn(gs, cardValue);
                if (ok) {
                    uiState.selectedCardValue = null;
                    updateUI(gs);
                }
            }, 170);
        } else {
            const ok = playFn(gs, cardValue);
            if (ok) {
                uiState.selectedCardValue = null;
                updateUI(gs);
            }
        }
    };

    // 2. pointermove（移動）：綁定於整個畫布/視窗（window），確保滑鼠快速移動離開卡牌時仍即時跟隨游標
    const onStagePointerMove = (e) => {
        if (!isDragging || hasCommitted) return;
        if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const vx = Math.max(-14, Math.min(14, (e.clientX - lastX) * 0.65));
        lastX = e.clientX;

        cardEl.dataset.dragDx = String(dx);
        cardEl.dataset.dragDy = String(dy);

        const ready = (dy < -DROP_UP_THRESHOLD) || checkIsInsideClock(e.clientX, e.clientY);
        if (ready !== isDropReady) {
            isDropReady = ready;
            cardEl.classList.toggle('is-drop-ready', isDropReady);
            setClockDropHighlight(isDropReady);
        }

        const scale = isDropReady ? 1.22 : 1.12;
        // 使用 setProperty(..., 'important') 確保覆蓋任何 CSS hover !important 規則，畫面即時呈現卡牌移動
        cardEl.style.setProperty('transform', `translate3d(${dx}px, ${dy}px, 0) rotate(${vx}deg) scale(${scale})`, 'important');
    };

    const resetCardToHand = () => {
        isDropReady = false;
        setClockDropHighlight(false);
        cardEl.classList.remove('is-dragging', 'is-drop-ready');
        cardEl.classList.add('is-returning');
        cardEl.style.removeProperty('transform');
        cardEl.style.removeProperty('z-index');
        cardEl.dataset.dragDx = '0';
        cardEl.dataset.dragDy = '0';
        setTimeout(() => {
            cardEl.classList.remove('is-returning');
        }, 260);
    };

    // 3A. pointerup（正常放開）：解除拖曳狀態，若在可出牌區則出牌，否則恢復圖層並彈回原位
    const onStagePointerUp = (e) => {
        if (!isDragging) return;
        if (activePointerId !== null && e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

        isDragging = false;
        activePointerId = null;
        detachStageListeners();

        if (isDropReady) {
            commitCardPlay();
        } else {
            resetCardToHand();
        }
    };

    // 3B. pointerupoutside（拖出視窗外放開或中斷）：防止拖到瀏覽器視窗外放開造成的卡死問題
    const onStagePointerUpOutside = () => {
        if (!isDragging) return;
        isDragging = false;
        activePointerId = null;
        detachStageListeners();
        resetCardToHand();
    };

    const onStageMouseLeave = (e) => {
        // 當滑鼠移出瀏覽器視窗且按鍵已鬆開時，視為 pointerupoutside
        if (isDragging && (!e || e.buttons === 0)) {
            onStagePointerUpOutside();
        }
    };

    // 1. pointerdown（按下）：提升 zIndex 到最高層，記錄進入「拖曳中」狀態，並將 move/up 綁定到全域 Stage
    cardEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (uiState.isSecondHandSelectingTwo || hasCommitted) return;
        if (typeof e.preventDefault === 'function') e.preventDefault();

        isDragging = true;
        activePointerId = e.pointerId !== undefined ? e.pointerId : null;
        startX = e.clientX;
        startY = e.clientY;
        lastX = e.clientX;
        isDropReady = false;
        cardEl.dataset.dragDx = '0';
        cardEl.dataset.dragDy = '0';

        cardEl.classList.remove('is-returning');
        cardEl.classList.add('is-dragging');
        cardEl.style.setProperty('z-index', '9999', 'important');
        cardEl.style.setProperty('transform', 'translate3d(0px, -6px, 0) scale(1.12)', 'important');

        window.addEventListener('pointermove', onStagePointerMove);
        window.addEventListener('pointerup', onStagePointerUp);
        window.addEventListener('pointercancel', onStagePointerUpOutside);
        window.addEventListener('blur', onStagePointerUpOutside);
        document.addEventListener('mouseleave', onStageMouseLeave);

        if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
            window.gameAudio.playClick();
        }
    });

    // 無障礙快速後備：雙擊卡牌直接飛入鐘面出牌
    cardEl.addEventListener('dblclick', () => {
        if (!uiState.isSecondHandSelectingTwo && !hasCommitted) {
            detachStageListeners();
            commitCardPlay();
        }
    });
}

// --- 三階段「各玩家比較分鐘數值並分出大小次序」動態演出（等待玩家點擊畫面退場）---
// 階段 1 (0.00s ~ 0.80s)：各玩家蓋牌匯聚於鐘面中央（原始座位次序，停留 0.8 秒）
// 階段 2 (0.80s ~ 3.00s)：依序 3D 翻牌揭曉各玩家打出的分鐘卡數值與齒輪數
// 階段 3 (3.00s ~ 5.80s)：依數值由大到小執行 FLIP 動態交錯換位並依序浮現 1st~5th 次序
// 5.80s 後：常駐展示最終次序，並顯示「👆 點擊畫面任意處繼續」，待玩家點擊畫面時才退場
window.playMinuteClashAnimation = function (gameState, preSortChoices, sortedChoices, onComplete) {
    const overlay = document.getElementById('minute-clash-overlay');
    if (!overlay || !Array.isArray(sortedChoices) || sortedChoices.length === 0) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : 'SM_1';

    const rankLabels = ['1st', '2nd', '3rd', '4th', '5th'];
    const timers = [];
    let finished = false;

    const cleanupDismissListener = () => {
        window.removeEventListener('pointerdown', onGlobalPointerDown, true);
        overlay.onclick = null;
    };

    const finishNow = () => {
        if (finished) return;
        finished = true;
        timers.forEach(id => clearTimeout(id));
        cleanupDismissListener();
        overlay.classList.add('is-leaving');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('is-leaving');
            overlay.innerHTML = '';
            if (typeof onComplete === 'function') onComplete();
        }, 260);
    };

    // 玩家點擊畫面任意處才退場（延遲 180ms 綁定，避免剛放開出牌滑鼠時立即誤觸關閉）
    const onGlobalPointerDown = (e) => {
        if (finished) return;
        // 避免攔截設定視窗或音效開關
        if (e && e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('#settings-modal, #rules-modal, #top-settings-btn')) return;
        }
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        finishNow();
    };

    timers.push(setTimeout(() => {
        if (finished) return;
        window.addEventListener('pointerdown', onGlobalPointerDown, true);
        overlay.onclick = () => finishNow();
    }, 180));

    // 建立舞台 DOM（初始按未排序的座位順序 preSortChoices 排列）
    const initialList = (Array.isArray(preSortChoices) && preSortChoices.length === sortedChoices.length)
        ? preSortChoices
        : sortedChoices;

    const banner = document.createElement('div');
    banner.className = 'minute-clash-banner';

    const titleEl = document.createElement('div');
    titleEl.className = 'minute-clash-title';
    titleEl.textContent = '⏳ 各玩家已蓋牌集結，準備翻牌…';
    banner.appendChild(titleEl);

    const rowEl = document.createElement('div');
    rowEl.className = 'minute-clash-row';

    const slotMap = new Map();

    initialList.forEach(item => {
        const playerObj = (gameState.players || []).find(p => p.id === item.playerId);
        const roleName = playerObj ? playerObj.roleCard : (item.roleType || '時魔');
        const roleKey = (roleName && String(roleName).includes('時魔')) ? '時魔' : roleName;
        const color = ROLE_COLORS[roleKey] || '#ffd27f';
        const isHuman = item.playerId === humanId;
        const val = item.card && typeof item.card.value === 'number' ? item.card.value : '?';
        const gear = item.card && typeof item.card.gear === 'number' ? item.card.gear : 1;

        const slot = document.createElement('div');
        slot.className = 'clash-card-slot' + (isHuman ? ' is-human' : '');
        slot.dataset.playerId = item.playerId;
        slot.style.setProperty('--role-color', color);

        const rankIdx = sortedChoices.findIndex(s => s.playerId === item.playerId);
        const rankText = rankLabels[rankIdx] || `#${rankIdx + 1}`;

        slot.innerHTML = `
            <div class="clash-rank-badge">${rankText}</div>
            <div class="clash-card-3d">
                <div class="clash-card-face clash-card-back">✦</div>
                <div class="clash-card-face clash-card-front">
                    <div class="clash-card-val">${val}</div>
                    <div class="clash-card-gear">${gear}⚙</div>
                </div>
            </div>
            <div class="clash-player-tag">${item.playerName}${isHuman ? '<span class="clash-you-badge">你</span>' : ''}</div>
        `;

        rowEl.appendChild(slot);
        slotMap.set(item.playerId, slot);
    });

    const footerEl = document.createElement('div');
    footerEl.className = 'minute-clash-footer';
    footerEl.textContent = '比較分鐘數值中…（點擊畫面可提前跳過）';

    banner.appendChild(rowEl);
    banner.appendChild(footerEl);
    overlay.innerHTML = '';
    overlay.appendChild(banner);
    overlay.classList.remove('hidden', 'is-leaving');

    // 階段 2 (0.80s ~ 3.00s)：階段 1 蓋牌集結縮短至 0.8s，此時依序 3D 翻牌揭曉數值（每張間隔 300ms）
    timers.push(setTimeout(() => {
        if (finished) return;
        titleEl.textContent = '🃏 揭曉各玩家打出的分鐘卡…';
        initialList.forEach((item, idx) => {
            timers.push(setTimeout(() => {
                if (finished) return;
                const slot = slotMap.get(item.playerId);
                if (slot) slot.classList.add('is-flipped');
                if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                    window.gameAudio.playClick();
                }
            }, idx * 300));
        });
    }, 800));

    // 階段 3 (3.00s ~ 5.80s)：比較數值大小，執行 FLIP 動態交錯換位並依序浮現 1st ~ 5th 名次
    timers.push(setTimeout(() => {
        if (finished) return;
        titleEl.textContent = '⚡ 比較分鐘數值大小，排列行動次序…';

        // Step A (First)：記錄換位前每個 slot 的水平座標
        const firstRects = new Map();
        slotMap.forEach((slot, pid) => {
            if (typeof slot.getBoundingClientRect === 'function') {
                firstRects.set(pid, slot.getBoundingClientRect());
            }
        });

        // Step B (Last)：將 DOM 節點依照由大到小（sortedChoices）重新掛載
        sortedChoices.forEach(item => {
            const slot = slotMap.get(item.playerId);
            if (slot) rowEl.appendChild(slot);
        });

        // Step C (Invert & Play)：計算位移差並以 1.35 秒曲線動畫優雅滑入新名次位置
        sortedChoices.forEach((item, newIdx) => {
            const slot = slotMap.get(item.playerId);
            const first = firstRects.get(item.playerId);
            if (!slot || !first || typeof slot.getBoundingClientRect !== 'function') return;
            const last = slot.getBoundingClientRect();
            const dx = first.left - last.left;

            if (Math.abs(dx) > 1) {
                // 往前排移動者微幅上拱，往後排退讓者微幅下沉，形成交錯超車感
                const arcY = dx > 0 ? -18 : 14;
                slot.style.transition = 'none';
                slot.style.transform = `translate3d(${dx}px, ${arcY}px, 0)`;
                // 強制觸發重繪 (reflow)
                void slot.offsetWidth;
                slot.style.transition = 'transform 1.35s cubic-bezier(0.22, 1, 0.36, 1)';
                slot.style.transform = 'translate3d(0, 0, 0)';
            }

            // 待換位滑行接近定點時（約 4.10s 起，每張間隔 280ms），依名次 1st -> 5th 逐一彈出標章
            timers.push(setTimeout(() => {
                if (!finished && slot) slot.classList.add('show-rank');
            }, 1100 + newIdx * 280));
        });

        if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
            window.gameAudio.playConfirm();
        }
    }, 3000));

    // 5.80s：整套動態演出完畢，畫面停留並提示玩家點擊畫面退場
    timers.push(setTimeout(() => {
        if (finished) return;
        titleEl.textContent = '✨ 分鐘卡大小次序已確定！';
        footerEl.textContent = '👆 點擊畫面任意處繼續挑選小時卡';
        footerEl.classList.add('is-ready-prompt');
    }, 5800));
};

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
// ui.js - renderSinAbilityPanel 修正版 (左右並排)

function renderSinAbilityPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:#feca57">時之惡</div>`;

    // 1. 顯示當前規則狀態
    const currentMode = gameState.sinTargetingMode === 'sin' ? '扣滅目標：距離最近 (已變更)' : '扣滅目標：數值最大 (預設)';
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'font-size:0.85rem; color:#aaa; margin-bottom:8px;';
    statusDiv.innerHTML = `<span style="color:${gameState.sinTargetingMode === 'sin' ? '#ff6b6b' : '#fff'}">${currentMode}</span>`;
    container.appendChild(statusDiv);

    // ✅ 建立按鈕群組容器 (Flex Row)
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '8px';    // 按鈕之間的間距
    btnGroup.style.width = '100%'; // 填滿寬度

    // 共用變數
    const canAct = window.GAME_CONFIG.enableAbilities && !gameState.gameEnded && !humanPlayer.specialAbilityUsed;

    // --- 按鈕 A：惡之牽引 (左) ---
    const pullCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_PULL || 2;
    const btnPull = document.createElement('button');
    btnPull.className = 'evo-btn';
    btnPull.style.flex = '1';           // ✅ 設定 flex: 1 讓兩顆按鈕平均分配寬度
    btnPull.style.backgroundColor = '#feca57';
    btnPull.style.color = '#000';
    // btnPull.style.marginBottom = '0'; // 移除原本的底部間距

    if (humanPlayer.specialAbilityUsed) {
        btnPull.textContent = "已行動";
        btnPull.disabled = true;
    } else if (humanPlayer.mana < pullCost) {
        btnPull.textContent = `缺 Mana (${pullCost})`; // 精簡文字
        btnPull.disabled = true;
    } else {
        // 精簡描述以適應較窄的寬度
        btnPull.innerHTML = `${pullCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">惡之牽引</span>`;
        btnPull.title = "改為懲罰「距離最近」者"; // 將詳細說明移至 Tooltip
        btnPull.onclick = () => {
            if (typeof activateSinAbility === 'function') {
                const success = activateSinAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    btnGroup.appendChild(btnPull); // 加入群組

    // --- 按鈕 B：封鎖 (右) ---
    const sealCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;
    const btnSeal = document.createElement('button');
    btnSeal.className = 'evo-btn';
    btnSeal.style.flex = '1';           // ✅ 設定 flex: 1
    btnSeal.style.backgroundColor = '#ff6b6b';
    btnSeal.style.color = '#fff';

    if (gameState.abilityMarker) {
        btnSeal.textContent = "已封鎖";
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.specialAbilityUsed) {
        btnSeal.textContent = "已行動";
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.mana < sealCost) {
        btnSeal.textContent = `缺 Mana (${sealCost})`;
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else {
        btnSeal.innerHTML = `${sealCost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">封鎖</span>`;
        btnSeal.title = "本回合封鎖時魔技能"; // Tooltip
        btnSeal.onclick = () => {
            if (typeof activateSinSealAbility === 'function') {
                const success = activateSinSealAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    btnGroup.appendChild(btnSeal); // 加入群組

    // 將整組按鈕加入主容器
    container.appendChild(btnGroup);

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

