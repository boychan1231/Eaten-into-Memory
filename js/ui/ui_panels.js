// ui_panels.js - 側邊抽屜、出牌歷史、積分、棄牌與異能任務面板

// ==== 右側資訊面板（UI 狀態） ====
const UI_HISTORY_LIMIT = window.UI_CONFIG?.HISTORY_LIMIT || 12;
let uiMinuteHistory = {};
let uiLastRecordedTurnKey = null;
const minuteHistoryRenderCache = {
    order: [],
    rows: new Map(),
    historySignature: new Map()
};

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
    if (typeof window !== 'undefined' && typeof window.resetPlayerStatsTracking === 'function') {
        window.resetPlayerStatsTracking();
    } else if (typeof lastPlayerStats !== 'undefined') {
        lastPlayerStats = {};
    }
    for (const k of Object.keys(uiMinuteHistory)) delete uiMinuteHistory[k];
    minuteHistoryRenderCache.order = [];
    minuteHistoryRenderCache.rows.clear();
    minuteHistoryRenderCache.historySignature.clear();
    if (!gameState) return;
    gameState.players.forEach(p => { uiMinuteHistory[p.id] = []; });
    const histEl = document.getElementById('player-history-list');
    if (histEl) histEl.innerHTML = '';
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

                const safePlayerName = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                    ? window.escapeHtml(choice.playerName)
                    : String(choice.playerName ?? '');
                row.innerHTML = `
                    <span class="p-name" style="color:${color}" title="${safePlayerName}">${safePlayerName}</span>
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

// 綁定積分面板頁籤 (即時總分 / 勝利進度 / 得分歷程)
function bindScoreTabs() {
    const tabButtons = document.querySelectorAll('.score-tab-btn');
    tabButtons.forEach(btn => {
        if (btn._tabBound) return;
        btn._tabBound = true;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetTab = btn.getAttribute('data-score-tab');
            const parentPanel = btn.closest('.score-panel');
            if (!parentPanel) return;
            parentPanel.querySelectorAll('.score-tab-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            const panes = parentPanel.querySelectorAll('.score-tab-content');
            panes.forEach(pane => {
                const isTarget = pane.id === `score-tab-content-${targetTab}`;
                pane.style.display = isTarget ? 'block' : 'none';
                if (isTarget) pane.classList.add('active');
                else pane.classList.remove('active');
            });
        });
    });
}

// ✅ 渲染積分面板 (支援即時總分、勝利進度與得分歷程分頁)
function renderScorePanel(gameState) {
    if (!gameState) return;

    // 動態確保 DOM 中具備特殊勝利進度分頁元素 (防禦性回退機制)
    const scorePanels = document.querySelectorAll('.score-panel');
    scorePanels.forEach(panel => {
        const tabBar = panel.querySelector('.score-tab-bar');
        if (tabBar && !tabBar.querySelector('[data-score-tab="special"]')) {
            const histBtn = tabBar.querySelector('[data-score-tab="history"]');
            const specialBtn = document.createElement('button');
            specialBtn.type = 'button';
            specialBtn.className = 'score-tab-btn';
            specialBtn.setAttribute('data-score-tab', 'special');
            specialBtn.setAttribute('data-i18n', 'ui.scores.tab_special_victory');
            specialBtn.textContent = (window.i18n ? window.i18n.t('ui.scores.tab_special_victory') : null) || '★ 勝利進度';
            if (histBtn) tabBar.insertBefore(specialBtn, histBtn);
            else tabBar.appendChild(specialBtn);
        }

        if (!panel.querySelector('#score-tab-content-special')) {
            const histPane = panel.querySelector('#score-tab-content-history');
            const specialPane = document.createElement('div');
            specialPane.id = 'score-tab-content-special';
            specialPane.className = 'score-tab-content';
            specialPane.style.display = 'none';
            const meterEl = document.createElement('div');
            meterEl.id = 'score-special-victory-meter';
            meterEl.className = 'score-special-meter-panel';
            specialPane.appendChild(meterEl);
            if (histPane) panel.insertBefore(specialPane, histPane);
            else panel.appendChild(specialPane);
        }

        const standingsPane = panel.querySelector('#score-tab-content-standings');
        if (standingsPane && !standingsPane.querySelector('#score-special-victory-mini')) {
            const miniBar = document.createElement('div');
            miniBar.id = 'score-special-victory-mini';
            miniBar.className = 'score-special-mini-bar';
            standingsPane.insertBefore(miniBar, standingsPane.firstChild);
        }
    });

    bindScoreTabs();

    // 1. 渲染即時總分榜 (score-list)
    const lists = document.querySelectorAll('#score-list');
    lists.forEach(list => {
        list.innerHTML = '';
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        const maxScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : -999;

        sortedPlayers.forEach(p => {
            const row = document.createElement('div');
            row.className = 'score-row';

            if (p.score === maxScore && p.score > 0) {
                row.classList.add('leader');
            }
            if (p.isEjected) {
                row.style.opacity = '0.5';
                row.style.textDecoration = 'line-through';
            }

            const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
            const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey])
                ? window.UI_CONFIG.ROLE_COLORS[roleKey]
                : '#ccc';

            const safeName = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                ? window.escapeHtml(p.name)
                : String(p.name ?? '');
            row.innerHTML = `
                <span class="score-name" style="color:${color}">${safeName}</span>
                <span class="score-val">${p.score}</span>
            `;
            list.appendChild(row);
        });
    });

    // 2. 渲染得分歷程分頁 (score-history-list)
    const histContainers = document.querySelectorAll('#score-history-list');
    histContainers.forEach(container => {
        container.innerHTML = '';

        if (!Array.isArray(gameState.scoreHistory) || gameState.scoreHistory.length === 0) {
            container.innerHTML = `
                <div class="score-history-empty">
                    <div class="score-history-empty-icon material-symbols-outlined">hourglass_empty</div>
                    <div class="score-history-empty-title">第 1 局進行中</div>
                    <div class="score-history-empty-desc">每局結算後，此處將記錄各角色的當局得分、吞噬狀態與累計分數變化。</div>
                </div>
            `;
            return;
        }

        // A. 全體角色歷程總覽 (每位角色的各局得分軌跡)
        const summaryWrapper = document.createElement('div');
        summaryWrapper.className = 'score-history-players-overview';
        summaryWrapper.innerHTML = `<div class="score-history-section-title"><span class="material-symbols-outlined icon-inline">bar_chart</span> 角色得分軌跡</div>`;

        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        sortedPlayers.forEach(p => {
            const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
            const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey])
                ? window.UI_CONFIG.ROLE_COLORS[roleKey]
                : '#ccc';

            const roundPills = gameState.scoreHistory.map(entry => {
                const pEntry = Array.isArray(entry.players) ? entry.players.find(x => x.id === p.id) : null;
                if (!pEntry) return '';
                const scoreText = pEntry.wasEjected ? '0齒(被吞噬)' : `+${pEntry.roundScore}齒`;
                const extraClass = pEntry.wasEjected ? 'ejected' : '';
                return `<span class="score-round-chip ${extraClass}">第${entry.round}局: ${scoreText}</span>`;
            }).join('');

            const safePlayerName = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                ? window.escapeHtml(p.name)
                : String(p.name ?? '');
            const playerCard = document.createElement('div');
            playerCard.className = 'score-player-summary-card';
            playerCard.innerHTML = `
                <div class="score-player-summary-header">
                    <span class="score-name" style="color:${color}">${safePlayerName}</span>
                    <span class="score-val">${p.score} 分</span>
                </div>
                <div class="score-round-chips">${roundPills}</div>
            `;
            summaryWrapper.appendChild(playerCard);
        });
        container.appendChild(summaryWrapper);

        // B. 各局結算明細清單 (由新到舊倒序呈現)
        const roundsWrapper = document.createElement('div');
        roundsWrapper.className = 'score-history-rounds-list';
        roundsWrapper.innerHTML = `<div class="score-history-section-title" style="margin-top: 10px;"><span class="material-symbols-outlined icon-inline">history_edu</span> 各局結算明細</div>`;

        const reversedHistory = [...gameState.scoreHistory].reverse();
        reversedHistory.forEach(entry => {
            const roundCard = document.createElement('div');
            roundCard.className = 'score-history-round-card';

            let rowsHtml = '';
            if (Array.isArray(entry.players)) {
                entry.players.forEach(p => {
                    const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
                    const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey])
                        ? window.UI_CONFIG.ROLE_COLORS[roleKey]
                        : '#ccc';
                    const gainClass = p.wasEjected ? 'ejected' : (p.roundScore > 0 ? '' : 'zero');
                    const gainText = p.wasEjected ? '<s>+0 齒</s> (被吞噬)' : `+${p.roundScore} 齒`;
                    const safeHistoryName = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                        ? window.escapeHtml(p.name)
                        : String(p.name ?? '');

                    rowsHtml += `
                        <div class="score-history-row">
                            <span class="score-history-name" style="color:${color}">${safeHistoryName}</span>
                            <div class="score-history-numbers">
                                <span class="score-history-gain ${gainClass}">${gainText}</span>
                                <span class="score-history-total">累計 ${p.totalScore}分</span>
                            </div>
                        </div>
                    `;
                });
            }

            roundCard.innerHTML = `
                <div class="score-history-round-header">
                    <span><span class="material-symbols-outlined icon-inline">trophy</span> 第 ${entry.round} 局結算快照</span>
                </div>
                <div class="score-history-rows">${rowsHtml}</div>
            `;
            roundsWrapper.appendChild(roundCard);
        });
        container.appendChild(roundsWrapper);
    });

    // 3. 渲染特殊勝利進度計 (mini 摘要條與完整面板)
    renderSpecialVictoryScoreMeter(gameState);
}

// ✅ 渲染積分頁中的特殊勝利進度計 (mini 摘要條與獨立詳情面板)
function renderSpecialVictoryScoreMeter(gameState) {
    if (!gameState || !Array.isArray(gameState.players)) return;
    const t = (key, params) => (window.i18n ? window.i18n.t(key, params) : null);
    const currentMode = gameState.gameMode || (typeof getGameMode === 'function' ? getGameMode() : (gameState.players.length === 3 ? '3P' : '5P'));

    // 1. 渲染即時總分頁的 mini pill 摘要條 (#score-special-victory-mini)
    const miniBars = document.querySelectorAll('#score-special-victory-mini');
    miniBars.forEach(bar => {
        if (typeof currentMode === 'string' && currentMode.startsWith('PURE')) {
            const totalRounds = gameState.players.length;
            bar.innerHTML = `
                <div class="score-mini-pill mode-3p">
                    <span class="mini-pill-icon material-symbols-outlined">casino</span>
                    <span class="mini-pill-label">純競標 ${totalRounds}P</span>
                    <span class="mini-pill-val">第 ${gameState.gameRound}/${totalRounds} 局</span>
                </div>
            `;
        } else if (currentMode === '3P') {
            const aliveCount = gameState.players.filter(p => !p.isEjected).length;
            const total = gameState.players.length;
            const label3p = t('ui.scores.mini_3p_survivors') || '生還';
            bar.innerHTML = `
                <div class="score-mini-pill mode-3p" title="${t('ui.scores.view_details') || '點擊查看特殊勝利詳情'}">
                    <span class="mini-pill-icon material-symbols-outlined">settings</span>
                    <span class="mini-pill-label">3P ${label3p}</span>
                    <span class="mini-pill-val ${aliveCount === total ? 'achieved' : ''}">${aliveCount}/${total}</span>
                </div>
            `;
        } else {
            // 5P: 狩獵 X/3, 記憶 X/12, 時之惡 X⚙/已吞噬
            const timeDemons = gameState.players.filter(p => p.type === '時魔');
            const totalDemons = timeDemons.length || 3;
            const ejectedCount = timeDemons.filter(p => p.hasEverBeenEjected).length;
            const isHuntComplete = (totalDemons > 0 && ejectedCount >= totalDemons);

            let lockedCount = 0;
            if (Array.isArray(gameState.clockFace)) {
                gameState.clockFace.forEach(spot => {
                    if (Array.isArray(spot.cards)) {
                        lockedCount += spot.cards.filter(c => c.isPrecious && c.isLocked).length;
                    }
                });
            }
            const isLockComplete = (lockedCount >= 12);

            const sinPlayer = gameState.players.find(p => p.type === '時之惡');
            const isSinEjected = sinPlayer ? (sinPlayer.isEjected || sinPlayer.hasEverBeenEjected) : false;

            const labelHunt = t('ui.scores.mini_hunt') || '狩獵';
            const labelLock = t('ui.scores.mini_lock') || '記憶';
            const labelSin = t('ui.scores.mini_sin') || '時之惡';
            const tagSinEjected = t('ui.scores.mini_sin_ejected') || '已吞噬';

            bar.innerHTML = `
                <div class="score-mini-pill demon-hunt" title="${t('ui.scores.view_details') || '點擊查看特殊勝利詳情'}">
                    <span class="mini-pill-icon">◆</span>
                    <span class="mini-pill-label">${labelHunt}</span>
                    <span class="mini-pill-val ${isHuntComplete ? 'achieved' : ''}">${ejectedCount}/${totalDemons}</span>
                </div>
                <div class="score-mini-pill curse-lock" title="${t('ui.scores.view_details') || '點擊查看特殊勝利詳情'}">
                    <span class="mini-pill-icon material-symbols-outlined">lock</span>
                    <span class="mini-pill-label">${labelLock}</span>
                    <span class="mini-pill-val ${isLockComplete ? 'achieved' : ''}">${lockedCount}/12</span>
                </div>
                <div class="score-mini-pill time-demon" title="${t('ui.scores.view_details') || '點擊查看特殊勝利詳情'}">
                    <span class="mini-pill-icon material-symbols-outlined">swords</span>
                    <span class="mini-pill-label">${labelSin}</span>
                    <span class="mini-pill-val ${isSinEjected ? 'achieved' : ''}">${isSinEjected ? tagSinEjected : `${sinPlayer ? sinPlayer.gearCards : 0}⚙`}</span>
                </div>
            `;
        }

        // 綁定點擊切換至 special tab
        if (!bar._bound) {
            bar._bound = true;
            bar.addEventListener('click', (e) => {
                e.preventDefault();
                const parentPanel = bar.closest('.score-panel');
                if (parentPanel) {
                    const btn = parentPanel.querySelector('[data-score-tab="special"]');
                    if (btn) btn.click();
                }
            });
        }
    });

    // 2. 渲染獨立的特殊勝利進度分頁 (#score-special-victory-meter)
    const fullMeters = document.querySelectorAll('#score-special-victory-meter');
    const renderFn = (typeof renderSpecialVictoryProgress === 'function')
        ? renderSpecialVictoryProgress
        : (typeof window !== 'undefined' && typeof window.renderSpecialVictoryProgress === 'function' ? window.renderSpecialVictoryProgress : null);

    if (renderFn) {
        fullMeters.forEach(meterContainer => {
            renderFn(gameState, meterContainer);
        });
    }
}



// --- D-0. 出牌記錄 (Played Cards Record) 與彈窗 ---
function getTopDiscardCard(gameState) {
    if (!gameState) return null;
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : 'SM_1');

    // 優先使用最後打出的卡牌
    if (gameState.lastPlayedCard && gameState.lastPlayedCard.value !== undefined) {
        return gameState.lastPlayedCard;
    }

    // 從 minuteDiscard 倒序搜尋最後一張牌
    const discard = gameState.minuteDiscard;
    if (Array.isArray(discard) && discard.length > 0) {
        const lastEntry = discard[discard.length - 1];
        if (lastEntry) {
            const val = (lastEntry.card && lastEntry.card.value !== undefined) ? lastEntry.card.value : lastEntry.value;
            if (val !== undefined) {
                return {
                    value: val,
                    gear: (lastEntry.card && lastEntry.card.gear !== undefined) ? lastEntry.card.gear : lastEntry.gear,
                    playerId: lastEntry.playerId,
                    playerName: lastEntry.playerName || '',
                    roleType: lastEntry.roleType || '',
                    isHuman: !!(lastEntry.isHuman || lastEntry.playerId === humanId)
                };
            }
        }
    }
    return null;
}

function getAllPlayedCardsInCurrentGameRound(gameState) {
    if (!gameState) return [];
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : 'SM_1');

    const result = [];
    const seenCards = new Set(); // 記錄本局已納入的卡牌點數，確保不重複

    // 1. 本局已進入出牌記錄/棄牌堆的卡牌 (包含所有玩家)
    if (Array.isArray(gameState.minuteDiscard)) {
        gameState.minuteDiscard.forEach(item => {
            if (!item) return;
            const val = (item.card && item.card.value !== undefined) ? item.card.value : item.value;
            if (val !== undefined && !seenCards.has(val)) {
                seenCards.add(val);
                result.push({
                    value: val,
                    gear: (item.card && item.card.gear !== undefined) ? item.card.gear : item.gear,
                    playerId: item.playerId,
                    playerName: item.playerName || '',
                    roleType: item.roleType || '',
                    gameRound: item.gameRound || gameState.gameRound || 1,
                    roundMarker: item.roundMarker || 1,
                    isHuman: !!(item.isHuman || item.playerId === humanId)
                });
            }
        });
    }

    // 2. 若當前回合正在比大小或選小時卡，尚未入堆的卡牌也併入
    if (Array.isArray(gameState.currentMinuteChoices)) {
        gameState.currentMinuteChoices.forEach(c => {
            if (!c || !c.card || c.card.type === 'seconds_pending') return;
            const val = c.card.value;
            if (typeof val === 'number' && !seenCards.has(val)) {
                seenCards.add(val);
                result.push({
                    value: val,
                    gear: c.card.gear,
                    playerId: c.playerId,
                    playerName: c.playerName || '',
                    roleType: c.roleType || '',
                    gameRound: gameState.gameRound || 1,
                    roundMarker: gameState.roundMarker || 1,
                    isHuman: !!(c.isHuman || c.playerId === humanId)
                });
            }
        });
    }

    return result;
}

function resolveCurrentPlayerName(item, gameState) {
    if (!item) return '';
    if (gameState && Array.isArray(gameState.players) && item.playerId) {
        const livePlayer = gameState.players.find(p => p.id === item.playerId);
        if (livePlayer && livePlayer.name) {
            return (window.i18n && typeof window.i18n.getRoleName === 'function')
                ? window.i18n.getRoleName(livePlayer.name)
                : livePlayer.name;
        }
    }
    return item.playerName || '';
}

function formatDiscardPlayerShortTag(item, gameState) {
    const t = (k, p) => (window.i18n ? window.i18n.t(k, p) : null);
    if (!item) return '';
    if (item.isHuman) {
        return t('ui.labels.you_tag') || '★我';
    }
    const name = resolveCurrentPlayerName(item, gameState);
    return name ? name.slice(0, 2) : 'AI';
}

function renderDiscardPile(gameState, humanPlayer) {
    const zoneEl = document.getElementById('discard-pile-zone');
    if (!zoneEl) return;

    const stackEl = document.getElementById('discard-pile-stack') || zoneEl.querySelector('.discard-pile-stack');
    const badgeEl = document.getElementById('discard-pile-badge') || zoneEl.querySelector('.discard-pile-badge');
    const handCountNumEl = document.getElementById('discard-hand-count-num') || zoneEl.querySelector('#discard-hand-count-num');
    const handCountTagEl = document.getElementById('discard-hand-count-tag') || zoneEl.querySelector('.discard-hand-count-tag');

    const allPlayed = getAllPlayedCardsInCurrentGameRound(gameState);
    const topCard = getTopDiscardCard(gameState);

    // 更新出牌計數標籤
    if (badgeEl) {
        badgeEl.textContent = String(allPlayed.length);
        if (allPlayed.length === 0) {
            badgeEl.classList.add('is-zero');
        } else {
            badgeEl.classList.remove('is-zero');
        }
    }

    // 更新棄牌區旁現時手牌數標記
    if (handCountNumEl) {
        const handCount = Array.isArray(humanPlayer?.hand) ? humanPlayer.hand.length : 0;
        handCountNumEl.textContent = String(handCount);
        if (handCountTagEl) {
            if (handCount === 0) {
                handCountTagEl.classList.add('is-zero');
            } else {
                handCountTagEl.classList.remove('is-zero');
            }
        }
    }

    const t = (k, p) => (window.i18n ? window.i18n.t(k, p) : null);

    if (stackEl) {
        if (topCard && topCard.value !== undefined) {
            stackEl.classList.add('has-cards');
            if (allPlayed.length >= 2) {
                stackEl.classList.add('has-multiple');
            } else {
                stackEl.classList.remove('has-multiple');
            }

            const tagText = topCard.isHuman ? (t('ui.labels.you_tag') || '★我') : formatDiscardPlayerShortTag(topCard, gameState);
            const tagTitle = topCard.isHuman ? '你的出牌' : `${resolveCurrentPlayerName(topCard, gameState)} 的出牌`;
            stackEl.innerHTML = `
                <div class="discard-top-card">
                    <div class="card-val">${topCard.value}</div>
                    <div class="card-gear">${topCard.gear ? '⚙️' : ''}</div>
                    <div class="card-player-tag ${topCard.isHuman ? 'is-human' : ''}" title="${tagTitle}">${tagText}</div>
                </div>
            `;
            const tooltipStr = t('ui.discard_pile.tooltip', { count: allPlayed.length }) || `點擊查看出牌記錄 (共 ${allPlayed.length} 張)`;
            zoneEl.setAttribute('title', tooltipStr);
            zoneEl.setAttribute('aria-label', tooltipStr);
        } else {
            stackEl.classList.remove('has-cards', 'has-multiple');
            const emptyTitle = t('ui.discard_pile.title') || '出牌記錄';
            stackEl.innerHTML = `
                <div class="discard-card-empty">
                    <span class="discard-empty-icon material-symbols-outlined">history_edu</span>
                    <span class="discard-empty-text">${emptyTitle}</span>
                </div>
            `;
            const emptySub = t('ui.discard_pile.empty_sub') || '尚無出牌 · 點擊查看出牌記錄';
            zoneEl.setAttribute('title', emptySub);
            zoneEl.setAttribute('aria-label', emptySub);
        }
    }
}

function renderDiscardPileModal(gameState) {
    const overlay = document.getElementById('discard-pile-overlay');
    if (!overlay) return;

    const t = (k, p) => (window.i18n ? window.i18n.t(k, p) : null);
    const roundBadge = document.getElementById('discard-round-badge');
    const countBadge = document.getElementById('discard-count-badge');
    const currentTrickList = document.getElementById('discard-current-trick-list');
    const playerHistoryList = document.getElementById('discard-player-history-list');
    const timelineList = document.getElementById('discard-timeline-list');
    const matrixGrid = document.getElementById('discard-matrix-grid');

    const currentRound = gameState ? (gameState.gameRound || 1) : 1;
    const allPlayed = getAllPlayedCardsInCurrentGameRound(gameState);
    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : (typeof window.HUMAN_PLAYER_ID !== 'undefined' ? window.HUMAN_PLAYER_ID : 'SM_1');

    if (roundBadge) {
        roundBadge.textContent = t('ui.labels.game_round', { round: currentRound }) || `第 ${currentRound} 局`;
    }
    if (countBadge) {
        countBadge.textContent = `已出 ${allPlayed.length} 張`;
    }

    // 1. 各角色歷程頁籤：本回合出牌 + 各角色出牌歷程
    if (currentTrickList) {
        currentTrickList.innerHTML = '';
        const choices = (gameState && Array.isArray(gameState.currentMinuteChoices)) ? gameState.currentMinuteChoices : [];
        if (choices.length > 0) {
            const sortedChoices = [...choices].sort((a, b) => {
                const valA = (a.card && typeof a.card.value === 'number') ? a.card.value : 999;
                const valB = (b.card && typeof b.card.value === 'number') ? b.card.value : 999;
                return valB - valA;
            });

            sortedChoices.forEach(choice => {
                const isHuman = (choice.playerId === humanId || choice.isHuman);
                const displayValue = (choice.card.type === 'seconds_pending') ? '??' : choice.card.value;
                const roleKey = (choice.roleType && choice.roleType.includes('時魔')) ? '時魔' : choice.roleType;
                const color = ROLE_COLORS[roleKey] || '#ccc';

                const esc = (v) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                    ? window.escapeHtml(v)
                    : String(v ?? '');
                const cardItem = document.createElement('div');
                cardItem.className = `discard-current-card-item ${isHuman ? 'is-human' : ''}`;
                cardItem.innerHTML = `
                    <span class="player-lbl" style="color:${color}">${esc(choice.playerName || '玩家')}</span>
                    ${isHuman ? '<span class="player-you-pill">你</span>' : ''}
                    <span class="card-val-badge">${displayValue}</span>
                    ${choice.card.gear ? '<span title="齒輪" style="color:#ffd27f; font-size:0.85rem;">⚙</span>' : ''}
                `;
                currentTrickList.appendChild(cardItem);
            });
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'played-placeholder';
            placeholder.style.cssText = 'color:#888; font-size:0.9rem; padding:8px 0;';
            placeholder.textContent = (gameState && gameState.currentRoundAIChoices !== null) ? '（等待確認出牌）' : '（尚未出牌）';
            currentTrickList.appendChild(placeholder);
        }
    }

    if (playerHistoryList) {
        playerHistoryList.innerHTML = '';
        const players = (gameState && Array.isArray(gameState.players)) ? gameState.players : [];
        players.forEach(player => {
            const isHuman = (player.id === humanId);
            const roleKey = (player.roleCard && player.roleCard.includes('時魔')) ? '時魔' : player.roleCard;
            const color = ROLE_COLORS[roleKey] || '#ccc';

            const row = document.createElement('div');
            row.className = `discard-player-history-row ${isHuman ? 'is-human' : ''}`;

            const historyArr = uiMinuteHistory[player.id] || [];
            let chipsHtml = '';
            for (let i = 0; i < UI_HISTORY_LIMIT; i++) {
                const val = historyArr[i];
                if (val !== undefined && val !== null) {
                    chipsHtml += `<span class="discard-history-chip">${val}</span>`;
                } else {
                    chipsHtml += `<span class="discard-history-chip empty">—</span>`;
                }
            }

            const safeName = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                ? window.escapeHtml(player.name)
                : String(player.name ?? '');
            row.innerHTML = `
                <div class="discard-player-history-name">
                    <span style="color:${color}; font-weight:700;">${safeName}</span>
                    ${isHuman ? '<span class="player-you-pill">你</span>' : ''}
                </div>
                <div class="discard-player-history-chips">${chipsHtml}</div>
            `;
            playerHistoryList.appendChild(row);
        });
    }

    // 2. 依回合記錄時間線（展示本局所有回合各玩家出牌）
    if (timelineList) {
        timelineList.innerHTML = '';
        if (allPlayed.length === 0) {
            const emptyTip = document.createElement('div');
            emptyTip.className = 'discard-empty-placeholder';
            emptyTip.style.cssText = 'text-align: center; color: #888; padding: 25px 0; font-size: 0.95rem;';
            emptyTip.textContent = t('ui.discard_pile.empty') || '本局尚未打出任何卡牌。';
            timelineList.appendChild(emptyTip);
        } else {
            // 依回合 (roundMarker) 分群
            const groupsByTrick = {};
            allPlayed.forEach(item => {
                const tr = item.roundMarker || 1;
                if (!groupsByTrick[tr]) groupsByTrick[tr] = [];
                groupsByTrick[tr].push(item);
            });

            // 由最新回合往最舊回合排
            const sortedTricks = Object.keys(groupsByTrick)
                .map(Number)
                .sort((a, b) => b - a);

            const escText = (v) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
                ? window.escapeHtml(v)
                : String(v ?? '');
            sortedTricks.forEach(tr => {
                const trickCards = groupsByTrick[tr];
                const trickCardEl = document.createElement('div');
                trickCardEl.className = 'discard-trick-card';

                const trickTitle = t('ui.discard_pile.trick_title', { trick: tr }) || `第 ${tr} 回合`;

                const trickHeaderEl = document.createElement('div');
                trickHeaderEl.className = 'discard-trick-header';
                trickHeaderEl.innerHTML = `
                    <span>${escText(trickTitle)}</span>
                    <span style="font-weight: normal; font-size: 0.8rem; color: #ffd27f;">共出 ${trickCards.length} 張</span>
                `;
                trickCardEl.appendChild(trickHeaderEl);

                const entriesEl = document.createElement('div');
                entriesEl.className = 'discard-trick-entries';

                // 回合內卡牌依點數由大到小展示
                [...trickCards].sort((a, b) => b.value - a.value).forEach(cardItem => {
                    const chip = document.createElement('div');
                    const isHuman = !!cardItem.isHuman;
                    chip.className = `discard-entry-chip ${isHuman ? 'is-human' : ''}`;
                    const tag = isHuman ? '★我:' : `${resolveCurrentPlayerName(cardItem, gameState)}:`;
                    chip.innerHTML = `
                        <span class="entry-player">${escText(tag)}</span>
                        <span class="entry-card-val">[ ${cardItem.value} ]</span>
                        ${cardItem.gear ? `<span class="entry-gear" title="${escText(cardItem.gear)}">⚙</span>` : ''}
                    `;
                    entriesEl.appendChild(chip);
                });

                trickCardEl.appendChild(entriesEl);
                timelineList.appendChild(trickCardEl);
            });
        }
    }

    // 3. 數字盤 (1~60) 矩陣（標註全場已打出的卡牌與玩家）
    if (matrixGrid) {
        matrixGrid.innerHTML = '';
        const playedMap = new Map();
        allPlayed.forEach(item => {
            playedMap.set(item.value, item);
        });

        for (let v = 1; v <= 60; v++) {
            const cell = document.createElement('div');
            const found = playedMap.get(v);
            if (found) {
                const isHuman = !!found.isHuman;
                cell.className = `matrix-cell played ${isHuman ? 'is-human' : ''}`;
                const who = isHuman ? '你' : resolveCurrentPlayerName(found, gameState);
                cell.title = `[${v}] 由 ${who} (第 ${found.roundMarker} 回合) 打出`;
                const subTag = isHuman ? '★我' : formatDiscardPlayerShortTag(found, gameState);
                cell.innerHTML = `
                    <span class="cell-num">${v}</span>
                    <span class="cell-sub">${subTag}</span>
                `;
            } else {
                cell.className = 'matrix-cell unplayed';
                cell.title = `[${v}] 尚未打出`;
                cell.innerHTML = `<span class="cell-num">${v}</span>`;
            }
            matrixGrid.appendChild(cell);
        }
    }
}
