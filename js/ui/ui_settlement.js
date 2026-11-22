// js/ui/ui_settlement.js
// 局末／終局結算面板、特殊勝利進度、回憶故事彈窗、下一回合自動倒數與開局過場彈窗

function renderSpecialVictoryProgress(gameState, container) {
    if (!container || !gameState || !Array.isArray(gameState.players)) return;

    const t = (key, params) => (window.i18n ? window.i18n.t(key, params) : null);
    const currentMode = gameState.gameMode || (typeof getGameMode === 'function' ? getGameMode() : (gameState.players.length === 3 ? '3P' : '5P'));

    const sectionTitle = t('ui.special_victory.title') || '★ 特殊勝利達成進度';

    let cardsHtml = '';

    if (currentMode === '3P') {
        // --- 3P 指針生還競速模式 ---
        const title3p = t('ui.special_victory.mode_3p_title') || '◈ 3P 指針競速對決';
        const desc3p = t('ui.special_victory.mode_3p_desc') || '純指針 GP 積分爭奪賽 (以最高積分獲勝)';

        const pointerBadges = gameState.players.map(p => {
            const roleName = p.roleCard || p.name;
            if (p.isEjected) {
                const defTag = t('ui.special_victory.defeated_tag') || '☠ 遭吞噬';
                return `<span class="sv-tag sv-tag-danger">${roleName}: ${defTag} (${p.score ?? 0}分)</span>`;
            } else {
                const survTag = t('ui.special_victory.survived_tag', { gears: p.gearCards ?? 0 }) || `⛨ 生還 (${p.gearCards ?? 0} GP)`;
                return `<span class="sv-tag sv-tag-safe">${roleName}: ${survTag} (${p.score ?? 0}分)</span>`;
            }
        }).join(' ');

        cardsHtml = `
            <div class="special-victory-card mode-3p">
                <div class="sv-card-head">
                    <div class="sv-card-title" style="color: #a29bfe;">
                        <span>${title3p}</span>
                    </div>
                    <span class="sv-card-status sv-status-progress">3P 競速</span>
                </div>
                <div style="font-size:0.8rem; color:#aaa; margin-bottom:6px;">${desc3p}</div>
                <div class="sv-card-details">
                    ${pointerBadges}
                </div>
            </div>
        `;
    } else {
        // --- 5P 陣營扮演模式 (三大特殊勝利) ---
        // 1. 時之惡陣營：完全狩獵
        const timeDemons = gameState.players.filter(p => p.type === '時魔');
        const totalDemons = timeDemons.length || 3;
        const ejectedCount = timeDemons.filter(p => p.hasEverBeenEjected).length;
        const isHuntComplete = (totalDemons > 0 && ejectedCount >= totalDemons);
        const huntPercent = Math.min(100, Math.round((ejectedCount / totalDemons) * 100));

        const huntTitle = t('ui.special_victory.demon_hunt_title') || '◆ 時之惡：完全狩獵';
        const huntDesc = t('ui.special_victory.demon_hunt_desc') || '將全場 3 位時魔各吞噬出局至少一次';
        const huntStatusText = isHuntComplete
            ? (t('ui.special_victory.demon_hunt_status_achieved') || '✦ 達成 (狩獵完成)')
            : (t('ui.special_victory.demon_hunt_status_in_progress', { current: ejectedCount }) || `進行中 (${ejectedCount}/3)`);

        const tagEjected = t('ui.special_victory.ejected_tag') || '☠ 已吞噬';
        const tagNotEjected = t('ui.special_victory.not_ejected_tag') || '⛨ 未曾被吞噬';

        const demonBadges = timeDemons.map(p => {
            const roleName = p.roleCard || p.name;
            if (p.hasEverBeenEjected) {
                return `<span class="sv-tag sv-tag-danger">${roleName}: ${tagEjected}</span>`;
            } else {
                return `<span class="sv-tag sv-tag-safe">${roleName}: ${tagNotEjected}</span>`;
            }
        }).join(' ');

        // 2. 受詛者陣營：記憶之鎖 (在鐘面鎖定 12 張珍貴卡)
        const lockedPreciousList = [];
        if (Array.isArray(gameState.clockFace)) {
            gameState.clockFace.forEach(spot => {
                if (Array.isArray(spot.cards)) {
                    spot.cards.forEach(card => {
                        if (card.isPrecious && card.isLocked) {
                            lockedPreciousList.push({ spot: spot.position, number: card.number });
                        }
                    });
                }
            });
        }
        const lockedCount = lockedPreciousList.length;
        const isLockComplete = (lockedCount >= 12);
        const lockPercent = Math.min(100, Math.round((lockedCount / 12) * 100));

        const lockTitle = t('ui.special_victory.curse_lock_title') || '◈ 受詛者：記憶之鎖';
        const lockDesc = t('ui.special_victory.curse_lock_desc') || '在鐘面上鎖定 12 張珍貴卡';
        const lockStatusText = isLockComplete
            ? (t('ui.special_victory.curse_lock_status_achieved') || '✦ 達成 (記憶解放)')
            : (t('ui.special_victory.curse_lock_status_in_progress', { current: lockedCount }) || `進行中 (${lockedCount}/12)`);

        const lockedMarksPrefix = t('ui.special_victory.locked_marks') || '已鎖定刻度：';
        const lockedNoneText = t('ui.special_victory.locked_none') || '無';
        const lockedBadges = lockedPreciousList.length > 0
            ? lockedPreciousList.map(item => `<span class="sv-tag sv-tag-lock">◈ ${item.spot}點 (${item.number}★)</span>`).join(' ')
            : `<span style="color:#777; font-size:0.75rem;">${lockedNoneText}</span>`;

        // 3. 時魔陣營：吞噬時之惡
        const sinPlayer = gameState.players.find(p => p.type === '時之惡');
        const isSinEjected = sinPlayer ? (sinPlayer.isEjected || sinPlayer.hasEverBeenEjected) : false;
        const demonVicTitle = t('ui.special_victory.time_demon_victory_title') || '◆ 時魔陣營：吞噬時之惡';
        const demonVicDesc = t('ui.special_victory.time_demon_victory_desc') || '耗盡時之惡 GP 並將其吞噬出局';
        const demonVicStatusText = isSinEjected
            ? (t('ui.special_victory.time_demon_status_achieved') || '✦ 達成 (時之惡已被吞噬)')
            : (t('ui.special_victory.time_demon_status_in_progress', { gears: sinPlayer ? sinPlayer.gearCards : 0 }) || `未達成 (時之惡存活，剩餘 ${sinPlayer ? sinPlayer.gearCards : 0} GP)`);

        cardsHtml = `
            <!-- 時之惡：完全狩獵 -->
            <div class="special-victory-card demon-hunt ${isHuntComplete ? 'achieved' : ''}">
                <div class="sv-card-head">
                    <div class="sv-card-title" style="color: #feca57;">
                        <span>${huntTitle}</span>
                    </div>
                    <span class="sv-card-status ${isHuntComplete ? 'sv-status-achieved' : 'sv-status-progress'}">${huntStatusText}</span>
                </div>
                <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${huntDesc}</div>
                <div class="sv-progress-bar-bg">
                    <div class="sv-progress-bar-fill sv-fill-gold" style="width: ${huntPercent}%;"></div>
                </div>
                <div class="sv-card-details">
                    ${demonBadges}
                </div>
            </div>

            <!-- 受詛者：記憶之鎖 -->
            <div class="special-victory-card curse-lock ${isLockComplete ? 'achieved' : ''}">
                <div class="sv-card-head">
                    <div class="sv-card-title" style="color: #00d2d3;">
                        <span>${lockTitle}</span>
                    </div>
                    <span class="sv-card-status ${isLockComplete ? 'sv-status-achieved' : 'sv-status-progress'}">${lockStatusText}</span>
                </div>
                <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${lockDesc}</div>
                <div class="sv-progress-bar-bg">
                    <div class="sv-progress-bar-fill sv-fill-cyan" style="width: ${lockPercent}%;"></div>
                </div>
                <div class="sv-card-details">
                    <span style="font-size:0.75rem; color:#888;">${lockedMarksPrefix}</span>
                    ${lockedBadges}
                </div>
            </div>

            <!-- 時魔陣營：吞噬時之惡 -->
            <div class="special-victory-card time-demon ${isSinEjected ? 'achieved' : ''}">
                <div class="sv-card-head">
                    <div class="sv-card-title" style="color: #ff6b6b;">
                        <span>${demonVicTitle}</span>
                    </div>
                    <span class="sv-card-status ${isSinEjected ? 'sv-status-achieved' : 'sv-status-failed'}">${demonVicStatusText}</span>
                </div>
                <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${demonVicDesc}</div>
                <div class="sv-progress-bar-bg">
                    <div class="sv-progress-bar-fill sv-fill-red" style="width: ${isSinEjected ? 100 : 0}%;"></div>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="special-victory-header">
            <span>${sectionTitle}</span>
            <span style="font-size:0.75rem; color:#888; font-weight:normal;">${currentMode} 模式</span>
        </div>
        <div class="special-victory-grid">
            ${cardsHtml}
        </div>
    `;
    container.style.display = 'block';
}

function renderGameOverPanel(gameState) {
    const overlay = document.getElementById('game-over-overlay');
    const titleEl = document.getElementById('winner-title');
    const subEl = document.getElementById('winner-subtitle');
    const listEl = document.getElementById('game-over-ranking-list');

    if (!overlay || !listEl) return;

    // 1. 判斷陣營勝負 (邏輯與 game.js checkEjectionAndWinCondition 一致)
    const sinPlayer = gameState.players.find(p => p.type === '時之惡');
    const sczPlayer = gameState.players.find(p => p.type === '受詛者');
    const timeDemons = gameState.players.filter(p => p.type === '時魔');
    const aliveDemons = timeDemons.filter(p => !p.isEjected);
    // 檢查是否所有時魔都曾被吞噬 (累積全滅)
    const allDemonsEverEjected = timeDemons.every(p => p.hasEverBeenEjected);

    // 檢查受詛者鎖定 12 張珍貴卡
    let lockedPreciousCount = 0;
    if (Array.isArray(gameState.clockFace)) {
        gameState.clockFace.forEach(spot => {
            if (Array.isArray(spot.cards)) {
                lockedPreciousCount += spot.cards.filter(c => c.isPrecious && c.isLocked).length;
            }
        });
    }
    const sczMissionSuccess = (lockedPreciousCount >= 12);

    const isPureGame = typeof gameState.gameMode === 'string' && gameState.gameMode.startsWith('PURE');

    let winnerText = "遊戲結束";
    let subText = "";
    let titleColor = "#fff";

    if (isPureGame) {
        const sortedPure = gameState.players.slice().sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const ejectDiff = (a.ejectionCount || 0) - (b.ejectionCount || 0);
            if (ejectDiff !== 0) return ejectDiff;
            return (b.bestRoundGear || 0) - (a.bestRoundGear || 0);
        });
        const topPlayer = sortedPure[0];
        winnerText = topPlayer ? `✦ ${topPlayer.name} 獲勝！` : "⧖ 遊戲結束";
        subText = `純競標模式 (${gameState.players.length}P) · 總積分最高者勝出`;
        titleColor = "#ffd27f";
    } else if (sinPlayer && sinPlayer.isEjected) {
        winnerText = "✦ 時魔陣營 獲勝！";
        subText = "時之惡已被吞噬";
        titleColor = "#ff6b6b"; // 時魔紅
    } else if (aliveDemons.length === 0 || allDemonsEverEjected) {
        winnerText = "◆ 時之惡陣營 獲勝！";
        subText = allDemonsEverEjected ? "完成「完全狩獵」(所有時魔皆曾被吞噬)" : "時魔全數陣亡";
        titleColor = "#feca57"; // 時之惡黃
    } else if (sczMissionSuccess) {
        winnerText = "✦ 受詛者 記憶解放！";
        subText = "成功鎖定 12 張珍貴卡，達成命運解脫";
        titleColor = "#00d2d3"; // 受詛者青綠
    } else {
        // 時間到 (回合數滿)
        winnerText = "⧖ 遊戲結束";
        subText = "結算最終積分";
    }

    if (titleEl) {
        titleEl.textContent = winnerText;
        titleEl.style.color = titleColor;
        titleEl.style.textShadow = `0 0 15px ${titleColor}`;
    }
    if (subEl) subEl.textContent = subText;

    // 特殊勝利達成進度渲染
    let svContainer = document.getElementById('special-victory-progress-container');
    if (!svContainer && subEl && subEl.parentNode) {
        svContainer = document.createElement('div');
        svContainer.id = 'special-victory-progress-container';
        svContainer.className = 'special-victory-section';
        subEl.parentNode.insertBefore(svContainer, subEl.nextSibling);
    }
    if (svContainer) {
        renderSpecialVictoryProgress(gameState, svContainer);
    }

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
        if (rank === 1) medal = '★ 1';
        else if (rank === 2) medal = '★ 2';
        else if (rank === 3) medal = '★ 3';

        // 角色顏色
        const roleKey = (p.roleCard && p.roleCard.includes('時魔')) ? '時魔' : p.roleCard;
        const color = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey]) || '#ccc';

        // 戰術榮譽高光標籤 (Match Highlights)
        let highlight = '';
        if (rank === 1) {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.champion') : null) || '★ 榮耀之冠';
        } else if (p.hourCards && p.hourCards.length >= 3) {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.collector') : null) || '◆ 記憶收藏家';
        } else if (!p.isEjected && p.gearCards > 0) {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.survivor') : null) || '⛨ 堅毅生還';
        } else if (p.type === '時之惡') {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.hunter') : null) || '◆ 終焉獵手';
        } else if (p.type === '受詛者' && (p.hourCards || []).some(c => c.isPrecious)) {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.destiny') : null) || '✦ 命運探索者';
        } else if (['時針', '分針', '秒針'].includes(p.roleCard)) {
            highlight = (window.i18n ? window.i18n.t('ui.match_highlights.awakened') : null) || '⧖ 覺醒者';
        }

        const esc = (v) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
            ? window.escapeHtml(v)
            : String(v ?? '');
        const highlightHtml = highlight ? `<span class="rank-highlight-tag">${esc(highlight)}</span>` : '';

        row.innerHTML = `
            <div class="rank-medal">${medal}</div>
            <div style="text-align:left; color:${color}; font-weight:bold;">${esc(p.name)} ${p.isEjected ? '(☠)' : ''} ${highlightHtml}</div>
            <div style="font-size:0.85rem; color:#aaa;">${esc(p.roleCard)}</div>
            <div style="font-family:monospace; font-size:1.2rem; font-weight:bold;">${p.score}</div>
        `;
        listEl.appendChild(row);
    });

    // 顯示視窗
    openModal(overlay, document.getElementById('btn-restart-game') || undefined);
}

// 綁定按鈕事件
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

    const btnStartNextRound = document.getElementById('btn-start-next-round');
    const readyOverlay = document.getElementById('round-ready-overlay');
    const readyCloseBtn = document.getElementById('round-ready-close-btn');

    if (readyOverlay) {
        // 建立共通的執行函式
        const proceedToNextRound = () => {
            // 播放確認音效
            if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
                window.gameAudio.playConfirm();
            }
            // 關閉視窗
            closeModal(readyOverlay);
            // 執行更新 UI 的動作 (揭曉新局)
            if (nextRoundCallback) {
                nextRoundCallback();
                nextRoundCallback = null;
            }
        };

        // 1. 點擊「準備完成」按鈕
        if (btnStartNextRound) {
            btnStartNextRound.addEventListener('click', proceedToNextRound);
        }

        // 2. 點擊右上角的「X」
        if (readyCloseBtn) {
            readyCloseBtn.addEventListener('click', proceedToNextRound);
        }

        // 3. 點擊視窗外圍背景 (半透明黑色遮罩)
        readyOverlay.addEventListener('click', (e) => {
            if (e.target === readyOverlay) {
                proceedToNextRound();
            }
        });
    }

});

// --- 顯示卡片故事視窗 ---
function showCardStory(card) {
    const overlay = document.getElementById('story-overlay');
    const titleEl = document.getElementById('story-title');
    const contentEl = document.getElementById('story-content');

    if (!overlay || !titleEl || !contentEl) return;

    const age = card.ageGroup || '未知';
    const num = card.number;
    const localizedAge = window.i18n ? window.i18n.getAgeGroupName(age) : age;
    const preciousTag = window.i18n ? window.i18n.t('ui.labels.precious', '★ 珍貴') : '★ 珍貴';
    const esc = (v) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
        ? window.escapeHtml(v)
        : String(v ?? '');
    const isPrecious = card.isPrecious ? `<span style="color:#ffd27f;">${esc(preciousTag)}</span>` : '';

    titleEl.innerHTML = `<span class="material-symbols-outlined icon-inline">menu_book</span> ${esc(localizedAge)} ${esc(num)} ${isPrecious}`;

    // 從資料庫取得故事 (支援多語系獨立故事模組)
    const storyText = (typeof window.getHourCardStory === 'function')
        ? window.getHourCardStory(age, num)
        : ((window.GAME_DATA?.HOUR_STORIES?.[age]?.[num]) || `這是一張尚未被發掘記憶的卡片...`);

    // 轉義後再替換換行符號為 <br>
    contentEl.innerHTML = esc(storyText).replace(/\n/g, '<br>');

    openModal(overlay, document.getElementById('story-close-btn') || undefined);

    // ✅ 新增：打開故事時切換為故事 BGM
    if (window.gameAudio && typeof window.gameAudio.switchBGM === 'function') {
        window.gameAudio.switchBGM('story', card);
    }
}

// --- 7 秒自動進入下一回合計時器 ---
window.AutoNextRoundTimer = {
    timerId: null,
    remainingSeconds: 7,
    targetRoundMarker: null,
    targetGameRound: null,
    isPaused: false,
    pausedGameState: null,

    start(gameState) {
        this.stop();

        if (!gameState || gameState.gameEnded || gameState.phase !== 'idle') return;
        if (gameState.waitingMinuteHandChoice || gameState.currentRoundAIChoices !== null) return;
        if (gameState.waitingHourChoice || gameState.isPlayingMinuteClash) return;
        if (gameState.roundMarker > 12) return; // 局結束進入結算，不自動推進

        this.targetRoundMarker = gameState.roundMarker;
        this.targetGameRound = gameState.gameRound;
        this.remainingSeconds = 7;
        this.pausedGameState = gameState;

        // 若玩家當前處於收集視窗、設定頁、規則頁，或教學視窗正在等待點擊確認，先標記暫停掛起，待玩家返回/確認後重新開始
        const isAwayFromGame = typeof window.isPlayerAwayFromGame === 'function' && window.isPlayerAwayFromGame();
        const isTutorialWaitingClick = Boolean(
            window.TutorialModeManager &&
            typeof window.TutorialModeManager.isAwaitingClickAck === 'function' &&
            window.TutorialModeManager.isAwaitingClickAck()
        );
        if (isAwayFromGame || isTutorialWaitingClick) {
            this.isPaused = true;
            if (isAwayFromGame) {
                if (typeof window.checkGameCountdownState === 'function') {
                    window.checkGameCountdownState();
                }
                if (typeof appLogger !== 'undefined') {
                    appLogger.log("⏱️【自動流程】玩家目前處於收集/設定/規則頁，下一回合自動倒數已暫停，等待返回後重新開始。");
                }
            }
            return;
        }

        const updateBtn = () => {
            const nextStepBtn = document.getElementById('next-step-btn');
            if (nextStepBtn && !nextStepBtn.disabled) {
                const sec = this.remainingSeconds;
                nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round_countdown', { sec }) : `下一回合 (${sec}s)`;
            }
        };
        updateBtn();

        this.timerId = setInterval(() => {
            const currentGs = window.globalGameState || gameState;
            if (!currentGs || currentGs.gameEnded || currentGs.roundMarker !== this.targetRoundMarker || currentGs.gameRound !== this.targetGameRound || currentGs.waitingMinuteHandChoice) {
                this.stop();
                return;
            }

            this.remainingSeconds--;
            if (this.remainingSeconds > 0) {
                updateBtn();
            } else {
                this.stop();
                if (typeof appLogger !== 'undefined') {
                    appLogger.log("⏱️【自動流程】小時卡選擇流程結束後 7 秒已到，自動進入下一回合。");
                }
                const nextStepBtn = document.getElementById('next-step-btn');
                if (nextStepBtn && !nextStepBtn.disabled) {
                    nextStepBtn.click();
                } else if (typeof window.startRound === 'function') {
                    window.startRound(currentGs);
                    if (typeof updateUI === 'function') updateUI(currentGs);
                }
            }
        }, 1000);
    },

    pause() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
            this.isPaused = true;
        }
        const nextStepBtn = document.getElementById('next-step-btn');
        if (nextStepBtn && typeof nextStepBtn.textContent === 'string' && nextStepBtn.textContent.includes('(')) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round') : '下一回合';
        }
    },

    resume() {
        if (!this.isPaused) return;
        const isTutorialWaitingClick = Boolean(
            window.TutorialModeManager &&
            typeof window.TutorialModeManager.isAwaitingClickAck === 'function' &&
            window.TutorialModeManager.isAwaitingClickAck()
        );
        if (isTutorialWaitingClick) return;
        this.isPaused = false;

        const currentGs = window.globalGameState || this.pausedGameState;
        if (!currentGs || currentGs.gameEnded || currentGs.phase !== 'idle') return;
        if (currentGs.roundMarker !== this.targetRoundMarker || currentGs.gameRound !== this.targetGameRound) return;
        if (currentGs.waitingMinuteHandChoice || currentGs.waitingHourChoice || currentGs.isPlayingMinuteClash || currentGs.roundMarker > 12) return;

        if (typeof appLogger !== 'undefined') {
            appLogger.log("⏱️【自動流程】玩家返回遊戲畫面，重新開始下一回合自動倒數 (7s)。");
        }
        this.start(currentGs);
    },

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isPaused = false;
        this.pausedGameState = null;
        this.remainingSeconds = 7;
        const nextStepBtn = document.getElementById('next-step-btn');
        if (nextStepBtn && typeof nextStepBtn.textContent === 'string' && nextStepBtn.textContent.includes('(')) {
            nextStepBtn.textContent = window.i18n ? window.i18n.t('ui.buttons.next_round') : '下一回合';
        }
    }
};

// --- 局數準備彈窗邏輯（同時展示分數詳情） ---
let nextRoundCallback = null;

window.showRoundReadyModal = function (titleText, subtitleText, callback, gameState) {
    const overlay = document.getElementById('round-ready-overlay');
    const titleEl = document.getElementById('round-ready-title');
    const contentEl = document.getElementById('round-ready-content');
    const scoreContainer = document.getElementById('round-ready-score-table');

    if (!overlay) {
        if (callback) callback();
        return;
    }

    // 填入標題與副標題
    if (titleEl) titleEl.textContent = titleText;
    if (contentEl) contentEl.textContent = subtitleText;
    nextRoundCallback = callback; // 記錄回呼函式，等待按鈕點擊後執行

    // 填入第一局結算分數詳情表格
    if (scoreContainer) {
        const gs = gameState || window.globalGameState;
        if (gs && Array.isArray(gs.players)) {
            const humanId = (typeof getCurrentHumanPlayerId === 'function')
                ? getCurrentHumanPlayerId()
                : ((typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1');
            // 優先讀取剛結束局的快照 (lastRoundSummary)，避免讀到下一局已重置發牌的齒輪與復活狀態
            const summaryMap = new Map();
            if (Array.isArray(gs.lastRoundSummary)) {
                gs.lastRoundSummary.forEach(item => summaryMap.set(item.id, item));
            }

            const playerList = gs.players.map(p => {
                const s = summaryMap.get(p.id);
                return {
                    id: p.id,
                    name: s ? s.name : p.name,
                    roleCard: s ? s.roleCard : p.roleCard,
                    type: s ? s.type : p.type,
                    isEjected: s ? s.wasEjected : !!p.isEjected,
                    roundScore: s ? s.roundScore : (p.isEjected ? 0 : p.gearCards),
                    score: s ? s.totalScore : p.score
                };
            });

            const sorted = playerList.slice().sort((a, b) => b.score - a.score);
            const maxScore = sorted.length > 0 ? sorted[0].score : -999;

            const colRank = window.i18n ? window.i18n.t('ui.round_ready.col_rank') : '排名';
            const colPlayer = window.i18n ? window.i18n.t('ui.round_ready.col_player') : '角色';
            const colRole = window.i18n ? window.i18n.t('ui.round_ready.col_role') : '身份';
            const colRoundScore = window.i18n ? window.i18n.t('ui.round_ready.col_round_score') : '本局得分';
            const colTotalScore = window.i18n ? window.i18n.t('ui.round_ready.col_total_score') : '累計總分';

            let html = `
                <table class="round-score-table">
                    <thead>
                        <tr>
                            <th style="width: 15%;">${colRank}</th>
                            <th style="width: 25%;">${colPlayer}</th>
                            <th style="width: 24%;">${colRole}</th>
                            <th style="width: 18%; text-align: center;">${colRoundScore}</th>
                            <th style="width: 18%; text-align: right;">${colTotalScore}</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            sorted.forEach((p, idx) => {
                const isHuman = p.id === humanId;
                const isLeader = p.score === maxScore && p.score > 0;
                const rankIcon = idx === 0 ? '★ 1' : (idx === 1 ? '★ 2' : (idx === 2 ? '★ 3' : `${idx + 1}`));
                const rawRole = p.roleCard || p.type;
                const roleKey = (rawRole && String(rawRole).includes('時魔')) ? '時魔' : rawRole;
                const roleColor = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey]) || '#ffd27f';
                const localizedRole = window.i18n ? window.i18n.getRoleName(rawRole) : rawRole;
                const ejectedText = window.i18n ? window.i18n.t('ui.round_ready.ejected') : '(被吞噬)';
                const roleDisplay = p.isEjected ? `<s style="opacity:0.6;">${localizedRole}</s> ${ejectedText}` : localizedRole;
                const humanBadgeText = window.i18n ? window.i18n.t('ui.labels.you_tag').replace('★', '') : '我';
                const humanBadge = isHuman ? `<span class="score-badge-human">${humanBadgeText}</span>` : '';
                const earnedGears = p.isEjected ? 0 : (typeof p.roundScore === 'number' ? p.roundScore : p.gearCards);
                const gearText = window.i18n ? window.i18n.t('ui.round_ready.pts_gear', { gear: earnedGears }) : `+${earnedGears} 齒`;
                const ptsText = window.i18n ? window.i18n.t('ui.round_ready.pts_total', { pts: p.score }) : `${p.score} 分`;

                html += `
                    <tr class="${isHuman ? 'is-human' : ''} ${isLeader ? 'is-leader' : ''}">
                        <td>${rankIcon}</td>
                        <td>${p.name}${humanBadge}</td>
                        <td style="color:${roleColor};">${roleDisplay}</td>
                        <td style="text-align: center;" class="score-pts-round">${gearText}</td>
                        <td style="text-align: right;" class="score-pts-total">${ptsText}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            scoreContainer.innerHTML = html;
        } else {
            scoreContainer.innerHTML = '';
        }
    }

    // 播放提示音效
    if (window.gameAudio && typeof window.gameAudio.playChime === 'function') {
        window.gameAudio.playChime();
    }

    // 顯示彈窗
    openModal(overlay, document.getElementById('btn-start-next-round'));
};

if (typeof window !== 'undefined') {
    window.renderSpecialVictoryProgress = renderSpecialVictoryProgress;
    window.renderGameOverPanel = renderGameOverPanel;
    window.showCardStory = showCardStory;
}
