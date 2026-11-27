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

// let globalGameState = null;  <-- (已經移至 config.js)


// 日誌佇列系統變數
const logQueue = [];
let isLogProcessing = false;
// ✅ 修改：讀取 config.js
let currentLogSpeed = window.UI_CONFIG?.LOG_SPEED ?? 360;
let currentLogRetentionLimit = window.UI_CONFIG?.LOG_RETENTION_LIMIT ?? 200;
const LOG_ACCEL_THRESHOLD = window.UI_CONFIG?.LOG_ACCEL_THRESHOLD ?? 5;
const LOG_ACCEL_DELAY = window.UI_CONFIG?.LOG_ACCEL_DELAY ?? 30;
let isSkippingLogs = false; // 是否正在進行「瞬間顯示」
// Modal functions moved to ui_modals.js

// ✅ 保險：避免 GAME_CONFIG 未定義導致 UI 事件中斷
try {
    let savedDiff = null;
    try { savedDiff = localStorage.getItem('eaten_ai_difficulty'); } catch (_) {}
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
    if (!window.GAME_CONFIG.aiDifficulty) {
        window.GAME_CONFIG.aiDifficulty = savedDiff || 'normal';
    }
} catch (_) { }

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
        if (logQueue.length === 0) {
            isSkippingLogs = false;
        }
        return;
    }
    isLogProcessing = true;

    const list = document.getElementById('log-list');
    const logContainer = document.getElementById('game-log-container');

    if (isSkippingLogs || logQueue.length > LOG_ACCEL_THRESHOLD) {
        // [效能] 批次效能改良：當日誌積壓或處於略過模式時，使用 DocumentFragment 一次性渲染
        const fragment = document.createDocumentFragment();
        const batchSize = isSkippingLogs ? logQueue.length : Math.min(logQueue.length, 20);
        const batchMessages = logQueue.splice(0, batchSize);

        batchMessages.forEach(msg => {
            const li = document.createElement('li');
            li.textContent = msg;
            li.className = 'log-entry-new';
            if (isSkippingLogs) {
                li.style.animation = 'none';
                li.style.opacity = '1';
            }
            fragment.appendChild(li);
        });

        if (list) {
            list.appendChild(fragment);
            enforceLogRetention(list);
            if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
        }

        const nextDelay = isSkippingLogs ? 0 : LOG_ACCEL_DELAY;
        setTimeout(() => {
            isLogProcessing = false;
            processLogQueue();
        }, nextDelay);
        return;
    }

    const message = logQueue.shift();
    if (list) {
        const li = document.createElement('li');
        li.textContent = message;
        li.className = 'log-entry-new';

        list.appendChild(li);
        enforceLogRetention(list);
        if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }

    setTimeout(() => {
        isLogProcessing = false;
        processLogQueue();
    }, currentLogSpeed);
}

// --- 打開日誌時自動滾動至最新（最底）一項 ---
function initLogAutoScrollOnOpen() {
    const logDetails = document.getElementById('log-panel-details');
    const logContainer = document.getElementById('game-log-container');
    if (!logDetails && !logContainer) return;

    const performScroll = () => {
        const container = document.getElementById('game-log-container');
        const list = document.getElementById('log-list');
        const details = document.getElementById('log-panel-details');
        const drawerBody = container ? container.closest('.hud-drawer-body') : null;

        const initialScrollX = window.scrollX || window.pageXOffset || 0;
        const initialScrollY = window.scrollY || window.pageYOffset || 0;

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
        if (drawerBody) {
            drawerBody.scrollTop = drawerBody.scrollHeight;
        }
        if (details) {
            details.scrollTop = details.scrollHeight;
        }
        if (list && list.lastElementChild) {
            try {
                list.lastElementChild.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' });
            } catch (_) {}
        }
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
        // 嚴防頁面整體視口產生非預期的位移跳動
        if (window.scrollX !== initialScrollX || window.scrollY !== initialScrollY) {
            window.scrollTo(initialScrollX, initialScrollY);
        }
    };

    const scheduleScrollToBottom = () => {
        // 多階層定時器以克服 display:none 展開時的重排重繪延遲
        performScroll();
        requestAnimationFrame(() => {
            performScroll();
            setTimeout(performScroll, 50);
            setTimeout(performScroll, 160);
        });
    };

    window.scrollLogToBottom = scheduleScrollToBottom;

    if (logDetails) {
        // 1. 監聽 details 原生 toggle 事件
        logDetails.addEventListener('toggle', () => {
            if (logDetails.open) {
                scheduleScrollToBottom();
            }
        });

        // 2. 監聽 summary 點擊事件（提早於展開前瞬間預備滾動）
        const summary = logDetails.querySelector(':scope > summary');
        if (summary) {
            summary.addEventListener('click', () => {
                if (!logDetails.open) {
                    scheduleScrollToBottom();
                }
            });
        }

        // 3. 若載入時已經處於打開狀態，也進行一次對齊
        if (logDetails.open) {
            scheduleScrollToBottom();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (modalOpenOrder.length > 0) {
            event.preventDefault();
            closeTopModal();
        }
    });
    try { appLogger.log('[UI] 已載入，等待開始遊戲。'); } catch (_) { }

    // [排版] 手機版排版改善：在螢幕寬度 <= 768px 時預設關閉所有懸浮抽屜，避免遮蔽中央鐘面
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        document.querySelectorAll('details.hud-drawer').forEach(d => {
            d.open = false;
        });
    }

    setupTabNavigation('.tab-btn', '.tab-content', 'active', 'active-tab');
    bindNextStepButton();

    const getSelectionValue = (groupName, fallback) => {
        const groupEl = document.querySelector(`[data-selection-group="${groupName}"]`);
        const activeBtn = groupEl?.querySelector('.selection-btn.is-selected');
        return activeBtn?.dataset.value || fallback;
    };
    const setSelectionValue = (groupName, value) => {
        const groupEl = document.querySelector(`[data-selection-group="${groupName}"]`);
        if (!groupEl) return;
        const buttons = Array.from(groupEl.querySelectorAll('.selection-btn'));
        let didMatch = false;
        buttons.forEach(btn => {
            const isActive = btn.dataset.value === value;
            btn.classList.toggle('is-selected', isActive);
            btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (isActive) didMatch = true;
        });
        if (!didMatch && buttons[0]) {
            buttons.forEach(btn => {
                const isActive = btn === buttons[0];
                btn.classList.toggle('is-selected', isActive);
                btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }
    };
    const bindSelectionButtons = (groupName, onChange) => {
        const groupEl = document.querySelector(`[data-selection-group="${groupName}"]`);
        if (!groupEl) return;
        groupEl.querySelectorAll('.selection-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                setSelectionValue(groupName, value);
                if (typeof onChange === 'function') onChange(value);
            });
        });
    };
    const syncStartModeNote = () => {
        const startModeNote3P = document.getElementById('start-mode-note-3p');
        const startModeNote5P = document.getElementById('start-mode-note-5p');
        const startModeNotePure = document.getElementById('start-mode-note-pure');
        const pureCountSection = document.getElementById('pure-count-section');
        const onlineLobbySection = document.getElementById('online-lobby-section');
        const confirmBtn = document.getElementById('game-mode-confirm');
        const mode = getSelectionValue('start-game-mode', '5P');
        const isPureSel = mode === 'PURE';
        const isOnlineSel = mode === 'ONLINE';
        if (startModeNote3P) startModeNote3P.style.display = (mode === '3P') ? 'block' : 'none';
        if (startModeNote5P) startModeNote5P.style.display = (mode === '5P') ? 'block' : 'none';
        if (startModeNotePure) startModeNotePure.style.display = isPureSel ? 'block' : 'none';
        if (pureCountSection) pureCountSection.classList.toggle('is-hidden', !isPureSel);
        if (onlineLobbySection) onlineLobbySection.classList.toggle('is-hidden', !isOnlineSel);
        if (confirmBtn) {
            confirmBtn.style.display = isOnlineSel ? 'none' : '';
            confirmBtn.textContent = isPureSel ? '開始遊戲' : '下一步';
        }
    };
    const getFivePRoleMechanicsHtml = (roleValue) => {
        if (roleValue === 'sin') {
            return '<b>【時之惡 · GP 與護盾機制】</b>起始與護盾歸零重置為 <code>clamp(GP + 1, 1, 5)</code>（上限 5 點）。受罰先扣 1 點護盾抵消，護盾歸零才扣 1 GP 並重新補充；若全場僅自己受罰，結算扣盾／GP 後回復 1 MP，局末若無時魔被吞噬則扣 2 GP。';
        }
        if (roleValue === 'SCZ') {
            return '<b>【受詛者 · GP 與護盾機制】</b>起始與護盾歸零重置為 <code>clamp(GP, 1, 3)</code>（上限 3 點）。受罰先扣 1 點護盾抵消，護盾歸零才扣 1 GP 並依新 GP 重新補充護盾；需踏中 12 張 ★ 珍貴卡並守住 GP（扣至負數才被吞噬）。';
        }
        return '5P 模式中時魔玩家將扮演<b>幼體時魔</b>（無常駐護盾；MP ≥ 3 時自動消耗全部 MP 抵免 1 次傷害，每局限 1 次）。';
    };
    window.getFivePRoleMechanicsHtml = getFivePRoleMechanicsHtml;

    const syncFivePRoleNote = () => {
        const noteEl = document.getElementById('role-choice-5p-note');
        if (!noteEl) return;
        const roleVal = getSelectionValue('start-five-player-role', window.GAME_CONFIG?.defaultHumanId || 'SM_1');
        noteEl.innerHTML = getFivePRoleMechanicsHtml(roleVal);
    };

    bindSelectionButtons('start-game-mode', syncStartModeNote);
    bindSelectionButtons('start-pure-player-count');
    bindSelectionButtons('start-time-demon-role');
    bindSelectionButtons('start-five-player-role', syncFivePRoleNote);
    syncStartModeNote();
    syncFivePRoleNote();

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

                    confirmMoveBtn.textContent = (window.i18n ? window.i18n.t('ui.buttons.confirm_move') : null) || '確認出牌';
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

            // 播放確認音效 ---
            if (window.gameAudio) window.gameAudio.playConfirm();

            confirmMoveBtn.disabled = true;
            const success = handleHumanChoice(globalGameState, uiState.selectedCardValue);

            if (success) {
                document.querySelectorAll('.minute-card').forEach(c => c.classList.remove('selected'));
                uiState.selectedCardValue = null;
                confirmMoveBtn.textContent = (window.i18n ? window.i18n.t('ui.buttons.confirm_move') : null) || '確認出牌';
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
        nextBtn.onclick = () => {
            if (window.AutoNextRoundTimer && typeof window.AutoNextRoundTimer.stop === 'function') {
                window.AutoNextRoundTimer.stop();
            }
            if (window.TutorialModeManager && typeof window.TutorialModeManager.clearTutorialPointers === 'function') {
                window.TutorialModeManager.clearTutorialPointers();
            }
            const currentGs = window.globalGameState || globalGameState;
            if (!currentGs) {
                appLogger.log('【UI】遊戲尚未開始，請先點擊「開始遊戲」。');
                return;
            }

            // 若處於「分針能力選擇中」，點擊此按鈕等同於「略過」
            if (currentGs.waitingMinuteHandChoice) {
                appLogger.log("【UI】玩家直接點擊下一回合，視為略過分針能力。");
                if (typeof handleHumanAbilityChoice === 'function') {
                    handleHumanAbilityChoice(currentGs, 'skip');
                }
                
                if (!currentGs.gameEnded) {
                    try {
                        if (typeof window.startRound === 'function') window.startRound(currentGs);
                        else if (typeof startRound === 'function') startRound(currentGs);
                        else appLogger.log("[錯誤] 致命錯誤：找不到 startRound 函式！請按 F12 檢查 game.js 是否有語法錯誤。");
                    } catch (e) {
                        appLogger.log("[錯誤] 執行下一回合時程式崩潰，請按 F12 查看詳細錯誤！");
                        console.error(e);
                    }
                    updateUI(currentGs);
                }
                return; 
            }

            const humanId = getCurrentHumanPlayerId();
            const waitingMinute = currentGs.currentRoundAIChoices !== null;
            const waitingHour = !!currentGs.waitingHourChoice && currentGs.waitingHourChoicePlayerId === humanId;
            const hourSelectionActive = !!currentGs.waitingHourChoice || (Array.isArray(currentGs.hourPickOrder) && currentGs.hourPickOrder.length > 0);
            const waitingAbility = !!currentGs.waitingAbilityChoice && currentGs.waitingAbilityChoicePlayerId === humanId;
            const waitingSecondFinal = !!currentGs.waitingSecondHandFinalChoice && currentGs.waitingSecondHandFinalChoicePlayerId === humanId;
            const playingClash = !!currentGs.isPlayingMinuteClash;

            if (uiState.isSecondHandSelectingTwo || waitingMinute || waitingHour || hourSelectionActive || waitingAbility || waitingSecondFinal || playingClash) {
                appLogger.log('【UI】仍在等待人類輸入，請先完成當前步驟。');
                updateUI(currentGs);
                return;
            }

            if (!currentGs.gameEnded) {
                try {
                    // 改用 Try-Catch 捕捉真正的錯誤
                    if (typeof window.startRound === 'function') window.startRound(currentGs);
                    else if (typeof startRound === 'function') startRound(currentGs);
                    else appLogger.log("[錯誤] 致命錯誤：找不到 startRound 函式！請按 F12 檢查 game.js 是否有語法錯誤。");
                } catch (e) {
                    appLogger.log("[錯誤] 執行下一回合時程式崩潰，請按 F12 查看詳細錯誤！");
                    console.error(e);
                }
                updateUI(currentGs);

            } else {
                appLogger.log("遊戲已結束。");
                nextBtn.disabled = true;
            }
        };
    }
    window.bindNextStepButton = bindNextStepButton;

    const startGameBtn = document.getElementById('start-game-btn');
    const roleOverlay = document.getElementById('role-choice-overlay');
    const gameModeOverlay = document.getElementById('game-mode-overlay');
    const gameModeConfirm = document.getElementById('game-mode-confirm');
    const gameModeCloseBtn = document.getElementById('game-mode-close-btn');
    const roleChoiceConfirm = document.getElementById('role-choice-confirm');
    const roleChoiceTitle = document.getElementById('role-choice-title');
    const roleChoiceHint = document.getElementById('role-choice-hint');
    const roleChoiceSection5p = document.getElementById('role-choice-5p');
    const roleChoiceSection3p = document.getElementById('role-choice-3p');
    let pendingStartConfig = null;

    const setStartModalDefaults = () => {
        const rawMode = window.GAME_CONFIG?.gameMode || '5P';
        const isPureRaw = typeof rawMode === 'string' && rawMode.startsWith('PURE');
        const selectedMode = isPureRaw ? 'PURE' : rawMode;
        const pureCount = isPureRaw
            ? String(typeof window.getPurePlayerCount === 'function' ? window.getPurePlayerCount(rawMode) : (window.GAME_CONFIG?.purePlayerCount || 4))
            : String(window.GAME_CONFIG?.purePlayerCount || 4);
        const selectedRole = window.GAME_CONFIG?.threePStartingRole || '時針';
        const selectedFivePRole = window.GAME_CONFIG?.defaultHumanId || 'SM_1';
        setSelectionValue('start-game-mode', selectedMode);
        setSelectionValue('start-pure-player-count', pureCount);
        setSelectionValue('start-time-demon-role', selectedRole);
        setSelectionValue('start-five-player-role', selectedFivePRole);
        if (typeof syncStartModeNote === 'function') syncStartModeNote();
    };

    const getStartModalSelection = () => ({
        selectedMode: getSelectionValue('start-game-mode', '5P')
    });

    const applyStartConfig = ({ selectedMode, selectedThreePRole, cfgEnableAbilities, cfgTestMode, cfgTutorialMode }) => {
        window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false, tutorialMode: true };
        window.GAME_CONFIG.enableAbilities = cfgEnableAbilities;
        window.GAME_CONFIG.testMode = cfgTestMode;
        window.GAME_CONFIG.tutorialMode = cfgTutorialMode;
        window.GAME_CONFIG.gameMode = selectedMode;
        window.GAME_CONFIG.threePStartingRole = selectedThreePRole;
        const currentDiff = window.GAME_CONFIG.aiDifficulty || (typeof localStorage !== 'undefined' ? localStorage.getItem('eaten_ai_difficulty') : null) || 'normal';
        window.GAME_CONFIG.aiDifficulty = currentDiff;
        if (typeof GAME_CONFIG !== 'undefined') {
            GAME_CONFIG.enableAbilities = cfgEnableAbilities;
            GAME_CONFIG.testMode = cfgTestMode;
            GAME_CONFIG.tutorialMode = cfgTutorialMode;
            GAME_CONFIG.gameMode = selectedMode;
            GAME_CONFIG.threePStartingRole = selectedThreePRole;
            GAME_CONFIG.aiDifficulty = currentDiff;
        }
    };

    const doInitialize = () => {
        if (window.AnimationController && typeof window.AnimationController.killAll === 'function') {
            window.AnimationController.killAll();
        }
        const logListEl = document.getElementById('log-list');
        if (logListEl) logListEl.innerHTML = '';
        const initFn = (typeof window.initializeGame === 'function') ? window.initializeGame : (typeof initializeGame === 'function' ? initializeGame : null);
        if (!initFn) throw new ReferenceError('initializeGame is not defined');
        globalGameState = initFn();
        resetMinuteHistory(globalGameState);
        resetRightPanels(globalGameState);
        uiTrackedGameRound = 1;// 重置輪數追蹤變數
        uiTokenMemory = {}; // 重新開始遊戲時清空記憶
        trackedEnteredClockPlayerIds.clear(); // 重新開始遊戲時清空首次入鐘面追蹤，確保模糊浮現特效重新播放
        uiState.selectedCardValue = null;
        uiState.selectedCardValues = [];
        uiState.isSecondHandSelectingTwo = false;
        const humanId = getCurrentHumanPlayerId();
        const humanPlayer = globalGameState.players.find(p => p.id === humanId);
        const isPureGame = typeof globalGameState.gameMode === 'string' && globalGameState.gameMode.startsWith('PURE');
        if (isPureGame) {
            appLogger.log(`純競標模式 (${globalGameState.players.length}P) 已開始！`);
        } else if (humanPlayer) {
            appLogger.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);
        }
        globalGameState.needsHandDealAnimation = true;

        // 遊戲開始時：
        // 手機版（<= 768px）：全部預設關閉，確保鐘面完全露出，不產生重疊
        // 桌機版：左側抽屜（含遊戲日誌）預設關閉，由玩家按需自行打開；右側「能力與進化」預設打開
        const isMobileScreen = (typeof window !== 'undefined' && window.innerWidth <= 768);
        const leftDrawers = document.querySelectorAll('.hud-drawer-left > details.hud-drawer');
        if (leftDrawers.length > 0) {
            leftDrawers.forEach(d => {
                d.open = false;
            });
        }
        const classicLogDetails = document.getElementById('log-panel-details');
        if (classicLogDetails) {
            classicLogDetails.open = false;
        }
        const rightDrawers = document.querySelectorAll('.hud-drawer-right > details.hud-drawer');
        if (rightDrawers.length > 0) {
            rightDrawers.forEach(d => {
                d.open = !isMobileScreen && (d.id === 'evo-panel-details');
            });
        }

        updateUI(globalGameState);
        bindNextStepButton();
    };

    const startWithRole = (roleId) => {
        if (roleOverlay) closeModal(roleOverlay);
        if (typeof window.setHumanPlayerId === 'function') {
            window.setHumanPlayerId(roleId);
        } else {
            try { window.HUMAN_PLAYER_ID = roleId; } catch (_) { }
        }
        doInitialize();
    };

    const syncRoleChoiceModal = (selectedMode) => {
        const isThreeP = selectedMode === '3P';
        if (roleChoiceTitle) roleChoiceTitle.textContent = isThreeP ? '選擇時魔身份' : '選擇角色';
        if (roleChoiceHint) {
            roleChoiceHint.textContent = isThreeP
                ? '請選擇 3P 模式下的時魔身份。'
                : '請選擇 5P 模式要扮演的角色。';
        }
        if (roleChoiceSection5p) roleChoiceSection5p.classList.toggle('is-hidden', isThreeP);
        if (roleChoiceSection3p) roleChoiceSection3p.classList.toggle('is-hidden', !isThreeP);
        if (!isThreeP) syncFivePRoleNote();
    };

    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            try {
                // --- 新增：使用者第一次互動時播放 BGM ---
                if (window.gameAudio) {
                    window.gameAudio.playBGM();
                    // 也可以在這裡播放一個確認音效
                    window.gameAudio.playConfirm();
                }


                setStartModalDefaults();
                if (gameModeOverlay) openModal(gameModeOverlay, gameModeConfirm || undefined);
            } catch (err) {
                appLogger.log('[UI] 開始遊戲時發生錯誤：', err);
            }
        });
    }

    if (gameModeConfirm) {
        gameModeConfirm.addEventListener('click', () => {
            try {
                const abilityToggleEl = document.getElementById('ability-toggle');
                const testToggleEl = document.getElementById('test-toggle');
                const tutorialToggleEl = document.getElementById('tutorial-toggle');
                const cfgEnableAbilities = !!abilityToggleEl?.checked;
                const cfgTestMode = !!testToggleEl?.checked;
                const cfgTutorialMode = tutorialToggleEl ? !!tutorialToggleEl.checked : true;
                const { selectedMode } = getStartModalSelection();
                if (selectedMode === 'PURE') {
                    const pureCount = Number(getSelectionValue('start-pure-player-count', '4')) || 4;
                    const resolvedPureMode = `PURE_${pureCount}P`;
                    window.GAME_CONFIG = window.GAME_CONFIG || {};
                    window.GAME_CONFIG.purePlayerCount = pureCount;
                    if (typeof GAME_CONFIG !== 'undefined') GAME_CONFIG.purePlayerCount = pureCount;
                    applyStartConfig({
                        selectedMode: resolvedPureMode,
                        selectedThreePRole: '時針',
                        cfgEnableAbilities: false,
                        cfgTestMode,
                        cfgTutorialMode
                    });
                    if (gameModeOverlay) closeModal(gameModeOverlay);
                    startWithRole('SM_1');
                    return;
                }
                pendingStartConfig = { selectedMode, cfgEnableAbilities, cfgTestMode, cfgTutorialMode };
                if (gameModeOverlay) closeModal(gameModeOverlay);
                syncRoleChoiceModal(selectedMode);
                if (roleOverlay) openModal(roleOverlay, roleChoiceConfirm || undefined);
            } catch (err) {
                appLogger.log('[UI] 開始遊戲時發生錯誤：', err);
            }
        });
    }

    if (roleChoiceConfirm) {
        roleChoiceConfirm.addEventListener('click', () => {
            try {
                if (!pendingStartConfig) return;
                const selectedMode = pendingStartConfig.selectedMode || '5P';
                const selectedThreePRole = getSelectionValue('start-time-demon-role', '時針');
                const selectedFivePRole = getSelectionValue(
                    'start-five-player-role',
                    window.GAME_CONFIG?.defaultHumanId || 'SM_1'
                );
                applyStartConfig({
                    selectedMode,
                    selectedThreePRole,
                    cfgEnableAbilities: pendingStartConfig.cfgEnableAbilities,
                    cfgTestMode: pendingStartConfig.cfgTestMode,
                    cfgTutorialMode: pendingStartConfig.cfgTutorialMode
                });
                if (selectedMode === '3P') {
                    startWithRole('SM_1');
                } else {
                    startWithRole(selectedFivePRole);
                }
            } catch (err) {
                appLogger.log('[UI] 開始遊戲時發生錯誤：', err);
            }
        });
    }

    // 監聽設定頁中的教學模式開關
    const tutorialToggleEl = document.getElementById('tutorial-toggle');
    if (tutorialToggleEl) {
        tutorialToggleEl.checked = window.GAME_CONFIG?.tutorialMode !== false;
        tutorialToggleEl.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.GAME_CONFIG = window.GAME_CONFIG || {};
            window.GAME_CONFIG.tutorialMode = isEnabled;
            if (typeof GAME_CONFIG !== 'undefined') GAME_CONFIG.tutorialMode = isEnabled;
            appLogger.log(`[System] 教學模式已${isEnabled ? '開啟' : '關閉'}`);
            if (window.TutorialModeManager) {
                if (isEnabled && globalGameState) {
                    window.TutorialModeManager.updateTutorialPointers(globalGameState);
                } else {
                    window.TutorialModeManager.clearTutorialPointers();
                }
            }
        });
    }

    // 監聽設定頁中的特效依序播放開關
    const seqToggleEl = document.getElementById('sequential-effects-toggle');
    if (seqToggleEl) {
        try {
            const savedSeq = localStorage.getItem('eaten_sequential_effects');
            if (savedSeq !== null && window.UI_CONFIG) {
                window.UI_CONFIG.SEQUENTIAL_EFFECTS = (savedSeq === 'true');
            }
        } catch (_) {}

        seqToggleEl.checked = window.UI_CONFIG?.SEQUENTIAL_EFFECTS !== false;
        seqToggleEl.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.UI_CONFIG = window.UI_CONFIG || {};
            window.UI_CONFIG.SEQUENTIAL_EFFECTS = isEnabled;
            try {
                localStorage.setItem('eaten_sequential_effects', String(isEnabled));
            } catch (_) {}
            appLogger.log(`[System] 特效依序播放已${isEnabled ? '開啟' : '關閉'}`);
        });
    }

    // 監聽設定頁中的畫面震動特效開關 (扣除 GP 時畫面震動)
    const shakeToggleEl = document.getElementById('screen-shake-toggle');
    if (shakeToggleEl) {
        try {
            const savedShake = localStorage.getItem('eaten_screen_shake');
            if (savedShake !== null && window.UI_CONFIG) {
                window.UI_CONFIG.SCREEN_SHAKE = (savedShake === 'true');
            }
        } catch (_) {}

        shakeToggleEl.checked = window.UI_CONFIG?.SCREEN_SHAKE !== false;
        shakeToggleEl.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.UI_CONFIG = window.UI_CONFIG || {};
            window.UI_CONFIG.SCREEN_SHAKE = isEnabled;
            try {
                localStorage.setItem('eaten_screen_shake', String(isEnabled));
            } catch (_) {}
            appLogger.log(`[System] 扣除 GP 畫面震動特效已${isEnabled ? '開啟' : '關閉'}`);
        });
    }

    // 監聽設定頁中的「減少動態效果（無障礙）」開關
    const reducedMotionToggleEl = document.getElementById('reduced-motion-toggle');
    {
        let reducedEnabled = false;
        try {
            const savedReduced = localStorage.getItem('eaten_reduced_motion');
            if (savedReduced !== null) {
                reducedEnabled = (savedReduced === 'true');
            } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
                reducedEnabled = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            }
        } catch (_) {}
        window.UI_CONFIG = window.UI_CONFIG || {};
        window.UI_CONFIG.REDUCED_MOTION = reducedEnabled;
        if (document.body) {
            document.body.classList.toggle('reduced-motion', reducedEnabled);
        }
        if (reducedMotionToggleEl) {
            reducedMotionToggleEl.checked = reducedEnabled;
            reducedMotionToggleEl.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                window.UI_CONFIG = window.UI_CONFIG || {};
                window.UI_CONFIG.REDUCED_MOTION = isEnabled;
                if (document.body) {
                    document.body.classList.toggle('reduced-motion', isEnabled);
                }
                try {
                    localStorage.setItem('eaten_reduced_motion', String(isEnabled));
                } catch (_) {}
                appLogger.log(`[System] 減少動態效果（無障礙）已${isEnabled ? '開啟' : '關閉'}`);
            });
        }
    }

    // 監聽設定頁中的「逾時自動代打（45 秒防卡關）」開關（預設關閉）
    const autoPlayTimeoutEl = document.getElementById('auto-play-timeout-toggle');
    {
        let autoTimeoutEnabled = false;
        try {
            const savedAutoTimeout = localStorage.getItem('eaten_auto_play_timeout');
            if (savedAutoTimeout !== null) {
                autoTimeoutEnabled = (savedAutoTimeout === 'true');
            }
        } catch (_) {}
        window.UI_CONFIG = window.UI_CONFIG || {};
        window.UI_CONFIG.AUTO_PLAY_TIMEOUT = autoTimeoutEnabled;
        if (autoPlayTimeoutEl) {
            autoPlayTimeoutEl.checked = autoTimeoutEnabled;
            autoPlayTimeoutEl.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                window.UI_CONFIG = window.UI_CONFIG || {};
                window.UI_CONFIG.AUTO_PLAY_TIMEOUT = isEnabled;
                try {
                    localStorage.setItem('eaten_auto_play_timeout', String(isEnabled));
                } catch (_) {}
                if (!isEnabled && window.HumanTurnTimeoutGuard) {
                    window.HumanTurnTimeoutGuard.clear();
                } else if (isEnabled && window.HumanTurnTimeoutGuard && window.globalGameState) {
                    window.HumanTurnTimeoutGuard.sync(window.globalGameState);
                }
                appLogger.log(`[System] 逾時自動代打（45 秒防卡關）已${isEnabled ? '開啟' : '關閉'}`);
            });
        }
    }

    // 監聽設定頁中的扇形手牌列開關（僅現代 PixiJS 版桌機適用）
    const fanHandToggleEl = document.getElementById('fan-hand-toggle');
    if (fanHandToggleEl) {
        try {
            const savedFanHand = localStorage.getItem('eaten_fan_hand_layout');
            if (savedFanHand !== null && window.UI_CONFIG) {
                window.UI_CONFIG.FAN_HAND_LAYOUT = (savedFanHand === 'true');
            }
        } catch (_) {}

        fanHandToggleEl.checked = window.UI_CONFIG?.FAN_HAND_LAYOUT !== false;
        fanHandToggleEl.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.UI_CONFIG = window.UI_CONFIG || {};
            window.UI_CONFIG.FAN_HAND_LAYOUT = isEnabled;
            try {
                localStorage.setItem('eaten_fan_hand_layout', String(isEnabled));
            } catch (_) {}
            appLogger.log(`[System] 扇形手牌列已${isEnabled ? '開啟' : '關閉'}`);
            if (typeof window.applyHandFanLayout === 'function') {
                window.applyHandFanLayout(document.getElementById('human-hand'));
            }
        });
    }

    if (gameModeCloseBtn && gameModeOverlay) {
        gameModeCloseBtn.addEventListener('click', () => closeModal(gameModeOverlay));
    }

    // ✅ 綁定「選擇角色」視窗的關閉按鈕事件
    const roleCloseBtn = document.getElementById('role-choice-close-btn');
    const roleOverlayEl = document.getElementById('role-choice-overlay');

    if (roleCloseBtn && roleOverlayEl) {
        roleCloseBtn.addEventListener('click', () => {
            closeModal(roleOverlayEl);
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
            if (val === 0) text = "✦ 瞬間 (0ms)";
            else if (val <= 100) text = "▶▶ 極快";
            else if (val <= 300) text = "▶ 一般";
            else text = "⧖ 慢速閱讀";
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


        // 語言切換監聽 (i18n)
        const langRadios = document.querySelectorAll('input[name="ui-lang"]');
        if (langRadios.length > 0 && window.i18n) {
            const currentLang = window.i18n.currentLang || 'zh-TW';
            langRadios.forEach(radio => {
                if (radio.value === currentLang) radio.checked = true;
                radio.addEventListener('change', (e) => {
                    if (e.target.checked && window.i18n) {
                        window.i18n.setLanguage(e.target.value);
                    }
                });
            });
        }

        // 新增：手牌排序設定監聽
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

        // AI 對戰難度設定監聽
        const aiDiffRadios = document.querySelectorAll('input[name="ai-difficulty"]');
        if (aiDiffRadios.length > 0) {
            let savedDiff = null;
            try {
                savedDiff = localStorage.getItem('eaten_ai_difficulty');
            } catch (_) {}
            const currentDiff = savedDiff || window.GAME_CONFIG?.aiDifficulty || 'normal';
            if (window.GAME_CONFIG) window.GAME_CONFIG.aiDifficulty = currentDiff;
            if (typeof GAME_CONFIG !== 'undefined') GAME_CONFIG.aiDifficulty = currentDiff;

            aiDiffRadios.forEach(radio => {
                if (radio.value === currentDiff) radio.checked = true;

                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        const newDiff = e.target.value;
                        if (window.GAME_CONFIG) window.GAME_CONFIG.aiDifficulty = newDiff;
                        if (typeof GAME_CONFIG !== 'undefined') GAME_CONFIG.aiDifficulty = newDiff;
                        try {
                            localStorage.setItem('eaten_ai_difficulty', newDiff);
                        } catch (_) {}
                        appLogger.log(`[AI] 對戰難度已切換為: ${newDiff === 'easy' ? '簡單 (原始基礎行為)' : '一般 (新改良演算法)'}`);
                    }
                });
            });
        }
    }

    // ✅ 日誌保留量滑桿控制
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

    // --- 獨立的音量拉桿邏輯 (Add) ---
    // 1. BGM 音量
    const bgmVolSlider = document.getElementById('bgm-volume-slider');
    const bgmVolDisplay = document.getElementById('bgm-volume-value');
    if (bgmVolSlider && bgmVolDisplay && window.gameAudio) {
        bgmVolSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            bgmVolDisplay.textContent = `${val}%`;
            window.gameAudio.setBGMVolume(val / 100);
        });
    }

    // 2. SFX 音量
    const sfxVolSlider = document.getElementById('sfx-volume-slider');
    const sfxVolDisplay = document.getElementById('sfx-volume-value');
    if (sfxVolSlider && sfxVolDisplay && window.gameAudio) {
        sfxVolSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            sfxVolDisplay.textContent = `${val}%`;
            window.gameAudio.setSFXVolume(val / 100);
        });
    }

    // --- 音效與音樂控制 (Header 靜音開關與設定頁 Checkbox 同步) ---
    const bgmToggle = document.getElementById('bgm-toggle');
    const sfxToggle = document.getElementById('sfx-toggle');
    const headerMuteBtn = document.getElementById('header-mute-btn');

    function isAllMuted() {
        if (!window.gameAudio) return false;
        return window.gameAudio.isBGMMuted && window.gameAudio.isSFXMuted;
    }

    function syncAudioUI() {
        if (!window.gameAudio) return;
        const bgmMuted = window.gameAudio.isBGMMuted;
        const sfxMuted = window.gameAudio.isSFXMuted;
        const allMuted = bgmMuted && sfxMuted;

        // 同步設定頁 Checkbox
        if (bgmToggle) bgmToggle.checked = !bgmMuted;
        if (sfxToggle) sfxToggle.checked = !sfxMuted;

        // 同步 Header 靜音按鈕
        if (headerMuteBtn) {
            headerMuteBtn.classList.toggle('is-muted', allMuted);
            headerMuteBtn.setAttribute('aria-pressed', allMuted.toString());
            headerMuteBtn.title = allMuted
                ? '聲音：已關閉（點擊開啟）'
                : '聲音：開啟中（點擊靜音）';
            const icon = headerMuteBtn.querySelector('.audio-icon');
            if (icon) icon.textContent = allMuted ? 'volume_off' : 'volume_up';
            const state = headerMuteBtn.querySelector('.audio-state');
            if (state) state.textContent = allMuted ? '關' : '開';
        }
    }

    if (window.gameAudio) {
        // 初始化狀態
        syncAudioUI();

        // 1. 設定頁背景音樂 (BGM) 開關
        if (bgmToggle) {
            bgmToggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                window.gameAudio.setBGMMuted(!isEnabled);
                syncAudioUI();
                appLogger.log(`[System] 背景音樂已${isEnabled ? '開啟' : '關閉'}`);
            });
        }

        // 2. 設定頁音效 (SFX) 開關
        if (sfxToggle) {
            sfxToggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                window.gameAudio.setSFXMuted(!isEnabled);
                syncAudioUI();
                appLogger.log(`[System] 音效已${isEnabled ? '開啟' : '關閉'}`);
            });
        }

        // 3. Header 靜音快捷按鈕
        if (headerMuteBtn) {
            headerMuteBtn.addEventListener('click', () => {
                const shouldMute = !isAllMuted();
                window.gameAudio.setBGMMuted(shouldMute);
                window.gameAudio.setSFXMuted(shouldMute);
                syncAudioUI();
                appLogger.log(`[System] 聲音已${shouldMute ? '關閉（靜音）' : '開啟'}`);
            });
        }
    }

    // 全域按鈕與收摺頁點擊音效 ---
    // 這樣不用幫每個按鈕加監聽器，只要是 button 標籤、分鐘卡被點擊，或打開 <details> 收摺頁時就會有聲音
    document.body.addEventListener('click', (e) => {
        const summaryEl = e.target.closest('summary');
        const detailsEl = summaryEl ? summaryEl.closest('details') : null;
        const isOpeningDetails = Boolean(detailsEl && !detailsEl.open);
        // 如果點擊的是按鈕、按鈕內部的元素、分鐘卡，或正在展開收摺頁
        if (e.target.closest('button') || e.target.classList.contains('minute-card') || isOpeningDetails) {
            if (window.gameAudio) {
                window.gameAudio.playClick();
            }
        }
    });


    // 點擊日誌區域「瞬間顯示」
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

    // 打開日誌時自動顯示最新（最底）一項
    initLogAutoScrollOnOpen();

    // 已收集小時卡彈窗控制
    const btnViewCol = document.getElementById('btn-view-collection');
    const colOverlay = document.getElementById('collection-overlay');
    const colClose = document.getElementById('collection-close-btn');
	
	// 手牌排序切換按鈕邏輯==========
    const btnToggleSort = document.getElementById('btn-toggle-sort');
    if (btnToggleSort) {
        btnToggleSort.addEventListener('click', () => {
            // 播放點擊音效
            if (window.gameAudio) window.gameAudio.playClick();
            
            // 判斷並切換排序
            window.UI_CONFIG = window.UI_CONFIG || {};
            const currentSort = window.UI_CONFIG.HAND_SORT_ORDER || 'asc';
            window.UI_CONFIG.HAND_SORT_ORDER = currentSort === 'asc' ? 'desc' : 'asc';
            
            // 同步更新「設定頁」裡的 Radio 勾選狀態
            const radio = document.querySelector(`input[name="hand-sort"][value="${window.UI_CONFIG.HAND_SORT_ORDER}"]`);
            if (radio) radio.checked = true;

            appLogger.log(`[UI] 手牌排序已切換為: ${window.UI_CONFIG.HAND_SORT_ORDER === 'asc' ? '由小到大' : '由大到小'}`);
            
            // 重新渲染畫面
            if (typeof updateUI === 'function' && globalGameState) {
                updateUI(globalGameState);
            }
        });
    }//============

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

    // 新增：故事視窗的關閉控制
    const storyOverlay = document.getElementById('story-overlay');
    const storyCloseBtn = document.getElementById('story-close-btn');

    if (storyCloseBtn && storyOverlay) {
        storyCloseBtn.addEventListener('click', () => {
            closeModal(storyOverlay);
            // 新增：點擊按鈕關閉時，切換回主遊戲 BGM
            if (window.gameAudio && typeof window.gameAudio.switchBGM === 'function') {
                window.gameAudio.switchBGM('main');
            }
        });
    }

    // 點擊視窗外部也可以關閉故事
    if (storyOverlay) {
        storyOverlay.addEventListener('click', (e) => {
            if (e.target === storyOverlay) {
                closeModal(storyOverlay);
                // 新增：點擊視窗外部關閉時，切換回主遊戲 BGM
                if (window.gameAudio && typeof window.gameAudio.switchBGM === 'function') {
                    window.gameAudio.switchBGM('main');
                }
            }
        });
    }

    // 出牌記錄彈窗控制
    const discardPileZone = document.getElementById('discard-pile-zone');
    const discardOverlay = document.getElementById('discard-pile-overlay');
    const discardCloseBtn = document.getElementById('discard-pile-close-btn');
    const tabDiscardHistory = document.getElementById('tab-discard-history');
    const tabDiscardTimeline = document.getElementById('tab-discard-timeline');
    const tabDiscardMatrix = document.getElementById('tab-discard-matrix');
    const contentDiscardHistory = document.getElementById('discard-tab-history');
    const contentDiscardTimeline = document.getElementById('discard-tab-timeline');
    const contentDiscardMatrix = document.getElementById('discard-tab-matrix');

    if (discardPileZone && discardOverlay) {
        discardPileZone.addEventListener('click', () => {
            if (window.gameAudio) window.gameAudio.playClick();
            const currentGs = (typeof window !== 'undefined' && window.globalGameState) || (typeof globalGameState !== 'undefined' ? globalGameState : null);
            if (typeof renderDiscardPileModal === 'function') {
                renderDiscardPileModal(currentGs);
            }
            openModal(discardOverlay, discardCloseBtn || undefined);
        });

        // 支援鍵盤 Enter/Space 觸發
        discardPileZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                discardPileZone.click();
            }
        });
    }

    if (discardCloseBtn && discardOverlay) {
        discardCloseBtn.addEventListener('click', () => {
            if (window.gameAudio) window.gameAudio.playClick();
            closeModal(discardOverlay);
        });
    }

    if (discardOverlay) {
        discardOverlay.addEventListener('click', (e) => {
            if (e.target === discardOverlay) {
                if (window.gameAudio) window.gameAudio.playClick();
                closeModal(discardOverlay);
            }
        });
    }

    // 出牌記錄彈窗標籤頁切換 (各角色歷程 / 依回合記錄 / 數字盤)
    const switchDiscardTab = (activeTab) => {
        if (window.gameAudio) window.gameAudio.playClick();
        if (tabDiscardHistory) tabDiscardHistory.classList.toggle('active', activeTab === 'history');
        if (tabDiscardTimeline) tabDiscardTimeline.classList.toggle('active', activeTab === 'timeline');
        if (tabDiscardMatrix) tabDiscardMatrix.classList.toggle('active', activeTab === 'matrix');

        if (contentDiscardHistory) contentDiscardHistory.classList.toggle('active', activeTab === 'history');
        if (contentDiscardTimeline) contentDiscardTimeline.classList.toggle('active', activeTab === 'timeline');
        if (contentDiscardMatrix) contentDiscardMatrix.classList.toggle('active', activeTab === 'matrix');
    };

    if (tabDiscardHistory) {
        tabDiscardHistory.addEventListener('click', () => switchDiscardTab('history'));
    }
    if (tabDiscardTimeline) {
        tabDiscardTimeline.addEventListener('click', () => switchDiscardTab('timeline'));
    }
    if (tabDiscardMatrix) {
        tabDiscardMatrix.addEventListener('click', () => switchDiscardTab('matrix'));
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

// --- 處理數值變動漂浮文字 (MP / 齒輪 / 護盾) ---
const lastSpawnOffsets = new Map(); // 記錄各目標最近一次浮字時間與垂直/水平偏移，防止短時間內同一目標的文字重疊



// ----------------------------------------
// 自訂字型上傳與即時反映模組
// ----------------------------------------

function initCustomFontUploader() {
    const uploadBtn = document.getElementById('font-upload-btn');
    const uploadInput = document.getElementById('font-upload-input');
    const resetBtn = document.getElementById('font-reset-btn');
    const statusEl = document.getElementById('font-upload-status');

    if (!uploadInput) return;

    const FONT_NAME = 'CustomGameFont';
    const STYLE_ID = 'custom-font-style-sheet';
    const STORAGE_KEY = 'eaten_custom_font';

    const injectCustomFontStyle = () => {
        let styleEl = document.getElementById(STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            body, button, input, select, textarea, .tab-btn, .modal-content, .drawer, .card-name, .game-header, .hud-title, .status-bar, .score-container, .role-badge, .log-item, .player-name, .story-text, .tutorial-pointer-bubble, #font-preview-box {
                font-family: '${FONT_NAME}', 'Noto Sans TC', Inter, -apple-system, sans-serif !important;
            }
        `;
        document.documentElement.style.setProperty('--font-main', `'${FONT_NAME}', sans-serif`);
    };

    const removeCustomFontStyle = () => {
        const styleEl = document.getElementById(STYLE_ID);
        if (styleEl) styleEl.remove();
        document.documentElement.style.removeProperty('--font-main');
    };

    const applyFontBuffer = async (buffer, fontFileName, saveToStorage = false) => {
        try {
            const fontFace = new FontFace(FONT_NAME, buffer);
            const loadedFace = await fontFace.load();
            document.fonts.add(loadedFace);
            injectCustomFontStyle();

            if (statusEl) {
                statusEl.textContent = window.i18n
                    ? window.i18n.t('ui.settings.custom_font_status_applied', { name: fontFileName })
                    : `已即時套用字型：${fontFileName}`;
                statusEl.style.color = '#4cd137';
            }
            if (resetBtn) resetBtn.style.display = 'inline-block';

            if (saveToStorage) {
                try {
                    // 若小於 3MB 則快取至 localStorage
                    if (buffer.byteLength < 3 * 1024 * 1024) {
                        let binary = '';
                        const bytes = new Uint8Array(buffer);
                        const len = bytes.byteLength;
                        for (let i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = btoa(binary);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: fontFileName, data: base64 }));
                    }
                } catch (_) {
                    // 若超過配額則略過快取，僅在當前頁面即時套用
                }
            }
        } catch (err) {
            console.error('[Font] 套用自訂字型失敗：', err);
            if (statusEl) {
                statusEl.textContent = window.i18n
                    ? window.i18n.t('ui.settings.custom_font_status_error')
                    : '✕ 字型載入失敗，請確認檔案格式';
                statusEl.style.color = '#ff6b6b';
            }
        }
    };

    // 嘗試從 localStorage 恢復自訂字型
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.data && parsed.name) {
                const binaryStr = atob(parsed.data);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                applyFontBuffer(bytes.buffer, parsed.name, false);
            }
        }
    } catch (_) {}

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadInput.click();
        });
    }

    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const buffer = event.target.result;
            applyFontBuffer(buffer, file.name, true);
        };
        reader.readAsArrayBuffer(file);
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            removeCustomFontStyle();
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
            uploadInput.value = '';
            resetBtn.style.display = 'none';
            if (statusEl) {
                statusEl.textContent = window.i18n
                    ? window.i18n.t('ui.settings.custom_font_status_default')
                    : '使用預設字型';
                statusEl.style.color = '#888';
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomFontUploader);
} else {
    initCustomFontUploader();
}


