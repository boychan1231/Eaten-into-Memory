// ui_hand_drag.js - 人類手牌區、拖放 (Drag & Drop) 控制器與秒針雙牌控制

function isModernFanHandEnabled() {
    if (typeof document === 'undefined') return false;
    const isModernEdition = Boolean(
        document.getElementById('modern-intro-overlay') ||
        (typeof document.querySelector === 'function' && document.querySelector('link[href*="modern.css"]'))
    );
    if (!isModernEdition) return false;
    if (typeof window !== 'undefined' && window.UI_CONFIG && window.UI_CONFIG.FAN_HAND_LAYOUT === false) {
        return false;
    }
    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth <= 768) {
        return false;
    }
    return true;
}

function clearHandFanSpread(handEl) {
    if (!handEl || typeof handEl.querySelectorAll !== 'function') return;
    handEl.querySelectorAll('.minute-card').forEach((cardEl) => {
        if (cardEl.style && typeof cardEl.style.setProperty === 'function') {
            cardEl.style.setProperty('--fan-spread-x', '0px');
        }
    });
}

function applyHandFanSpread(handEl, hoverIdx) {
    if (!handEl || !handEl.classList || !handEl.classList.contains('hand-fan-layout')) return;
    const cardEls = handEl.querySelectorAll('.minute-card');
    cardEls.forEach((cardEl, idx) => {
        const diff = idx - hoverIdx;
        let spread = '0px';
        if (diff === -1) spread = '-10px';
        else if (diff === -2) spread = '-5px';
        else if (diff === 1) spread = '12px';
        else if (diff === 2) spread = '6px';
        if (cardEl.style && typeof cardEl.style.setProperty === 'function') {
            cardEl.style.setProperty('--fan-spread-x', spread);
        }
    });
}

function applyHandFanLayout(handEl) {
    if (!handEl || typeof handEl.querySelectorAll !== 'function') return false;
    const cardEls = Array.from(handEl.querySelectorAll('.minute-card'));
    const enabled = isModernFanHandEnabled();

    if (!enabled) {
        if (handEl.classList) handEl.classList.remove('hand-fan-layout');
        if (handEl.style && typeof handEl.style.removeProperty === 'function') {
            handEl.style.removeProperty('--fan-overlap');
        }
        cardEls.forEach((cardEl) => {
            if (cardEl.style && typeof cardEl.style.removeProperty === 'function') {
                cardEl.style.removeProperty('--fan-index');
                cardEl.style.removeProperty('--fan-angle');
                cardEl.style.removeProperty('--fan-y');
                cardEl.style.removeProperty('--fan-spread-x');
            }
            if (cardEl.dataset) {
                delete cardEl.dataset.fanIndex;
                delete cardEl.dataset.fanAngle;
                delete cardEl.dataset.fanY;
            }
        });
        return false;
    }

    if (handEl.classList) handEl.classList.add('hand-fan-layout');
    const n = cardEls.length;
    let overlap = '0px';
    if (n >= 12) overlap = '-12px';
    else if (n >= 10) overlap = '-10px';
    else if (n >= 7) overlap = '-7px';
    else if (n >= 5) overlap = '-4px';

    if (handEl.style && typeof handEl.style.setProperty === 'function') {
        handEl.style.setProperty('--fan-overlap', overlap);
    }

    const maxAngle = Math.min(18, Math.max(0, (n - 1) * 1.85));
    const maxDrop = Math.min(24, Math.max(0, (n - 1) * 2.1));

    cardEls.forEach((cardEl, i) => {
        const t = (n <= 1) ? 0 : ((i - (n - 1) / 2) / ((n - 1) / 2));
        const fanAngle = Number((t * maxAngle).toFixed(2));
        const fanY = Number((t * t * maxDrop).toFixed(1));

        if (cardEl.style && typeof cardEl.style.setProperty === 'function') {
            cardEl.style.setProperty('--fan-index', String(i));
            cardEl.style.setProperty('--fan-angle', `${fanAngle}deg`);
            cardEl.style.setProperty('--fan-y', `${fanY}px`);
            cardEl.style.setProperty('--fan-spread-x', '0px');
        }
        if (cardEl.dataset) {
            cardEl.dataset.fanIndex = String(i);
            cardEl.dataset.fanAngle = String(fanAngle);
            cardEl.dataset.fanY = String(fanY);
        }

        if (!cardEl._fanHoverBound && typeof cardEl.addEventListener === 'function') {
            cardEl._fanHoverBound = true;
            cardEl.addEventListener('pointerenter', () => {
                if ((typeof window !== 'undefined' && window.isDraggingCard) || !handEl.classList || !handEl.classList.contains('hand-fan-layout')) return;
                const hoverIdx = Number(cardEl.dataset ? cardEl.dataset.fanIndex : i);
                if (!Number.isNaN(hoverIdx)) {
                    applyHandFanSpread(handEl, hoverIdx);
                }
            });
            cardEl.addEventListener('pointerleave', () => {
                if (typeof window !== 'undefined' && window.isDraggingCard) return;
                clearHandFanSpread(handEl);
            });
        }
    });

    if (!handEl._fanContainerLeaveBound && typeof handEl.addEventListener === 'function') {
        handEl._fanContainerLeaveBound = true;
        handEl.addEventListener('pointerleave', () => {
            if (typeof window !== 'undefined' && window.isDraggingCard) return;
            clearHandFanSpread(handEl);
        });
    }

    return true;
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && !window._fanHandResizeBound) {
    window._fanHandResizeBound = true;
    window.addEventListener('resize', () => {
        if (typeof document !== 'undefined') {
            applyHandFanLayout(document.getElementById('human-hand'));
        }
    });
}

// --- D. 人類操作區 ---
function renderHumanPlayerArea(gameState, humanPlayer, flags) {
    if (!humanPlayer) return;

    // 0. 更新棄牌區 (手牌旁)
    renderDiscardPile(gameState, humanPlayer);

    // 1. 更新數據
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    const humanRoleEl = document.getElementById('human-role-display');
    if (humanRoleEl) {
        // ✅ 新增：人類玩家護盾顯示
        const isYoung = humanPlayer.roleCard && humanPlayer.roleCard.includes('幼');
        const shieldCost = (window.GAME_DATA?.ABILITY_COSTS?.YOUNG_SHIELD) || 3;
        const hasShield = isYoung && humanPlayer.mana >= shieldCost && !humanPlayer.shieldUsed && !humanPlayer.isEjected;

        // 使用 innerHTML 插入圖示
        const shieldHtml = hasShield
            ? `<span class="shield-indicator" title="護盾就緒！受到傷害時自動消耗 MP 抵擋"><span class="material-symbols-outlined" style="font-size:1.1em; vertical-align:-0.15em;">shield</span></span>`
            : '';

        const roleName = window.i18n ? window.i18n.getRoleName(humanPlayer.roleCard) : humanPlayer.roleCard;
        const youAreLabel = window.i18n ? window.i18n.t('ui.labels.you_are') : '您是：';
        humanRoleEl.innerHTML = `${youAreLabel}${roleName} ${shieldHtml}`;
    }

    setText('h-hand-count', String(humanPlayer.hand.length));
    setText('h-score', String(humanPlayer.score));

    // 渲染立體機械 GP 鏈與發條 MP 管
    const gearChip = document.querySelector('.human-top-bar .resource-chip--gear');
    if (gearChip) {
        gearChip.classList.add('has-mech-gauge');
        gearChip.innerHTML = createGearChainHtml(humanPlayer.gearCards, false, 'h-gear');
    } else {
        setText('h-gear', '⚙️'.repeat(Math.max(0, humanPlayer.gearCards)));
    }

    const manaChip = document.querySelector('.human-top-bar .resource-chip--mana');
    if (manaChip) {
        manaChip.classList.add('has-mech-gauge');
        manaChip.innerHTML = createManaGaugeHtml(humanPlayer.mana, humanPlayer.gearCards, false, 'h-mana');
    } else {
        setText('h-mana', String(humanPlayer.mana));
    }
    const ejectedLabel = window.i18n ? window.i18n.t('ui.labels.ejected') : '被吞噬';
    const notOnBoardLabel = window.i18n ? window.i18n.t('ui.labels.not_on_board') : '未上場';
    setText('h-pos', humanPlayer.isEjected ? ejectedLabel : String(humanPlayer.currentClockPosition || notOnBoardLabel));
    setText('h-hour', String(humanPlayer.hourCards.length));

    const diceEl = document.getElementById('h-dice');
    if (diceEl) diceEl.textContent = (humanPlayer.d6Die === null) ? '--' : String(humanPlayer.d6Die);
	
	// 動態顯示/隱藏護盾區塊
    const shieldChip = document.querySelector('.human-top-bar .resource-chip--shield');
    if (shieldChip) {
        if (humanPlayer.type === '時魔') {
            shieldChip.style.display = 'none'; // 時魔不需要護盾數值，隱藏
        } else {
            shieldChip.style.display = '';     // 其他身份恢復顯示
        }
    }
    //
	
    // 2. 更新收集列表 (小時卡) - 帶有分類樣式與點擊功能
    const hourCollectionEl = document.getElementById('human-hour-collection');
    if (hourCollectionEl) {
        hourCollectionEl.innerHTML = '';
        const hourCards = humanPlayer.hourCards || [];
        if (hourCards.length === 0) {
            const ph = document.createElement('div');
            ph.className = 'hour-collection-placeholder';
            ph.textContent = '尚未收集';
            hourCollectionEl.appendChild(ph);
        } else {
            const groups = { '幼年': [], '少年': [], '青年': [], '中年': [], '死亡': [] };

            // 將卡片實體放入群組，而非字串
            [...hourCards].sort((a, b) => a.number - b.number).forEach(card => {
                let g = card.ageGroup || '未知';
                if (!groups[g]) groups[g] = [];
                groups[g].push(card);
            });

            ['幼年', '少年', '青年', '中年', '死亡'].forEach(label => {
                if (groups[label] && groups[label].length > 0) {
                    const row = document.createElement('div');
                    row.className = 'collection-text-row';

                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'col-label';
                    const displayLabel = (window.i18n ? window.i18n.getAgeGroupName(label) : label) || label;
                    labelSpan.textContent = `${displayLabel}：`;
                    row.appendChild(labelSpan);

                    const valuesContainer = document.createElement('div');
                    valuesContainer.style.display = 'inline-flex';
                    valuesContainer.style.gap = '8px';
                    valuesContainer.style.flexWrap = 'wrap';
                    valuesContainer.style.marginTop = '4px';

                    // 繪製單張可點擊的卡片
                    groups[label].forEach(card => {
                        const cardBtn = document.createElement('div');
                        cardBtn.className = `hour-collection-card ${card.isPrecious ? 'precious' : ''}`;
                        cardBtn.textContent = `${card.number}${card.isPrecious ? '★' : ''}`;
                        cardBtn.title = '點擊查看故事';

                        // ✅ 綁定點擊事件
                        cardBtn.onclick = () => {
                            if (window.gameAudio) window.gameAudio.playClick(); // 播放點擊音效
                            showCardStory(card);
                        };

                        valuesContainer.appendChild(cardBtn);
                    });

                    row.appendChild(valuesContainer);
                    hourCollectionEl.appendChild(row);
                }
            });
        }
    }

    // 3. 更新手牌 (分鐘卡)
    const humanHandEl = document.getElementById('human-hand');
    const confirmBtn = document.getElementById('confirm-move-btn');
    const actionHint = document.getElementById('action-hint');

    if (humanHandEl) {
        humanHandEl.innerHTML = '';
		
		// 根據角色身份動態設定手牌區背景圖 
        let bgUrl = "url('assets/soul_demon.png')"; // 預設背景（以幼體時魔作為安全預設，避免 404）
        
        if (humanPlayer.type === '時之惡') {
            bgUrl = "url('assets/soul_sin.png')";        // 時之惡專屬背景
        } else if (humanPlayer.type === '受詛者') {
            bgUrl = "url('assets/soul_scz.png')";        // 受詛者專屬背景
        } else if (humanPlayer.roleCard === '時針') {
            bgUrl = "url('assets/soul_hour.png')";       // 進化：時針專屬背景
        } else if (humanPlayer.roleCard === '分針') {
            bgUrl = "url('assets/soul_min.png')";        // 進化：分針專屬背景
        } else if (humanPlayer.roleCard === '秒針') {
            bgUrl = "url('assets/soul_sec.png')";        // 進化：秒針專屬背景
        } else if (humanPlayer.type === '時魔') {
            bgUrl = "url('assets/soul_demon.png')";      // 未進化：幼體時魔專屬背景
        }
        
        // 將圖片路徑寫入 CSS 變數中
        humanHandEl.style.setProperty('--hand-bg-image', bgUrl);
        //
		
        const sortOrder = window.UI_CONFIG?.HAND_SORT_ORDER || 'asc'; //根據設定決定排序方向
        const sortedHand = [...humanPlayer.hand].sort((a, b) => sortOrder === 'asc' ? a.value - b.value : b.value - a.value);

        sortedHand.forEach(card => {
            const cardEl = document.createElement('div');
            const v = Number(card.value);
            let tierClass = 'card-tier-mid';
            if (v <= 20) {
                tierClass = 'card-tier-low';
            } else if (v >= 46) {
                tierClass = 'card-tier-high';
            }
            cardEl.className = `minute-card ${tierClass}`;
            cardEl.setAttribute('data-value', card.value);
            cardEl.innerHTML = `<div class="card-num">${card.value}</div><div class="card-gear">${card.gear}</div>`;

            if (flags.isWaitingMinuteInput) {
                if (uiState.isSecondHandSelectingTwo) {
                    // 【秒針特殊能力模式】：保留「點選 2 張卡牌 + 點擊確認出牌」操作
                    cardEl.addEventListener('click', function () {
                        const v = card.value;
                        if (uiState.selectedCardValues.includes(v)) {
                            uiState.selectedCardValues = uiState.selectedCardValues.filter(x => x !== v);
                            this.classList.remove('selected');
                        } else {
                            if (uiState.selectedCardValues.length >= 2) return;
                            uiState.selectedCardValues.push(v);
                            this.classList.add('selected');
                        }
                        uiState.selectedCardValue = null;
                        if (confirmBtn) confirmBtn.disabled = (uiState.selectedCardValues.length !== 2);
                        if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function') {
                            window.TutorialModeManager.updateTutorialPointers(gameState);
                        }
                    });
                } else {
                    // 【一般出牌模式】：採用拖放（Drag & Drop）至鐘面出牌（同時支援雙擊快速出牌）
                    bindMinuteCardDragToPlay(cardEl, card.value, gameState);
                }
            } else {
                cardEl.style.cursor = 'default';
                cardEl.style.opacity = '0.7';
            }

            if (!uiState.isSecondHandSelectingTwo && uiState.selectedCardValue === card.value) cardEl.classList.add('selected');
            if (uiState.isSecondHandSelectingTwo && uiState.selectedCardValues.includes(card.value)) cardEl.classList.add('selected');
            humanHandEl.appendChild(cardEl);
        });

        // 計算並套用扇形手牌列變數（僅現代 PixiJS 版桌機且設定開啟時生效）
        const isFanActive = applyHandFanLayout(humanHandEl);

        // 分鐘手牌初次配置「發牌進入手牌區」動態效果（納管於 AnimationController，完成後清除行內 transform 避免干擾 CSS Hover）
        if (gameState && gameState.needsHandDealAnimation && typeof gsap !== 'undefined') {
            const introOverlay = document.getElementById('modern-intro-overlay');
            const isIntroCovering = introOverlay && introOverlay.style.display !== 'none' && !introOverlay.classList.contains('is-leaving');
            const cardEls = humanHandEl.querySelectorAll('.minute-card');

            if (isIntroCovering) {
                // 開場進場動畫仍覆蓋中，先預先隱藏手牌並保留標記，等進場動畫淡出後才正式發牌
                if (cardEls.length > 0) gsap.set(cardEls, { opacity: 0 });
            } else {
                gameState.needsHandDealAnimation = false;
                if (cardEls.length > 0) {
                    const midIdx = Math.floor(cardEls.length / 2);
                    const targetOpacity = flags.isWaitingMinuteInput ? 1 : 0.7;
                    const dealTl = AnimationController.create({
                        watchdogMs: 2200,
                        onCleanup: () => {
                            gsap.set(cardEls, { opacity: targetOpacity, clearProps: 'transform,transformOrigin' });
                        }
                    });
                    dealTl.fromTo(cardEls,
                        {
                            y: 85,
                            x: (i) => (midIdx - i) * 14,
                            opacity: 0,
                            scale: 0.55,
                            rotation: (i) => (i - midIdx) * 2.8,
                            transformOrigin: "50% 100%"
                        },
                        {
                            y: (i, el) => (isFanActive && el && el.dataset ? (parseFloat(el.dataset.fanY || '0') || 0) : 0),
                            x: 0,
                            opacity: targetOpacity,
                            scale: 1,
                            rotation: (i, el) => (isFanActive && el && el.dataset ? (parseFloat(el.dataset.fanAngle || '0') || 0) : 0),
                            duration: 0.42,
                            ease: "back.out(1.4)",
                            clearProps: "transform,transformOrigin",
                            stagger: {
                                each: 0.042,
                                from: "start"
                            },
                            onStart: () => {
                                if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                                    window.gameAudio.playClick();
                                }
                            }
                        },
                        0
                    );
                }
            }
        }

        // 確認出牌按鈕狀態：支援「選取手牌 + 點擊確認出牌」與「拖放至鐘面出牌」雙軌操作，手機操作更靈活
        if (confirmBtn) {
            if (flags.isWaitingMinuteInput) {
                confirmBtn.style.display = 'inline-block';
                if (uiState.isSecondHandSelectingTwo) {
                    confirmBtn.disabled = (uiState.selectedCardValues.length !== 2);
                } else {
                    confirmBtn.disabled = (uiState.selectedCardValue === null);
                }
            } else {
                confirmBtn.style.display = 'none';
                confirmBtn.disabled = true;
            }
        }

        if (actionHint) {
            let hintText = '';
            if (flags.gameEnded) {
                hintText = '遊戲已結束，可查看盤面或重新開始。';
            } else if (flags.isWaitingSecondFinalChoice) {
                hintText = '請完成秒針二選一選擇。';
            } else if (flags.isWaitingAbilityChoice) {
                hintText = '請選擇是否使用特殊能力。';
            } else if (flags.isWaitingHourInput) {
                hintText = '請在鐘面選擇小時卡。';
            } else if (flags.isWaitingMinuteInput) {
                if (uiState.isSecondHandSelectingTwo) {
                    hintText = uiState.selectedCardValues.length < 2
                        ? '◆ 秒針能力：請點選 2 張分鐘卡。'
                        : '◆ 已選 2 張卡牌，請點擊「確認出牌」。';
                } else {
                    hintText = '▲ 向上拖曳一張分鐘卡至鐘面即可出牌';
                }
            } else {
                hintText = '準備完成，點擊「下一回合」繼續遊戲。';
            }
            actionHint.textContent = hintText;
        }
    }

    // 4. 秒針能力按鈕與彈窗控制
    updateSecondHandControls(gameState, humanPlayer, flags);
}

// --- 一般分鐘卡拖放（Drag & Drop）出牌控制器 ---
// 遵循三大核心事件架構：
// 1. pointerdown（按下）：提升卡牌 zIndex 至最高層並記錄進入「拖曳中」狀態，註冊全域 Stage (window) 移動與放開事件。
// 2. pointermove（移動）：綁定於整個視窗 Stage (window)，游標快速移動離開卡牌時也不會中斷，並以 !important 即時更新卡牌座標。
// 3. pointerup / pointerupoutside (pointercancel / blur / mouseleave)：綁定於整個視窗 Stage，確保拖出視窗外放開也不會卡死，並恢復圖層與狀態。

function bindMinuteCardDragToPlay(cardEl, cardValue, gameState) {
    if (!cardEl || typeof cardEl.addEventListener !== 'function') return;

    let isPendingDrag = false;
    let isDragging = false;
    let hasDraggedOut = false; // 是否曾拖離手牌區（只有拖離後再拖回手牌區，才顯示「收回」）
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let minDy = 0;
    let isDropReady = false;
    let hasCommitted = false;

    // 加大「拖拉回手牌不打出」的判定範圍 (Hitbox / Check box)
    const checkIsInCancelZone = (clientX, clientY, dy) => {
        // 1. 取得手牌區或玩家塢的判定範圍
        const handEl = document.getElementById('human-hand') || document.getElementById('human-player-area');
        if (handEl && typeof handEl.getBoundingClientRect === 'function') {
            const rect = handEl.getBoundingClientRect();
            // 大幅加大判定區：向上延伸 80px，左右各擴充 60px，向下延伸至螢幕底端
            if (clientY >= (rect.top - 80) &&
                clientX >= (rect.left - 60) &&
                clientX <= (rect.right + 60)) {
                return true;
            }
        }
        // 2. 備用垂直位移判定：向上拖曳未超過 95px，或向下拉回 (dy >= -95) 均視為回收區
        if (dy >= -95) {
            return true;
        }
        return false;
    };

    const checkIsInsideClock = (clientX, clientY) => {
        if (window.Board && typeof window.Board.isInsideClock === 'function') {
            return window.Board.isInsideClock(clientX, clientY);
        }
        const clockEl = document.getElementById('clock-face');
        if (!clockEl || typeof clockEl.getBoundingClientRect !== 'function') return false;
        const r = clockEl.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const setClockDropHighlight = (active) => {
        const clockEl = document.getElementById('clock-face');
        if (clockEl && clockEl.classList) {
            clockEl.classList.toggle('drop-target-active', !!active);
        }
        if (window.ModernBoard && typeof window.ModernBoard.setDropHighlight === 'function') {
            window.ModernBoard.setDropHighlight(!!active);
        }
    };

    const detachStageListeners = () => {
        window.removeEventListener('pointermove', onStagePointerMove);
        window.removeEventListener('pointerup', onStagePointerUp);
        window.removeEventListener('pointercancel', onStagePointerUpOutside);
        window.removeEventListener('blur', onStagePointerUpOutside);
        document.removeEventListener('mouseleave', onStageMouseLeave);
    };

    const removeRetrieveBadge = () => {
        const b = cardEl.querySelector('.card-retrieve-badge');
        if (b) b.remove();
    };

    const ensureRetrieveBadge = () => {
        let b = cardEl.querySelector('.card-retrieve-badge');
        if (!b) {
            b = document.createElement('div');
            b.className = 'card-retrieve-badge';
            const retrieveText = (window.i18n ? window.i18n.t('ui.discard_pile.retrieve_badge') : null) || '↩ 收回';
            b.textContent = retrieveText;
            cardEl.appendChild(b);
        }
    };

    const commitCardPlay = () => {
        if (hasCommitted) return;
        const gs = window.globalGameState || gameState;
        if (!gs || gs.currentRoundAIChoices === null) return;
        const playFn = (typeof window.handleHumanChoice === 'function')
            ? window.handleHumanChoice
            : (typeof handleHumanChoice === 'function' ? handleHumanChoice : null);
        if (!playFn) return;

        hasCommitted = true;
        setClockDropHighlight(false);
        removeRetrieveBadge();

        if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
            window.gameAudio.playConfirm();
        }

        cardEl.classList.remove('is-dragging', 'is-drop-ready', 'is-retrieving');
        const ok = playFn(gs, cardValue);
        if (ok) {
            uiState.selectedCardValue = null;
            updateUI(gs);
        }
    };

    const resetCardToHand = () => {
        isDropReady = false;
        hasDraggedOut = false;
        minDy = 0;
        setClockDropHighlight(false);
        removeRetrieveBadge();
        cardEl.classList.remove('is-dragging', 'is-drop-ready', 'is-retrieving');
        cardEl.classList.add('is-returning');
        cardEl.style.removeProperty('transform');
        cardEl.style.removeProperty('z-index');
        cardEl.dataset.dragDx = '0';
        cardEl.dataset.dragDy = '0';
        setTimeout(() => {
            cardEl.classList.remove('is-returning');
        }, 260);
    };

    // 2. pointermove（移動）：智慧判定橫向滑動手牌 vs 向上拖曳出牌
    const onStagePointerMove = (e) => {
        if (hasCommitted) return;
        if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // 若仍處於判定起點階段，辨析手勢方向
        if (isPendingDrag && !isDragging) {
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // A. 水平位移主導：判定為檢視橫向手牌塢，釋放拖曳監聽由原生/容器滾動接手
            if (absDx > absDy + 3 && dy > -12) {
                isPendingDrag = false;
                detachStageListeners();
                return;
            }

            // B. 向上拖動主導（垂直向上拉出超過 10px 或滑鼠拖曳）：正式進入出牌拖放
            const isMouseDrag = (e.pointerType === 'mouse' && Math.hypot(dx, dy) > 5);
            const isTouchUpward = (dy <= -10);

            if (isTouchUpward || isMouseDrag) {
                isPendingDrag = false;
                isDragging = true;
                window.isDraggingCard = true;
                clearHandFanSpread(cardEl.parentElement);
                cardEl.classList.remove('is-returning', 'is-retrieving');
                cardEl.classList.add('is-dragging');
                removeRetrieveBadge();
                cardEl.style.setProperty('z-index', '9999', 'important');
                try { cardEl.setPointerCapture(activePointerId); } catch (_) {}
                if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                    window.gameAudio.playClick();
                }
            } else {
                return;
            }
        }

        if (!isDragging) return;

        const vy = e.clientY - lastY;
        const vx = Math.max(-14, Math.min(14, (e.clientX - lastX) * 0.65));
        lastX = e.clientX;
        lastY = e.clientY;

        if (dy < minDy) {
            minDy = dy;
        }

        cardEl.dataset.dragDx = String(dx);
        cardEl.dataset.dragDy = String(dy);

        const inCancelZone = checkIsInCancelZone(e.clientX, e.clientY, dy);
        const inClock = checkIsInsideClock(e.clientX, e.clientY);

        if (minDy < -70 || inClock) {
            hasDraggedOut = true;
        }

        const ready = !inCancelZone && (inClock || dy < -110);

        if (ready !== isDropReady) {
            isDropReady = ready;
            cardEl.classList.toggle('is-drop-ready', isDropReady);
            setClockDropHighlight(isDropReady);
        }

        const isRetrieving = hasDraggedOut && !isDropReady && inCancelZone;

        cardEl.classList.toggle('is-retrieving', isRetrieving);
        if (isRetrieving) {
            ensureRetrieveBadge();
        } else {
            removeRetrieveBadge();
        }

        const scale = isDropReady ? 1.22 : 1.10;
        const baseFanY = (cardEl.parentElement && cardEl.parentElement.classList && cardEl.parentElement.classList.contains('hand-fan-layout') && cardEl.dataset)
            ? (parseFloat(cardEl.dataset.fanY || '0') || 0)
            : 0;
        cardEl.style.setProperty('transform', `translate3d(${dx}px, ${dy + baseFanY}px, 0) rotate(${vx}deg) scale(${scale})`, 'important');
    };

    // 3A. pointerup（正常放開）：若拖曳出牌則出牌；若僅是點擊（無位移）則切換選取狀態！
    const onStagePointerUp = (e) => {
        if (activePointerId !== null && e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

        const wasDragging = isDragging;
        const wasPending = isPendingDrag;

        isDragging = false;
        isPendingDrag = false;
        window.isDraggingCard = false;
        hasDraggedOut = false;
        activePointerId = null;
        detachStageListeners();

        if (wasDragging) {
            if (isDropReady) {
                commitCardPlay();
            } else {
                resetCardToHand();
            }
        } else if (wasPending) {
            // 單擊/輕觸選取切換（支援手機單手點擊確認出牌）
            const isAlreadySelected = (uiState.selectedCardValue === cardValue);
            uiState.selectedCardValue = isAlreadySelected ? null : cardValue;

            const handParent = cardEl.parentElement || document.getElementById('human-hand');
            if (handParent) {
                const allCards = handParent.querySelectorAll('.minute-card');
                allCards.forEach(c => {
                    const v = parseInt(c.getAttribute('data-value'), 10);
                    c.classList.toggle('selected', v === uiState.selectedCardValue);
                });
            }

            const confirmBtn = document.getElementById('confirm-move-btn');
            if (confirmBtn && !uiState.isSecondHandSelectingTwo) {
                confirmBtn.style.display = 'inline-block';
                confirmBtn.disabled = (uiState.selectedCardValue === null);
            }

            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }

            if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function') {
                window.TutorialModeManager.updateTutorialPointers(gameState);
            }
        }
    };

    // 3B. pointerupoutside（拖出視窗外放開或中斷）
    const onStagePointerUpOutside = () => {
        if (isDragging) {
            isDragging = false;
            window.isDraggingCard = false;
            hasDraggedOut = false;
            activePointerId = null;
            detachStageListeners();
            resetCardToHand();
        } else {
            isPendingDrag = false;
            detachStageListeners();
        }
    };

    const onStageMouseLeave = (e) => {
        if (isDragging && (!e || e.buttons === 0)) {
            onStagePointerUpOutside();
        }
    };

    // 1. pointerdown（按下）：不強制 preventDefault，保留手牌塢原生橫向滾動
    cardEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (uiState.isSecondHandSelectingTwo || hasCommitted) return;

        isPendingDrag = true;
        isDragging = false;
        hasDraggedOut = false;
        activePointerId = (e.pointerId !== undefined) ? e.pointerId : null;
        startX = e.clientX;
        startY = e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;
        minDy = 0;
        isDropReady = false;
        cardEl.dataset.dragDx = '0';
        cardEl.dataset.dragDy = '0';

        window.addEventListener('pointermove', onStagePointerMove);
        window.addEventListener('pointerup', onStagePointerUp);
        window.addEventListener('pointercancel', onStagePointerUpOutside);
        window.addEventListener('blur', onStagePointerUpOutside);
        document.addEventListener('mouseleave', onStageMouseLeave);
    });

    // 無障礙快速後備：雙擊卡牌直接飛入鐘面出牌
    cardEl.addEventListener('dblclick', () => {
        if (!uiState.isSecondHandSelectingTwo && !hasCommitted) {
            detachStageListeners();
            commitCardPlay();
        }
    });
}

// --- 秒針 UI 控制 (輔助函式) ---
function updateSecondHandControls(gameState, humanPlayer, flags) {
    const sWrap = document.getElementById('seconds-ability-controls');
    const sBtn = document.getElementById('seconds-ability-btn');
    const sCancel = document.getElementById('seconds-ability-cancel-btn');
    const sHint = document.getElementById('seconds-ability-hint');
    const overlay = document.getElementById('seconds-choice-overlay');

    const canUseSecondHand = window.GAME_CONFIG.enableAbilities && humanPlayer && humanPlayer.roleCard === '秒針' &&
        flags.isWaitingMinuteInput && !flags.isWaitingSecondFinalChoice && !gameState.gameEnded && !gameState.abilityMarker &&
        !humanPlayer.specialAbilityUsed && humanPlayer.mana >= 3 && humanPlayer.hand.length >= 2;

    if (sWrap) sWrap.style.display = (canUseSecondHand || uiState.isSecondHandSelectingTwo) ? 'block' : 'none';
    if (sBtn) {
        sBtn.style.display = (canUseSecondHand || uiState.isSecondHandSelectingTwo) ? 'inline-block' : 'none';
        sBtn.disabled = !canUseSecondHand || uiState.isSecondHandSelectingTwo;
    }
    if (sCancel) {
        sCancel.style.display = uiState.isSecondHandSelectingTwo ? 'inline-block' : 'none';
        sCancel.disabled = false;
    }
    if (sHint) sHint.style.display = uiState.isSecondHandSelectingTwo ? 'block' : 'none';

    // 二選一彈窗
    if (overlay) {
        if (flags.isWaitingSecondFinalChoice && gameState.secondHandPendingCards && gameState.secondHandPendingCards.length === 2) {
            const [a, b] = gameState.secondHandPendingCards;
            const btnA = document.getElementById('seconds-choice-a');
            const btnB = document.getElementById('seconds-choice-b');
            if (btnA) { btnA.textContent = String(a.value); btnA.dataset.value = String(a.value); }
            if (btnB) { btnB.textContent = String(b.value); btnB.dataset.value = String(b.value); }
            if (overlay.classList.contains('hidden')) {
                if (typeof openModal === 'function') openModal(overlay, btnA || undefined);
                else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal(overlay, btnA || undefined);
                else if (overlay) { overlay.classList.remove('hidden'); overlay.style.display = 'block'; }
            }
        } else if (!overlay.classList.contains('hidden')) {
            if (typeof closeModal === 'function') closeModal(overlay);
            else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal(overlay);
            else if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
        }
    }
}

if (typeof window !== 'undefined') {
    window.renderHumanPlayerArea = renderHumanPlayerArea;
    window.applyHandFanLayout = applyHandFanLayout;
    window.isModernFanHandEnabled = isModernFanHandEnabled;
}
