// js/ui/ui_hud_fx.js
// 玩家數值變動追蹤、浮動受擊跳字、畫面震動與時之惡連線特效（由 ui.js 拆出）

// 新增：記錄玩家上一狀態與所屬局次，用於比對同局內的數值變化
let lastPlayerStats = {};
let lastStatsGameRound = null;

function resetPlayerStatsTracking() {
    lastPlayerStats = {};
    lastStatsGameRound = null;
}

function processFloatingText(gameState) {
    if (!gameState || !gameState.players) return;

    const currentGameRound = (typeof gameState.gameRound === 'number') ? gameState.gameRound : null;
    const isRoundChanged = (
        currentGameRound !== null &&
        lastStatsGameRound !== null &&
        currentGameRound !== lastStatsGameRound
    );

    // 換局開始時重新分配齒輪/MP/護盾，僅靜默同步新局基準快照，不觸發浮字、受擊與畫面震動特效
    if (isRoundChanged) {
        lastPlayerStats = {};
        gameState.players.forEach(player => {
            lastPlayerStats[player.id] = {
                mana: player.mana,
                gearCards: player.gearCards,
                d6Die: (typeof player.d6Die === 'number') ? player.d6Die : 0,
                shieldUsed: !!player.shieldUsed,
                currentClockPosition: player.currentClockPosition,
                gameRound: currentGameRound
            };
        });
        lastStatsGameRound = currentGameRound;
        return;
    }

    // 收集所有玩家的數值變動事件
    const pendingEvents = [];

    gameState.players.forEach(player => {
        const last = lastPlayerStats[player.id];
        const sameGameRound = !last || last.gameRound == null || currentGameRound == null || last.gameRound === currentGameRound;
        const shieldOutcome = player.lastShieldOutcome || null;
        const shouldAnimateShield = !!player.triggerShieldAnim;
        if (player.lastShieldOutcome !== undefined) delete player.lastShieldOutcome;
        if (player.triggerShieldAnim !== undefined) delete player.triggerShieldAnim;

        if (last && sameGameRound) {
            const gearDiff = player.gearCards - last.gearCards;

            // 1. 護盾變動 (防禦先消耗或重置)
            const currentShield = (typeof player.d6Die === 'number') ? player.d6Die : 0;
            const lastShield = (typeof last.d6Die === 'number') ? last.d6Die : 0;
            const shieldDiff = currentShield - lastShield;
            const isShieldBrokenReset = (shieldOutcome === 'broken') || (gearDiff < 0 && shieldDiff > 0);
            const isShieldBlocked = (shieldOutcome === 'blocked') || (shieldDiff < 0 && gearDiff === 0);

            if (isShieldBlocked) {
                const blockLabel = (window.i18n ? window.i18n.t('ui.combat_float.shield_block') : null) || '⛨ 護盾抵免!';
                const text = shieldDiff < 0 ? `${blockLabel} (${shieldDiff} ⛨)` : blockLabel;
                pendingEvents.push({
                    playerId: player.id,
                    text,
                    color: '#4cd137',
                    type: 'shield_block',
                    diff: 0,
                    animateShield: shouldAnimateShield || true
                });
            } else if (shieldDiff !== 0 && !isShieldBrokenReset) {
                const text = (shieldDiff > 0 ? '+' : '') + shieldDiff + ' ⛨';
                const color = shieldDiff > 0 ? '#4cd137' : '#e17055';
                pendingEvents.push({
                    playerId: player.id,
                    text,
                    color,
                    type: 'shield',
                    diff: shieldDiff,
                    animateShield: shouldAnimateShield
                });
            }

            // 2. 齒輪 (生命值) 變動
            if (gearDiff !== 0) {
                let text = (gearDiff > 0 ? '+' : '') + gearDiff + ' GP';
                let color = gearDiff > 0 ? '#00d2d3' : '#ff4757';
                if (gearDiff < 0) {
                    if (player.isEjected) {
                        text = (window.i18n ? window.i18n.t('ui.combat_float.ejected') : null) || '☠ 遭吞噬出局!';
                    } else if (gameState.gameMode === '3P' || gameState.sinTargetingMode === 'default') {
                        text = (window.i18n ? window.i18n.t('ui.combat_float.penalty_max') : null) || '-1 GP (最高刻度處決)';
                    } else if (gameState.sinTargetingMode === 'sin') {
                        text = (window.i18n ? window.i18n.t('ui.combat_float.penalty_sin') : null) || '-1 GP (時之惡侵蝕)';
                    }
                }
                pendingEvents.push({
                    playerId: player.id,
                    text,
                    color,
                    type: 'gear',
                    diff: gearDiff
                });
            }

            // 3. MP 變動
            const manaDiff = player.mana - last.mana;
            if (manaDiff !== 0) {
                // 若幼體時魔使用護盾抵免傷害 (mana 耗盡且開啟 shieldUsed)
                if (player.type === '時魔' && player.shieldUsed && !last.shieldUsed && manaDiff < 0 && gearDiff === 0) {
                    const text = (window.i18n ? window.i18n.t('ui.combat_float.shield_block') : null) || '⛨ 護盾抵免!';
                    pendingEvents.push({
                        playerId: player.id,
                        text,
                        color: '#4cd137',
                        type: 'shield',
                        diff: 0
                    });
                } else if (player.type === '時之惡' && manaDiff > 0 && gearDiff === 0) {
                    const tpl = window.i18n ? window.i18n.t('ui.combat_float.sin_recharge') : null;
                    const text = tpl ? tpl.replace('{diff}', manaDiff) : `+${manaDiff} MP (惡念充能)`;
                    pendingEvents.push({
                        playerId: player.id,
                        text,
                        color: '#a29bfe',
                        type: 'mana',
                        diff: manaDiff
                    });
                } else {
                    const text = (manaDiff > 0 ? '+' : '') + manaDiff + ' MP';
                    const color = manaDiff > 0 ? '#4cd137' : '#e17055';
                    pendingEvents.push({
                        playerId: player.id,
                        text,
                        color,
                        type: 'mana',
                        diff: manaDiff
                    });
                }
            }
        }

        // 更新記錄
        lastPlayerStats[player.id] = {
            mana: player.mana,
            gearCards: player.gearCards,
            d6Die: (typeof player.d6Die === 'number') ? player.d6Die : 0,
            shieldUsed: !!player.shieldUsed,
            currentClockPosition: player.currentClockPosition,
            gameRound: currentGameRound
        };
    });

    if (currentGameRound !== null) {
        lastStatsGameRound = currentGameRound;
    }

    if (pendingEvents.length === 0) return;

    // 依序或立即觸發特效
    pendingEvents.forEach(evt => {
        if (window.EffectQueue && window.EffectQueue.isEnabled()) {
            window.EffectQueue.enqueue(() => {
                triggerFloat(evt.playerId, evt.text, evt.color, evt.type, evt.diff);
            });
        } else {
            triggerFloat(evt.playerId, evt.text, evt.color, evt.type, evt.diff);
        }
    });
}

function triggerFloat(playerId, text, color, type, diff) {
    let targetEl = null;
    let cardEl = null;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : 'SM_1';

    // 僅 GP／護盾損失視為受擊；MP 花費與護盾抵免只顯示浮字，不觸發受擊特效
    const isDamageHit = type !== 'mana' && type !== 'shield_block' &&
        (diff < 0 || (typeof diff === 'undefined' && (color === '#ff4757' || color === '#e17055')));

    // 受到懲罰／扣除齒輪或護盾時觸發棋子受擊震動
    if (isDamageHit) {
        if (window.ModernBoard && typeof window.ModernBoard.shakeToken === 'function') {
            window.ModernBoard.shakeToken(playerId, true);
        }
        if (window.gameAudio && typeof window.gameAudio.playDamage === 'function') {
            window.gameAudio.playDamage();
        }
    } else if ((diff > 0 && type === 'mana') || type === 'shield_block') {
        if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
            window.gameAudio.playConfirm();
        }
    }

    if (playerId === humanId) {
        if (type === 'mana') {
            targetEl = document.getElementById('h-mana');
        } else if (type === 'shield' || type === 'shield_block') {
            targetEl = document.getElementById('h-dice') || document.querySelector('.human-top-bar .resource-chip--shield');
        } else {
            targetEl = document.getElementById('h-gear');
        }
        cardEl = document.querySelector('.human-top-bar') || document.getElementById('human-player-area');
        if (!targetEl) targetEl = cardEl;
    } else {
        cardEl = document.querySelector(`.player-card[data-id="${playerId}"]`);
        targetEl = cardEl;
    }

    // 受到懲罰／扣除齒輪或護盾時觸發卡片受擊震動動態與音效
    if (isDamageHit) {
        if (cardEl) {
            cardEl.classList.remove('card-damage-shake');
            void cardEl.offsetWidth; // 強制重排以重啟動畫
            cardEl.classList.add('card-damage-shake');
            setTimeout(() => {
                if (cardEl) cardEl.classList.remove('card-damage-shake');
            }, 450);
        }

        // 當玩家1齒輪 (GP) 被扣減時，觸發畫面晃動特效
        if (playerId === humanId && type === 'gear' && typeof diff === 'number' && diff < 0) {
            triggerScreenShake();
        }
    }

    // 優先以鐘面上實體角色棋子 (Token) 的螢幕座標作為浮動戰鬥文字起點
    let tokenScreenPos = null;
    if (window.ModernBoard && typeof window.ModernBoard.getTokenScreenPosition === 'function') {
        tokenScreenPos = window.ModernBoard.getTokenScreenPosition(playerId);
    }

    spawnFloatingText(targetEl, text, color, playerId, tokenScreenPos);
}

// 玩家1齒輪扣除畫面震動特效
function triggerScreenShake() {
    if (window.UI_CONFIG && (window.UI_CONFIG.SCREEN_SHAKE === false || window.UI_CONFIG.REDUCED_MOTION === true)) return;
    const body = document.body;
    if (!body) return;
    body.classList.remove('screen-damage-shake');
    void body.offsetWidth; // 強制重排以重新觸發動畫
    body.classList.add('screen-damage-shake');
    setTimeout(() => {
        body.classList.remove('screen-damage-shake');
    }, 450);
}

function spawnFloatingText(targetEl, text, color, playerId, customScreenPos) {
    let centerX = 0, topY = 0;
    if (customScreenPos && typeof customScreenPos.x === 'number' && typeof customScreenPos.y === 'number') {
        centerX = customScreenPos.x;
        topY = customScreenPos.y - 14;
    } else if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        topY = rect.top;
    } else {
        centerX = window.innerWidth / 2;
        topY = window.innerHeight / 2;
    }

    // 計算同一目標短時間內的錯位偏移，避免重疊
    const now = Date.now();
    const key = playerId || 'global';
    let offsetInfo = lastSpawnOffsets.get(key) || { time: 0, count: 0 };
    if (now - offsetInfo.time > 800) {
        offsetInfo = { time: now, count: 0 };
    } else {
        offsetInfo.count++;
        offsetInfo.time = now;
    }
    lastSpawnOffsets.set(key, offsetInfo);

    // 每連續疊加一個數字，Y 軸微幅上移 18px，X 軸微幅交錯 12px
    const offsetY = offsetInfo.count * -18;
    const offsetX = (offsetInfo.count % 2 === 1 ? 14 : (offsetInfo.count === 0 ? 0 : -14));

    const el = document.createElement('div');
    el.className = 'floating-text combat-float-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${centerX + offsetX}px`;
    el.style.top = `${topY + offsetY}px`;
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

if (typeof window !== 'undefined') {
    window.processFloatingText = processFloatingText;
    window.resetPlayerStatsTracking = resetPlayerStatsTracking;
    window.triggerFloat = triggerFloat;
    window.spawnFloatingText = spawnFloatingText;
    window.drawSinTargetLines = drawSinTargetLines;
}

function getUIDistance(pos1, pos2) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff);
}

