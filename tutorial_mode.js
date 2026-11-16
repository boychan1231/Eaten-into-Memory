// tutorial_mode.js - 新手教學模式與引導指標管理器

(function () {
    let tutorialSpotlightEl = null;
    let autoDismissTimer = null;
    const TOOLTIP_AUTO_DISMISS_SECONDS = 25; // 備用

    // 教學歷史閱覽記錄與當前檢視索引
    const tutorialHistory = [];
    let currentHistoryIndex = -1;

    // 清除自動隱藏計時器
    function clearAutoDismissTimer() {
        if (autoDismissTimer) {
            clearTimeout(autoDismissTimer);
            autoDismissTimer = null;
        }
    }

    // 氣泡提示自動隱藏排程（依使用者指示：教學說明不會自動消除，而是在執行教學說明的動作後自動進入下一個說明，不再設置自動定時器）
    function scheduleAutoDismiss() {
        clearAutoDismissTimer();
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
            tooltip.style.visibility = '';
        }
    }

    // 檢驗 DOM 元素是否處於可見狀態（支援 fixed 定位與自訂容器）
    function isElementVisible(el) {
        if (!el) return false;
        if (el === document.body || el.id === 'clock-face' || el.id === 'modern-board' || el.id === 'table-top') return true;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
        if (typeof el.getClientRects === 'function' && el.getClientRects().length > 0) return true;
        return false;
    }

    // 計算提示框的最佳定位與指向箭頭
    function computeOptimalPosition(targetEl, tooltipEl, preferredPlacement = 'auto') {
        const isClockContainer = targetEl.id === 'clock-face' || targetEl.id === 'modern-board' || targetEl.id === 'table-top' || targetEl === document.body;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 實測提示框真實尺寸
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || Math.min(340, viewportWidth - 24);
        const tooltipHeight = tooltipRect.height || 140;

        // 【使用者指示】：當視窗寬度足夠時，統一放到畫面最左邊安全區，絕不干擾中央鐘面、右側面板或底部手牌
        const isWideScreen = viewportWidth >= 1000;
        if (isWideScreen) {
            const left = 20;
            const minTop = 130; // 避開頂部 header 與左上角抽屜按鈕群
            const idealTop = Math.round((viewportHeight - tooltipHeight) * 0.38);
            const maxTop = Math.max(minTop, viewportHeight - tooltipHeight - 20);
            const safeTop = Math.max(minTop, Math.min(idealTop, maxTop));
            return { left, top: safeTop, arrow: 'none', arrowX: tooltipWidth / 2, arrowY: 0 };
        }

        // 若目標為全屏鐘面/桌面容器：懸浮於畫面中央偏右安全區，防止阻擋中央鐘面
        if (isClockContainer) {
            const idealLeft = viewportWidth > 768
                ? Math.round(viewportWidth * 0.52)
                : Math.round((viewportWidth - tooltipWidth) / 2);
            const idealTop = Math.round((viewportHeight - tooltipHeight) * 0.42);
            const safeLeft = Math.max(12, Math.min(idealLeft, viewportWidth - tooltipWidth - 16));
            const safeTop = Math.max(64, Math.min(idealTop, viewportHeight - tooltipHeight - 16));
            return { left: safeLeft, top: safeTop, arrow: 'none', arrowX: tooltipWidth / 2, arrowY: 0 };
        }

        const rect = targetEl.getBoundingClientRect();

        // 若指定為「中央偏右 (center-right)」（如開局歡迎教學指南指向下一回合按鈕），懸浮於中央偏右安全區並指向目標
        if (preferredPlacement === 'center-right') {
            const idealLeft = viewportWidth > 768
                ? Math.round(viewportWidth * 0.52)
                : Math.round((viewportWidth - tooltipWidth) / 2);
            const idealTop = Math.round((viewportHeight - tooltipHeight) * 0.42);
            const maxAllowedTop = rect.top > tooltipHeight + 24
                ? rect.top - tooltipHeight - 16
                : viewportHeight - tooltipHeight - 16;
            const safeLeft = Math.max(12, Math.min(idealLeft, viewportWidth - tooltipWidth - 16));
            const safeTop = Math.max(64, Math.min(idealTop, maxAllowedTop));
            const targetCenterX = rect.left + rect.width / 2;
            const arrowX = Math.max(18, Math.min(tooltipWidth - 18, Math.round(targetCenterX - safeLeft)));
            return { left: safeLeft, top: safeTop, arrow: 'bottom', arrowX, arrowY: tooltipHeight };
        }

        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = viewportWidth - rect.right;

        let chosen = preferredPlacement;

        // 智慧評估空間：若偏好方位放不下，自動翻轉至空間充裕的方位
        if (chosen === 'auto' || !['top', 'bottom', 'left', 'right'].includes(chosen)) {
            if (spaceAbove >= tooltipHeight + 16) {
                chosen = 'top';
            } else if (spaceBelow >= tooltipHeight + 16) {
                chosen = 'bottom';
            } else if (spaceLeft >= tooltipWidth + 16) {
                chosen = 'left';
            } else if (spaceRight >= tooltipWidth + 16) {
                chosen = 'right';
            } else {
                chosen = spaceAbove >= spaceBelow ? 'top' : 'bottom';
            }
        }

        // 邊界防禦與覆蓋重疊翻轉
        if (chosen === 'left' && spaceLeft < tooltipWidth + 14) {
            chosen = spaceAbove >= tooltipHeight + 14 ? 'top' : (spaceBelow >= tooltipHeight + 14 ? 'bottom' : 'top');
        } else if (chosen === 'right' && spaceRight < tooltipWidth + 14) {
            chosen = spaceAbove >= tooltipHeight + 14 ? 'top' : (spaceBelow >= tooltipHeight + 14 ? 'bottom' : 'left');
        } else if (chosen === 'top' && spaceAbove < tooltipHeight + 14 && spaceBelow > spaceAbove) {
            chosen = 'bottom';
        } else if (chosen === 'bottom' && spaceBelow < tooltipHeight + 14 && spaceAbove > spaceBelow) {
            chosen = 'top';
        }

        let top = 0;
        let left = 0;
        let arrow = 'bottom';

        if (chosen === 'top') {
            // 氣泡位於目標上方，箭頭朝下指向目標，保留 16px 安全淨空，絕不覆蓋目標卡牌
            top = rect.top - tooltipHeight - 16;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            arrow = 'bottom';
        } else if (chosen === 'bottom') {
            // 氣泡位於目標下方，箭頭朝上指向目標
            top = rect.bottom + 14;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            arrow = 'top';
        } else if (chosen === 'left') {
            // 氣泡位於目標左方，箭頭朝右指向目標
            left = rect.left - tooltipWidth - 14;
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            arrow = 'right';
        } else if (chosen === 'right') {
            // 氣泡位於目標右方，箭頭朝左指向目標
            left = rect.right + 14;
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            arrow = 'left';
        }

        // 確保提示框完全在可視視窗安全邊界之內
        // 當氣泡位於目標上方時，maxTopAllowed 嚴格限制在目標頂部上方，絕對防止向下推擠覆蓋手牌卡牌
        const maxTopAllowed = (chosen === 'top')
            ? Math.max(10, rect.top - tooltipHeight - 12)
            : viewportHeight - tooltipHeight - 10;
        const safeLeft = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
        const safeTop = Math.max(10, Math.min(top, maxTopAllowed));

        // 計算箭頭在氣泡上的相對座標，精確直指目標中心
        const targetCenterX = rect.left + rect.width / 2;
        const targetCenterY = rect.top + rect.height / 2;
        const arrowX = Math.max(18, Math.min(tooltipWidth - 18, Math.round(targetCenterX - safeLeft)));
        const arrowY = Math.max(14, Math.min(tooltipHeight - 14, Math.round(targetCenterY - safeTop)));

        return { left: safeLeft, top: safeTop, arrow, arrowX, arrowY };
    }

    // 更新教學視窗底部的上一則/下一則導覽狀態
    function updateTutorialNav() {
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const statusEl = document.getElementById('tutorial-history-status');
        if (!prevBtn || !nextBtn || !statusEl) return;

        const total = tutorialHistory.length;
        if (total <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            const latestLabel = window.i18n ? window.i18n.t('tutorial.latest_tag') : '最新進度';
            statusEl.textContent = total === 1 ? latestLabel : '';
            statusEl.classList.remove('is-historical');
            return;
        }

        const currentPos = currentHistoryIndex + 1;
        const isLatest = (currentHistoryIndex === total - 1);

        prevBtn.disabled = (currentHistoryIndex <= 0);
        nextBtn.disabled = isLatest;

        if (isLatest) {
            statusEl.textContent = `${currentPos} / ${total}`;
            statusEl.classList.remove('is-historical');
        } else {
            const histTag = window.i18n ? window.i18n.t('tutorial.history_tag') : '（歷史閱覽）';
            statusEl.textContent = `${currentPos} / ${total} ${histTag}`;
            statusEl.classList.add('is-historical');
        }
    }

    // 歷史閱覽切換函式（delta = -1 閱覽上一則，delta = 1 閱覽下一則）
    function navigateTutorialHistory(delta) {
        if (tutorialHistory.length === 0) return;
        const targetIndex = currentHistoryIndex + delta;
        if (targetIndex < 0 || targetIndex >= tutorialHistory.length) return;

        currentHistoryIndex = targetIndex;
        const entry = tutorialHistory[currentHistoryIndex];
        if (!entry) return;

        const isLatest = (currentHistoryIndex === tutorialHistory.length - 1);
        let displayMsg = entry.messageText;
        if (!isLatest) {
            displayMsg = `<div style="font-size:0.78rem; color:#ff9ff3; margin-bottom:4px; font-weight:bold;">📜【歷史教學回顧】</div>` + displayMsg;
        }

        renderTutorialMessage(entry.targetSelector, displayMsg, entry.preferredPlacement);
        updateTutorialNav();
    }

    // 核心渲染函式：負責幾何測量、定位座標與氣泡框原地淡入顯現
    function renderTutorialMessage(targetSelector, messageText, preferredPlacement = 'auto') {
        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        const textEl = document.getElementById('tutorial-tooltip-text');
        if (!tooltip || !textEl) return;

        let targetEl = null;
        if (typeof targetSelector === 'string') {
            targetEl = document.querySelector(targetSelector);
        } else if ((typeof HTMLElement !== 'undefined' && targetSelector instanceof HTMLElement) || (targetSelector && typeof targetSelector === 'object' && (targetSelector.nodeType === 1 || targetSelector._rect))) {
            targetEl = targetSelector;
        }

        // 若目標暫時不可見（例如歷史步驟之按鈕已隱藏），安全退回至 document.body 容器供玩家完整閱讀
        if (!targetEl || !isElementVisible(targetEl)) {
            targetEl = document.body;
        }

        // 清除舊高亮
        if (tutorialSpotlightEl) {
            tutorialSpotlightEl.classList.remove('tutorial-spotlight');
            tutorialSpotlightEl = null;
        }
        document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));

        // 目標高亮：若非全屏容器或 body，加上聚光燈樣式（純光暈無 scale 變形）
        const isClockContainer = targetEl.id === 'clock-face' || targetEl.id === 'modern-board' || targetEl.id === 'table-top' || targetEl === document.body;
        if (!isClockContainer && isElementVisible(targetEl)) {
            targetEl.classList.add('tutorial-spotlight');
            tutorialSpotlightEl = targetEl;
        }

        // 設定訊息內容
        textEl.innerHTML = messageText;

        // 關鍵強化：在 visibility: hidden 狀態下解除 display: none，強制瀏覽器重排以獲取注入最新文字後的真實幾何尺寸
        tooltip.classList.remove('hidden');
        tooltip.style.visibility = 'hidden';
        tooltip.style.transition = 'none';
        void tooltip.offsetWidth; // 強制重排

        // 計算最佳定位座標（基於實測真實尺寸）
        const pos = computeOptimalPosition(targetEl, tooltip, preferredPlacement);
        tooltip.setAttribute('data-arrow', pos.arrow);

        // 切換教學步驟或重新顯示時，一律先於 DOM 精確設定座標，絕不在畫面上橫向飛竄
        tooltip.style.left = `${pos.left}px`;
        tooltip.style.top = `${pos.top}px`;

        if (typeof tooltip.style.setProperty === 'function') {
            tooltip.style.setProperty('--arrow-x', `${pos.arrowX}px`);
            tooltip.style.setProperty('--arrow-y', `${pos.arrowY}px`);
        } else {
            tooltip.style['--arrow-x'] = `${pos.arrowX}px`;
            tooltip.style['--arrow-y'] = `${pos.arrowY}px`;
        }

        // 尺寸與座標定錨完成後，恢復可見並以純透明度原地淡入顯現（常駐顯示，直到玩家執行說明動作推進）
        tooltip.style.visibility = 'visible';
        tooltip.classList.remove('tutorial-fade-in');
        void tooltip.offsetWidth; // 強制觸發重繪 (reflow) 使定位立即生效
        tooltip.classList.add('tutorial-fade-in');
    }

    // 將動態氣泡提示框指向目標 DOM 元素（納入歷史記錄佇列供回溯閱覽）
    function showTutorialPointer(targetSelector, messageText, preferredPlacement = 'auto') {
        // 若玩家停用教學模式，不動作
        if (window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false) {
            clearTutorialPointers();
            return;
        }

        // 記錄至歷史記錄佇列（連續相同訊息不重複新增）
        const lastEntry = tutorialHistory[tutorialHistory.length - 1];
        if (!lastEntry || lastEntry.messageText !== messageText) {
            tutorialHistory.push({
                targetSelector,
                messageText,
                preferredPlacement
            });
        }
        currentHistoryIndex = tutorialHistory.length - 1;

        renderTutorialMessage(targetSelector, messageText, preferredPlacement);
        updateTutorialNav();
    }

    // 追蹤已顯示過的教學步驟，避免同步驟於同一局對局中重複彈出干擾玩家
    const shownSteps = new Set();

    function hasCompletedAllTutorialSteps(gameState) {
        // 核心流程：出牌 + 完成回合
        const hasPlayedCard = shownSteps.has('step1_drag_minute');
        const hasFinishedRound = shownSteps.has('step4_next_round') || shownSteps.has('step4_no_hour_card');
        return hasPlayedCard && hasFinishedRound;
    }

    // 判斷人類玩家當前角色標識
    function getHumanRoleKey(player) {
        if (!player) return 'young';
        if (player.type === '時之惡') return 'sin';
        if (player.type === '受詛者') return 'scz';
        const roleCard = String(player.roleCard || '');
        if (roleCard.includes('時針')) return 'hour';
        if (roleCard.includes('分針')) return 'minute';
        if (roleCard.includes('秒針')) return 'second';
        return 'young';
    }

    // 取得角色專屬得分與目標說明預設文本 (若 i18n 尚未載入時備用)
    function getDefaultRoleScoringText(roleKey) {
        switch (roleKey) {
            case 'sin':
                return '<strong>【😈 時之惡 · 獵殺與得分指南】</strong><br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>🩸 特殊大勝：</strong>在 5 局內成功將全場 3 位時魔<strong>各驅逐一次</strong>，即可直接奪得特殊大勝！<br>• <strong>⚠️ 飢餓懲罰：</strong>若連續 2 局無人被驅逐時，將因飢餓扣除 1 齒輪！齒輪歸零時直接敗北！<br>• <strong>專屬異能：</strong>【惡之牽引 (2 Mana)】改變處決規則為「處決距離自己最近者」；【虛無封鎖 (3 Mana)】封印全場技能！';
            case 'scz':
                return '<strong>【👻 受詛者 · 鎖定與得分指南】</strong><br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>🔒 核心任務：</strong>踩中帶有【★】的珍貴小時卡將其永久鎖定在鐘面！<br>• <strong>🏆 巨額階段分：</strong>第 2 / 3 / 4 局結束前累積鎖定 12 張，依序額外獲得 <strong>+9 / +5 / +2 巨額獎勵分</strong>！<br>• <strong>☠️ 終局生死線：</strong>第 5 局結束若<strong>未滿 12 張</strong>，總分將被重扣 <strong>-999 分</strong>！務必全力搶奪珍貴卡！';
            case 'hour':
                return '<strong>【👁️ 時針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>預知未來：</strong>每回合自動預覽小時牌庫頂牌數值。<br>• <strong>移底操弄：</strong>主動消耗 Mana 將 11、12 點高危毒牌移至底部，確保翻出的都是安全的小數字小時卡，保全自身齒輪！';
            case 'minute':
                return '<strong>【👟 分針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>躍遷避險：</strong>取得小時卡落子後，可消耗 2 Mana 順時針或逆時針跳躍至下一個有牌的刻度，甩開 12 點處決厄運，把受罰丟給對手！';
            case 'second':
                return '<strong>【🃏 秒針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>後手雙牌伏擊：</strong>關鍵回合消耗 3 Mana 暗蓋 2 張分鐘卡，看清全場牌後再二選一打出！精準搶下低刻度安全格或故意落入第 3 名避險！';
            case 'young':
            default:
                return '<strong>【🐣 時魔幼體 · 得分與勝負指南】</strong><br>• <strong>基礎得分：</strong>每局結束時存活保留的齒輪將 1:1 轉換為總分！<br>• <strong>成長目標：</strong>爭奪小時卡湊齊 4 大配方進化為時、分、秒針！第 5 局結束時，已進化的時魔享有 <strong>+3 分</strong> 陣營加成！<br>• <strong>驅逐大勝：</strong>若合力將「時之惡」齒輪扣盡驅逐，時魔全體直接獲勝！<br>• <strong>保命防禦：</strong>Mana ≥ 3 且即將受罰時，可消耗全部 Mana 抵免傷害一次。';
        }
    }

    // 根據當前遊戲階段 (GameState & Flags) 自動評判教學引導 (支援 force 重播模式)
    function updateTutorialPointers(gameState, force = false) {
        if (!gameState || (!force && window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false)) {
            clearTutorialPointers();
            return;
        }

        // 若現代版進場動畫 (modern-intro-overlay) 尚未完全結束，暫不顯示教學提示
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
        const humanPlayer = gameState.players ? gameState.players.find(p => p.id === humanId) : null;
        const roleKey = getHumanRoleKey(humanPlayer);

        // 若進入全新對局（第 1 局、第 1 回合、尚未翻開小時卡），自動重置步驟紀錄與歷史閱覽佇列
        if (gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && (!gameState.currentDrawnHourCards || gameState.currentDrawnHourCards.length === 0)) {
            if (!shownSteps.has('step0_welcome')) {
                shownSteps.clear();
                tutorialHistory.length = 0;
                currentHistoryIndex = -1;
                updateTutorialNav();
            }
        }

        // 【階段 0】：開局初始歡迎提示（第 1 局、第 1 回合、尚未展開出牌）
        const nextBtn = document.getElementById('next-step-btn');
        const isInitialOpening = (gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && !shownSteps.has('step1_drag_minute'));
        if (isInitialOpening && (!shownSteps.has('step0_welcome') || force)) {
            shownSteps.add('step0_welcome');
            shownSteps.add('step0_role_scoring');
            shownSteps.add('has_shown_welcome');
            const welcomeMsg = window.i18n
                ? window.i18n.t('tutorial.step0_welcome')
                : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。';
            const roleScoringMsg = window.i18n
                ? window.i18n.t(`tutorial.role_scoring_${roleKey}`)
                : getDefaultRoleScoringText(roleKey);
            const combinedMsg = `${welcomeMsg}<br><br>${roleScoringMsg}`;
            if (nextBtn && isElementVisible(nextBtn)) {
                nextBtn.disabled = false;
                showTutorialPointer(nextBtn, combinedMsg, 'center-right');
                return;
            }
        }

        const welcomePrefix = !shownSteps.has('has_shown_welcome')
            ? (window.i18n ? window.i18n.t('tutorial.welcome_prefix') : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>')
            : '';

        // 【階段 1】：等待人類出牌 (分鐘卡)
        if (gameState.currentRoundAIChoices !== null) {
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';

            // 【1-A】：5P 模式幼體時魔進化為新形態後的專屬得分導引
            const isEvolvedDemon = (humanPlayer && humanPlayer.type === '時魔' && ['hour', 'minute', 'second'].includes(roleKey));
            const evoStepKey = `step_evolved_${roleKey}`;
            if (isEvolvedDemon && !shownSteps.has(evoStepKey)) {
                shownSteps.add(evoStepKey);
                const roleName = humanPlayer.roleCard || (roleKey === 'hour' ? '時針' : (roleKey === 'minute' ? '分針' : '秒針'));
                const evoNotice = window.i18n
                    ? window.i18n.t('tutorial.role_evolved_notice', { roleName })
                    : `<strong>🎉【恭喜進化為 ${roleName}！】</strong><br>您已成功變身！終局將享有 <strong>+3 分</strong> 陣營額外加分！請善用全新的專屬異能保護齒輪，爭取最高積分！`;
                const evoScoring = window.i18n
                    ? window.i18n.t(`tutorial.role_scoring_${roleKey}`)
                    : getDefaultRoleScoringText(roleKey);
                const roleTarget = document.getElementById('human-role-display')
                    || document.querySelector('#human-player-area .human-top-bar')
                    || '#human-hand';
                showTutorialPointer(roleTarget, turnPrefix + evoNotice + '<br><br>' + evoScoring, 'top');
                return;
            }

            // 若玩家啟動了「秒針」蓋 2 張特殊能力，則提供「點選 2 張卡牌 + 點擊確認出牌」的教學提示
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
                    showTutorialPointer('#confirm-move-btn', welcomePrefix + turnPrefix + msg, 'top');
                }
                return;
            }

            // 【1-B】：一般出牌階段（選牌中 或 點擊出牌確認）
            const selectedCard = (typeof uiState !== 'undefined' && uiState.selectedCardValue !== null && uiState.selectedCardValue !== undefined)
                ? uiState.selectedCardValue
                : null;

            // 若已選中卡牌，引導點擊確認出牌
            if (selectedCard !== null) {
                const hintMsg = window.i18n
                    ? window.i18n.t('tutorial.step1_select_minute_hint', { value: selectedCard })
                    : `<strong>步驟 1：點擊「確認出牌」</strong><br>已選取 <strong>[${selectedCard}]</strong> 號分鐘卡，點擊「確認出牌」蓋牌送出，或直接將卡牌向上拖曳至鐘面！`;
                const confirmBtn = document.getElementById('confirm-move-btn');
                if (confirmBtn && isElementVisible(confirmBtn)) {
                    showTutorialPointer(confirmBtn, welcomePrefix + turnPrefix + hintMsg, 'top');
                    return;
                }
            }

            // 若玩家已在初期掌握出牌方式，第 2 回合後不再重複彈出拖牌教學，保持遊戲流暢
            if (!force && shownSteps.has('step1_drag_minute') && gameState.roundMarker > 1) {
                clearTutorialPointers();
                return;
            }

            // 未選卡牌時，引導玩家挑選一張分鐘卡出牌
            if (!shownSteps.has('step1_drag_minute') || force) {
                shownSteps.add('step1_drag_minute');
                shownSteps.add('has_shown_welcome');
                const step1Msg = window.i18n
                    ? window.i18n.t('tutorial.step1_drag_minute')
                    : '<strong>步驟 1：挑選一張分鐘卡出牌</strong><br>• <strong>操作方式：</strong>按住卡牌往鐘面方向拉動並放開，或<strong>點擊卡牌後點擊「確認出牌」</strong>。<br>💡 <strong>戰術思維：</strong>數字大者可搶佔鐘面安全位與回憶卡；數字較小未進前 2 名則無須進入鐘面，能安全避開受罰！';
                const handTarget = document.getElementById('human-hand') || '#human-hand';
                showTutorialPointer(handTarget, welcomePrefix + turnPrefix + step1Msg, 'top');
                return;
            }
        }

        // 判斷當前是否處於小時卡挑選階段（無論輪到 AI 或人類）
        const isHourSelectionActive = !!(
            (gameState.currentDrawnHourCards && gameState.currentDrawnHourCards.length > 0) ||
            (gameState.hourPickOrder && Array.isArray(gameState.hourPickOrder) && gameState.nextHourPickerIndex < gameState.hourPickOrder.length) ||
            gameState.waitingHourChoice
        );

        // 判斷人類玩家本回合是否為有權挑選小時卡的玩家
        const isHumanPicker = !!(
            gameState.hourPickOrder &&
            Array.isArray(gameState.hourPickOrder) &&
            gameState.hourPickOrder.some(p => p.playerId === humanId || String(p.playerId) === String(humanId) || (humanPlayer && p.playerId === humanPlayer.id))
        );
        const humanHasPickedHour = !!(humanPlayer && humanPlayer.pickedHourThisTurn);

        // 【階段 2】：等待挑選小時卡 (輪到人類選卡)
        const isHumanHourTurn = !!gameState.waitingHourChoice && (
            gameState.waitingHourChoicePlayerId === humanId ||
            String(gameState.waitingHourChoicePlayerId) === String(humanId) ||
            (humanPlayer && gameState.waitingHourChoicePlayerId === humanPlayer.id)
        );

        if (isHumanHourTurn) {
            if (!force && shownSteps.has('step3_select_hour') && gameState.roundMarker > 1) {
                clearTutorialPointers();
                return;
            }

            const isSinDist = gameState.sinTargetingMode === 'sin' && gameState.gameMode !== '3P';
            const penaltyHint = isSinDist
                ? (window.i18n ? window.i18n.t('tutorial.penalty_sin') : '<br><span style="color:#feca57;">⚠️ 當前為「受罰：距離最近」，請遠離時之惡！</span>')
                : (window.i18n ? window.i18n.t('tutorial.penalty_max') : '<br><span style="color:#ff6b6b;">⚠️ 當前為「受罰：最高小時值」，接近 12 者將扣生命/護盾！</span>');
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';

            // 針對受詛者或時之惡加入專屬挑選提示
            let roleHourHint = '';
            if (roleKey === 'scz') {
                roleHourHint = window.i18n
                    ? window.i18n.t('tutorial.role_scz_hour_hint')
                    : '<br><span style="color:#00d2d3;">💡 <strong>受詛者專屬提示：</strong>請優先挑選【★ 珍貴卡】！踩上即可永久鎖定，衝刺 12 張任務目標以獲得巨額加分並免受 -999 分懲罰！</span>';
            } else if (roleKey === 'sin') {
                roleHourHint = window.i18n
                    ? window.i18n.t('tutorial.role_sin_hour_hint')
                    : '<br><span style="color:#feca57;">💡 <strong>時之惡專屬提示：</strong>落子後可發動【惡之牽引 (2 Mana)】處決身邊獵物，加速達成「驅逐 3 位時魔各一次」的特殊大勝！</span>';
            }

            shownSteps.add('step3_select_hour');
            const step3Msg = (window.i18n ? window.i18n.t('tutorial.step3_select_hour') : '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！') + penaltyHint + roleHourHint;
            const highlightSpot = document.querySelector('.clock-spot.highlight-target');
            if (highlightSpot && isElementVisible(highlightSpot)) {
                showTutorialPointer(highlightSpot, turnPrefix + step3Msg, 'top');
            } else {
                showTutorialPointer('#clock-face', turnPrefix + step3Msg, 'center-right');
            }
            return;
        }

        // 若當前仍處於小時卡挑選階段（尚未輪到人類，或人類非挑選者）：
        if (isHourSelectionActive) {
            // 【重要修復】：若人類玩家是有權挑選者，但目前正等待前面的對手 (AI) 挑選或落子中：
            // 嚴格禁止彈出「無須挑選小時卡」，清除指針並安靜等待人類輪次到來，徹底杜絕一閃而過的問題
            if (isHumanPicker && !humanHasPickedHour) {
                clearTutorialPointers();
                return;
            }

            // 【階段 2-B】：人類玩家確定未進挑選名單（確定本回合無須挑選小時卡）
            // 僅在人類明確「非挑選者」時，在鐘面顯示一次避險提醒
            if (!isHumanPicker && (!shownSteps.has('step3_no_hour_notice') || force)) {
                const turnPrefix = gameState.roundMarker > 1
                    ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                    : '';
                shownSteps.add('step3_no_hour_notice');
                const noHourNotice = window.i18n
                    ? window.i18n.t('tutorial.step3_no_hour_notice')
                    : '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險保命）：</strong>本回合不進入鐘面，<strong>完全免疫</strong>「受罰」扣減齒輪（生命值）的風險！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，將延緩達成角色進化（變身）的進度。';
                showTutorialPointer('#clock-face', turnPrefix + noHourNotice, 'center-right');
                return;
            }

            // 小時卡階段未完全結束，嚴格禁止進入後續階段 3、4、5
            return;
        }

        // 【階段 3】：分針能力選擇中
        if (gameState.waitingMinuteHandChoice && (!shownSteps.has('step_minute_ability') || force)) {
            const turnPrefix = gameState.roundMarker > 1
                ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                : '';
            shownSteps.add('step_minute_ability');
            const minMsg = window.i18n
                ? window.i18n.t('tutorial.step_minute_ability')
                : '<strong>分針能力：</strong>可選擇順/逆時針移動一格，或點擊「下一回合」略過能力。';

            // 若能力抽屜折疊，自動展開以便玩家選取
            const evoDrawer = document.getElementById('evo-panel-details');
            if (evoDrawer && !evoDrawer.open) {
                evoDrawer.open = true;
            }

            const target = document.querySelector('#evolution-progress-area .evo-btn')
                || document.getElementById('evolution-progress-area')
                || document.getElementById('next-step-btn');
            showTutorialPointer(target, turnPrefix + minMsg, 'top');
            return;
        }

        // 【階段 4】：秒針二選一
        if (gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId && (!shownSteps.has('step_second_ability') || force)) {
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

        // 【階段 5】：回合結束，準備進入下一回合
        // 嚴格確保小時卡階段已完全結束，且「下一回合」按鈕可用且可見
        if (!isHourSelectionActive && nextBtn && !nextBtn.disabled && isElementVisible(nextBtn)) {
            const isInitialStart = (gameState.gameRound === 1 && gameState.roundMarker === 1 && !shownSteps.has('step1_drag_minute'));
            if (isInitialStart) {
                if (!shownSteps.has('step0_welcome') || force) {
                    shownSteps.add('step0_welcome');
                    shownSteps.add('has_shown_welcome');
                    const welcomeMsg = window.i18n
                        ? window.i18n.t('tutorial.step0_welcome')
                        : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。';
                    showTutorialPointer(nextBtn, welcomeMsg, 'center-right');
                }
            } else if ((!shownSteps.has('step4_next_round') && !shownSteps.has('step4_no_hour_card')) || force) {
                const turnPrefix = gameState.roundMarker > 1
                    ? (window.i18n ? window.i18n.t('tutorial.turn_prefix') : '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>')
                    : '';

                const didPickHour = !!(humanPlayer && humanPlayer.pickedHourThisTurn);

                // 依角色加入專屬進度與得分反饋
                let roleProgressHint = '';
                if (roleKey === 'scz') {
                    const lockedCount = gameState.clockFace ? gameState.clockFace.reduce((sum, s) => sum + (s.cards ? s.cards.filter(c => c.isLocked).length : 0), 0) : 0;
                    roleProgressHint = '<br><span style="color:#00d2d3;">' + (window.i18n
                        ? window.i18n.t('tutorial.role_progress_scz', { count: lockedCount, round: gameState.gameRound })
                        : `當前鐘面鎖定珍貴卡：${lockedCount}/12 張（第 ${gameState.gameRound} 局）`) + '</span>';
                } else if (roleKey === 'sin') {
                    const ejectedCount = gameState.players ? gameState.players.filter(p => p.type === '時魔' && p.hasEverBeenEjected).length : 0;
                    roleProgressHint = '<br><span style="color:#ff6b6b;">' + (window.i18n
                        ? window.i18n.t('tutorial.role_progress_sin', { count: ejectedCount })
                        : `特殊大勝進度：已逐出時魔 ${ejectedCount}/3 位`) + '</span>';
                } else if (roleKey === 'young') {
                    const bagCount = (humanPlayer && Array.isArray(humanPlayer.hourCards)) ? humanPlayer.hourCards.length : 0;
                    roleProgressHint = '<br><span style="color:#a8f0c6;">' + (window.i18n
                        ? window.i18n.t('tutorial.role_progress_young', { count: bagCount })
                        : `背包已收集小時卡：${bagCount} 張，繼續收集以達成進化！`) + '</span>';
                }

                if (didPickHour) {
                    shownSteps.add('step4_next_round');
                    const roundDoneMsg = window.i18n
                        ? window.i18n.t('tutorial.step4_round_done')
                        : '<strong>回合結算完畢！</strong>點擊「下一回合」展開新回合競標。';
                    showTutorialPointer('#next-step-btn', turnPrefix + roundDoneMsg + roleProgressHint, 'left');
                } else {
                    shownSteps.add('step4_no_hour_card');
                    const noHourMsg = window.i18n
                        ? window.i18n.t('tutorial.step4_no_hour_card')
                        : '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險）：</strong>本回合不進入鐘面，齒輪毫髮無損！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，延緩變身進度。<br>點擊「<strong>下一回合</strong>」展開新回合競標！';
                    showTutorialPointer('#next-step-btn', turnPrefix + noHourMsg + roleProgressHint, 'left');
                }
            }
            return;
        }

        clearTutorialPointers();
    }

    // 關閉/停用教學引導模式（主動於設定或點擊「不再提示」時調用）
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
                    ? '💡 所有教學指南已展示完畢，新手教學模式已自動完成。'
                    : '💡 新手教學模式已關閉（可隨時於「設定」中重新開啟）。'
            );
        }
    }

    function resetTutorialProgress() {
        shownSteps.clear();
        tutorialHistory.length = 0;
        currentHistoryIndex = -1;
        updateTutorialNav();
    }

    // 重播當前步驟教學提示（使用者手動點擊「💡 提示」按鈕時調用）
    function replayCurrentTutorial(gameState) {
        const gs = gameState || window.globalGameState;
        if (!gs) return;

        // 若先前已關閉教學模式，點擊提示按鈕自動重啟
        if (window.GAME_CONFIG) {
            window.GAME_CONFIG.tutorialMode = true;
        }
        if (typeof GAME_CONFIG !== 'undefined') {
            GAME_CONFIG.tutorialMode = true;
        }
        const toggleEl = document.getElementById('tutorial-toggle');
        if (toggleEl) toggleEl.checked = true;
        const introToggleEl = document.getElementById('intro-tutorial-chk');
        if (introToggleEl) introToggleEl.checked = true;

        if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
            window.gameAudio.playClick();
        }

        const replayBtn = document.getElementById('btn-replay-tutorial');
        if (replayBtn) {
            replayBtn.classList.remove('tutorial-btn-pulse');
            void replayBtn.offsetWidth;
            replayBtn.classList.add('tutorial-btn-pulse');
        }

        updateTutorialPointers(gs, true);

        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        if (!tooltip || tooltip.classList.contains('hidden')) {
            const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
                ? window.getEffectiveHumanPlayerId()
                : 'SM_1';
            const humanPlayer = gs.players ? gs.players.find(p => p && (p.isHuman || p.id === humanId || p.id === 0)) : null;
            const currentRoleKey = getHumanRoleKey(humanPlayer);
            const roleScoringMsg = window.i18n
                ? window.i18n.t(`tutorial.role_scoring_${currentRoleKey}`)
                : getDefaultRoleScoringText(currentRoleKey);
            const roleTarget = document.getElementById('human-role-display')
                || document.querySelector('#human-player-area .human-top-bar')
                || '#human-hand';
            showTutorialPointer(roleTarget, roleScoringMsg, 'top');
        }
    }

    // 掛載全域物件
    window.TutorialModeManager = {
        showTutorialPointer,
        updateTutorialPointers,
        clearTutorialPointers,
        dismissTooltip: clearTutorialPointers,
        disableTutorialMode,
        resetTutorialProgress,
        replayCurrentTutorial,
        hasCompletedAllTutorialSteps,
        navigateTutorialHistory,
        getTutorialHistory: () => [...tutorialHistory]
    };

    // 視窗大小改變時重新計算 Tooltip 位置（動態響應寬螢幕最左側或自適應佈局）
    window.addEventListener('resize', () => {
        if (window.globalGameState && window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode) {
            const tooltip = document.getElementById('tutorial-pointer-tooltip');
            if (tooltip && !tooltip.classList.contains('hidden')) {
                updateTutorialPointers(window.globalGameState, true);
            }
        }
    });

    // 頁面載入與事件綁定處理
    document.addEventListener('DOMContentLoaded', () => {
        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        const closeBtn = document.getElementById('tutorial-close-btn');
        const muteBtn = document.getElementById('tutorial-mute-btn');
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');

        // 點擊「◀ 上一則教學」：閱覽歷史教學說明
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateTutorialHistory(-1);
            });
        }

        // 點擊「下一則 ▶」：切換至後續或最新教學說明
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateTutorialHistory(1);
            });
        }

        // 點擊「✕」：僅關閉當前提示，保留教學模式供後續步驟使用
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTutorialPointers();
            });
        }

        // 點擊「不再提示」：關閉教學模式並同步取消設定勾選
        if (muteBtn) {
            muteBtn.addEventListener('click', (e) => {
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

        // 點擊人類角色徽章：隨時展示該角色專屬得分與勝負指南
        const roleDisplayEl = document.getElementById('human-role-display');
        if (roleDisplayEl) {
            roleDisplayEl.style.cursor = 'pointer';
            roleDisplayEl.title = '點擊檢視角色得分與玩法教學';
            roleDisplayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.globalGameState) return;
                const humanPlayer = (window.globalGameState.players || []).find(p => p && (p.isHuman || p.id === 0));
                const currentRoleKey = getHumanRoleKey(humanPlayer);
                const roleScoringMsg = window.i18n
                    ? window.i18n.t(`tutorial.role_scoring_${currentRoleKey}`)
                    : getDefaultRoleScoringText(currentRoleKey);
                showTutorialPointer(roleDisplayEl, roleScoringMsg, 'top');
            });
        }

        // 點擊「💡 提示」常駐按鈕：隨時重播當前步驟教學提示
        const replayBtn = document.getElementById('btn-replay-tutorial');
        if (replayBtn) {
            replayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                replayCurrentTutorial(window.globalGameState);
            });
        }
    });
})();
