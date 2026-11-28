// js/ui/ui_panel_abilities.js
// 幼體進化進度、高階指針異能、時之惡異能與受詛者任務面板（由 ui_panels.js 拆出）


// --- F. 進化 / 能力 / 任務面板 ---
function renderEvolutionPanel(gameState, humanPlayer) {
    const progressArea = document.getElementById('evolution-progress-area');
    if (!progressArea) return;
    progressArea.innerHTML = '';

    if (!humanPlayer || humanPlayer.isEjected) return;

    // 0. 純競標模式：無角色能力與進化
    if (humanPlayer.type === 'pure') {
        progressArea.innerHTML = `<div class="evo-empty-note" style="font-size:0.85rem; color:#bbb; padding:6px 4px;">純競標模式（${gameState.players.length}P）：無角色能力與進化，保留 GP 即為最終分數。</div>`;
        return;
    }

    // 1. 幼體時魔：顯示進化進度
    if (humanPlayer.type === '時魔' && humanPlayer.roleCard.includes('幼')) {
        renderYoungTimeDemonProgress(gameState, humanPlayer, progressArea);
    }
    // 2. 已進化時魔：顯示能力按鈕
    else if (['時針', '分針', '秒針'].includes(humanPlayer.roleCard)) {
        renderEvolvedAbilityPanel(gameState, humanPlayer, progressArea);
    }
    // 3. 時之惡：顯示抓人能力
    else if (humanPlayer.type === '時之惡') {
        renderSinAbilityPanel(gameState, humanPlayer, progressArea);
    }
    // 4. 受詛者：顯示任務監控
    else if (humanPlayer.type === '受詛者') {
        renderSczMissionPanel(gameState, humanPlayer, progressArea);
    }
}

// F-1. 幼體時魔
function renderYoungTimeDemonProgress(gameState, humanPlayer, container) {
    if (typeof window.checkEvolutionCondition === 'function') {
        const cards = humanPlayer.hourCards || [];
        const preciousCount = cards.filter(c => c.isPrecious).length;
        const uniqueAges = new Set(cards.map(c => c.ageGroup).filter(g => g)).size;
        const uniqueNumbers = new Set(cards.map(c => c.number)).size;
        const totalCount = cards.length;

        const cond1 = (uniqueAges >= 3 && preciousCount >= 1);
        const cond2 = (uniqueNumbers >= 4 && preciousCount >= 1);
        const cond3 = (totalCount >= 5 && preciousCount >= 2);
        const cond4 = (preciousCount >= 3);

        const isReady = cond1 || cond2 || cond3 || cond4;

        //過濾已被佔用的身份 ---
        // 1. 找出已被「其他存活玩家」佔用的身份
        const takenRoles = gameState.players
            .filter(p => p.id !== humanPlayer.id && !p.isEjected)
            .map(p => p.roleCard);

        // 2. 定義所有可能的身份
        const allRoles = ['時針', '分針', '秒針'];

        // 3. 決定當前目標 (若原目標已被搶走，嘗試切換到第一個可用的)
        let currentTarget = humanPlayer.targetRoleName || '時針';
        const availableRoles = allRoles.filter(r => !takenRoles.includes(r));

        // 如果當前選的已經被搶走了，且還有其他選擇，暫時顯示為第一個可用的 (視覺上)
        if (takenRoles.includes(currentTarget) && availableRoles.length > 0) {
            currentTarget = availableRoles[0];
            // 這裡可以選擇是否直接更新玩家狀態，建議讓 change 事件去觸發實際更新，
            // 但為了讓下方的 roleDescriptions 顯示正確，這裡先用 effective target。
        }

        // 4. 動態生成下拉選單 HTML
        let optionsHtml = '';
        allRoles.forEach(role => {
            // 如果該身份已被其他人佔用，就跳過 (不生成 option)
            if (takenRoles.includes(role)) return;

            const selected = (currentTarget === role) ? 'selected' : '';
            optionsHtml += `<option value="${role}" ${selected}>${role}</option>`;
        });

        // 若全部被搶光 (極端狀況)
        if (optionsHtml === '') {
            optionsHtml = `<option disabled selected>無可用身份</option>`;
        }

        // --- 修改結束 ---

        const targetLabel = window.i18n ? window.i18n.t('abilities.target_role') : '目標身份：';
        const condMetText = window.i18n ? window.i18n.t('abilities.condition_met') : '✦ 條件達成！回合結束時進化';
        const roleDescriptions = {
            '時針': `<div style="color:#ff9ff3; margin-top:4px;">${window.i18n ? window.i18n.t('abilities.hour_desc') : '⧖ 預知牌頂 + ◆ 1 MP：牌頂移底'}</div>`,
            '分針': `<div style="color:#f368e0; margin-top:4px;">${window.i18n ? window.i18n.t('abilities.min_desc') : '◆ 2 MP：移至下一個有小時卡的格子'}</div>`,
            '秒針': `<div style="color:#00d2d3; margin-top:4px;">${window.i18n ? window.i18n.t('abilities.sec_desc') : '◆ 3 MP：出牌二選一'}</div>`
        };

        const cond1Text = window.i18n ? window.i18n.t('abilities.cond_ages', { ages: uniqueAges, precious: preciousCount }) : `1. 時代 ${uniqueAges}/3, 珍貴 ${preciousCount}/1`;
        const cond2Text = window.i18n ? window.i18n.t('abilities.cond_numbers', { numbers: uniqueNumbers, precious: preciousCount }) : `2. 數字 ${uniqueNumbers}/4, 珍貴 ${preciousCount}/1`;
        const cond3Text = window.i18n ? window.i18n.t('abilities.cond_total', { total: totalCount, precious: preciousCount }) : `3. 總數 ${totalCount}/5, 珍貴 ${preciousCount}/2`;
        const cond4Text = window.i18n ? window.i18n.t('abilities.cond_precious', { precious: preciousCount }) : `4. 珍貴 ${preciousCount}/3 (任意)`;

        // 計算距離最近的進化配方提示
        let closestTipHtml = '';
        if (!isReady) {
            const needPrecious = (gameState.gameMode === '5P');
            const candidates = [
                { name: '久遠一生', missing: Math.max(0, 3 - uniqueAges) + (needPrecious ? Math.max(0, 1 - preciousCount) : 0), desc: `時代 ${uniqueAges}/3${needPrecious && preciousCount < 1 ? '（缺珍貴）' : ''}` },
                { name: '命途節錄', missing: Math.max(0, 4 - uniqueNumbers) + (needPrecious ? Math.max(0, 1 - preciousCount) : 0), desc: `數字 ${uniqueNumbers}/4${needPrecious && preciousCount < 1 ? '（缺珍貴）' : ''}` },
                { name: '漫長生涯', missing: Math.max(0, 5 - totalCount) + (needPrecious ? Math.max(0, 2 - preciousCount) : 0), desc: `總數 ${totalCount}/5${needPrecious && preciousCount < 2 ? `（缺${2 - preciousCount}珍貴）` : ''}` }
            ];
            if (needPrecious) {
                candidates.push({ name: '銘記珍重', missing: Math.max(0, 3 - preciousCount), desc: `珍貴 ${preciousCount}/3` });
            }
            candidates.sort((a, b) => a.missing - b.missing);
            const best = candidates[0];
            closestTipHtml = `<div style="margin-top:8px; padding:5px 8px; border-radius:6px; background:rgba(124,140,255,0.14); border:1px solid rgba(124,140,255,0.35); color:#c7d2fe; font-size:0.78rem;">✦ 最近目標：<strong>${best.name}</strong>（${best.desc}）</div>`;
        }

        // 將 optionsHtml 放入 select 中
        let html = `
            <div class="target-role-header">
                <label class="target-role-label">${targetLabel}</label>
                <select id="target-role-select" class="target-role-select">
                    ${optionsHtml}
                </select>
                <div style="font-size:0.8rem; line-height:1.4; color:#ddd;">${roleDescriptions[currentTarget] || ''}</div>
            </div>
            ${closestTipHtml}
            <div style="margin-top:10px;">
                ${renderConditionRow(cond1, cond1Text)}
                ${renderConditionRow(cond2, cond2Text)}
                ${renderConditionRow(cond3, cond3Text)}
                ${renderConditionRow(cond4, cond4Text)}
            </div>
        `;
        if (isReady) {
            html += `<div style="margin-top:8px; color:#ffd27f; text-align:center; font-weight:bold; border:1px dashed #ffd27f; padding:4px;">${condMetText}</div>`;
        }
        container.innerHTML = html;

        const selectEl = document.getElementById('target-role-select');
        if (selectEl && typeof selectEl.addEventListener === 'function') {
            selectEl.addEventListener('change', (e) => {
                humanPlayer.targetRoleName = e.target.value;
                if (globalGameState && globalGameState.isOnlineMatch && window.OnlineLobbyClient && typeof window.OnlineLobbyClient.sendAction === 'function') {
                    window.OnlineLobbyClient.sendAction({ type: 'USE_ABILITY', ability: 'SET_TARGET_ROLE', role: e.target.value });
                }
                updateUI(globalGameState);
            });

            // 如果發現當前記憶的 targetRoleName 其實已經被隱藏了(不合法)，
            // 且 select 已經自動跳到第一個合法選項，我們需要同步更新回 humanPlayer
            // 這樣下一幀繪製時描述文字才會正確
            if (selectEl.value && selectEl.value !== humanPlayer.targetRoleName) {
                humanPlayer.targetRoleName = selectEl.value;
                // 不用急著 updateUI，等下次循環或玩家操作即可，
                // 或是這裡可以手動呼叫一次 updateUI(globalGameState) 來即時刷新描述文字
            }
        }
    }
}

function renderConditionRow(isMet, text) {
    return `<div class="condition-row ${isMet ? 'met' : ''}"><div class="condition-icon"></div><div class="condition-text">${text}</div></div>`;
}

// F-2. 已進化時魔
function renderEvolvedAbilityPanel(gameState, humanPlayer, parent) {
    const role = humanPlayer.roleCard;
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:${ROLE_COLORS[role]}">${role}</div>`;

    // 1. 檢查封印狀態
    const isAbilityLocked = !!gameState.abilityMarker;

    // --- 時針 (Time Hand) ---
    if (role === '時針') {
        const baseCost = window.GAME_DATA?.ABILITY_COSTS?.TIME_HAND_MOVE || 1;

        // 顯示牌庫頂資訊
        const topCard = (Array.isArray(gameState.hourDeck) && gameState.hourDeck.length > 0)
            ? gameState.hourDeck[gameState.hourDeck.length - 1] : null;

        let contentHtml = '';
        if (isAbilityLocked) {
            contentHtml = `<div style="color:#ff6b6b; font-weight:bold;"><span class="material-symbols-outlined icon-inline">block</span> ${window.i18n ? window.i18n.t('abilities.hour_predict_disabled') : '預知能力失效'}</div>`;
        } else if (!topCard) {
            contentHtml = `<div style="color:#aaa;">${window.i18n ? window.i18n.t('abilities.hour_deck_empty') : '(牌庫已空)'}</div>`;
        } else {
            const star = topCard.isPrecious ? '<span style="color:#ffd27f; font-size:1.2rem;">★</span>' : '';
            const localizedAge = window.i18n ? window.i18n.getAgeGroupName(topCard.ageGroup || '') : (topCard.ageGroup || '');
            const topCardText = window.i18n
                ? window.i18n.t('abilities.hour_top_card', { number: topCard.number, age: localizedAge, star })
                : `⧖ 牌庫頂：<strong>${topCard.number}</strong> <span style="font-size:0.8rem; color:#ccc;">${localizedAge}</span> ${star}`;
            contentHtml = `<div style="font-size:0.9rem; margin-bottom:6px; border-bottom:1px dashed #666; padding-bottom:4px; color:#fff;">${topCardText}</div>`;
        }

        const passiveContainer = document.createElement('div');
        passiveContainer.style.cssText = 'background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #555; text-align:center;';
        passiveContainer.innerHTML = contentHtml;
        container.appendChild(passiveContainer);

        // 按鈕邏輯
        const moveCount = humanPlayer.hourHandMoveCount || 0;
        const currentCost = (moveCount === 0) ? baseCost : 2;

        // 判斷是否可用 (增加 !isAbilityLocked 檢查)
        const canUse = !gameState.gameEnded &&
            !isAbilityLocked &&
            humanPlayer.mana >= currentCost &&
            gameState.hourDeck.length > 0 &&
            (!humanPlayer.specialAbilityUsed && moveCount < 2);

        const btn = document.createElement('button');
        btn.className = 'evo-btn';

        if (isAbilityLocked) {
            // 封鎖狀態樣式
            btn.innerHTML = `<span class="material-symbols-outlined icon-inline">block</span> ` + (window.i18n ? window.i18n.t('abilities.locked_btn') : `能力被封鎖`);
            btn.style.backgroundColor = '#555';
            btn.style.color = '#999';
            btn.disabled = true;
        } else {
            // 正常狀態
            btn.style.backgroundColor = '#ff9ff3';
            if (moveCount === 0) {
                btn.innerHTML = window.i18n
                    ? window.i18n.t('abilities.hour_move_btn', { cost: currentCost })
                    : `${currentCost} MP<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>`;
            } else {
                btn.innerHTML = window.i18n
                    ? window.i18n.t('abilities.hour_move_again_btn', { cost: currentCost })
                    : `${currentCost} MP<br><span style="font-size:0.8rem; font-weight:bold;"><span class="material-symbols-outlined icon-inline">restart_alt</span> 再移動一次 (剩1次)</span>`;
            }
            btn.disabled = !canUse;
            btn.onclick = () => {
                if (typeof hourHandMoveTopToBottom === 'function') {
                    hourHandMoveTopToBottom(globalGameState, humanPlayer.id);
                    updateUI(globalGameState);
                }
            };
        }
        container.appendChild(btn);

        // --- 分針 (Minute Hand) ---
    } else if (role === '分針') {
        const COST = (gameState.gameMode === '3P')
            ? (window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE_3P || 3)
            : (window.GAME_DATA?.ABILITY_COSTS?.MINUTE_HAND_MOVE || 2);

        if (gameState.waitingMinuteHandChoice) {
            if (isAbilityLocked) {
                container.innerHTML += `<div style="color:#ff6b6b">異常：封鎖狀態下不應顯示選擇面板。</div>`;
            } else {
                const desc = document.createElement('div');
                desc.className = 'evo-desc';
                desc.innerHTML = `<span style="color:#f368e0">${window.i18n ? window.i18n.t('abilities.min_prompt') : '◆ 請選擇移動方向 (將跳至下一個有卡片的格子)：'}`;
                container.appendChild(desc);

                const btnGroup = document.createElement('div');
                btnGroup.style.display = 'flex';
                btnGroup.style.gap = '5px';
                const makeBtn = (txt, val, color) => {
                    const b = document.createElement('button');
                    b.className = 'evo-btn';
                    b.style.background = color;
                    b.textContent = txt;
                    b.onclick = () => handleHumanAbilityChoice(globalGameState, val);
                    return b;
                }
                const findTargetFn = (typeof window !== 'undefined' && typeof window.findMinuteHandTargetPosition === 'function')
                    ? window.findMinuteHandTargetPosition
                    : (typeof findMinuteHandTargetPosition === 'function' ? findMinuteHandTargetPosition : (gs, pos, dir) => {
                        if (!gs || !Array.isArray(gs.clockFace) || typeof pos !== 'number') return null;
                        let p = pos;
                        for (let i = 0; i < 11; i++) {
                            p = (dir === 'ccw') ? (p <= 1 ? 12 : p - 1) : (p >= 12 ? 1 : p + 1);
                            const s = gs.clockFace.find(x => x.position === p);
                            if (s && Array.isArray(s.cards) && s.cards.length > 0) return p;
                        }
                        return null;
                    });
                const ccwTarget = findTargetFn(gameState, humanPlayer.currentClockPosition, 'ccw');
                const cwTarget = findTargetFn(gameState, humanPlayer.currentClockPosition, 'cw');
                const ccwBase = window.i18n ? window.i18n.t('abilities.min_btn_ccw') : '↺ 逆時針';
                const cwBase = window.i18n ? window.i18n.t('abilities.min_btn_cw') : '↻ 順時針';
                const ccwTxt = `${ccwBase} ( ${ccwTarget !== null ? ccwTarget : '--'} )`;
                const cwTxt = `${cwBase} ( ${cwTarget !== null ? cwTarget : '--'} )`;
                const skipTxt = window.i18n ? window.i18n.t('abilities.min_btn_skip') : '略過';

                const ccwBtn = makeBtn(ccwTxt, 'ccw', '#00d2d3');
                const cwBtn = makeBtn(cwTxt, 'cw', '#ff9ff3');
                if (ccwTarget === null) { ccwBtn.disabled = true; ccwBtn.style.opacity = '0.5'; }
                if (cwTarget === null) { cwBtn.disabled = true; cwBtn.style.opacity = '0.5'; }
                btnGroup.appendChild(ccwBtn);
                btnGroup.appendChild(cwBtn);
                btnGroup.appendChild(makeBtn(skipTxt, false, '#777'));
                container.appendChild(btnGroup);
            }
        } else {
            // 靜態描述 (被動觸發)
            const info = document.createElement('div');
            info.className = 'evo-desc';

            if (isAbilityLocked) {
                info.innerHTML = window.i18n
                    ? window.i18n.t('abilities.min_passive_disabled', { cost: COST })
                    : `<span style="color:#888; text-decoration:line-through;">取得小時卡時，可消耗 ${COST} MP 移動。</span><br><span style="color:#ff6b6b; font-weight:bold;">(✕ 本回合失效)</span>`;
            } else {
                info.innerHTML = window.i18n
                    ? window.i18n.t('abilities.min_passive_text', { cost: COST })
                    : `取得小時卡時，可消耗 ${COST} MP 跳躍至順/逆時針下一個有卡片的格子。`;
            }
            container.appendChild(info);
        }

        // --- 秒針 (Second Hand) ---
    } else if (role === '秒針') {
        const COST = (gameState.gameMode === '3P')
            ? (window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT_3P || 2)
            : (window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SELECT || 3);
        const isWaitingMinute = gameState.currentRoundAIChoices !== null;
        const isWaitingFinal = !!gameState.waitingSecondHandFinalChoice;

        // 判斷是否可用 (增加 !isAbilityLocked 檢查)
        const canUse = window.GAME_CONFIG.enableAbilities &&
            !isAbilityLocked &&
            isWaitingMinute &&
            !isWaitingFinal &&
            !humanPlayer.specialAbilityUsed &&
            humanPlayer.mana >= COST &&
            humanPlayer.hand.length >= 2;

        if (isWaitingFinal) {
            const desc = document.createElement('div');
            desc.className = 'evo-desc';
            desc.textContent = window.i18n ? window.i18n.t('abilities.sec_pick_one_prompt') : '請選擇一張牌...';
            container.appendChild(desc);
        } else {
            const btn = document.createElement('button');
            btn.className = 'evo-btn';

            if (isAbilityLocked) {
                // 封鎖狀態樣式
                btn.innerHTML = `<span class="material-symbols-outlined icon-inline">block</span> ` + (window.i18n ? window.i18n.t('abilities.locked_btn') : `能力被封鎖`);
                btn.style.backgroundColor = '#555';
                btn.style.color = '#999';
                btn.disabled = true;
            } else {
                // 正常 / 取消選擇狀態
                if (uiState.isSecondHandSelectingTwo) {
                    btn.style.backgroundColor = '#ff6b6b';
                    btn.style.color = '#fff';
                    btn.textContent = window.i18n ? window.i18n.t('abilities.sec_btn_cancel') : '取消選擇';
                    btn.onclick = () => { uiState.isSecondHandSelectingTwo = false; uiState.selectedCardValues = []; updateUI(globalGameState); };
                } else {
                    btn.style.backgroundColor = '#00d2d3';
                    btn.innerHTML = window.i18n
                        ? window.i18n.t('abilities.sec_btn_play', { cost: COST })
                        : `${COST} MP<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>`;
                    btn.disabled = !canUse;
                    btn.onclick = () => { uiState.isSecondHandSelectingTwo = true; uiState.selectedCardValue = null; uiState.selectedCardValues = []; updateUI(globalGameState); };
                }
            }
            container.appendChild(btn);

            if (uiState.isSecondHandSelectingTwo) {
                const hint = document.createElement('div');
                hint.className = 'evo-desc';
                hint.style.color = '#00d2d3';
                hint.textContent = window.i18n ? window.i18n.t('abilities.sec_pick_two_hint') : '▲ 請點擊上方 2 張手牌';
                container.appendChild(hint);
            }

            // 秒針 1 MP 互換能力（1 已打出時 60→1；60 已打出時 1→60）
            if (!isAbilityLocked) {
                const swapCost = window.GAME_DATA?.ABILITY_COSTS?.SECOND_HAND_SWAP || 1;
                const canSwap60To1 = isWaitingMinute && typeof canUseSecondHandSwap === 'function' && canUseSecondHandSwap(gameState, humanPlayer, 60, 1);
                const canSwap1To60 = isWaitingMinute && typeof canUseSecondHandSwap === 'function' && canUseSecondHandSwap(gameState, humanPlayer, 1, 60);

                const swapWrap = document.createElement('div');
                swapWrap.style.cssText = 'display:flex; flex-direction:column; gap:6px; margin-top:8px;';

                const makeSwapBtn = (fromVal, toVal, enabled) => {
                    const sBtn = document.createElement('button');
                    sBtn.className = 'evo-btn';
                    sBtn.style.backgroundColor = '#00a8a8';
                    sBtn.style.fontSize = '0.82rem';
                    sBtn.innerHTML = window.i18n
                        ? window.i18n.t('abilities.sec_btn_swap', { cost: swapCost, from: fromVal, to: toVal })
                        : `${swapCost} MP：將 [${fromVal}] 當成 [${toVal}] 打出`;
                    sBtn.disabled = !enabled;
                    sBtn.onclick = () => {
                        if (typeof handleHumanSecondHandSwap === 'function') {
                            uiState.isSecondHandSelectingTwo = false;
                            uiState.selectedCardValue = null;
                            uiState.selectedCardValues = [];
                            handleHumanSecondHandSwap(globalGameState, fromVal, toVal);
                            updateUI(globalGameState);
                        }
                    };
                    return sBtn;
                };

                swapWrap.appendChild(makeSwapBtn(60, 1, canSwap60To1));
                swapWrap.appendChild(makeSwapBtn(1, 60, canSwap1To60));

                const swapDesc = document.createElement('div');
                swapDesc.className = 'evo-desc';
                swapDesc.style.fontSize = '0.75rem';
                swapDesc.textContent = window.i18n
                    ? window.i18n.t('abilities.sec_swap_hint')
                    : '本局 1 已打出時可將 60 當 1；60 已打出時可將 1 當 60。';
                swapWrap.appendChild(swapDesc);
                container.appendChild(swapWrap);
            }
        }
    }
    parent.appendChild(container);
}


// F-3. 時之惡 (已更新：新增封印按鈕)
// ui.js - renderSinAbilityPanel 修正版 (左右並排)

function renderSinAbilityPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    const localizedSinName = window.i18n ? window.i18n.getRoleName('時之惡') : '時之惡';
    container.innerHTML = `<div class="evo-role-title" style="color:#feca57">${localizedSinName}</div>`;

    if (gameState.waitingSinPreRoundDiscard && gameState.waitingSinPreRoundDiscardPlayerId === humanPlayer.id && gameState.sinPreRoundDiscardOptions) {
        const { minValue, maxValue } = gameState.sinPreRoundDiscardOptions;
        const promptDiv = document.createElement('div');
        promptDiv.style.cssText = 'font-size:0.85rem; color:#feca57; font-weight:bold; margin-bottom:8px;';
        promptDiv.textContent = '4P 開局強制棄牌：請選擇棄掉最低或最高分鐘卡';
        container.appendChild(promptDiv);

        const discardRow = document.createElement('div');
        discardRow.style.cssText = 'display:flex; gap:8px; width:100%; margin-bottom:10px;';

        const makeDiscardBtn = (label, choice) => {
            const dBtn = document.createElement('button');
            dBtn.className = 'evo-btn';
            dBtn.style.cssText = 'flex:1; background:#e17055; color:#fff; padding:8px 6px;';
            dBtn.textContent = label;
            dBtn.onclick = () => {
                if (typeof handleHumanSinPreRoundDiscard === 'function') {
                    handleHumanSinPreRoundDiscard(globalGameState, choice);
                }
            };
            return dBtn;
        };

        discardRow.appendChild(makeDiscardBtn(`棄掉最低 [${minValue}]`, 'min'));
        discardRow.appendChild(makeDiscardBtn(`棄掉最高 [${maxValue}]`, 'max'));
        container.appendChild(discardRow);
    }

    // 1. 顯示當前規則狀態
    const modeNear = window.i18n ? window.i18n.t('abilities.sin_mode_near') : '扣滅目標：距離最近 (已變更)';
    const modeMax = window.i18n ? window.i18n.t('abilities.sin_mode_max') : '扣滅目標：數值最大 (預設)';
    const currentMode = gameState.sinTargetingMode === 'sin' ? modeNear : modeMax;
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'font-size:0.85rem; color:#aaa; margin-bottom:8px;';
    statusDiv.innerHTML = `<span style="color:${gameState.sinTargetingMode === 'sin' ? '#ff6b6b' : '#fff'}">${currentMode}</span>`;
    container.appendChild(statusDiv);

    // ✅ 建立按鈕群組容器 (Flex Row)
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '8px';    // 按鈕之間的間距
    btnGroup.style.width = '100%'; // 填滿寬度

    // 共用變數
    const canAct = window.GAME_CONFIG.enableAbilities && !gameState.gameEnded && !humanPlayer.specialAbilityUsed;

    // --- 按鈕 A：惡之牽引 (左) ---
    const pullCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_PULL || 2;
    const btnPull = document.createElement('button');
    btnPull.className = 'evo-btn';
    btnPull.style.flex = '1';
    btnPull.style.backgroundColor = '#feca57';
    btnPull.style.color = '#000';

    const actedTxt = window.i18n ? window.i18n.t('abilities.sin_acted') : '已行動';
    const lackManaTxt = (cost) => window.i18n ? window.i18n.t('abilities.sin_lack_mana', { cost }) : `缺 MP (${cost})`;

    if (humanPlayer.specialAbilityUsed) {
        btnPull.textContent = actedTxt;
        btnPull.disabled = true;
    } else if (humanPlayer.mana < pullCost) {
        btnPull.textContent = lackManaTxt(pullCost);
        btnPull.disabled = true;
    } else {
        btnPull.innerHTML = window.i18n
            ? window.i18n.t('abilities.sin_btn_pull', { cost: pullCost })
            : `${pullCost} MP<br><span style="font-size:0.8rem; font-weight:normal;">惡之牽引</span>`;
        btnPull.title = window.i18n ? window.i18n.t('abilities.sin_pull_tip') : '改為懲罰「距離最近」者';
        btnPull.onclick = () => {
            if (typeof activateSinAbility === 'function') {
                const success = activateSinAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    btnGroup.appendChild(btnPull);

    // --- 按鈕 B：封鎖 (右) ---
    const sealCost = window.GAME_DATA?.ABILITY_COSTS?.SIN_SEAL || 3;
    const btnSeal = document.createElement('button');
    btnSeal.className = 'evo-btn';
    btnSeal.style.flex = '1';
    btnSeal.style.backgroundColor = '#ff6b6b';
    btnSeal.style.color = '#fff';

    if (gameState.abilityMarker) {
        btnSeal.textContent = window.i18n ? window.i18n.t('abilities.locked_btn') : '已封鎖';
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.specialAbilityUsed) {
        btnSeal.textContent = actedTxt;
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else if (humanPlayer.mana < sealCost) {
        btnSeal.textContent = lackManaTxt(sealCost);
        btnSeal.disabled = true;
        btnSeal.style.backgroundColor = '#555';
    } else {
        btnSeal.innerHTML = window.i18n
            ? window.i18n.t('abilities.sin_btn_seal', { cost: sealCost })
            : `${sealCost} MP<br><span style="font-size:0.8rem; font-weight:normal;">封鎖時魔</span>`;
        btnSeal.title = window.i18n ? window.i18n.t('abilities.sin_seal_tip') : '本回合封印全體時魔能力';
        btnSeal.onclick = () => {
            if (typeof activateSinSealAbility === 'function') {
                const success = activateSinSealAbility(globalGameState, humanPlayer.id);
                if (success) updateUI(globalGameState);
            }
        };
    }
    btnGroup.appendChild(btnSeal); // 加入群組

    // 將整組按鈕加入主容器
    container.appendChild(btnGroup);

    parent.appendChild(container);
}


// F-4. 受詛者專用面板：顯示「已固定」與「敵人持有」的珍貴卡
function renderSczMissionPanel(gameState, humanPlayer, parent) {
    const container = document.createElement('div');
    container.className = 'evo-ability-panel';
    container.innerHTML = `<div class="evo-role-title" style="color:#54a0ff"><span class="material-symbols-outlined icon-inline">bar_chart</span> 珍貴卡分佈監控</div>`;

    // --- 區塊 1: 受詛者已固定 (Locked) ---
    const lockedCards = [];
    // 定義已進化的角色名稱，用於排除
    const evolvedRoles = ['時針', '分針', '秒針'];

    gameState.clockFace.forEach(spot => {
        spot.cards.forEach(c => {
            if (c.isPrecious && c.isLocked) {
                lockedCards.push(c.number);
            }
        });
    });
    lockedCards.sort((a, b) => a - b);

    const lockedSection = document.createElement('div');
    lockedSection.style.cssText = 'background:rgba(84, 160, 255, 0.1); border:1px solid #54a0ff; border-radius:6px; padding:8px; margin-bottom:8px;';

    let lockedHtml = `<div style="color:#54a0ff; font-weight:bold; font-size:0.9rem; margin-bottom:5px;"><span class="material-symbols-outlined icon-inline">lock</span> 已固定 (${lockedCards.length}/12)</div>`;
    if (lockedCards.length === 0) {
        lockedHtml += `<div style="color:#888; font-size:0.85rem;">尚未固定任何卡片</div>`;
    } else {
        lockedHtml += `<div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        lockedCards.forEach(num => {
            lockedHtml += `<span style="background:#54a0ff; color:#000; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.9rem;">${num}★</span>`;
        });
        lockedHtml += `</div>`;
    }
    lockedSection.innerHTML = lockedHtml;
    container.appendChild(lockedSection);


    // --- 區塊 2: 幼體時魔已收集 (Held by Young Demons) ---
    const enemyHoldings = [];

    gameState.players.forEach(p => {
        // 條件：是時魔 + 未被吞噬
        if (p.type === '時魔' && !p.isEjected) {

            // 判定是否為幼體：
            // 1. roleCard 包含 '幼' (最準確)
            // 2. 或者 roleCard 不在已進化名單中 (防呆後備)
            const roleName = String(p.roleCard || '');
            const isYoung = roleName.includes('幼') || !evolvedRoles.includes(roleName);

            if (isYoung && Array.isArray(p.hourCards) && p.hourCards.length > 0) {
                // 篩選出該玩家持有的「珍貴」卡片
                const heldPrecious = p.hourCards
                    .filter(c => c && c.isPrecious)
                    .map(c => c.number);

                if (heldPrecious.length > 0) {
                    heldPrecious.sort((a, b) => a - b);
                    enemyHoldings.push({ name: p.name, cards: heldPrecious });
                }
            }
        }
    });

    const enemySection = document.createElement('div');
    enemySection.style.cssText = 'background:rgba(255, 107, 107, 0.1); border:1px solid #ff6b6b; border-radius:6px; padding:8px;';

    let enemyHtml = `<div style="color:#ff6b6b; font-weight:bold; font-size:0.9rem; margin-bottom:5px;"><span class="material-symbols-outlined icon-inline">backpack</span> 幼體時魔持有</div>`;

    if (enemyHoldings.length === 0) {
        enemyHtml += `<div style="color:#888; font-size:0.85rem;">目前無威脅 (或是持有卡皆非珍貴)</div>`;
    } else {
        enemyHoldings.forEach(item => {
            enemyHtml += `<div style="margin-top:4px; font-size:0.85rem; color:#ccc;">`;
            enemyHtml += `<span style="color:#fff;">${item.name}</span>: `;
            item.cards.forEach(num => {
                enemyHtml += `<span style="color:#ff6b6b; border:1px solid #ff6b6b; padding:0 3px; border-radius:3px; margin-left:3px;">${num}★</span>`;
            });
            enemyHtml += `</div>`;
        });
    }
    enemySection.innerHTML = enemyHtml;
    container.appendChild(enemySection);

    // --- 勝利提示 ---
    if (lockedCards.length >= 12) {
        const winMsg = document.createElement('div');
        winMsg.style.cssText = 'margin-top:8px; text-align:center; color:#ffd27f; font-weight:bold; animation: tipPulse 1s infinite;';
        winMsg.innerHTML = '<span class="material-symbols-outlined icon-inline">celebration</span> 條件達成！請繼續努力保護手中齒輪！';
        container.appendChild(winMsg);
    }

    parent.appendChild(container);
}

if (typeof window !== 'undefined') {
    window.renderDiscardPile = renderDiscardPile;
    window.renderDiscardPileModal = renderDiscardPileModal;
    window.getTopDiscardCard = getTopDiscardCard;
    window.getAllPlayedCardsInCurrentGameRound = getAllPlayedCardsInCurrentGameRound;
    window.renderScorePanel = renderScorePanel;
    window.renderSpecialVictoryScoreMeter = renderSpecialVictoryScoreMeter;
    window.bindScoreTabs = bindScoreTabs;
}
