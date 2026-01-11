// ui.js 
const originalLog = console.log;
const logList = document.getElementById('log-list');
let globalGameState = null;
// 新增：記錄玩家上一狀態，用於比對數值變化
let lastPlayerStats = {}; 

// 日誌佇列系統變數
const logQueue = [];
let isLogProcessing = false;
const LOG_SPEED = 200; // ⏳ 設定顯示速度 (毫秒)，數值越小越快

// ✅ 保險：避免 GAME_CONFIG 未定義導致 UI 事件中斷
try {
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
} catch (_) {}

// 核心函式：處理日誌佇列
function processLogQueue() {
    // 如果正在處理中，或佇列是空的，就停止
    if (isLogProcessing || logQueue.length === 0) return;

    isLogProcessing = true;
    
    // 取出下一條訊息
    const message = logQueue.shift();
    const list = document.getElementById('log-list');

    if (list) {
        const li = document.createElement('li');
        li.textContent = message;
        li.className = 'log-entry-new'; // 套用 CSS 動畫 class
        list.appendChild(li);

        // 自動捲動到底部
        const logContainer = document.getElementById('game-log-container');
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // 設定延遲後處理下一條
    setTimeout(() => {
        isLogProcessing = false;
        // 如果還有訊息堆積，加快速度消化 (可選優化)
        if (logQueue.length > 5) {
             processLogQueue(); // 遞迴呼叫 (不延遲太久)
        } else {
             processLogQueue();
        }
    }, (logQueue.length > 5 ? 50 : LOG_SPEED)); // 如果堆積超過 5 條，加速到 50ms
}

// 重寫 console.log：改為推入佇列
console.log = function(...args) {
    // 1. 還是要印在瀏覽器的開發者工具 (除錯用)
    originalLog.apply(console, args); 
    
    // 2. 組合文字
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    
    // 3. 推入佇列
    logQueue.push(message);
    
    // 4. 啟動處理器
    processLogQueue();
};

// 1. 錯誤監控 - 讓錯誤顯示在日誌中
window.addEventListener("error", (e) => {
    try {
        originalLog("[JS Error]", e.message, e.filename ? ("@" + e.filename + ":" + e.lineno) : "");
        const li = document.createElement('li');
        li.style.color = '#ff6b6b';
        li.textContent = `❌ 錯誤: ${e.message}`;
        if (logList) {
            logList.appendChild(li);
            const logContainer = document.getElementById('game-log-container');
            if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
        }
    } catch (_) {}
});

window.addEventListener("unhandledrejection", (e) => {
    try {
        originalLog("[Promise Rejection]", e.reason);
    } catch (_) {}
});

// 2. 定義玩家顏色和 ID
let selectedCardValue = null;         // 一般出牌：單選
let selectedCardValues = [];          // 秒針能力：雙選（兩張）
let isSecondHandSelectingTwo = false; // 秒針能力：是否正在選兩張

const ROLE_COLORS = {
    '時魔': '#ff6b6b',
    '時之惡': '#feca57',
    '受詛者': '#54a0ff',
    '時針': '#ff9ff3',
    '分針': '#f368e0',
    '秒針': '#00d2d3'
};

function setupTabNavigation(buttonSelector, panelSelector, activeButtonClass, activePanelClass) {
    const buttons = Array.from(document.querySelectorAll(buttonSelector));
    const panels = Array.from(document.querySelectorAll(panelSelector));
    if (buttons.length === 0 || panels.length === 0) return;

    const activateTab = (targetId) => {
        buttons.forEach(btn => btn.classList.remove(activeButtonClass));
        panels.forEach(panel => panel.classList.remove(activePanelClass));

        const activeBtn = buttons.find(btn => btn.dataset.target === targetId);
        const targetPanel = document.getElementById(targetId);

        if (activeBtn) activeBtn.classList.add(activeButtonClass);
        if (targetPanel) targetPanel.classList.add(activePanelClass);
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            activateTab(targetId);
        });
    });
}

// ====
// 右側資訊面板（UI 狀態）
// ====
const UI_HISTORY_LIMIT = 12;
let uiMinuteHistory = {};
let uiLastRecordedTurnKey = null;

function resetMinuteHistory(gameState) {
    uiMinuteHistory = {};
    uiLastRecordedTurnKey = null;

    if (gameState && Array.isArray(gameState.players)) {
        gameState.players.forEach(p => {
            uiMinuteHistory[p.id] = [];
        });
    }

    const el = document.getElementById('player-history-list');
    if (el) el.innerHTML = '';
}

function recordMinuteHistoryIfNew(gameState, choices) {
    if (!gameState || !Array.isArray(choices) || choices.length === 0) return;

    // ✅ 關鍵修正：用「分鐘卡確定當下」鎖定的 key，而不是當下的 roundMarker
    const turnKey = gameState.uiMinuteChoicesTurnKey || `${gameState.gameRound}-${gameState.roundMarker}`;
    if (uiLastRecordedTurnKey === turnKey) return;
    uiLastRecordedTurnKey = turnKey;

    // 確保每位玩家都有陣列
    (gameState.players || []).forEach(p => {
        if (!uiMinuteHistory[p.id]) uiMinuteHistory[p.id] = [];
    });

    // 先標記本回合誰有出牌
    const playedSet = new Set();
    choices.forEach(c => {
        playedSet.add(c.playerId);
        const v = c?.card?.value;
        if (typeof v !== 'number') return;

        uiMinuteHistory[c.playerId].unshift(v);
        uiMinuteHistory[c.playerId] = uiMinuteHistory[c.playerId].slice(0, UI_HISTORY_LIMIT);
    });

    // 沒出牌者補一格（維持對齊）
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
	lastPlayerStats = {}; // 重置數值記錄
    for (const k of Object.keys(uiMinuteHistory)) delete uiMinuteHistory[k];
    if (!gameState) return;

    gameState.players.forEach(p => { uiMinuteHistory[p.id] = []; });

    const statusEl = document.getElementById('player-status-list');
    if (statusEl) statusEl.innerHTML = '';

    const histEl = document.getElementById('player-history-list');
    if (histEl) histEl.innerHTML = '';
}

function recordAndRenderRightPanels(gameState, choices) {
    recordMinuteHistoryIfNew(gameState, choices);
    renderMinuteHistory(gameState);
}

function renderPlayerHistoryPanel(gameState) {
	renderMinuteHistory(gameState);
    const host = document.getElementById('player-history-list');
    if (!host) return;

    host.innerHTML = '';
    const orderedPlayers = (gameState.players || []).slice().reverse();
	orderedPlayers.forEach(p => {
        const roleKey = getPlayerColorKey(p);
        const color = ROLE_COLORS[roleKey] || '#ccc';
        const arr = uiMinuteHistory[p.id] || [];

        const row = document.createElement('div');
        row.className = 'player-mini-row';

        const chips = arr.length
            ? `<div class="history-values">${arr.map(v => `<span class="history-chip">${v}</span>`).join('')}</div>`
            : `<div class="history-values"><span style="opacity:.6;">—</span></div>`;

        row.innerHTML = `
            <div class="player-mini-left" style="color:${color}" title="${p.roleCard || p.name}">
                ${p.roleCard || p.name}
            </div>
            <div class="player-mini-right">
                ${chips}
            </div>
        `;
        (row.querySelector('.player-mini-right')).classList.add('history-values');

        host.appendChild(row);
    });
}


// 3. 核心繪圖函式：更新整個界面
function updateUI(gameState) {
    if (!gameState) return;

    // ✅ 修正：移除重複宣告，合併為單一邏輯
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
		? window.getEffectiveHumanPlayerId()
		: (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : 'SM_1'));
	
	const HUMAN_PLAYER_ID = humanId; // ✅ 供 updateUI 內既有邏輯沿用
	const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);


    // 定義等待狀態 (用於按鈕控制)
    const isWaitingMinuteInput = gameState.currentRoundAIChoices !== null;
    const isWaitingHourInput = gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId;
    const isWaitingAbilityChoice = !!gameState.waitingAbilityChoice && gameState.waitingAbilityChoicePlayerId === humanId;
    const isWaitingSecondFinalChoiceTop = !!gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId;

    // ✅ 防呆：即使 humanPlayer 讀取失敗，也必須鎖住「下一回合」避免跳過出牌/選卡流程
    const nextStepBtnTop = document.getElementById('next-step-btn');
    if (nextStepBtnTop) {
        if (gameState.gameEnded) {
            nextStepBtnTop.disabled = true;
            nextStepBtnTop.textContent = '遊戲結束';
        } else if (isWaitingMinuteInput || isWaitingHourInput || isWaitingAbilityChoice || isWaitingSecondFinalChoiceTop) {
            nextStepBtnTop.disabled = true;
            nextStepBtnTop.textContent = '等待輸入中…';
        } else {
            nextStepBtnTop.disabled = false;
            nextStepBtnTop.textContent = '下一回合';
        }
    }
    
    // A. 更新頂部資訊
    document.getElementById('round-info').textContent = `第 ${gameState.gameRound} 輪`;
    document.getElementById('turn-info').textContent = `回合標記: ${gameState.roundMarker}`;
    const deckNumEl = document.getElementById('deck-count-num');
    if(deckNumEl) deckNumEl.textContent = gameState.hourDeck.length;
    
    // A-2. 更新本回合出牌列表 + 各角色出牌記錄
	const playedPanel = document.getElementById('played-cards-panel');
	const playedList  = document.getElementById('played-cards-list');

	// 統一轉成陣列，避免 null 導致判斷分歧
	const choices = Array.isArray(gameState.currentMinuteChoices) ? gameState.currentMinuteChoices : [];

	// (2) 各角色出牌記錄：
	recordMinuteHistoryIfNew(gameState, choices);
	renderMinuteHistory(gameState);

// 本回合出牌面板：
// 2. 渲染面板 (將兩段重複的代碼合併為一段)
    if (playedPanel && playedList) {
        //playedPanel.style.display = 'block'; 這行會導致無法隱藏
        playedList.innerHTML = '';

        if (choices.length > 0) {
            // 依數值大到小排序
            const sortedChoices = [...choices].sort((a, b) => b.card.value - a.card.value);

            sortedChoices.forEach(choice => {
                const row = document.createElement('div');
                row.className = 'played-card-row';
                // 處理 Pending 狀態的顯示文字
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
            // 空狀態顯示
            if (gameState.currentRoundAIChoices !== null) {
                playedList.innerHTML = `<div class="played-placeholder">（等待確認出牌）</div>`;
            } else {
                playedList.innerHTML = `<div class="played-placeholder">（未翻牌）</div>`;
            }
        }
    }


    

    // B. 繪製鐘面 (圓形鐘格)
	const radius = 190;   // 這是 500px 圓心到邊緣的距離
	const centerX = 250;  // 500 / 2
	const centerY = 250;  // 500 / 2
    const clockFaceEl = document.getElementById('clock-face');
    
    // 移除舊的元素
    const existingSpots = clockFaceEl.querySelectorAll('.clock-spot');
    const existingArrows = clockFaceEl.querySelectorAll('.active-round-arrow');
    clockFaceEl.querySelectorAll('.ring-segment').forEach(el => el.remove()); 
    existingSpots.forEach(el => el.remove());
    existingArrows.forEach(el => el.remove());
    
    gameState.clockFace.forEach((spot, index) => {
        // 角度計算
        const angleDeg = spot.position * 30 - 90; 
        const angleRad = angleDeg * (Math.PI / 180);
        
        const x = centerX + radius * Math.cos(angleRad);
        const y = centerY + radius * Math.sin(angleRad);

        const spotEl = document.createElement('div');
        spotEl.className = 'clock-spot';
        spotEl.style.left = `${x}px`;
        spotEl.style.top = `${y}px`;

        // 箭頭與高亮邏輯
        if (spot.position === gameState.roundMarker) {
            spotEl.classList.add('active-round');

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

        // 數字標籤
        const numSpan = document.createElement('span');
        numSpan.className = 'spot-num';
        numSpan.textContent = spot.position;
        spotEl.appendChild(numSpan);
        
		// 卡牌顯示邏輯 (鐘面上的)
        if (spot.cards.length > 0) {
            const topCard = spot.cards[spot.cards.length - 1]; // 取得最上面那張
            
            // 1. 繪製原本的「頂牌預覽」 (保持不變，這是鐘面上直接看到的)
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

            // 2. ✅ 新增：堆疊查看器 (Stack Inspector)
            // 這個 div 平常隱藏(display:none)，滑鼠移上去時 CSS 會讓它顯示
            const inspector = document.createElement('div');
            inspector.className = 'stack-inspector';
            
            // 標題：顯示總張數
            const title = document.createElement('div');
            title.className = 'stack-title';
            title.textContent = `堆疊 (${spot.cards.length}張)`;
            inspector.appendChild(title);

            // 列表：從「最上面」列到「最下面」 (將陣列反轉顯示)
            [...spot.cards].reverse().forEach((card, i) => {
                const item = document.createElement('div');
                item.className = 'stack-item';
                if (card.isPrecious) item.classList.add('precious');
                
                // 第一張標示為 Top
                const isTop = (i === 0);
                const prefix = isTop ? '🔝 ' : '';
                const star = card.isPrecious ? '★' : '';
                // 簡化顯示，如果是青年/少年/中年 顯示縮寫或全名
                const age = card.ageGroup ? `<span class="age-tag">(${card.ageGroup})</span>` : '';
                
                item.innerHTML = `${prefix}${card.number}${star}${age}`;
                inspector.appendChild(item);
            });

            spotEl.appendChild(inspector);
        }

        // 棋子顯示邏輯
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

    // C. 繪製 AI 玩家狀態
    const playersContainer = document.getElementById('players-section');
    playersContainer.innerHTML = ''; 

    gameState.players.filter(p => p.id !== HUMAN_PLAYER_ID).forEach(player => {
        const pCard = document.createElement('div');
        pCard.className = 'player-card';
		pCard.dataset.id = player.id; // 標記 ID 以便漂浮文字定位		
        if (player.isEjected) pCard.classList.add('ejected');

        const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
        const color = ROLE_COLORS[roleKey] || '#fff';

        let diceInfo = '';
        if (player.d6Die !== null) {
            diceInfo = `<div>骰子: <strong>${player.d6Die}</strong></div>`;
        }

        const posDisplay = player.isEjected ? '驅逐' : (player.currentClockPosition || '未上場');

        pCard.innerHTML = `
            <div class="role-badge" style="color:${color}">${player.roleCard}</div>
            <h4 style="color:${color}">${player.name}</h4>
            <div class="player-stats">
                <div>手牌: ${player.hand.length}</div>
                <div>Mana/齒輪: ${player.mana} / ${player.gearCards}</div>
                <div>分數: ${player.score}</div>
                ${diceInfo}
                <div>位置: ${posDisplay}</div>
                <div>收集小時卡: ${player.hourCards.length}</div>
            </div>
        `;
        playersContainer.appendChild(pCard);
    });

    // D. 繪製人類玩家手牌與控制項
    const humanHandEl = document.getElementById('human-hand');
    const humanRoleEl = document.getElementById('human-role-display');
    const confirmBtn = document.getElementById('confirm-move-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const abilityBtn = document.getElementById('use-ability-btn');

    if (humanPlayer) {
        if (humanRoleEl) humanRoleEl.textContent = `您是：${humanPlayer.roleCard}`;

        // ✅ 防呆：頁面上可能沒有這些欄位（避免 Cannot set properties of null）
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('h-hand-count', String(humanPlayer.hand.length));
        setText('h-mana', `${humanPlayer.mana} / ${humanPlayer.gearCards}`);
        setText('h-gear', String(humanPlayer.gearCards));
        setText('h-score', String(humanPlayer.score));
        
        // ✅ 修改重點：人類玩家若被驅逐，顯示「驅逐」
        setText('h-pos', humanPlayer.isEjected ? '驅逐' : String(humanPlayer.currentClockPosition || '未上場'));
        
        setText('h-hour', String(humanPlayer.hourCards.length));

        // --- 修改開始：已收集小時卡 (分類文字版) ---
        const hourCollectionEl = document.getElementById('human-hour-collection');
        if (hourCollectionEl) {
            hourCollectionEl.innerHTML = '';
            const hourCards = Array.isArray(humanPlayer.hourCards) ? humanPlayer.hourCards : [];

            if (hourCards.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'hour-collection-placeholder';
                placeholder.textContent = '尚未收集';
                placeholder.style.color = '#777';
                placeholder.style.fontStyle = 'italic';
                hourCollectionEl.appendChild(placeholder);
            } else {
                // 1. 定義分組容器
                const groups = { '少年': [], '青年': [], '中年': [] };

                // 2. 先將卡片按數字大小排序，看起來更整齊
                const sortedCards = [...hourCards].sort((a, b) => a.number - b.number);

                // 3. 分配卡片到對應群組
                sortedCards.forEach(card => {
                    const groupName = card.ageGroup || '未知';
                    // 如果該群組尚未定義 (例如未知)，初始化它
                    if (!groups[groupName]) groups[groupName] = [];
                    
                    // 組合顯示文字：數字 + 星號
                    const text = `${card.number}${card.isPrecious ? '★' : ''}`;
                    groups[groupName].push(text);
                });

                // 4. 依序渲染每一行
                // 定義顯示順序
                const order = ['少年', '青年', '中年']; 
                
                order.forEach(label => {
                    const items = groups[label];
                    if (items && items.length > 0) {
                        const row = document.createElement('div');
                        row.className = 'collection-text-row';
                        // 使用 HTML 讓標籤與內容有不同顏色
                        row.innerHTML = `
                            <span class="col-label">${label}：</span>
                            <span class="col-values">${items.join(', ')}</span>
                        `;
                        hourCollectionEl.appendChild(row);
                    }
                });
            }
        }

        const diceEl = document.getElementById('h-dice');
        if (diceEl) {
            const d = humanPlayer.d6Die;
            diceEl.textContent = (d === null || d === undefined) ? '--' : String(d);
        }

        if (humanHandEl) humanHandEl.innerHTML = '';

        
        const sortedHand = [...humanPlayer.hand].sort((a, b) => a.value - b.value);

        sortedHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'minute-card';
            cardEl.setAttribute('data-value', card.value);
            cardEl.innerHTML = `
                <div>${card.value}</div>
                <div class="card-gear">${card.gear} ⚙</div>
            `;
            
            if (isWaitingMinuteInput) {
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
					return;
					} 
					  
					document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
					this.classList.add('selected');
					selectedCardValue = v;
					selectedCardValues = [];
					confirmBtn.disabled = false;
				  });
				} else {
				  cardEl.style.cursor = 'default';
				  cardEl.style.opacity = '0.7';
				}
            humanHandEl.appendChild(cardEl);
			
			if (!isSecondHandSelectingTwo && selectedCardValue === card.value) {
				cardEl.classList.add('selected');
			}
			if (isSecondHandSelectingTwo && selectedCardValues.includes(card.value)) {
				cardEl.classList.add('selected');
			}
			const isWaitingSecondFinalChoice =
			!!gameState.waitingSecondHandFinalChoice &&
			gameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;

			// 秒針按鈕區
			const sWrap = document.getElementById('seconds-ability-controls');
			const sBtn = document.getElementById('seconds-ability-btn');
			const sCancel = document.getElementById('seconds-ability-cancel-btn');
			const sHint = document.getElementById('seconds-ability-hint');

			const canUseSecondHand =
			  window.GAME_CONFIG.enableAbilities &&
			  humanPlayer &&
			  humanPlayer.roleCard === '秒針' &&
			  isWaitingMinuteInput &&
			  !isWaitingSecondFinalChoice &&
			  !gameState.gameEnded &&
			  !gameState.abilityMarker &&
			  !humanPlayer.specialAbilityUsed &&
			  humanPlayer.mana >= 3 &&
			  humanPlayer.hand.length >= 2;

			if (sWrap) sWrap.style.display = (canUseSecondHand || isSecondHandSelectingTwo) ? 'block' : 'none';

			if (sBtn) {
			  sBtn.style.display = (canUseSecondHand || isSecondHandSelectingTwo) ? 'inline-block' : 'none';
			  sBtn.disabled = !canUseSecondHand || isSecondHandSelectingTwo;
			}

			if (sCancel) {
			  sCancel.style.display = isSecondHandSelectingTwo ? 'inline-block' : 'none';
			  sCancel.disabled = false;
			}

			if (sHint) {
			  sHint.style.display = isSecondHandSelectingTwo ? 'block' : 'none';
			}

			// 二選一彈窗
			const overlay = document.getElementById('seconds-choice-overlay');
			if (overlay) {
			  if (
				isWaitingSecondFinalChoice &&
				humanPlayer &&
				Array.isArray(gameState.secondHandPendingCards) &&
				gameState.secondHandPendingCards.length === 2
			  ) {
				overlay.style.display = 'flex';

				const [a, b] = gameState.secondHandPendingCards;
				const desc = document.getElementById('seconds-choice-desc');
				const btnA = document.getElementById('seconds-choice-a');
				const btnB = document.getElementById('seconds-choice-b');

				if (desc) desc.textContent = '其他玩家已翻牌，請從以下兩張中選一張打出：';
				if (btnA) { btnA.textContent = String(a.value); btnA.dataset.value = String(a.value); }
				if (btnB) { btnB.textContent = String(b.value); btnB.dataset.value = String(b.value); }
			  } else {
				overlay.style.display = 'none';
			  }
			}
        });

        // ✅ 依目前模式決定「確認出牌」是否可按
		if (isWaitingMinuteInput) {
			if (isSecondHandSelectingTwo) {
				confirmBtn.disabled = (selectedCardValues.length !== 2);
			} else {
				confirmBtn.disabled = (selectedCardValue === null);
			}
		} else {
			confirmBtn.disabled = true;
		}

        
        // 更新「使用特殊能力」按鈕狀態
        if (abilityBtn) {
            if (!window.GAME_CONFIG.enableAbilities
) {
                abilityBtn.disabled = true;
                abilityBtn.textContent = "特殊能力已關閉";
            } else {
                let label = "使用特殊能力";
                if (humanPlayer.roleCard) {
                    label = `使用${humanPlayer.roleCard}能力`;
                }
                abilityBtn.textContent = label;
                const canUseBase = !gameState.gameEnded && humanPlayer.mana > 0;
                abilityBtn.disabled = !canUseBase;
            }
        }
        
		// ===
		// ✅ 秒針能力 UI：顯示 / 隱藏
		// ===
		const secondsBtn = document.getElementById('seconds-ability-btn');
		const secondsCancelBtn = document.getElementById('seconds-ability-cancel-btn');

		const isWaitingSecondFinalChoice =
		  !!gameState.waitingSecondHandFinalChoice &&
		  gameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;

		const canUseSecondHand =
		  window.GAME_CONFIG.enableAbilities
 &&
		  humanPlayer &&
		  humanPlayer.roleCard === '秒針' &&
		  isWaitingMinuteInput &&
		  !isWaitingSecondFinalChoice &&
		  !gameState.gameEnded &&
		  !gameState.abilityMarker &&
		  !humanPlayer.specialAbilityUsed &&
		  humanPlayer.mana >= 3 &&
		  humanPlayer.hand.length >= 2;

		if (secondsBtn) {
		  secondsBtn.style.display = (canUseSecondHand || isSecondHandSelectingTwo) ? 'inline-block' : 'none';
		  secondsBtn.disabled = !canUseSecondHand || isSecondHandSelectingTwo;
		}

		if (secondsCancelBtn) {
		  secondsCancelBtn.style.display = isSecondHandSelectingTwo ? 'inline-block' : 'none';
		}

		// ===
		// ✅ 秒針二選一彈窗：顯示 / 隱藏
		// ===
		const overlay = document.getElementById('seconds-choice-overlay');
		if (overlay) {
		  if (
			isWaitingSecondFinalChoice &&
			humanPlayer &&
			Array.isArray(gameState.secondHandPendingCards) &&
			gameState.secondHandPendingCards.length === 2
		  ) {
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

		// ✅ 若正在等秒針二選一，鎖住「下一回合」
		if (isWaitingSecondFinalChoice) {
		  nextStepBtn.disabled = true;
		  nextStepBtn.textContent = "請完成秒針二選一...";
		}

		
        if (isWaitingMinuteInput || isWaitingHourInput || isWaitingAbilityChoice || isWaitingSecondFinalChoice) {
			nextStepBtn.disabled = true;
			if (isWaitingHourInput) nextStepBtn.textContent = "請選擇小時卡...";
			else if (isWaitingAbilityChoice) nextStepBtn.textContent = "請決定是否使用特殊能力...";
			else if (isWaitingSecondFinalChoice) nextStepBtn.textContent = "請完成秒針二選一...";
			else nextStepBtn.textContent = "請出牌...";
		} else {
			nextStepBtn.disabled = false;
			nextStepBtn.textContent = "下一回合";
		}
    } 
    
    // E. 繪製當前回合抽出的小時卡
    const clockCenterEl = clockFaceEl.querySelector('.clock-center');
    
    if (clockCenterEl) {
        clockCenterEl.innerHTML = '';
        
        if (isWaitingHourInput) {
            const tipEl = document.createElement('div');
            tipEl.className = 'hour-choice-tip';
            tipEl.textContent = '👇 點擊卡牌 👇';
            clockCenterEl.appendChild(tipEl);
        }

        if (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) {
			gameState.currentDrawnHourCards.forEach(card => {
				const cardEl = document.createElement('div');
				cardEl.className = 'drawn-hour-card'; // 這裡會應用 style.css 中的縮小樣式

				// 新增：年齡顯示 + 珍貴星號
				const ageText = card.ageGroup ? `(${card.ageGroup})` : '';
				const starText = card.isPrecious ? '★' : '';

				// 主要顯示：7/青年/★
				const ageLine = card.ageGroup ? card.ageGroup : '&nbsp;';
				const starLine = card.isPrecious ? '★' : '&nbsp;';

				cardEl.innerHTML = `
					<div class="hour-num">${card.number}</div>
					<div class="hour-age">${ageLine}</div>
					<div class="hour-star">${starLine}</div>
				`;

				if (card.isPrecious) {
					cardEl.classList.add('precious');
				}

				if (isWaitingHourInput) {
					cardEl.classList.add('clickable');
					cardEl.addEventListener('click', () => {
						const idx = gameState.currentDrawnHourCards.indexOf(card);
						handleHumanHourCardChoice(globalGameState, idx);
					});
				}
				// 將卡牌加入到鐘面中心
				clockCenterEl.appendChild(cardEl);
			});
		}
    }

// F. 繪製進化鑰匙進度 OR 進化後的能力面板 (位於日誌下方)
    const progressArea = document.getElementById('evolution-progress-area');
    
    // 確保區域存在
    if (progressArea) {
        progressArea.innerHTML = ''; // 清空舊內容

        // === 情況 1：尚未進化的「幼體時魔」 (顯示收集進度) ===
        if (humanPlayer && humanPlayer.type === '時魔' && humanPlayer.roleCard.includes('幼')) {
            
            // (這部分保持原本的進度顯示邏輯)
            if (typeof window.checkEvolutionCondition === 'function') {
                const cards = humanPlayer.hourCards || [];
                const preciousCount = cards.filter(c => c.isPrecious).length;
                const uniqueAges = new Set(cards.map(c => c.ageGroup).filter(g => g)).size;
                const uniqueNumbers = new Set(cards.map(c => c.number)).size;
                const totalCount = cards.length;

                const cond1 = (uniqueAges >= 3 && preciousCount >= 1);
                const cond2 = (uniqueNumbers >= 4 && preciousCount >= 1);
                const cond3 = (totalCount >= 5 && preciousCount >= 2);
                const isReady = cond1 || cond2 || cond3;
                const currentTarget = humanPlayer.targetRoleName || '時針';

                const roleDescriptions = {
                    '時針': `<div style="color:#ff9ff3; margin-top:4px;">👁️預知小時卡庫頂牌+ ⚡2 Mana：將牌頂的至底部</div>`,
                    '分針': `<div style="color:#f368e0; margin-top:4px;">⚡2 Mana：取得小時卡後，可順時針或逆時針移動 1 格</div>`,
                    '秒針': `<div style="color:#00d2d3; margin-top:4px;">⚡3 Mana：出牌時可打出 2 張蓋牌，對手出牌後再二選一</div>`
                };
                const currentDesc = roleDescriptions[currentTarget] || '';

                let html = `
                    <div class="target-role-header">
                        <label class="target-role-label">目標身份：</label>
                        <select id="target-role-select" class="target-role-select">
                            <option value="時針" ${currentTarget === '時針' ? 'selected' : ''}>時針</option>
                            <option value="分針" ${currentTarget === '分針' ? 'selected' : ''}>分針</option>
                            <option value="秒針" ${currentTarget === '秒針' ? 'selected' : ''}>秒針</option>
                        </select>
                        <div style="font-size:0.8rem; line-height:1.4; color:#ddd;">${currentDesc}</div>
                    </div>
                `;

                const renderItem = (isMet, text) => {
                    const metClass = isMet ? 'met' : '';
                    return `<div class="condition-row ${metClass}"><div class="condition-icon"></div><div class="condition-text">${text}</div></div>`;
                };

                html += `<div style="margin-top:10px;">`;
                html += renderItem(cond1, `1. 時代 ${uniqueAges}/3, 珍貴 ${preciousCount}/1`);
                html += renderItem(cond2, `2. 數字 ${uniqueNumbers}/4, 珍貴 ${preciousCount}/1`);
                html += renderItem(cond3, `3. 總數 ${totalCount}/5, 珍貴 ${preciousCount}/2`);
                html += `</div>`;

                if (isReady) {
                     html += `<div style="margin-top:8px; color:#ffd27f; text-align:center; font-weight:bold; border:1px dashed #ffd27f; padding:4px;">✨ 條件達成！回合結束時進化</div>`;
                }

                progressArea.innerHTML = html;

                const selectEl = document.getElementById('target-role-select');
                if (selectEl) {
                    selectEl.addEventListener('change', (e) => {
                        humanPlayer.targetRoleName = e.target.value;
                        updateUI(globalGameState);
                    });
                }
            }
        } 
		
        // === 情況 2：已進化的時魔 (顯示能力按鈕) ===
        else if (humanPlayer && !humanPlayer.isEjected && ['時針', '分針', '秒針'].includes(humanPlayer.roleCard)) {
            
            const role = humanPlayer.roleCard;
            const container = document.createElement('div');
            container.className = 'evo-ability-panel';

            // 標題
            const titleColor = ROLE_COLORS[role] || '#fff';
            container.innerHTML = `<div class="evo-role-title" style="color:${titleColor}">${role} 能力面板</div>`;

            // --- 依照角色產生按鈕 ---
            
            // 1. 時針面板
            if (role === '時針') {
                // ✅ 新增：被動能力顯示 (預知牌庫頂) - 放在按鈕上方
                const passiveContainer = document.createElement('div');
                passiveContainer.style.cssText = 'background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #555; text-align:center;';
                
                const blocked = !!gameState.abilityMarker;
                // 取得牌庫頂端卡片 (陣列最後一張)
                const topCard = (Array.isArray(gameState.hourDeck) && gameState.hourDeck.length > 0) 
                    ? gameState.hourDeck[gameState.hourDeck.length - 1] 
                    : null;

                let contentHtml = '';
                if (blocked) {
                    contentHtml = '<div style="color:#ff6b6b; font-weight:bold;">🚫 能力被封鎖</div>';
                } else if (!topCard) {
                    contentHtml = '<div style="color:#aaa;">(牌庫已空)</div>';
                } else {
                    // 顯示格式：數字 (時代) ★
                    const star = topCard.isPrecious ? '<span style="color:#ffd27f; font-size:1.2rem;">★</span>' : '';
                    contentHtml = `
                        <div style="font-size:0.85rem; margin-bottom:4px; border-bottom:1px dashed #666; padding-bottom:2px; display:inline-block;">
						👁️ 牌庫頂：${topCard.number}${topCard.ageGroup || ''}${star}
						</div>
                    `;
                }
                passiveContainer.innerHTML = contentHtml;
                container.appendChild(passiveContainer);
                
                // --- 主動能力按鈕 ---
                const canUse = !gameState.gameEnded && humanPlayer.mana >= 2 && !humanPlayer.specialAbilityUsed && gameState.hourDeck.length > 0;
                
                const btn = document.createElement('button');
                btn.className = 'evo-btn';
                btn.style.backgroundColor = '#ff9ff3';
                btn.innerHTML = `2 Mana<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>`;
                btn.disabled = !canUse;
                
                btn.onclick = () => {
                    if (typeof hourHandMoveTopToBottom === 'function') {
                        hourHandMoveTopToBottom(globalGameState, HUMAN_PLAYER_ID);
                        updateUI(globalGameState);
                    }
                };
                container.appendChild(btn);
            }

            // 2. 分針面板
            else if (role === '分針') {
                // 分針能力是被動觸發的 (waitingMinuteHandChoice)，或是顯示提示
                if (gameState.waitingMinuteHandChoice) {
                    const desc = document.createElement('div');
                    desc.className = 'evo-desc';
                    desc.innerHTML = `<span style="color:#f368e0">⚡ 觸發！</span> 請選擇移動方向 (2 Mana)：`;
                    container.appendChild(desc);

                    const btnGroup = document.createElement('div');
                    btnGroup.style.display = 'flex';
                    btnGroup.style.gap = '5px';

                    const btnCCW = document.createElement('button');
                    btnCCW.className = 'evo-btn';
                    btnCCW.style.background = '#00d2d3';
                    btnCCW.textContent = '↺ 逆時針';
                    btnCCW.onclick = () => handleHumanAbilityChoice(globalGameState, 'ccw');

                    const btnCW = document.createElement('button');
                    btnCW.className = 'evo-btn';
                    btnCW.style.background = '#ff9ff3';
                    btnCW.textContent = '↻ 順時針';
                    btnCW.onclick = () => handleHumanAbilityChoice(globalGameState, 'cw');

                    const btnSkip = document.createElement('button');
                    btnSkip.className = 'evo-btn';
                    btnSkip.style.background = '#777';
                    btnSkip.style.color = '#fff';
                    btnSkip.textContent = '略過';
                    btnSkip.onclick = () => handleHumanAbilityChoice(globalGameState, false);

                    btnGroup.appendChild(btnCCW);
                    btnGroup.appendChild(btnCW);
                    btnGroup.appendChild(btnSkip);
                    container.appendChild(btnGroup);

                } else {
                    const info = document.createElement('div');
                    info.className = 'evo-desc';
                    info.innerHTML = `取得小時卡時，可消耗 2 Mana 移動一步。<br>(條件達成時按鈕將自動出現)`;
                    container.appendChild(info);
                }
            }

            // 3. 秒針面板
            else if (role === '秒針') {
                // 秒針能力條件
                const isWaitingMinute = gameState.currentRoundAIChoices !== null; // 正在出牌階段
                const isWaitingFinal = !!gameState.waitingSecondHandFinalChoice; // 正在二選一
                const canUse = window.GAME_CONFIG.enableAbilities && 
                               isWaitingMinute && 
                               !isWaitingFinal && 
                               !humanPlayer.specialAbilityUsed && 
                               humanPlayer.mana >= 3 && 
                               humanPlayer.hand.length >= 2;

                if (isWaitingFinal) {
                    const desc = document.createElement('div');
                    desc.className = 'evo-desc';
                    desc.textContent = '請從彈窗中選擇一張牌...';
                    container.appendChild(desc);
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'evo-btn';
                    btn.style.backgroundColor = '#00d2d3';
                    btn.innerHTML = `3 Mana<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>`;
                    
                    // 如果正在選 2 張模式
                    if (isSecondHandSelectingTwo) {
                        btn.style.backgroundColor = '#ff6b6b';
                        btn.style.color = '#fff';
                        btn.textContent = '取消選擇';
                        btn.onclick = () => {
                            isSecondHandSelectingTwo = false;
                            selectedCardValues = [];
                            updateUI(globalGameState);
                        };
                    } else {
                        btn.disabled = !canUse;
                        btn.onclick = () => {
                            isSecondHandSelectingTwo = true;
                            selectedCardValue = null;
                            selectedCardValues = [];
                            updateUI(globalGameState);
                        };
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

            progressArea.appendChild(container);
        }
		
		// === 情況 2：已進化的時魔 (顯示能力按鈕) ===
        else if (humanPlayer && !humanPlayer.isEjected && ['時針', '分針', '秒針'].includes(humanPlayer.roleCard)) {
             // ... (這裡是原本時針/分針/秒針的程式碼，保持不變) ...
             // ...
             progressArea.appendChild(container);
        }

        // ✅ 新增：情況 3：時之惡 (顯示能力按鈕)
        else if (humanPlayer && !humanPlayer.isEjected && humanPlayer.type === '時之惡') {
            const container = document.createElement('div');
            container.className = 'evo-ability-panel';

            // 標題
            container.innerHTML = `<div class="evo-role-title" style="color:#feca57">時之惡 能力面板</div>`;

            // 狀態顯示
            const currentMode = gameState.sinTargetingMode === 'sin' ? '距離最近 (已變更)' : '數值最大 (預設)';
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = 'font-size:0.85rem; color:#aaa; margin-bottom:8px;';
            statusDiv.innerHTML = `當前規則：<span style="color:${gameState.sinTargetingMode === 'sin' ? '#ff6b6b' : '#fff'}">${currentMode}</span>`;
            container.appendChild(statusDiv);

            // 按鈕
            const canUse = window.GAME_CONFIG.enableAbilities && 
                           !gameState.gameEnded && 
                           humanPlayer.mana >= 2 && 
                           !humanPlayer.specialAbilityUsed;

            const btn = document.createElement('button');
            btn.className = 'evo-btn';
            btn.style.backgroundColor = '#feca57';
            btn.style.color = '#000'; // 黑字比較清楚
            
            // 按鈕文字與狀態
            if (humanPlayer.specialAbilityUsed) {
                btn.textContent = "本回合已發動";
                btn.disabled = true;
            } else if (humanPlayer.mana < 2) {
                btn.textContent = "Mana 不足 (需 2)";
                btn.disabled = true;
            } else {
                btn.innerHTML = `2 Mana：改為懲罰「距離最近」者</span>`;
                btn.disabled = !canUse;
                
                // 綁定點擊事件
                btn.onclick = () => {
                    if (typeof activateSinAbility === 'function') {
                        const success = activateSinAbility(globalGameState, humanPlayer.id);
                        if (success) {
                            updateUI(globalGameState); // 發動後立即更新介面
                        }
                    }
                };
            }
            
            container.appendChild(btn);
            progressArea.appendChild(container);
        }
		
    }
// ✅ 新增：處理數值變動的漂浮文字
    processFloatingText(gameState);
	
	// ✅ 新增：繪製時之惡紅線
    drawSinTargetLines(gameState);
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

			// 秒針二選一期間，不允許再按確認出牌
			const waitingSecondFinal =
				!!globalGameState.waitingSecondHandFinalChoice &&
				globalGameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;

			if (waitingSecondFinal) {
				console.log('請先完成「秒針二選一」。');
				return;
			}

			// ✅ 秒針模式：需要選 2 張 → 呼叫 handleHumanSecondHandCommit()
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

			// ✅ 一般模式：單張出牌 → handleHumanChoice()
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
	} else {
		try { console.log('[UI] 找不到 confirm-move-btn'); } catch (_) {}
	}

	// 秒針能力按鈕（進入/取消「選 2 張」模式）
	// ✅ 秒針：進入「選 2 張」模式
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

	// ✅ 秒針：二選一彈窗按鈕
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

    // 時針能力按鈕
    const peekBtn = document.getElementById('ability-peek-btn');
    if (peekBtn) {
        peekBtn.addEventListener('click', () => {
            if (!globalGameState) return;
            if (typeof hourHandPeekTop === 'function') {
                hourHandPeekTop(globalGameState, HUMAN_PLAYER_ID);
                updateUI(globalGameState);
            }
        });
    }

    const buryBtn = document.getElementById('ability-bury-btn');
    if (buryBtn) {
        buryBtn.addEventListener('click', () => {
            if (!globalGameState) return;
            if (typeof hourHandMoveTopToBottom === 'function') {
                hourHandMoveTopToBottom(globalGameState, HUMAN_PLAYER_ID);
                updateUI(globalGameState);
            }
        });
    }

    // 特殊能力選擇面板按鈕
    const abilityUseBtn = document.getElementById('ability-use-btn');
    if (abilityUseBtn) {
        abilityUseBtn.addEventListener('click', () => {
            if (!globalGameState) return;
            abilityUseBtn.disabled = true; 
            handleHumanAbilityChoice(globalGameState, true);
            updateUI(globalGameState);
        });
    }

    const abilitySkipBtn = document.getElementById('ability-skip-btn');
    if (abilitySkipBtn) {
        abilitySkipBtn.addEventListener('click', () => {
            if (!globalGameState) return;
            abilitySkipBtn.disabled = true; 
            handleHumanAbilityChoice(globalGameState, false);
            updateUI(globalGameState);
        });
    }

    // 4B. Tab 切換
    function setupTabNavigation(buttonSelector, panelSelector, activeButtonClass, activePanelClass) {
        const buttons = Array.from(document.querySelectorAll(buttonSelector));
        const panels = Array.from(document.querySelectorAll(panelSelector));
        if (buttons.length === 0 || panels.length === 0) return;

        const activateTab = (targetId) => {
            buttons.forEach(btn => btn.classList.remove(activeButtonClass));
            panels.forEach(panel => panel.classList.remove(activePanelClass));

            const activeBtn = buttons.find(btn => btn.dataset.target === targetId);
            const targetPanel = document.getElementById(targetId);

            if (activeBtn) activeBtn.classList.add(activeButtonClass);
            if (targetPanel) targetPanel.classList.add(activePanelClass);
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (!targetId) return;
                activateTab(targetId);
            });
        });
    }

    // 4B-2. 人類玩家分頁切換
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
	
	// --- 新增：右側面板切換邏輯 ---
    const btnPlayed = document.getElementById('btn-show-played');
    const btnHistory = document.getElementById('btn-show-history');
    const panelPlayed = document.getElementById('played-cards-panel');
    const panelHistory = document.getElementById('player-history-panel');

    if (btnPlayed && btnHistory && panelPlayed && panelHistory) {
        btnPlayed.addEventListener('click', () => {
            // 切換按鈕樣式
            btnPlayed.classList.add('active');
            btnHistory.classList.remove('active');
            // 切換面板顯示
            panelPlayed.style.display = 'block';
            panelHistory.style.display = 'none';
        });

        btnHistory.addEventListener('click', () => {
            // 切換按鈕樣式
            btnHistory.classList.add('active');
            btnPlayed.classList.remove('active');
            // 切換面板顯示
            panelHistory.style.display = 'block';
            panelPlayed.style.display = 'none';
        });
    }

   // 4C. 開始遊戲 (修改版：加入角色選擇流程)
    function getCurrentHumanPlayerId() {
        if (typeof window.getEffectiveHumanPlayerId === 'function') {
            return window.getEffectiveHumanPlayerId();
        }
        if (typeof window.HUMAN_PLAYER_ID !== 'undefined') return window.HUMAN_PLAYER_ID;
        if (typeof HUMAN_PLAYER_ID !== 'undefined') return HUMAN_PLAYER_ID;
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
            const waitingSecondFinal =
                !!globalGameState.waitingSecondHandFinalChoice &&
                globalGameState.waitingSecondHandFinalChoicePlayerId === humanId;

            if (isSecondHandSelectingTwo || waitingMinute || waitingHour || waitingAbility || waitingSecondFinal) {
                console.log('【UI】仍在等待人類輸入（出牌/選卡/能力），請先完成當前步驟。');
                updateUI(globalGameState);
                return;
            }

            if (!globalGameState.gameEnded) {
                startRound(globalGameState);
				
				// ✅ 新增這一行：每次點擊「下一回合」(進入新的一輪) 時，清空右側歷史記錄
                resetMinuteHistory(globalGameState);
				
                updateUI(globalGameState);
            } else {
                console.log("遊戲已結束。");
                nextBtn.disabled = true;
            }
        };
    }

    // 定義：真正的遊戲初始化邏輯 (原按鈕內的程式碼移至此)
    function runGameInitialization() {
        try {
            // ✅ 讀取設定（統一使用 window.GAME_CONFIG）
            const abilityToggleEl = document.getElementById('ability-toggle');
            const testToggleEl = document.getElementById('test-toggle');

            window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
            window.GAME_CONFIG.enableAbilities = !!abilityToggleEl?.checked;
            window.GAME_CONFIG.testMode = !!testToggleEl?.checked;

            const logListEl = document.getElementById('log-list');
            if (logListEl) logListEl.innerHTML = '';

            // ✅ 更安全：優先用 window.initializeGame
            const initFn = (typeof window.initializeGame === 'function')
                ? window.initializeGame
                : (typeof initializeGame === 'function' ? initializeGame : null);

            if (!initFn) {
                throw new ReferenceError('initializeGame is not defined (game.js 未正確載入或未掛到 window)');
            }

            globalGameState = initFn();

            resetMinuteHistory(globalGameState);
            resetRightPanels(globalGameState);
            
            // ✅ 重置秒針 UI 狀態（避免上一局殘留）
            selectedCardValue = null;
            selectedCardValues = [];
            isSecondHandSelectingTwo = false;

            const humanPlayer = globalGameState.players.find(p => p.id === HUMAN_PLAYER_ID);
            if (humanPlayer) {
                console.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);
            }

            resetMinuteHistory(globalGameState);
            updateUI(globalGameState);


            bindNextStepButton();
        }catch (err) {
            console.log('[UI] 開始遊戲時發生錯誤：', err);
        }
    }

    // 邏輯 1：綁定「開始新遊戲」按鈕 -> 只負責打開彈窗
    const startGameBtn = document.getElementById('start-game-btn');
    const roleOverlay = document.getElementById('role-choice-overlay');

    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
			try {
				// ① 讀取設定（統一寫入 window.GAME_CONFIG，並同步到 GAME_CONFIG 若存在）
				window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };

				const abilityToggleEl = document.getElementById('ability-toggle');
				const testToggleEl = document.getElementById('test-toggle');

				const cfgEnableAbilities = !!abilityToggleEl?.checked;
				const cfgTestMode = !!testToggleEl?.checked;

				window.GAME_CONFIG.enableAbilities = cfgEnableAbilities;
				window.GAME_CONFIG.testMode = cfgTestMode;

				try {
					if (typeof GAME_CONFIG !== 'undefined') {
						GAME_CONFIG.enableAbilities = cfgEnableAbilities;
						GAME_CONFIG.testMode = cfgTestMode;
					}
				} catch (_) {}

				// ② 定義「真正開始遊戲」流程（會在選角後呼叫）
				const doInitialize = () => {
					const logListEl = document.getElementById('log-list');
					if (logListEl) logListEl.innerHTML = '';

					const gameMessage = document.getElementById('game-message');
					if (gameMessage) gameMessage.textContent = '';

					const initFn = (typeof window.initializeGame === 'function')
						? window.initializeGame
						: (typeof initializeGame === 'function' ? initializeGame : null);

					if (!initFn) throw new ReferenceError('initializeGame is not defined');

					globalGameState = initFn();

					resetMinuteHistory(globalGameState);
					resetRightPanels(globalGameState);

					selectedCardValue = null;
					selectedCardValues = [];
					isSecondHandSelectingTwo = false;

					const humanId = getCurrentHumanPlayerId();

					const humanPlayer = globalGameState.players.find(p => p.id === humanId);
					if (humanPlayer) console.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);

					updateUI(globalGameState);
					
					bindNextStepButton();

				};

				// ③ 角色選擇：若存在彈窗，先要求選角；否則直接開始
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

					// 使用 onclick 避免重複綁定
					btnTimeDemon.onclick = () => startWithRole('SM_1');
					btnSin.onclick = () => startWithRole('sin');
					btnScz.onclick = () => startWithRole('SCZ');
					return;
				}

				// fallback：沒有角色彈窗就照既有預設開始
				startWithRole((typeof window.getEffectiveHumanPlayerId === 'function') ? window.getEffectiveHumanPlayerId() : 'SM_1');

			} catch (err) {
				console.log('[UI] 開始遊戲時發生錯誤：', err);
			}
		});

    } else {
        try { console.log('[UI] 找不到 start-game-btn'); } catch (_) {}
    }
	
	// (在 DOMContentLoaded 內)

    // 分針能力按鈕綁定
    const btnMinCCW = document.getElementById('btn-minute-ccw');
    const btnMinCW = document.getElementById('btn-minute-cw');
    const btnMinSkip = document.getElementById('btn-minute-skip');

    if (btnMinCCW) {
        btnMinCCW.addEventListener('click', () => {
            if (!globalGameState) return;
            handleHumanAbilityChoice(globalGameState, 'ccw');
        });
    }
    if (btnMinCW) {
        btnMinCW.addEventListener('click', () => {
            if (!globalGameState) return;
            handleHumanAbilityChoice(globalGameState, 'cw');
        });
    }
    if (btnMinSkip) {
        btnMinSkip.addEventListener('click', () => {
            if (!globalGameState) return;
            handleHumanAbilityChoice(globalGameState, 'skip');
        });
    }
});

// (在 DOMContentLoaded 內的最後面)

    // 時之惡能力按鈕
const btnSinActivate = document.getElementById('btn-sin-activate');
if (btnSinActivate) {
    btnSinActivate.addEventListener('click', () => {
        if (!globalGameState) return;
        const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'sin';
            
        // 呼叫 abilities.js 的函式
        if (typeof activateSinAbility === 'function') {
            const success = activateSinAbility(globalGameState, humanId);
            if (success) {
                updateUI(globalGameState); // 發動成功後更新介面
            }
        }
    });
}
	
// --- 新增：處理數值變動漂浮文字邏輯 (全域定位版) ---
function processFloatingText(gameState) {
    if (!gameState || !gameState.players) return;

    gameState.players.forEach(player => {
        const last = lastPlayerStats[player.id];
        
        // 如果有舊資料才比對 (避免剛開局跳數字)
        if (last) {
            // 1. 檢查 Mana 變動
            const manaDiff = player.mana - last.mana;
            if (manaDiff !== 0) {
                const text = (manaDiff > 0 ? '+' : '') + manaDiff + ' Mana';
                const color = manaDiff > 0 ? '#4cd137' : '#e17055'; // 綠 / 紅
                triggerFloat(player.id, text, color, 'mana');
            }

            // 2. 檢查 齒輪 變動
            const gearDiff = player.gearCards - last.gearCards;
            if (gearDiff !== 0) {
                const text = (gearDiff > 0 ? '+' : '') + gearDiff + ' ⚙';
                const color = gearDiff > 0 ? '#00d2d3' : '#ff4757'; // 青 / 深紅
                triggerFloat(player.id, text, color, 'gear');
            }
        }

        // 更新記錄
        lastPlayerStats[player.id] = {
            mana: player.mana,
            gearCards: player.gearCards
        };
    });
}

function triggerFloat(playerId, text, color, type) {
    let targetEl = null;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';

    if (playerId === humanId) {
        // 人類：找介面上的欄位
        targetEl = (type === 'mana') ? document.getElementById('h-mana') : document.getElementById('h-gear');
        if (!targetEl) targetEl = document.querySelector('.human-top-bar'); // 防呆
    } else {
        // AI：找 C 區的卡片
        targetEl = document.querySelector(`.player-card[data-id="${playerId}"]`);
    }

    if (targetEl) {
        spawnFloatingText(targetEl, text, color);
    }
}

function spawnFloatingText(targetEl, text, color) {
    // 1. 計算目標元素在螢幕上的座標
    const rect = targetEl.getBoundingClientRect();
    
    // 2. 找出「水平中心點」與「頂部位置」
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top; // 從元素頂端飄出來

    // 3. 建立浮動元素，直接加在 body 上 (fixed定位)
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${centerX}px`;
    el.style.top = `${topY}px`;
    
    document.body.appendChild(el);

    // 4. 動畫結束後移除
    setTimeout(() => {
        el.remove();
    }, 1800);
}

// --- 新增：繪製時之惡索命紅線 ---
function drawSinTargetLines(gameState) {
    const svg = document.getElementById('connection-lines');
    if (!svg) return;
    
    // 清空舊線條
    svg.innerHTML = '';

    // 1. 找出時之惡
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer || !sinPlayer.currentClockPosition) return;

    // 2. 確定瞄準模式與目標
    const mode = gameState.sinTargetingMode || 'default';
    const targets = [];
    const sinPos = sinPlayer.currentClockPosition;

    // 篩選潛在受害者 (時魔 & 受詛者)
    const candidates = gameState.players.filter(p => 
        (p.type === '時魔' || p.type === '受詛者') && 
        !p.isEjected && 
        p.currentClockPosition
    );

    if (candidates.length === 0) return;

    if (mode === 'sin') {
        // --- 模式：距離最近 (紅線) ---
        // 算出最短距離
        let minDist = 100;
        candidates.forEach(p => {
            const dist = getUIDistance(sinPos, p.currentClockPosition);
            if (dist < minDist) minDist = dist;
        });
        // 抓出所有距離最短的人
        candidates.forEach(p => {
            if (getUIDistance(sinPos, p.currentClockPosition) === minDist) {
                targets.push(p.currentClockPosition);
            }
        });
    } else {
        // --- 模式：數值最大 (預設不畫線，或畫個淡灰色線) ---
        // 如果您希望預設模式也要畫線，可以在這裡實作。
        // 目前需求是針對「時之惡能力」，所以我們只畫 'sin' 模式的紅線。
        return; 
    }

    // 3. 繪製線條
    // 必須與 updateUI 中的半徑參數一致
    const radius = 190;
    const centerX = 250;
    const centerY = 250;

    // 取得座標的輔助函式
    const getCoords = (pos) => {
        const angleDeg = pos * 30 - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        return {
            x: centerX + radius * Math.cos(angleRad),
            y: centerY + radius * Math.sin(angleRad)
        };
    };

    const start = getCoords(sinPos);

    targets.forEach(targetPos => {
        const end = getCoords(targetPos);
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);
        line.setAttribute("class", "sin-line"); // 套用 CSS 樣式
        
        svg.appendChild(line);
    });
}

// UI 專用的距離計算 (複製自 game.js 避免 scope 問題)
function getUIDistance(pos1, pos2) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff);
}