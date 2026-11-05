// tutorial_mode.js - 新手教學模式與引導指標管理器

(function () {
    let tutorialSpotlightEl = null;
    let autoDismissTimer = null;
    const TOOLTIP_AUTO_DISMISS_SECONDS = 10;

    // 清除自動隱藏計時器
    function clearAutoDismissTimer() {
        if (autoDismissTimer) {
            clearTimeout(autoDismissTimer);
            autoDismissTimer = null;
        }
    }

    // 啟動氣泡提示自動隱藏倒數計時器
    function scheduleAutoDismiss(seconds = TOOLTIP_AUTO_DISMISS_SECONDS) {
        clearAutoDismissTimer();
        autoDismissTimer = setTimeout(() => {
            clearTutorialPointers();
        }, seconds * 1000);
    }

    // 清除目前畫面上所有引導高亮與氣泡提示
    function clearTutorialPointers() {
        clearAutoDismissTimer();

        if (tutorialSpotlightEl) {
            tutorialSpotlightEl.classList.remove('tutorial-spotlight');
            tutorialSpotlightEl = null;
        }
        document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));

        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('tutorial-fade-in');
        }
    }

    // 將動態氣泡提示框指向目標 DOM 元素
    function showTutorialPointer(targetSelector, messageText, arrowDirection = 'bottom') {
        // 若玩家停用教學模式，不動作
        if (window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false) {
            clearTutorialPointers();
            return;
        }

        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        const textEl = document.getElementById('tutorial-tooltip-text');
        if (!tooltip || !textEl) return;

        let targetEl = null;
        if (typeof targetSelector === 'string') {
            targetEl = document.querySelector(targetSelector);
        } else if (targetSelector instanceof HTMLElement) {
            targetEl = targetSelector;
        }

        if (!targetEl || targetEl.offsetParent === null) {
            clearTutorialPointers();
            return;
        }

        const wasHidden = tooltip.classList.contains('hidden');

        // 高亮目標元素
        clearTutorialPointers();
        targetEl.classList.add('tutorial-spotlight');
        tutorialSpotlightEl = targetEl;

        // 設定訊息內容
        textEl.innerHTML = messageText;

        // 重新顯示 tooltip（若為初次／重新浮現，加入淡入動畫）
        tooltip.classList.remove('hidden');
        if (wasHidden) {
            tooltip.classList.add('tutorial-fade-in');
        }
        tooltip.setAttribute('data-arrow', arrowDirection);

        // 計算定位
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = 0;
        let left = 0;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (arrowDirection === 'bottom') {
            top = rect.top - tooltipRect.height - 14;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        } else if (arrowDirection === 'top') {
            top = rect.bottom + 14;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        } else if (arrowDirection === 'left') {
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.right + 14;
        } else if (arrowDirection === 'right') {
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.left - tooltipRect.width - 14;
        }

        // 邊界防禦與防遮擋修正
        left = Math.max(10, Math.min(left, viewportWidth - tooltipRect.width - 10));
        top = Math.max(10, Math.min(top, viewportHeight - tooltipRect.height - 10));

        // 若計算出的框位與目標按鈕有重疊碰撞，向上挪移避開按鈕
        if (
            left < rect.right &&
            left + tooltipRect.width > rect.left &&
            top < rect.bottom &&
            top + tooltipRect.height > rect.top
        ) {
            top = Math.max(10, rect.top - tooltipRect.height - 14);
            tooltip.setAttribute('data-arrow', 'bottom');
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        // 每次成功展示教學提示時，啟動 10 秒自動隱藏倒數，避免提示永久滯留遮擋盤面
        scheduleAutoDismiss(TOOLTIP_AUTO_DISMISS_SECONDS);
    }

    // 追蹤已顯示過的教學指南步驟；當核心步驟顯示並推進後，自動關閉教學
    const shownSteps = new Set();

    function hasCompletedAllTutorialSteps(gameState) {
        // 情況 A：若當前對局已推進至第 3 回合以上 (roundMarker >= 3 或 gameRound > 1)，
        // 且玩家已體驗過拖曳出牌，代表初期教學已足夠，自動關閉教學以避免干擾
        if (gameState && ((gameState.roundMarker && gameState.roundMarker >= 3) || gameState.gameRound > 1) && shownSteps.has('step1_drag_minute')) {
            return true;
        }

        // 情況 B：玩家已完成出牌 (step1_drag_minute)，且經歷過進鐘面選卡 (step3_select_hour 或 step4_next_round)
        // 以及經歷過無須選卡/未進鐘面的優劣勢提醒 (step3_no_hour_notice 或 step4_no_hour_card)
        const hasPlayedCard = shownSteps.has('step1_drag_minute');
        const hasExperiencedPickHour = shownSteps.has('step3_select_hour') || shownSteps.has('step4_next_round');
        const hasExperiencedNoHour = shownSteps.has('step3_no_hour_notice') || shownSteps.has('step4_no_hour_card');
        if (hasPlayedCard && hasExperiencedPickHour && hasExperiencedNoHour) {
            return true;
        }

        return false;
    }

    // 根據當前遊戲階段 (GameState & Flags) 自動評判教學引導
    function updateTutorialPointers(gameState) {
        if (!gameState || (window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false)) {
            clearTutorialPointers();
            return;
        }

        // 核心檢查：若玩家已經完成新手教學步驟或已完成第 1 回合完整循環，立即自動關閉教學模式
        if (hasCompletedAllTutorialSteps(gameState)) {
            disableTutorialMode(true);
            return;
        }

        // 若現代版進場動畫 (modern-intro-overlay) 尚未完全結束，暫不顯示教學提示，待進場動畫結束後再顯示
        const introOverlay = document.getElementById('modern-intro-overlay');
        const introStillVisible = introOverlay && (
            typeof window.getComputedStyle === 'function'
                ? window.getComputedStyle(introOverlay).display !== 'none'
                : (introOverlay.style ? introOverlay.style.display !== 'none' : false)
        );
        if ((window.ModernIntro && window.ModernIntro.state !== 'DONE') || introStillVisible) {
            clearTutorialPointers();
            return;
        }

        // 若正在播放分鐘卡比大小與次序排列動畫，暫時隱藏教學提示以免遮擋動畫
        if (gameState.isPlayingMinuteClash) {
            clearTutorialPointers();
            return;
        }

        const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
            ? window.getEffectiveHumanPlayerId()
            : 'SM_1';

        // 若進入新一場遊戲（第 1 局、第 1 回合、尚未翻開小時卡），自動重置教學步驟紀錄
        if (!shownSteps.has('step1_drag_minute') && gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && (!gameState.currentDrawnHourCards || gameState.currentDrawnHourCards.length === 0)) {
            shownSteps.clear();
        }

        // 【優先檢查 0】：開局初始歡迎提示（第 1 局、第 1 回合、尚未展開出牌）
        const nextBtn = document.getElementById('next-step-btn');
        const isInitialOpening = (gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && !shownSteps.has('step1_drag_minute'));
        if (isInitialOpening) {
            shownSteps.add('step0_welcome');
            shownSteps.add('has_shown_welcome');
            const welcomeMsg = window.i18n
                ? window.i18n.t('tutorial.step0_welcome')
                : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。';
            if (nextBtn && nextBtn.offsetParent !== null) {
                nextBtn.disabled = false;
                showTutorialPointer(nextBtn, welcomeMsg, 'left');
                return;
            }
        }

        const welcomePrefix = !shownSteps.has('has_shown_welcome')
            ? (window.i18n ? window.i18n.t('tutorial.welcome_prefix') : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>')
            : '';

        // 階段 1：等待人類出牌 (分鐘卡)
        if (gameState.currentRoundAIChoices !== null) {
            if (hasCompletedAllTutorialSteps(gameState)) {
                disableTutorialMode(true);
                return;
            }

            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';

            // 若玩家啟動了「秒針」蓋 2 張特殊能力，則保留「點選 2 張卡牌 + 點擊確認出牌」的教學提示
            if (typeof uiState !== 'undefined' && uiState.isSecondHandSelectingTwo) {
                shownSteps.add('has_shown_welcome');
                const selectedCount = Array.isArray(uiState.selectedCardValues) ? uiState.selectedCardValues.length : 0;
                if (selectedCount < 2) {
                    const msg = window.i18n
                        ? window.i18n.t('tutorial.step1_sec_ability_select', { count: selectedCount })
                        : `<strong>秒針能力（${selectedCount}/2）：請點選 2 張分鐘卡</strong><br>選滿 2 張後再點擊右側「確認出牌」。`;
                    showTutorialPointer('#human-hand', welcomePrefix + turnPrefix + msg, 'top');
                } else {
                    const msg = window.i18n
                        ? window.i18n.t('tutorial.step1_sec_ability_confirm')
                        : '<strong>秒針能力：點擊「確認出牌」</strong><br>將挑選的 2 張分鐘卡蓋牌送出！';
                    showTutorialPointer('#confirm-move-btn', welcomePrefix + turnPrefix + msg, 'bottom');
                }
                return;
            }

            // 一般出牌：引導玩家直接將分鐘卡向上拖曳至鐘面出牌
            shownSteps.add('step1_drag_minute');
            shownSteps.add('has_shown_welcome');
            const step1Msg = window.i18n
                ? window.i18n.t('tutorial.step1_drag_minute')
                : '<strong>步驟 1：向上拖曳一張分鐘卡至鐘面出牌</strong><br>按住卡牌往鐘面方向拉動並放開出牌。<br>💡 <strong>戰術思維：</strong>數字大者可搶佔鐘面安全位與回憶卡；數字較小未進前 2 名則無須進入鐘面，能安全避開受罰！';
            showTutorialPointer('#human-hand', welcomePrefix + turnPrefix + step1Msg, 'top');
            return;
        }

        // 階段 2：等待挑選小時卡 (輪到人類選卡)
        if (gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId) {
            const isSinDist = gameState.sinTargetingMode === 'sin' && gameState.gameMode !== '3P';
            const penaltyHint = isSinDist
                ? (window.i18n ? window.i18n.t('tutorial.penalty_sin') : '<br><span style="color:#feca57;">⚠️ 當前為「受罰：距離最近」，請遠離時之惡！</span>')
                : (window.i18n ? window.i18n.t('tutorial.penalty_max') : '<br><span style="color:#ff6b6b;">⚠️ 當前為「受罰：最高小時值」，接近 12 者將扣生命/護盾！</span>');
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';

            shownSteps.add('step3_select_hour');
            const step3Msg = (window.i18n ? window.i18n.t('tutorial.step3_select_hour') : '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！') + penaltyHint;
            const highlightSpot = document.querySelector('.clock-spot.highlight-target');
            if (highlightSpot && highlightSpot.offsetParent !== null) {
                showTutorialPointer(highlightSpot, turnPrefix + step3Msg, 'top');
            } else {
                showTutorialPointer('#clock-face', turnPrefix + step3Msg, 'left');
            }
            return;
        }

        // 階段 2-B：等待挑選小時卡，但人類玩家未進前 2 名（無須挑選小時卡）
        const isHourPhase = (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) || gameState.waitingHourChoice;
        const humanNotPicker = gameState.hourPickOrder && Array.isArray(gameState.hourPickOrder) && !gameState.hourPickOrder.some(p => p.playerId === humanId);
        if (isHourPhase && humanNotPicker && !shownSteps.has('step3_no_hour_notice')) {
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';
            shownSteps.add('step3_no_hour_notice');
            const noHourNotice = window.i18n
                ? window.i18n.t('tutorial.step3_no_hour_notice')
                : '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險保命）：</strong>本回合不進入鐘面，<strong>完全免疫</strong>「受罰」扣減齒輪（生命值）的風險！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，將延緩達成角色進化（變身）的進度。';
            showTutorialPointer('#clock-face', turnPrefix + noHourNotice, 'left');
            return;
        }

        // 階段 3：分針能力選擇中
        if (gameState.waitingMinuteHandChoice) {
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';
            shownSteps.add('step_minute_ability');
            const minMsg = window.i18n
                ? window.i18n.t('tutorial.step_minute_ability')
                : '<strong>分針能力：</strong>可選擇順/逆時針移動一格，或點擊「下一回合」略過能力。';
            showTutorialPointer('#evolution-progress-area', turnPrefix + minMsg, 'right');
            return;
        }

        // 階段 4：秒針二選一
        if (gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId) {
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';
            shownSteps.add('step_second_ability');
            const secMsg = window.i18n
                ? window.i18n.t('tutorial.step_second_ability')
                : '<strong>秒針能力：</strong>請在兩張蓋放的分鐘卡中選擇最終打出的一張！';
            showTutorialPointer('#seconds-choice-overlay .modal', turnPrefix + secMsg, 'top');
            return;
        }

        // 階段 5：回合結束，準備進入下一回合
        if (nextBtn && !nextBtn.disabled && nextBtn.offsetParent !== null) {
            const isInitialStart = (gameState.gameRound === 1 && gameState.roundMarker === 1 && !shownSteps.has('step1_drag_minute'));
            if (isInitialStart) {
                shownSteps.add('step0_welcome');
                shownSteps.add('has_shown_welcome');
                const welcomeMsg = window.i18n
                    ? window.i18n.t('tutorial.step0_welcome')
                    : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。';
                showTutorialPointer(nextBtn, welcomeMsg, 'left');
            } else {
                const turnPrefix = gameState.roundMarker > 1
                    ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                    : '';

                const humanPlayer = gameState.players ? gameState.players.find(p => p.id === humanId) : null;
                const didPickHour = !!(humanPlayer && humanPlayer.pickedHourThisTurn);

                if (didPickHour) {
                    shownSteps.add('step4_next_round');
                    const roundDoneMsg = window.i18n
                        ? window.i18n.t('tutorial.step4_round_done')
                        : '<strong>回合結算完畢！</strong>點擊「下一回合」展開新回合競標。';
                    showTutorialPointer('#next-step-btn', turnPrefix + roundDoneMsg, 'left');
                } else {
                    // 玩家未取得小時卡（未進入鐘面）
                    // 告知：雖然不進入鐘面能保護齒輪，卻沒法取得變身用的珍貴回憶卡
                    shownSteps.add('step4_no_hour_card');
                    const noHourMsg = window.i18n
                        ? window.i18n.t('tutorial.step4_no_hour_card')
                        : '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險）：</strong>本回合不進入鐘面，齒輪毫髮無損！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，延緩變身進度。<br>點擊「<strong>下一回合</strong>」展開新回合競標！';
                    showTutorialPointer('#next-step-btn', turnPrefix + noHourMsg, 'left');
                }
            }
            return;
        }

        clearTutorialPointers();
    }

    // 關閉/停用教學引導
    function disableTutorialMode(isAutoCompleted = false) {
        if (window.GAME_CONFIG) {
            window.GAME_CONFIG.tutorialMode = false;
        }
        if (typeof GAME_CONFIG !== 'undefined') {
            GAME_CONFIG.tutorialMode = false;
        }
        const toggleEl = document.getElementById('tutorial-toggle');
        if (toggleEl) toggleEl.checked = false;
        const introToggleEl = document.getElementById('intro-tutorial-chk');
        if (introToggleEl) introToggleEl.checked = false;
        clearTutorialPointers();
        if (window.appLogger) {
            window.appLogger.log(
                isAutoCompleted
                    ? '💡 所有教學指南已顯示完畢，新手教學模式已自動關閉。'
                    : '💡 新手教學模式已關閉。'
            );
        }
    }

    function resetTutorialProgress() {
        shownSteps.clear();
    }

    // 掛載全域物件
    window.TutorialModeManager = {
        showTutorialPointer,
        updateTutorialPointers,
        clearTutorialPointers,
        dismissTooltip: clearTutorialPointers,
        disableTutorialMode,
        resetTutorialProgress,
        hasCompletedAllTutorialSteps
    };

    // 視窗大小改變時重新計算 Tooltip 位置
    window.addEventListener('resize', () => {
        if (window.globalGameState && window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode) {
            updateTutorialPointers(window.globalGameState);
        }
    });

    // 頁面載入與點擊視窗外部關閉處理
    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('tutorial-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                disableTutorialMode(false);
            });
        }
        const toggleEl = document.getElementById('tutorial-toggle');
        if (toggleEl) {
            toggleEl.addEventListener('change', (e) => {
                if (e.target.checked) {
                    shownSteps.clear();
                }
            });
        }
        const introToggleEl = document.getElementById('intro-tutorial-chk');
        if (introToggleEl) {
            introToggleEl.addEventListener('change', (e) => {
                if (e.target.checked) {
                    shownSteps.clear();
                }
            });
        }

        // 點擊視窗任意外部區域（包含點擊按鈕、卡牌、盤面空白處）：自動關閉當前氣泡提示
        document.addEventListener('pointerdown', (e) => {
            const tooltip = document.getElementById('tutorial-pointer-tooltip');
            if (!tooltip || tooltip.classList.contains('hidden')) return;

            // 若點擊的是關閉按鈕，保留其原生點擊行為以觸發 disableTutorialMode(false)
            if (e.target && (e.target.id === 'tutorial-close-btn' || (e.target.classList && e.target.classList.contains('tutorial-close-x')))) {
                return;
            }

            // 外部點擊：自動關閉當前提示氣泡
            clearTutorialPointers();
        }, true);
    });
})();
