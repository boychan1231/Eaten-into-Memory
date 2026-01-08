// ui.js (整合修正版：修復變數重複宣告錯誤)

const originalLog = console.log;
const logList = document.getElementById('log-list');
let globalGameState = null; 

// ✅ 保險：避免 GAME_CONFIG 未定義導致 UI 事件中斷
try {
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
} catch (_) {}


// 重寫 console.log 以顯示在遊戲日誌中
console.log = function(...args) {
    originalLog.apply(console, args); 
	
	const list = document.getElementById('log-list'); // 每次即時抓取，或確保 DOM 已載入
    if (!list) return; // 如果找不到元素，就只印在 Console
	
    if (!logList) return;
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    const li = document.createElement('li');
    li.textContent = message;
    logList.appendChild(li);
    
    const logContainer = document.getElementById('game-log-container');
    if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
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

// ================================
// 右側資訊面板（UI 狀態）
// ================================
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
    const clockFaceEl = document.getElementById('clock-face');
    
    // 移除舊的元素
    const existingSpots = clockFaceEl.querySelectorAll('.clock-spot');
    const existingArrows = clockFaceEl.querySelectorAll('.active-round-arrow');
    clockFaceEl.querySelectorAll('.ring-segment').forEach(el => el.remove()); 
    existingSpots.forEach(el => el.remove());
    existingArrows.forEach(el => el.remove());

    // 參數設定
    const radius = 190; 
    const centerX = 250;
    const centerY = 250;
    
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
            const topCard = spot.cards[spot.cards.length - 1];
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
        if (player.isEjected) pCard.classList.add('ejected');

        const roleKey = player.roleCard.includes('時魔') ? '時魔' : player.roleCard;
        const color = ROLE_COLORS[roleKey] || '#fff';

        let diceInfo = '';
        if (player.d6Die !== null) {
            diceInfo = `<div>骰子: <strong>${player.d6Die}</strong></div>`;
        }

        // ✅ 修改重點：若被驅逐顯示「驅逐」，否則顯示位置或「未上場」
        const posDisplay = player.isEjected ? '驅逐' : (player.currentClockPosition || '未上場');

        pCard.innerHTML = `
            <div class="role-badge" style="color:${color}">${player.roleCard}</div>
            <h4 style="color:${color}">${player.name}</h4>
            <div class="player-stats">
                <div>手牌: ${player.hand.length}</div>
                <div>Mana: ${player.mana} / ${player.gearCards}</div>
                <div>齒輪卡: ${player.gearCards}</div>
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

        const hourCollectionEl = document.getElementById('human-hour-collection');
        if (hourCollectionEl) {
            hourCollectionEl.innerHTML = '';
            const hourCards = Array.isArray(humanPlayer.hourCards) ? humanPlayer.hourCards : [];

            if (hourCards.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'hour-collection-placeholder';
                placeholder.textContent = '尚未收集小時卡';
                hourCollectionEl.appendChild(placeholder);
            } else {
                hourCards.forEach(card => {
                    const value = (typeof card === 'number') ? card : card?.number;
                    const precious = (typeof card === 'object' && card) ? !!card.isPrecious : false;
                    const ageGroup = (typeof card === 'object' && card) ? card.ageGroup : '';

                    const cardEl = document.createElement('div');
                    cardEl.className = `hour-collection-card${precious ? ' precious' : ''}`;
                    cardEl.textContent = value != null ? `${value}${precious ? '★' : ''}` : '--';

                    if (ageGroup) {
                        cardEl.title = ageGroup;
                    } else if (precious) {
                        cardEl.title = '珍貴';
                    }

                    hourCollectionEl.appendChild(cardEl);
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
        
		// ===============================
		// ✅ 秒針能力 UI：顯示 / 隱藏
		// ===============================
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

		// ===============================
		// ✅ 秒針二選一彈窗：顯示 / 隱藏
		// ===============================
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
    
    // === 分針特殊能力選擇面板 ===
    const minuteAbilityPanel = document.getElementById('ability-choice-panel');
	const abilityText = document.getElementById('ability-choice-text');
	const abilityUseBtn = document.getElementById('ability-use-btn');
	const abilitySkipBtn = document.getElementById('ability-skip-btn');

	if (minuteAbilityPanel && abilityText && abilityUseBtn && abilitySkipBtn) {
	  if (isWaitingAbilityChoice) {
		minuteAbilityPanel.style.display = 'block';

            if (gameState.waitingAbilityChoiceType === 'minuteHandShiftMinus1') {
                const base = gameState.waitingAbilityBaseNumber;
                abilityText.textContent = `【分針能力】你剛取得本回合較小小時卡 ${base}，是否消耗 2 Mana 移動到 ${base - 1}？（本回合限一次）`;
            } else {
				minuteAbilityPanel.style.display = 'none';
                abilityText.textContent = '請選擇是否使用特殊能力。';
            }

            abilityUseBtn.disabled = false;
            abilitySkipBtn.disabled = false;
        } else {
            minuteAbilityPanel.style.display = 'none';
            abilityText.textContent = '';
            abilityUseBtn.disabled = true;
            abilitySkipBtn.disabled = true;
        }
    }

    // --- 時針能力面板控制 ---
    const hourAbilityPanel = document.getElementById('ability-panel');
	if (hourAbilityPanel) {
        const peekBtn = document.getElementById('ability-peek-btn');
        const buryBtn = document.getElementById('ability-bury-btn');
        const peekResultEl = document.getElementById('ability-peek-result');

        const isHourHand = humanPlayer && humanPlayer.roleCard === '時針' && !humanPlayer.isEjected;
        const isPreMinute = (typeof gameState.phase === 'string')
            ? (gameState.phase === 'preMinute')
            : isWaitingMinuteInput; 

        const canShow = window.GAME_CONFIG.enableAbilities
 && isHourHand && isPreMinute && !gameState.gameEnded;

        hourAbilityPanel.style.display = canShow ? 'block' : 'none';

        if (canShow) {
            const blocked = !!gameState.abilityMarker;
            if (peekBtn) {
            peekBtn.disabled = true;
            peekBtn.style.display = 'none';
			}
            if (buryBtn) {
                buryBtn.disabled =
					blocked ||
					humanPlayer.mana < 1 ||
					humanPlayer.specialAbilityUsed ||
					!gameState.hourDeck ||
					gameState.hourDeck.length < 2;
			}

            if (peekResultEl) {
                const top = (Array.isArray(gameState.hourDeck) && gameState.hourDeck.length > 0)
					? gameState.hourDeck[gameState.hourDeck.length - 1]
					: null;

				if (blocked || !top) {
					peekResultEl.textContent = '頂牌：--';
				} else {
					const ageLine = top.ageGroup ? `\n${top.ageGroup}` : '';
					const starLine = top.isPrecious ? `\n★` : '';
					peekResultEl.textContent = `頂牌：${top.number}${ageLine}${starLine}`;
                }
            }
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

				// 主要顯示：7/中年/★
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
						handleHumanHourCardChoice(globalGameState, card.number);
					});
				}
				// 將卡牌加入到鐘面中心
				clockCenterEl.appendChild(cardEl);
			});
		}
    }

	// F. 繪製進化鑰匙進度 (新版 UI：仿照圖片結構)
    if (humanPlayer && humanPlayer.type === '時魔' && humanPlayer.roleCard.includes('時魔')) {
        const progressArea = document.getElementById('evolution-progress-area');
        
        // 確保 helper 函式存在
        if (progressArea && typeof window.checkEvolutionCondition === 'function') {
            
            // 取得目前收集狀況
            const cards = humanPlayer.hourCards || [];
            const preciousCount = cards.filter(c => c.isPrecious).length;
            const uniqueAges = new Set(cards.map(c => c.ageGroup).filter(g => g)).size;
            const uniqueNumbers = new Set(cards.map(c => c.number)).size;
            const totalCount = cards.length;

            // 條件判定
            const cond1 = (uniqueAges >= 3 && preciousCount >= 1);
            const cond2 = (uniqueNumbers >= 4 && preciousCount >= 1);
            const cond3 = (totalCount >= 5 && preciousCount >= 2);
            const isReady = cond1 || cond2 || cond3;

            // 目前選擇的目標
            const currentTarget = humanPlayer.targetRoleName || '時針';

            // --- 建立 HTML 結構 (Header + List) ---
            let html = `
                <div class="target-role-header">
                    <label class="target-role-label">目標身份：
                         <span class="target-role-hint">(達成任一條件即可)</span>
                    </label>
                    <select id="target-role-select" class="target-role-select">
                        <option value="時針" ${currentTarget === '時針' ? 'selected' : ''}>時針</option>
                        <option value="分針" ${currentTarget === '分針' ? 'selected' : ''}>分針</option>
                        <option value="秒針" ${currentTarget === '秒針' ? 'selected' : ''}>秒針</option>
                    </select>
                </div>
            `;

            // 輔助函式：產生條列項目
            const renderItem = (isMet, text) => {
                const metClass = isMet ? 'met' : '';
                return `
                <div class="condition-row ${metClass}">
                    <div class="condition-icon"></div>
                    <div class="condition-text">${text}</div>
                </div>`;
            };

            // 列表內容
            html += renderItem(cond1, `1. 三時代收集: 時代 ${uniqueAges}/3, 珍貴 ${preciousCount}/1`);
            html += renderItem(cond2, `2. 數字收藏家: 數字 ${uniqueNumbers}/4, 珍貴 ${preciousCount}/1`);
            html += renderItem(cond3, `3. 魔力滿溢: 總數 ${totalCount}/5, 珍貴 ${preciousCount}/2`);

            // 達成提示
            if (isReady) {
                 html += `<div style="margin-top:8px; color:#ffd27f; text-align:center; font-weight:bold; border:1px solid #ffd27f; background: rgba(255, 210, 127, 0.1); padding:6px; border-radius:4px;">
                             ✨ 進化條件已達成！<br><span style="font-size:0.8rem; font-weight:normal;">(將於回合結束時觸發)</span>
                         </div>`;
            }

            progressArea.innerHTML = html;

            // 綁定下拉選單事件
            const selectEl = document.getElementById('target-role-select');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    humanPlayer.targetRoleName = e.target.value;
                    // 若需要即時存檔或反應，可在此呼叫 updateUI(globalGameState)，但通常不需要
                });
            }
        }
    } else {
        // 如果不是時魔，清空該區域
        const progressArea = document.getElementById('evolution-progress-area');
        if (progressArea) progressArea.innerHTML = '';
    }

}


// 4. 綁定按鈕事件
document.addEventListener('DOMContentLoaded', () => {
    try { console.log('[UI] 已載入，等待開始遊戲。'); } catch (_) {}

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
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(targetId) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active-tab'));

        const activeBtn = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
        const targetEl = document.getElementById(targetId);

        if (activeBtn) activeBtn.classList.add('active');
        if (targetEl) targetEl.classList.add('active-tab');
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            switchTab(targetId);
        });
    });

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

            const nextBtn = document.getElementById('next-step-btn');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = "執行下一回合";
                nextBtn.onclick = () => {
                    if (!globalGameState) return;

                    const waitingMinute = globalGameState.currentRoundAIChoices !== null;
                    const waitingHour = !!globalGameState.waitingHourChoice && globalGameState.waitingHourChoicePlayerId === HUMAN_PLAYER_ID;
                    const waitingAbility = !!globalGameState.waitingAbilityChoice && globalGameState.waitingAbilityChoicePlayerId === HUMAN_PLAYER_ID;
                    const waitingSecondFinal =
                        !!globalGameState.waitingSecondHandFinalChoice &&
                        globalGameState.waitingSecondHandFinalChoicePlayerId === HUMAN_PLAYER_ID;

                    if (isSecondHandSelectingTwo || waitingMinute || waitingHour || waitingAbility || waitingSecondFinal) {
                        console.log('【UI】仍在等待人類輸入（出牌/選卡/能力），請先完成當前步驟。');
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
        } catch (err) {
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

					const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
						? window.getEffectiveHumanPlayerId()
						: (typeof window.HUMAN_PLAYER_ID !== 'undefined'
							? window.HUMAN_PLAYER_ID
							: (typeof HUMAN_PLAYER_ID !== 'undefined' ? HUMAN_PLAYER_ID : 'SM_1'));

					const humanPlayer = globalGameState.players.find(p => p.id === humanId);
					if (humanPlayer) console.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);

					updateUI(globalGameState);

					const nextBtn = document.getElementById('next-step-btn');
					if (nextBtn) {
						nextBtn.disabled = false;
						nextBtn.textContent = "下一回合";
					}
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

    // 邏輯 2：綁定角色選擇按鈕 -> 設定 ID -> 初始化遊戲
    const btnTimeDemon = document.getElementById('role-choice-timeDemon');
    const btnSin = document.getElementById('role-choice-sin');
    const btnScz = document.getElementById('role-choice-scz');

    function selectRoleAndStart(roleId) {
        // 設定全域人類玩家 ID
        if (typeof setHumanPlayerId === 'function') {
            setHumanPlayerId(roleId);
        } else {
            window.HUMAN_PLAYER_ID = roleId;
        }

        // 關閉彈窗
        if (roleOverlay) roleOverlay.style.display = 'none';

        // 執行遊戲初始化
        runGameInitialization();
    }

    if (btnTimeDemon) btnTimeDemon.addEventListener('click', () => selectRoleAndStart('SM_1'));
    if (btnSin) btnSin.addEventListener('click', () => selectRoleAndStart('sin'));
    if (btnScz) btnScz.addEventListener('click', () => selectRoleAndStart('SCZ'));
	
});
