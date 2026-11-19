// ui_animations.js - 動畫排程器、視覺特效與動態演出

// ==========================================
// 角色首次進入鐘面：「漂移 (Drift)」與「逐字模糊浮現 (Blur In Letters)」
// ==========================================
function getRoleSoulImage(player) {
    if (!player) return 'assets/soul_demon.png';
    const rawRole = String(player.roleCard || player.type || '').toLowerCase();
    let key = 'demon';
    if (rawRole.includes('時針') || rawRole.includes('hour')) key = 'hour';
    else if (rawRole.includes('分針') || rawRole.includes('min')) key = 'min';
    else if (rawRole.includes('秒針') || rawRole.includes('sec')) key = 'sec';
    else if (rawRole.includes('時之惡') || rawRole.includes('sin')) key = 'sin';
    else if (rawRole.includes('受詛者') || rawRole.includes('scz')) key = 'scz';
    else if (rawRole.includes('時魔') || rawRole.includes('demon')) key = 'demon';

    return `assets/soul_${key}.png`;
}

/**
 * 取得角色在鐘面上的螢幕絕對像素座標 (支援 PixiJS 現代鐘面與經典 DOM 鐘面)
 */
function getPlayerClockScreenCoords(player) {
    if (!player || typeof player.currentClockPosition !== 'number') {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    // 1. 優先嘗試從現代 PixiJS 渲染器 (window.Board) 取得實體棋子節點的世界座標
    try {
        if (window.Board && window.Board.tokens && window.Board.tokens.has(player.id)) {
            const node = window.Board.tokens.get(player.id);
            if (node && node.c && window.Board.app && window.Board.app.view) {
                const rect = window.Board.app.view.getBoundingClientRect();
                const pt = node.c.toGlobal(new PIXI.Point(0, 0));
                if (typeof pt.x === 'number' && typeof pt.y === 'number' && !isNaN(pt.x) && !isNaN(pt.y)) {
                    return { x: rect.left + pt.x, y: rect.top + pt.y };
                }
            }
        }
    } catch (e) {
        // fallback to geometric calculation
    }

    // 2. 若 Board.tokens 尚未同步或節點未掛載，使用 Pixi 畫布極座標進行視口投射
    try {
        if (window.Board && typeof window.Board.polar === 'function' && window.Board.stage && window.Board.app && window.Board.app.view) {
            const TOKEN_R = 164; // 222 - 58
            const localPt = window.Board.polar(player.currentClockPosition, TOKEN_R);
            const rect = window.Board.app.view.getBoundingClientRect();
            const pt = window.Board.stage.toGlobal(new PIXI.Point(localPt.x, localPt.y));
            if (typeof pt.x === 'number' && typeof pt.y === 'number' && !isNaN(pt.x) && !isNaN(pt.y)) {
                return { x: rect.left + pt.x, y: rect.top + pt.y };
            }
        }
    } catch (e) {
        // fallback to DOM
    }

    // 3. 次選：經典 DOM 鐘面模式 (#clock-face)
    try {
        const clockFaceEl = document.getElementById('clock-face');
        if (clockFaceEl) {
            const rect = clockFaceEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const radius = rect.width * 0.38;
                const angleRad = ((player.currentClockPosition * 30 - 90) * Math.PI) / 180;
                return {
                    x: cx + radius * Math.cos(angleRad),
                    y: cy + radius * Math.sin(angleRad)
                };
            }
        }
    } catch (e) {
        // fallback to center
    }

    // 4. 兜底策略：螢幕中央
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * 全域動畫生命週期控制器 (AnimationController)
 * 封裝 GSAP Timeline、確定性回呼 (safeComplete)、中斷保護 (interrupt/abort) 與超時保險絲 (Watchdog)
 */
const AnimationController = {
    activeTimelines: new Set(),
    pendingTimers: new Set(),

    setTimeout(fn, delayMs) {
        const id = setTimeout(() => {
            this.pendingTimers.delete(id);
            try { fn(); } catch (err) { console.error('[AnimationController] Timer error:', err); }
        }, delayMs);
        this.pendingTimers.add(id);
        return id;
    },

    create(options = {}) {
        let resolved = false;
        let watchdogId = null;
        let tl = null;
        const internalTimers = [];

        const clearWatchdog = () => {
            if (watchdogId !== null) {
                clearTimeout(watchdogId);
                this.pendingTimers.delete(watchdogId);
                watchdogId = null;
            }
            while (internalTimers.length > 0) {
                const tid = internalTimers.pop();
                clearTimeout(tid);
                this.pendingTimers.delete(tid);
            }
        };

        const runCleanup = () => {
            clearWatchdog();
            if (tl) this.activeTimelines.delete(tl);
            if (typeof options.onCleanup === 'function') {
                try { options.onCleanup(); } catch (err) { console.error('[AnimationController] onCleanup error:', err); }
            }
        };

        const safeComplete = () => {
            if (resolved) return;
            resolved = true;
            runCleanup();
            if (typeof options.onComplete === 'function') {
                try { options.onComplete(); } catch (err) { console.error('[AnimationController] onComplete error:', err); }
            }
        };

        if (typeof window !== 'undefined' && window.gsap && typeof window.gsap.timeline === 'function') {
            const gsapOpts = { ...options };
            delete gsapOpts.watchdogMs;
            delete gsapOpts.onCleanup;
            gsapOpts.onComplete = safeComplete;
            tl = window.gsap.timeline(gsapOpts);
        } else {
            // 無 GSAP 環境（如 Node.js 無頭測試）相容降級時間線
            tl = {
                _cursor: 0,
                isPausedByUser: false,
                fromTo(targets, fromVars, toVars, pos) { return this; },
                to(targets, toVars, pos) { return this; },
                set(targets, vars, pos) { return this; },
                call(fn, params, pos) {
                    const sec = typeof pos === 'number' ? pos : this._cursor;
                    if (sec > this._cursor) this._cursor = sec;
                    const tid = setTimeout(() => {
                        if (!resolved && typeof fn === 'function') {
                            try { fn.apply(null, params || []); } catch (e) {}
                        }
                    }, Math.max(0, Math.round(sec * 1000)));
                    internalTimers.push(tid);
                    AnimationController.pendingTimers.add(tid);
                    return this;
                },
                progress(v) {
                    if (v === 1) safeComplete();
                    return this;
                },
                kill() {
                    clearWatchdog();
                },
                isActive() { return !resolved; },
                pause() { return this; },
                resume() { return this; },
                play() { return this; },
                time() { return 0; },
                seek() { return this; }
            };
        }

        // 擴充確定性中斷（觸發清理與 onComplete，推進遊戲階段）
        tl.interrupt = () => {
            if (resolved) return;
            try { if (typeof tl.kill === 'function') tl.kill(); } catch (_) {}
            safeComplete();
        };

        // 擴充強制終止（僅執行 DOM 清理，不觸發舊局的 onComplete 業務回呼）
        tl.abort = () => {
            if (resolved) return;
            resolved = true;
            try { if (typeof tl.kill === 'function') tl.kill(); } catch (_) {}
            runCleanup();
        };

        this.activeTimelines.add(tl);

        // 掛載超時保險絲 (Watchdog Timeout)：防止未預期腳本錯誤導致動畫永久卡死
        if (typeof options.watchdogMs === 'number' && options.watchdogMs > 0) {
            const startWatchdog = () => {
                watchdogId = setTimeout(() => {
                    this.pendingTimers.delete(watchdogId);
                    watchdogId = null;
                    if (!resolved) {
                        if (tl.isPausedByUser) {
                            // 若使用者正在暫停狀態（在收集/設定/規則頁），重新掛載保險絲等待，不強制終止演出
                            startWatchdog();
                            return;
                        }
                        console.warn('[AnimationController] Watchdog triggered, forcing safeComplete.');
                        tl.interrupt();
                    }
                }, options.watchdogMs);
                this.pendingTimers.add(watchdogId);
            };
            startWatchdog();
        }

        return tl;
    },

    // 暫停所有活動中的時間線（玩家打開收集視窗或轉到設定/規則頁時）
    pauseAll() {
        const list = Array.from(this.activeTimelines);
        list.forEach(tl => {
            if (tl) {
                tl.isPausedByUser = true;
                if (typeof tl.pause === 'function') {
                    tl.pause();
                }
            }
        });
    },

    // 恢復並重新開始倒數（玩家返回遊戲頁面時）
    resumeAll() {
        const list = Array.from(this.activeTimelines);
        list.forEach(tl => {
            if (tl) {
                tl.isPausedByUser = false;
                // 若進度已進入比牌 5 秒倒數區間 (>= 4.25s)，倒帶至 4.25s 重新開始 5 秒倒數
                if (typeof tl.time === 'function' && typeof tl.seek === 'function') {
                    try {
                        if (tl.time() >= 4.25) {
                            tl.seek(4.25);
                        }
                    } catch (_) {}
                }
                if (typeof tl.resume === 'function') {
                    tl.resume();
                } else if (typeof tl.play === 'function') {
                    tl.play();
                }
            }
        });
    },

    // 快進跳過所有活動中的劇情演出（觸發各自的 safeComplete）
    skipAll() {
        if (typeof EffectQueue !== 'undefined' && typeof EffectQueue.skipAll === 'function') {
            EffectQueue.skipAll();
        }
        const list = Array.from(this.activeTimelines);
        list.forEach(tl => {
            if (tl && typeof tl.interrupt === 'function') tl.interrupt();
        });
        this.activeTimelines.clear();
    },

    // 強制銷毀所有活動中的動畫與等待計時器（換局或重新開始時呼叫）
    killAll() {
        if (typeof EffectQueue !== 'undefined' && typeof EffectQueue.clear === 'function') {
            EffectQueue.clear();
        }
        this.pendingTimers.forEach(id => clearTimeout(id));
        this.pendingTimers.clear();
        const list = Array.from(this.activeTimelines);
        list.forEach(tl => {
            if (tl && typeof tl.abort === 'function') tl.abort();
        });
        this.activeTimelines.clear();

        if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
            const clashOverlay = document.getElementById('minute-clash-overlay');
            if (clashOverlay && clashOverlay.classList) {
                clashOverlay.classList.add('hidden');
                clashOverlay.classList.remove('is-leaving');
                clashOverlay.innerHTML = '';
            }
            const blurOverlay = document.getElementById('clock-blur-in-overlay');
            if (blurOverlay) blurOverlay.innerHTML = '';
        }
    }
};

/**
 * 全域特效序列佇列管理器 (EffectQueue)
 * 解決多個玩家數值變動浮字、受傷震動、鐘面角色落位同時爆發堆疊的問題
 * 依序逐一（Sequential）執行各項演出，支援靈活間隔（預設 260ms）與跳過
 */
const EffectQueue = {
    queue: [],
    isRunning: false,
    timerId: null,

    isEnabled() {
        if (typeof window !== 'undefined' && window.UI_CONFIG && typeof window.UI_CONFIG.SEQUENTIAL_EFFECTS === 'boolean') {
            return window.UI_CONFIG.SEQUENTIAL_EFFECTS;
        }
        return true;
    },

    getIntervalMs() {
        if (typeof window !== 'undefined' && window.UI_CONFIG && typeof window.UI_CONFIG.EFFECT_INTERVAL_MS === 'number') {
            return window.UI_CONFIG.EFFECT_INTERVAL_MS;
        }
        return 260; // 預設 260ms (輕快節奏)
    },

    /**
     * 加入一項特效至佇列
     * @param {Function} effectFn 特效執行動態函式
     * @param {Object} [options] { delayAfter, onComplete, id }
     */
    enqueue(effectFn, options = {}) {
        if (typeof effectFn !== 'function') return;

        // 若使用者關閉依序播放開關，直接立即同步執行（回退為原本的立即齊發模式）
        if (!this.isEnabled()) {
            try { effectFn(); } catch (e) { console.error('[EffectQueue] effect execution error:', e); }
            if (typeof options.onComplete === 'function') {
                try { options.onComplete(); } catch (_) {}
            }
            return;
        }

        const delay = (typeof options.delayAfter === 'number') ? options.delayAfter : this.getIntervalMs();
        this.queue.push({
            fn: effectFn,
            delayAfter: delay,
            onComplete: options.onComplete,
            id: options.id || null
        });

        if (!this.isRunning) {
            this.processNext();
        }
    },

    processNext() {
        if (this.queue.length === 0) {
            this.isRunning = false;
            return;
        }

        this.isRunning = true;
        const item = this.queue.shift();

        try {
            item.fn();
        } catch (err) {
            console.error('[EffectQueue] Error running effect item:', err);
        }

        if (typeof item.onComplete === 'function') {
            try { item.onComplete(); } catch (_) {}
        }

        const delay = Math.max(0, item.delayAfter);
        this.timerId = setTimeout(() => {
            this.timerId = null;
            this.processNext();
        }, delay);

        if (typeof AnimationController !== 'undefined' && AnimationController.pendingTimers) {
            AnimationController.pendingTimers.add(this.timerId);
        }
    },

    skipAll() {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            try { item.fn(); } catch (_) {}
            if (typeof item.onComplete === 'function') {
                try { item.onComplete(); } catch (_) {}
            }
        }
        this.isRunning = false;
    },

    clear() {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.queue = [];
        this.isRunning = false;
    }
};

if (typeof window !== 'undefined') {
    window.AnimationController = AnimationController;
    window.EffectQueue = EffectQueue;
}

function triggerClockBlurInEffect(player) {
    if (!player) return;

    let overlay = document.getElementById('clock-blur-in-overlay') || document.getElementById('clock-drift-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'clock-blur-in-overlay';
        overlay.className = 'clock-blur-in-overlay';
        document.body.appendChild(overlay);
    }

    // 取得角色在鐘面刻度的精確螢幕座標（支援 PixiJS 世界座標與 DOM 幾何換算）
    const coords = getPlayerClockScreenCoords(player);

    const rawRole = player.roleCard || player.type;
    const roleKey = (rawRole && String(rawRole).includes('時魔')) ? '時魔' : rawRole;
    // 嚴格依照網站既有主題色與風格搭配，不另外指定顏色
    const glowColor = (window.UI_CONFIG?.ROLE_COLORS && window.UI_CONFIG.ROLE_COLORS[roleKey]) || '#ffd27f';
    const localizedRole = window.i18n ? window.i18n.getRoleName(rawRole) : rawRole;
    const soulImg = getRoleSoulImage(player);

    const itemEl = document.createElement('div');
    itemEl.className = 'clock-blur-in-item';
    itemEl.style.left = `${coords.x}px`;
    itemEl.style.top = `${coords.y}px`;
    itemEl.style.setProperty('--drift-glow', glowColor);

    // 1. 光環靈魂徽記（依網站既有暗金、暗夜藍與角色專屬主題色光暈）
    const emblemEl = document.createElement('div');
    emblemEl.className = 'clock-blur-in-emblem';
    const avatarEl = document.createElement('img');
    avatarEl.className = 'clock-blur-in-avatar';
    avatarEl.src = soulImg;
    avatarEl.alt = localizedRole;
    emblemEl.appendChild(avatarEl);
    itemEl.appendChild(emblemEl);

    // 2. 逐字模糊浮現標題 (Blur In Letters)
    const titleEl = document.createElement('div');
    titleEl.className = 'clock-blur-in-title';
    titleEl.style.borderColor = `${glowColor}50`;

    // 拆分個別字元為 span，供 GSAP 進行依序（stagger）模糊落位
    const textChars = localizedRole.split('');
    const letterEls = textChars.map(char => {
        const span = document.createElement('span');
        span.className = 'blur-letter';
        span.textContent = char;
        titleEl.appendChild(span);
        return span;
    });
    itemEl.appendChild(titleEl);
    overlay.appendChild(itemEl);

    // 3. GSAP 模糊浮現（Blur In Letters）動態效果（納管於 AnimationController）：
    const cleanupItem = () => {
        if (itemEl.parentNode) itemEl.remove();
    };

    if (window.gsap) {
        const tl = AnimationController.create({
            watchdogMs: 3800,
            onCleanup: cleanupItem
        });

        // (1) 徽記率先由「模糊(blur: 10px)、透明(opacity: 0)、略大(scale: 1.15)、略低(y: 12px)」清楚落到位
        tl.fromTo(emblemEl,
            { opacity: 0, filter: 'blur(10px)', y: 12, scale: 1.15 },
            { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1, duration: 0.55, ease: 'power2.out' },
            0
        );

        // (2) 標題字元依序（stagger: 0.07）由「模糊(blur: 10px)、透明(opacity: 0)、略大(scale: 1.15)、略低(y: .25em)」
        // 變成清楚並落到位
        if (letterEls.length > 0) {
            tl.fromTo(letterEls,
                { opacity: 0, filter: 'blur(10px)', y: '.25em', scale: 1.15 },
                { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1, duration: 0.65, ease: 'power2.out', stagger: 0.07 },
                0.05
            );
        }

        // (3) 定位清楚停留展示約 1.4 秒後，柔和模糊淡出退場
        tl.to([emblemEl, titleEl],
            { opacity: 0, filter: 'blur(8px)', duration: 0.45, ease: 'power2.in' },
            '+=1.4'
        );
    } else {
        itemEl.style.opacity = '1';
        AnimationController.setTimeout(cleanupItem, 2200);
    }
}

function checkAndTriggerClockBlurIn(gameState) {
    if (!gameState || !Array.isArray(gameState.players)) return;
    const newlyEntered = [];
    gameState.players.forEach(p => {
        if (typeof p.currentClockPosition === 'number' && !p.isEjected) {
            if (!trackedEnteredClockPlayerIds.has(p.id)) {
                trackedEnteredClockPlayerIds.add(p.id);
                newlyEntered.push(p);
            }
        }
    });

    if (newlyEntered.length > 0) {
        if (typeof EffectQueue !== 'undefined' && EffectQueue.isEnabled()) {
            newlyEntered.forEach(p => {
                EffectQueue.enqueue(() => {
                    triggerClockBlurInEffect(p);
                }, { delayAfter: EffectQueue.getIntervalMs() });
            });
        } else {
            // 多位角色依序（stagger: 240ms）各自在所屬刻度上模糊浮現落位
            newlyEntered.forEach((p, idx) => {
                AnimationController.setTimeout(() => {
                    triggerClockBlurInEffect(p);
                }, idx * 240);
            });
        }
    }
}

// 暴露 API 並相容舊函式名稱
window.triggerClockBlurInEffect = triggerClockBlurInEffect;
window.checkAndTriggerClockBlurIn = checkAndTriggerClockBlurIn;
window.triggerClockDriftEffect = triggerClockBlurInEffect;
window.checkAndTriggerClockDrift = checkAndTriggerClockBlurIn;

// --- 小時卡被挑選時「粒子消散（Disintegrate）」動態效果 ---
// 小時卡被挑選時不立即消失，而是快速變得模糊往右上飄散並淡出，同時周圍冒出許多小方塊粒子往外飄走。
// 配色依網站既有主題色（金色、古銅金、琥珀金、星芒金）自行搭配。
window.playHourCardDisintegrateAnimation = function (target, onComplete) {
    if (typeof onComplete === 'function') onComplete();
};

// --- 分鐘卡比大小與次序排列（Minute Clash）動態演出（由 AnimationController 統一納管）---
// 階段 1 (0.00s ~ 0.75s)：[集結] 各玩家蓋牌匯聚於鐘面中央（卡牌集合後停留 0.75 秒，減少一半節奏更明快）
// 階段 2 (0.75s ~ 2.25s)：全體 3D 翻牌揭曉分鐘數值與齒輪數（停留 1.5 秒看清點數）
// 階段 3 (2.25s ~ 4.25s)：依數值由大到小執行交錯換位並浮現 1st~5th 次序（1.4s 弧線換位 + 徽章彈出）
// 4.25s ~ 9.25s：次序確立，常駐展示並啟動 5 秒倒數計時（點擊畫面任意處亦可提前跳過退場）
window.playMinuteClashAnimation = function (gameState, preSortChoices, sortedChoices, onComplete) {
    const overlay = document.getElementById('minute-clash-overlay');
    if (!overlay || !Array.isArray(sortedChoices) || sortedChoices.length === 0) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
        ? window.getEffectiveHumanPlayerId()
        : 'SM_1';

    const rankLabels = ['1st', '2nd', '3rd', '4th', '5th'];
    let finished = false;
    let clashTl = null;

    const cleanupDismissListener = () => {
        window.removeEventListener('pointerdown', onGlobalPointerDown, true);
        window.removeEventListener('keydown', onGlobalKeyDown, true);
        overlay.onclick = null;
    };

    const cleanupOverlayDom = () => {
        cleanupDismissListener();
        overlay.classList.add('hidden');
        overlay.classList.remove('is-leaving');
        overlay.innerHTML = '';
    };

    const finishNow = () => {
        if (finished) return;
        finished = true;
        cleanupDismissListener();
        overlay.classList.add('is-leaving');
        AnimationController.setTimeout(() => {
            if (clashTl && typeof clashTl.interrupt === 'function') {
                clashTl.interrupt();
            } else {
                cleanupOverlayDom();
                if (typeof onComplete === 'function') onComplete();
            }
        }, 220);
    };

    // 玩家點擊畫面任意處才退場（延遲 180ms 綁定，避免剛放開出牌滑鼠時立即誤觸關閉）
    const onGlobalPointerDown = (e) => {
        if (finished) return;
        if (e && e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('#settings-modal, #rules-modal, #top-settings-btn')) return;
        }
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        finishNow();
    };

    const onGlobalKeyDown = (e) => {
        if (finished) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            finishNow();
        }
    };

    // 建立舞台 DOM（初始按未排序的座位順序 preSortChoices 排列）
    const initialList = (Array.isArray(preSortChoices) && preSortChoices.length === sortedChoices.length)
        ? preSortChoices
        : sortedChoices;

    const banner = document.createElement('div');
    banner.className = 'minute-clash-banner';

    const titleEl = document.createElement('div');
    titleEl.className = 'minute-clash-title';
    titleEl.textContent = window.i18n ? window.i18n.t('ui.clash.gathering') : '⧖ 各玩家已蓋牌集結，準備翻牌…';
    banner.appendChild(titleEl);

    const rowEl = document.createElement('div');
    rowEl.className = 'minute-clash-row';

    const slotMap = new Map();
    const slotEls = [];
    const youTag = window.i18n ? window.i18n.t('ui.labels.you_tag').replace('★', '') : '你';

    initialList.forEach(item => {
        const playerObj = (gameState.players || []).find(p => p.id === item.playerId);
        const roleName = playerObj ? playerObj.roleCard : (item.roleType || '時魔');
        const roleKey = (roleName && String(roleName).includes('時魔')) ? '時魔' : roleName;
        const color = ROLE_COLORS[roleKey] || '#ffd27f';
        const isHuman = item.playerId === humanId;
        const val = item.card && typeof item.card.value === 'number' ? item.card.value : '?';
        const gear = item.card && typeof item.card.gear === 'number' ? item.card.gear : 1;

        const slot = document.createElement('div');
        slot.className = 'clash-card-slot' + (isHuman ? ' is-human' : '');
        slot.dataset.playerId = item.playerId;
        slot.style.setProperty('--role-color', color);

        const rankIdx = sortedChoices.findIndex(s => s.playerId === item.playerId);
        const rankText = rankLabels[rankIdx] || `#${rankIdx + 1}`;

        slot.innerHTML = `
            <div class="clash-rank-badge">${rankText}</div>
            <div class="clash-card-3d">
                <div class="clash-card-face clash-card-back">✦</div>
                <div class="clash-card-face clash-card-front">
                    <div class="clash-card-val">${val}</div>
                    <div class="clash-card-gear">${gear} GP</div>
                </div>
            </div>
            <div class="clash-player-tag">${item.playerName}${isHuman ? `<span class="clash-you-badge">${youTag}</span>` : ''}</div>
        `;

        rowEl.appendChild(slot);
        slotMap.set(item.playerId, slot);
        slotEls.push(slot);
    });

    const footerEl = document.createElement('div');
    footerEl.className = 'minute-clash-footer';
    footerEl.textContent = window.i18n ? window.i18n.t('ui.hints.comparing_minute_skip') : '比較分鐘數值中…（點擊畫面可提前跳過）';

    banner.appendChild(rowEl);
    banner.appendChild(footerEl);
    overlay.innerHTML = '';
    overlay.appendChild(banner);
    overlay.classList.remove('hidden', 'is-leaving');

    // 建立受控 GSAP Timeline（預設 5s 演出 + 5s 倒數 = 10s，外加 11.5s Watchdog 超時保護）
    clashTl = AnimationController.create({
        watchdogMs: 11500,
        onCleanup: cleanupOverlayDom,
        onComplete: () => {
            if (typeof onComplete === 'function') onComplete();
        }
    });

    // 階段 1 (0.00s ~ 0.75s)：[集結] 各玩家蓋牌匯聚於鐘面中央（為聯網對戰預留出牌同步緩衝，停留 1.5 秒）
    clashTl.fromTo(banner,
        { opacity: 0, y: 12, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'power2.out' },
        0
    );
    clashTl.fromTo(slotEls,
        { opacity: 0, y: 12, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, stagger: 0.05, ease: 'power2.out' },
        0.04
    );

    clashTl.call(() => {
        if (finished) return;
        window.addEventListener('pointerdown', onGlobalPointerDown, true);
        window.addEventListener('keydown', onGlobalKeyDown, true);
        overlay.onclick = () => finishNow();
    }, null, 0.18);

    // 階段 2 (0.75s ~ 2.25s)：全體卡牌一同 3D 翻牌揭曉數值與齒輪數（停留 1.5 秒看清點數）
    clashTl.call(() => {
        if (finished) return;
        titleEl.textContent = window.i18n ? window.i18n.t('ui.clash.revealing') : '◈ 揭曉各玩家打出的分鐘卡…';
        initialList.forEach(item => {
            const slot = slotMap.get(item.playerId);
            if (slot) slot.classList.add('is-flipped');
        });
        if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
            window.gameAudio.playClick();
        }
    }, null, 0.75);

    // 階段 3 (2.25s ~ 4.25s)：比較數值大小，執行 FLIP 動態交錯換位並全體浮現 1st ~ 5th 名次
    clashTl.call(() => {
        if (finished) return;
        titleEl.textContent = window.i18n ? window.i18n.t('ui.clash.comparing') : '◆ 比較分鐘數值大小，排列行動次序…';

        // Step A (First)：記錄換位前每個 slot 的水平座標
        const firstRects = new Map();
        slotMap.forEach((slot, pid) => {
            if (typeof slot.getBoundingClientRect === 'function') {
                firstRects.set(pid, slot.getBoundingClientRect());
            }
        });

        // Step B (Last)：將 DOM 節點依照由大到小（sortedChoices）重新掛載
        sortedChoices.forEach(item => {
            const slot = slotMap.get(item.playerId);
            if (slot) rowEl.appendChild(slot);
        });

        // Step C (Invert & Play)：計算位移差並以 1.4 秒曲線動畫優雅滑入新名次位置
        sortedChoices.forEach((item) => {
            const slot = slotMap.get(item.playerId);
            const first = firstRects.get(item.playerId);
            if (!slot || !first || typeof slot.getBoundingClientRect !== 'function') return;
            const last = slot.getBoundingClientRect();
            const dx = first.left - last.left;

            if (Math.abs(dx) > 1) {
                const arcY = dx > 0 ? -18 : 14;
                if (window.gsap && typeof window.gsap.fromTo === 'function') {
                    window.gsap.fromTo(slot,
                        { x: dx, y: arcY },
                        { x: 0, y: 0, duration: 1.4, ease: 'power3.out', clearProps: 'transform' }
                    );
                } else {
                    slot.style.transition = 'none';
                    slot.style.transform = `translate3d(${dx}px, ${arcY}px, 0)`;
                    void slot.offsetWidth;
                    slot.style.transition = 'transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)';
                    slot.style.transform = 'translate3d(0, 0, 0)';
                }
            }
        });

        if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
            window.gameAudio.playConfirm();
        }
    }, null, 2.25);

    // 3.55s：換位滑行接近定點，全體次序標章（1st, 2nd, 3rd...）一同彈出顯示
    clashTl.call(() => {
        if (finished) return;
        sortedChoices.forEach(item => {
            const slot = slotMap.get(item.playerId);
            if (slot) slot.classList.add('show-rank');
        });
    }, null, 3.55);

    // 4.25s ~ 9.25s：預設播放 5 秒後全數結束，次序正式確立，啟動 5 秒倒數計時自動關閉
    const setCountdownLabel = (sec) => {
        if (finished) return;
        titleEl.textContent = window.i18n ? window.i18n.t('ui.clash.resolved') : '✦ 分鐘卡大小次序已確定！';
        footerEl.classList.add('is-ready-prompt');
        footerEl.textContent = window.i18n
            ? window.i18n.t('ui.clash.continue_prompt', { sec })
            : `▲ 點擊畫面任意處繼續（${sec}s 後自動進入挑選小時卡）`;
    };

    for (let s = 5; s >= 1; s--) {
        clashTl.call(() => setCountdownLabel(s), null, 4.25 + (5 - s));
    }

    clashTl.call(() => {
        finishNow();
    }, null, 9.25);
};

// --- 分鐘手牌初次配置「發牌進入手牌區」動態觸發函式 ---
window.playCardDealAnimation = function (onComplete) {
    const gs = window.globalGameState;
    if (gs) {
        gs.needsHandDealAnimation = true;
        if (typeof updateUI === 'function') updateUI(gs);
    }
    if (typeof onComplete === 'function') onComplete();
};

