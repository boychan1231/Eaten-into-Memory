// tutorial_mode.js - 新手教學模式與引導指標管理器

(function () {
    let tutorialSpotlightEl = null;
    let autoDismissTimer = null;
    const TOOLTIP_AUTO_DISMISS_SECONDS = 25; // 延長自動關閉倒數至 25 秒，提供充足閱讀時間

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

    // 檢驗 DOM 元素是否處於可見狀態（支援 fixed 定位與自訂容器）
    function isElementVisible(el) {
        if (!el) return false;
        if (el.id === 'clock-face' || el.id === 'modern-board' || el.id === 'table-top') return true;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
        if (typeof el.getClientRects === 'function' && el.getClientRects().length > 0) return true;
        return false;
    }

    // 計算提示框的最佳定位與指向箭頭
    function computeOptimalPosition(targetEl, tooltipEl, preferredPlacement = 'auto') {
        const isClockContainer = targetEl.id === 'clock-face' || targetEl.id === 'modern-board' || targetEl.id === 'table-top';
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 預估或實測提示框尺寸
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || Math.min(340, viewportWidth - 24);
        const tooltipHeight = tooltipRect.height || 110;

        // 若目標為全屏鐘面/桌面容器，居中懸浮於畫面上方，不施加外框變形
        if (isClockContainer) {
            const left = Math.max(12, Math.round((viewportWidth - tooltipWidth) / 2));
            const top = Math.max(68, Math.min(130, Math.round(viewportHeight * 0.14)));
            return { left, top, arrow: 'none', arrowX: tooltipWidth / 2, arrowY: 0 };
        }

        const rect = targetEl.getBoundingClientRect();
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
            // 氣泡位於目標上方，箭頭朝下指向目標
            top = rect.top - tooltipHeight - 12;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            arrow = 'bottom';
        } else if (chosen === 'bottom') {
            // 氣泡位於目標下方，箭頭朝上指向目標
            top = rect.bottom + 12;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            arrow = 'top';
        } else if (chosen === 'left') {
            // 氣泡位於目標左方，箭頭朝右指向目標
            left = rect.left - tooltipWidth - 12;
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            arrow = 'right';
        } else if (chosen === 'right') {
            // 氣泡位於目標右方，箭頭朝左指向目標
            left = rect.right + 12;
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            arrow = 'left';
        }

        // 確保提示框完全在可視視窗安全邊界之內
        const safeLeft = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
        const safeTop = Math.max(10, Math.min(top, viewportHeight - tooltipHeight - 10));

        // 計算箭頭在氣泡上的相對座標，精確直指目標中心
        const targetCenterX = rect.left + rect.width / 2;
        const targetCenterY = rect.top + rect.height / 2;
        const arrowX = Math.max(18, Math.min(tooltipWidth - 18, Math.round(targetCenterX - safeLeft)));
        const arrowY = Math.max(14, Math.min(tooltipHeight - 14, Math.round(targetCenterY - safeTop)));

        return { left: safeLeft, top: safeTop, arrow, arrowX, arrowY };
    }

    // 將動態氣泡提示框指向目標 DOM 元素
    function showTutorialPointer(targetSelector, messageText, preferredPlacement = 'auto') {
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
        } else if ((typeof HTMLElement !== 'undefined' && targetSelector instanceof HTMLElement) || (targetSelector && typeof targetSelector === 'object' && (targetSelector.nodeType === 1 || targetSelector._rect))) {
            targetEl = targetSelector;
        }

        if (!targetEl || !isElementVisible(targetEl)) {
            clearTutorialPointers();
            return;
        }

        const wasHidden = tooltip.classList.contains('hidden');

        // 清除舊高亮
        clearTutorialPointers();

        // 目標高亮：若非全屏容器，加上聚光燈樣式（純光暈無 scale 變形）
        const isClockContainer = targetEl.id === 'clock-face' || targetEl.id === 'modern-board' || targetEl.id === 'table-top';
        if (!isClockContainer) {
            targetEl.classList.add('tutorial-spotlight');
            tutorialSpotlightEl = targetEl;
        }

        // 設定訊息內容
        textEl.innerHTML = messageText;

        // 重新顯示 tooltip
        tooltip.classList.remove('hidden');
        if (wasHidden) {
            tooltip.classList.add('tutorial-fade-in');
        }

        // 計算最佳定位座標
        const pos = computeOptimalPosition(targetEl, tooltip, preferredPlacement);
        tooltip.setAttribute('data-arrow', pos.arrow);
        tooltip.style.left = `${pos.left}px`;
        tooltip.style.top = `${pos.top}px`;
        if (typeof tooltip.style.setProperty === 'function') {
            tooltip.style.setProperty('--arrow-x', `${pos.arrowX}px`);
            tooltip.style.setProperty('--arrow-y', `${pos.arrowY}px`);
        } else {
            tooltip.style['--arrow-x'] = `${pos.arrowX}px`;
            tooltip.style['--arrow-y'] = `${pos.arrowY}px`;
        }

        // 啟動自動隱藏倒數計時（滑鼠或觸控懸停時自動暫停計時）
        scheduleAutoDismiss(TOOLTIP_AUTO_DISMISS_SECONDS);
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

    // 根據當前遊戲階段 (GameState & Flags) 自動評判教學引導
    function updateTutorialPointers(gameState) {
        if (!gameState || (window.GAME_CONFIG && window.GAME_CONFIG.tutorialMode === false)) {
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

        // 若進入全新對局（第 1 局、第 1 回合、尚未翻開小時卡），自動重置步驟紀錄
        if (gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && (!gameState.currentDrawnHourCards || gameState.currentDrawnHourCards.length === 0)) {
            if (!shownSteps.has('step0_welcome')) {
                shownSteps.clear();
            }
        }

        // 【階段 0】：開局初始歡迎提示（第 1 局、第 1 回合、尚未展開出牌）
        const nextBtn = document.getElementById('next-step-btn');
        const isInitialOpening = (gameState.gameRound === 1 && gameState.roundMarker === 1 && gameState.currentRoundAIChoices === null && !shownSteps.has('step1_drag_minute'));
        if (isInitialOpening && !shownSteps.has('step0_welcome')) {
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
                showTutorialPointer(nextBtn, combinedMsg, 'left');
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
            if (shownSteps.has('step1_drag_minute') && gameState.roundMarker > 1) {
                clearTutorialPointers();
                return;
            }

            // 未選卡牌時，引導玩家挑選一張分鐘卡出牌
            shownSteps.add('step1_drag_minute');
            shownSteps.add('has_shown_welcome');
            const step1Msg = window.i18n
                ? window.i18n.t('tutorial.step1_drag_minute')
                : '<strong>步驟 1：挑選一張分鐘卡出牌</strong><br>• <strong>操作方式：</strong>按住卡牌往鐘面方向拉動並放開，或<strong>點擊卡牌後點擊「確認出牌」</strong>。<br>💡 <strong>戰術思維：</strong>數字大者可搶佔鐘面安全位與回憶卡；數字較小未進前 2 名則無須進入鐘面，能安全避開受罰！';
            const handTarget = document.querySelector('#human-hand .minute-card') || '#human-hand';
            showTutorialPointer(handTarget, welcomePrefix + turnPrefix + step1Msg, 'top');
            return;
        }

        // 【階段 2】：等待挑選小時卡 (輪到人類選卡)
        if (gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId) {
            if (shownSteps.has('step3_select_hour') && gameState.roundMarker > 1) {
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
                showTutorialPointer('#clock-face', turnPrefix + step3Msg, 'center');
            }
            return;
        }

        // 【階段 2-B】：等待挑選小時卡，但人類玩家未進前 2 名（無須挑選小時卡）
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
            showTutorialPointer('#clock-face', turnPrefix + noHourNotice, 'center');
            return;
        }

        // 【階段 3】：分針能力選擇中
        if (gameState.waitingMinuteHandChoice && !shownSteps.has('step_minute_ability')) {
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
        if (gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId && !shownSteps.has('step_second_ability')) {
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
        if (nextBtn && !nextBtn.disabled && isElementVisible(nextBtn)) {
            const isInitialStart = (gameState.gameRound === 1 && gameState.roundMarker === 1 && !shownSteps.has('step1_drag_minute'));
            if (isInitialStart) {
                if (!shownSteps.has('step0_welcome')) {
                    shownSteps.add('step0_welcome');
                    shownSteps.add('has_shown_welcome');
                    const welcomeMsg = window.i18n
                        ? window.i18n.t('tutorial.step0_welcome')
                        : '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。';
                    showTutorialPointer(nextBtn, welcomeMsg, 'left');
                }
            } else if (!shownSteps.has('step4_next_round') && !shownSteps.has('step4_no_hour_card')) {
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

    // 頁面載入與事件綁定處理
    document.addEventListener('DOMContentLoaded', () => {
        const tooltip = document.getElementById('tutorial-pointer-tooltip');
        const closeBtn = document.getElementById('tutorial-close-btn');
        const muteBtn = document.getElementById('tutorial-mute-btn');

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

        // 懸停與觸控暫停倒數：當使用者正在閱讀提示時，自動暫停計時器
        if (tooltip) {
            tooltip.addEventListener('mouseenter', clearAutoDismissTimer);
            tooltip.addEventListener('mouseleave', () => {
                if (!tooltip.classList.contains('hidden')) {
                    scheduleAutoDismiss(TOOLTIP_AUTO_DISMISS_SECONDS);
                }
            });
            tooltip.addEventListener('touchstart', clearAutoDismissTimer, { passive: true });
            tooltip.addEventListener('touchend', () => {
                if (!tooltip.classList.contains('hidden')) {
                    scheduleAutoDismiss(TOOLTIP_AUTO_DISMISS_SECONDS);
                }
            }, { passive: true });
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

        // 點擊盤面或外部空白處：關閉當前提示氣泡（不打斷框內閱讀或高亮按鈕點擊）
        document.addEventListener('pointerdown', (e) => {
            const currentTooltip = document.getElementById('tutorial-pointer-tooltip');
            if (!currentTooltip || currentTooltip.classList.contains('hidden')) return;

            // 若點擊在提示框內部（閱讀、點擊按鈕、選取文字等），不關閉
            if (currentTooltip.contains(e.target)) {
                return;
            }

            // 若點擊在當前高亮目標元素上，保留原生點擊行為，不搶先打斷
            if (tutorialSpotlightEl && tutorialSpotlightEl.contains(e.target)) {
                return;
            }

            // 外部盤面空白處點擊：關閉當前提示氣泡
            clearTutorialPointers();
        });

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
    });
})();
