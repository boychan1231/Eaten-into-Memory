// tutorial_mode.js - 新手教學模式與引導指標管理器

(function () {
    let tutorialSpotlightEl = null;

    // 清除目前畫面上所有引導高亮與氣泡提示
    function clearTutorialPointers() {
        if (tutorialSpotlightEl) {
            tutorialSpotlightEl.classList.remove('tutorial-spotlight');
            tutorialSpotlightEl = null;
        }
        document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));

        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
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

        // 高亮目標元素
        clearTutorialPointers();
        targetEl.classList.add('tutorial-spotlight');
        tutorialSpotlightEl = targetEl;

        // 設定訊息內容
        textEl.innerHTML = messageText;

        // 重新顯示 tooltip
        tooltip.classList.remove('hidden');
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
    }

    // 追蹤已顯示過的教學指南步驟；當全部核心步驟都顯示過並推進後，自動關閉教學
    const shownSteps = new Set();
    const CORE_STEPS = [
        'step1_select_minute',
        'step2_confirm_minute',
        'step3_select_hour',
        'step4_next_round'
    ];

    function hasCompletedAllTutorialSteps() {
        return CORE_STEPS.every(step => shownSteps.has(step));
    }

    // 根據當前遊戲階段 (GameState & Flags) 自動評判教學引導
    function updateTutorialPointers(gameState) {
        if (!gameState || (window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false)) {
            clearTutorialPointers();
            return;
        }

        const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
            ? window.getEffectiveHumanPlayerId()
            : 'SM_1';

        // 階段 1：等待人類出牌 (分鐘卡)
        if (gameState.currentRoundAIChoices !== null) {
            // 若四個核心教學步驟都已經顯示過（代表上一回合已完成完整教學循環），自動關閉教學
            if (hasCompletedAllTutorialSteps()) {
                disableTutorialMode(true);
                return;
            }

            const hasSelected = document.querySelector('.minute-card.selected');
            const turnPrefix = gameState.roundMarker > 1 ? '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>' : '';
            if (!hasSelected) {
                shownSteps.add('step1_select_minute');
                showTutorialPointer(
                    '#human-hand',
                    turnPrefix + '<strong>步驟 1：點擊挑選一張分鐘卡</strong><br>數字越大越有機會取得優先挑選小時卡的位置！',
                    'top'
                );
            } else {
                shownSteps.add('step2_confirm_minute');
                showTutorialPointer(
                    '#confirm-move-btn',
                    turnPrefix + '<strong>步驟 2：點擊「確認出牌」</strong><br>將挑選的分鐘卡打出與其他玩家比大小。',
                    'bottom'
                );
            }
            return;
        }

        // 階段 2：等待挑選小時卡 (輪到人類選卡)
        if (gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId) {
            const isSinDist = gameState.sinTargetingMode === 'sin' && gameState.gameMode !== '3P';
            const penaltyHint = isSinDist
                ? '<br><span style="color:#feca57;">⚠️ 當前為「受罰：距離最近」，請遠離時之惡！</span>'
                : '<br><span style="color:#ff6b6b;">⚠️ 當前為「受罰：最高小時值」，接近 12 者將扣生命/護盾！</span>';
            const turnPrefix = gameState.roundMarker > 1 ? '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>' : '';

            shownSteps.add('step3_select_hour');
            const highlightSpot = document.querySelector('.clock-spot.highlight-target');
            if (highlightSpot && highlightSpot.offsetParent !== null) {
                showTutorialPointer(
                    highlightSpot,
                    turnPrefix + '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！' + penaltyHint,
                    'top'
                );
            } else {
                showTutorialPointer(
                    '#clock-face',
                    turnPrefix + '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！' + penaltyHint,
                    'left'
                );
            }
            return;
        }

        // 階段 3：分針能力選擇中
        if (gameState.waitingMinuteHandChoice) {
            const turnPrefix = gameState.roundMarker > 1 ? '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>' : '';
            shownSteps.add('step_minute_ability');
            showTutorialPointer(
                '#evolution-progress-area',
                turnPrefix + '<strong>分針能力：</strong>可選擇順/逆時針移動一格，或點擊「下一回合」略過能力。',
                'right'
            );
            return;
        }

        // 階段 4：秒針二選一
        if (gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId) {
            const turnPrefix = gameState.roundMarker > 1 ? '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>' : '';
            shownSteps.add('step_second_ability');
            showTutorialPointer(
                '#seconds-choice-overlay .modal',
                turnPrefix + '<strong>秒針能力：</strong>請在兩張蓋放的分鐘卡中選擇最終打出的一張！',
                'top'
            );
            return;
        }

        // 階段 5：回合結束，準備進入下一回合
        const nextBtn = document.getElementById('next-step-btn');
        if (nextBtn && !nextBtn.disabled && nextBtn.offsetParent !== null) {
            // 若在開局尚未進行第 1 回合前（例如剛初始化），也先記錄或引導點擊下一回合
            if (shownSteps.has('step1_select_minute') && shownSteps.has('step2_confirm_minute') && shownSteps.has('step3_select_hour')) {
                shownSteps.add('step4_next_round');
            }
            const turnPrefix = gameState.roundMarker > 1 ? '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>' : '';
            showTutorialPointer(
                '#next-step-btn',
                turnPrefix + '<strong>回合結算完畢！</strong>點擊「下一回合」展開新回合競標。',
                'left'
            );
            return;
        }

        clearTutorialPointers();
    }

    // 關閉/停用教學引導
    function disableTutorialMode(isAutoCompleted = false) {
        if (window.GAME_CONFIG) {
            window.GAME_CONFIG.tutorialMode = false;
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
        disableTutorialMode,
        resetTutorialProgress
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
    });
})();
