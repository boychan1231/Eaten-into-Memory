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

// 新增：記錄玩家上一狀態，用於比對數值變化
let lastPlayerStats = {};

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
    window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
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
        // 🚀 批次效能優化：當日誌積壓或處於略過模式時，使用 DocumentFragment 一次性渲染
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

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (modalOpenOrder.length > 0) {
            event.preventDefault();
            closeTopModal();
        }
    });
    try { appLogger.log('[UI] 已載入，等待開始遊戲。'); } catch (_) { }

    setupTabNavigation('.tab-btn', '.tab-content', 'active', 'active-tab');

    const startModeNote = document.getElementById('start-mode-note');
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
        if (!startModeNote) return;
        const mode = getSelectionValue('start-game-mode', '5P');
        startModeNote.style.display = mode === '3P' ? 'block' : 'none';
    };
    bindSelectionButtons('start-game-mode', syncStartModeNote);
    bindSelectionButtons('start-time-demon-role');
    bindSelectionButtons('start-five-player-role');
    syncStartModeNote();

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

            // 播放確認音效 ---
            if (window.gameAudio) window.gameAudio.playConfirm();

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
                
                if (!globalGameState.gameEnded) {
                    try {
                        if (typeof window.startRound === 'function') window.startRound(globalGameState);
                        else if (typeof startRound === 'function') startRound(globalGameState);
                        else appLogger.log("❌ 致命錯誤：找不到 startRound 函式！請按 F12 檢查 game.js 是否有語法錯誤。");
                    } catch (e) {
                        appLogger.log("❌ 執行下一回合時程式崩潰，請按 F12 查看詳細錯誤！");
                        console.error(e);
                    }
                    updateUI(globalGameState);
                }
                return; 
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
                try {
                    // 👇 改用 Try-Catch 捕捉真正的錯誤 👇
                    if (typeof window.startRound === 'function') window.startRound(globalGameState);
                    else if (typeof startRound === 'function') startRound(globalGameState);
                    else appLogger.log("❌ 致命錯誤：找不到 startRound 函式！請按 F12 檢查 game.js 是否有語法錯誤。");
                } catch (e) {
                    appLogger.log("❌ 執行下一回合時程式崩潰，請按 F12 查看詳細錯誤！");
                    console.error(e);
                }
                updateUI(globalGameState);

            } else {
                appLogger.log("遊戲已結束。");
                nextBtn.disabled = true;
            }
        };
    }

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
        const selectedMode = window.GAME_CONFIG?.gameMode || '5P';
        const selectedRole = window.GAME_CONFIG?.threePStartingRole || '時針';
        const selectedFivePRole = window.GAME_CONFIG?.defaultHumanId || 'SM_1';
        setSelectionValue('start-game-mode', selectedMode);
        setSelectionValue('start-time-demon-role', selectedRole);
        setSelectionValue('start-five-player-role', selectedFivePRole);
        if (typeof syncStartModeNote === 'function') syncStartModeNote();
    };

    const getStartModalSelection = () => ({
        selectedMode: getSelectionValue('start-game-mode', '5P')
    });

    const applyStartConfig = ({ selectedMode, selectedThreePRole, cfgEnableAbilities, cfgTestMode }) => {
        window.GAME_CONFIG = window.GAME_CONFIG || { enableAbilities: false, testMode: false };
        window.GAME_CONFIG.enableAbilities = cfgEnableAbilities;
        window.GAME_CONFIG.testMode = cfgTestMode;
        window.GAME_CONFIG.gameMode = selectedMode;
        window.GAME_CONFIG.threePStartingRole = selectedThreePRole;
        if (typeof GAME_CONFIG !== 'undefined') {
            GAME_CONFIG.enableAbilities = cfgEnableAbilities;
            GAME_CONFIG.testMode = cfgTestMode;
            GAME_CONFIG.gameMode = selectedMode;
            GAME_CONFIG.threePStartingRole = selectedThreePRole;
        }
    };

    const doInitialize = () => {
        const logListEl = document.getElementById('log-list');
        if (logListEl) logListEl.innerHTML = '';
        const initFn = (typeof window.initializeGame === 'function') ? window.initializeGame : (typeof initializeGame === 'function' ? initializeGame : null);
        if (!initFn) throw new ReferenceError('initializeGame is not defined');
        globalGameState = initFn();
        resetMinuteHistory(globalGameState);
        resetRightPanels(globalGameState);
        uiTrackedGameRound = 1;// 重置輪數追蹤變數
        uiTokenMemory = {}; // 重新開始遊戲時清空記憶
        uiState.selectedCardValue = null;
        uiState.selectedCardValues = [];
        uiState.isSecondHandSelectingTwo = false;
        const humanId = getCurrentHumanPlayerId();
        const humanPlayer = globalGameState.players.find(p => p.id === humanId);
        if (humanPlayer) appLogger.log(`您扮演的角色是：【${humanPlayer.roleCard}】`);
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
                const cfgEnableAbilities = !!abilityToggleEl?.checked;
                const cfgTestMode = !!testToggleEl?.checked;
                const { selectedMode } = getStartModalSelection();
                pendingStartConfig = { selectedMode, cfgEnableAbilities, cfgTestMode };
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
                    cfgTestMode: pendingStartConfig.cfgTestMode
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
            if (val === 0) text = "⚡ 瞬間 (0ms)";
            else if (val <= 100) text = "⏩ 極快";
            else if (val <= 300) text = "▶ 一般";
            else text = "🐢慢速閱讀";
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

    // 1. 背景音樂 (BGM) 開關
    const bgmToggle = document.getElementById('bgm-toggle');
    if (bgmToggle && window.gameAudio) {
        // 初始化狀態 (Checked = 未靜音)
        bgmToggle.checked = !window.gameAudio.isBGMMuted;

        bgmToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.gameAudio.setBGMMuted(!isEnabled);
            appLogger.log(`[System] 背景音樂已${isEnabled ? '開啟' : '關閉'}`);
        });
    }

    // 2. 音效 (SFX) 開關
    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle && window.gameAudio) {
        // 初始化狀態
        sfxToggle.checked = !window.gameAudio.isSFXMuted;

        sfxToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            window.gameAudio.setSFXMuted(!isEnabled);
            appLogger.log(`[System] 音效已${isEnabled ? '開啟' : '關閉'}`);
        });
    }

    // 全域按鈕點擊音效 ---
    // 這樣不用幫每個按鈕加監聽器，只要是 button 標籤被點擊就會有聲音
    document.body.addEventListener('click', (e) => {
        // 如果點擊的是按鈕，或按鈕內部的元素
        if (e.target.closest('button') || e.target.classList.contains('minute-card')) {
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

    // 👇 新增：故事視窗的關閉控制 👇
    const storyOverlay = document.getElementById('story-overlay');
    const storyCloseBtn = document.getElementById('story-close-btn');

    if (storyCloseBtn && storyOverlay) {
        storyCloseBtn.addEventListener('click', () => {
            closeModal(storyOverlay);
            // ✅ 新增：點擊按鈕關閉時，切換回主遊戲 BGM
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
                // ✅ 新增：點擊視窗外部關閉時，切換回主遊戲 BGM
                if (window.gameAudio && typeof window.gameAudio.switchBGM === 'function') {
                    window.gameAudio.switchBGM('main');
                }
            }
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
            d6Die: (typeof player.d6Die === 'number') ? player.d6Die : 0,

            // --- 新增 (Add)：將位置也存入紀錄中 ---
            currentClockPosition: player.currentClockPosition
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
    const isPrecious = card.isPrecious ? '<span style="color:#ffd27f;">★ 珍貴</span>' : '';

    titleEl.innerHTML = `📖 ${age} ${num} ${isPrecious}`;

    // 從資料庫取得故事
    const stories = window.GAME_DATA?.HOUR_STORIES || {};
    const ageStories = stories[age] || {};
    const storyText = ageStories[num] || `這是一張尚未被發掘記憶的卡片...)`;

    // 替換換行符號為 <br>
    contentEl.innerHTML = storyText.replace(/\n/g, '<br>');

    openModal(overlay, document.getElementById('story-close-btn') || undefined);

    // ✅ 新增：打開故事時切換為故事 BGM
    if (window.gameAudio && typeof window.gameAudio.switchBGM === 'function') {
        window.gameAudio.switchBGM('story');
    }
}

// ---局數準備彈窗邏輯 ---
let nextRoundCallback = null;

window.showRoundReadyModal = function (titleText, subtitleText, callback) {
    const overlay = document.getElementById('round-ready-overlay');
    const titleEl = document.getElementById('round-ready-title');
    const contentEl = document.getElementById('round-ready-content');

    if (!overlay) {
        if (callback) callback();
        return;
    }

    // 填入文字
    if (titleEl) titleEl.textContent = titleText;
    if (contentEl) contentEl.textContent = subtitleText;
    nextRoundCallback = callback; // 記錄回呼函式，等待按鈕點擊後執行

    // 播放提示音效
    if (window.gameAudio && typeof window.gameAudio.playChime === 'function') {
        window.gameAudio.playChime();
    }

    // 顯示彈窗
    openModal(overlay, document.getElementById('btn-start-next-round'));
};

// ----------------------------------------

