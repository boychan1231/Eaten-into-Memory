import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 3：新手教學系統行為測試 (Node.js vm Mock DOM)
// =========================================================
export async function stage3TutorialBehaviorTest() {
    function makeClassList() {
        const set = new Set();
        return {
            add: (...cls) => cls.forEach(c => set.add(c)),
            remove: (...cls) => cls.forEach(c => set.delete(c)),
            contains: (c) => set.has(c),
            toggle: (c, force) => (force === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (force ? set.add(c) : set.delete(c)))
        };
    }

    function makeEl(id, selectorMatches = []) {
        const listeners = {};
        const el = {
            id,
            nodeType: 1,
            className: '',
            classList: makeClassList(),
            style: { setProperty: () => {} },
            innerHTML: '',
            textContent: '',
            disabled: false,
            checked: true,
            open: false,
            offsetWidth: 320,
            _listeners: listeners,
            setAttribute: () => {},
            getBoundingClientRect: () => ({ width: 200, height: 100, left: 100, top: 100, right: 300, bottom: 200 }),
            getClientRects: () => [{}],
            addEventListener: (ev, fn) => {
                listeners[ev] = listeners[ev] || [];
                listeners[ev].push(fn);
            },
            dispatchEvent: (e) => {
                (listeners[e.type] || []).forEach(fn => fn(e));
            },
            closest: (sel) => (selectorMatches.some(m => sel.includes(m)) ? el : null),
            appendChild: () => {}
        };
        return el;
    }

    const els = {
        'tutorial-pointer-tooltip': makeEl('tutorial-pointer-tooltip'),
        'tutorial-tooltip-text': makeEl('tutorial-tooltip-text'),
        'tutorial-prev-btn': makeEl('tutorial-prev-btn', ['#tutorial-prev-btn']),
        'tutorial-next-btn': makeEl('tutorial-next-btn', ['#tutorial-next-btn']),
        'tutorial-history-status': makeEl('tutorial-history-status'),
        'tutorial-close-btn': makeEl('tutorial-close-btn', ['#tutorial-close-btn']),
        'tutorial-mute-btn': makeEl('tutorial-mute-btn', ['#tutorial-mute-btn']),
        'tutorial-toggle': makeEl('tutorial-toggle'),
        'intro-tutorial-chk': makeEl('intro-tutorial-chk'),
        'human-role-display': makeEl('human-role-display'),
        'btn-replay-tutorial': makeEl('btn-replay-tutorial', ['#btn-replay-tutorial']),
        'next-step-btn': makeEl('next-step-btn'),
        'human-hand': makeEl('human-hand'),
        'confirm-move-btn': makeEl('confirm-move-btn'),
        'clock-face': makeEl('clock-face'),
        'evo-panel-details': makeEl('evo-panel-details'),
        'evolution-progress-area': makeEl('evolution-progress-area'),
        'tutorial-bounce-arrow': makeEl('tutorial-bounce-arrow'),
        'modern-intro-overlay': makeEl('modern-intro-overlay'),
        'evo-btn': makeEl('evo-btn')
    };
    els['tutorial-pointer-tooltip'].classList.add('hidden');
    els['tutorial-bounce-arrow'].classList.add('hidden');
    els['modern-intro-overlay'].style.display = 'flex';

    const docListeners = { click: [], DOMContentLoaded: [] };
    const winListeners = { resize: [] };

    const documentMock = {
        body: makeEl('body'),
        getElementById: (id) => els[id] || null,
        querySelector: (sel) => {
            if (sel === '#evolution-progress-area .evo-btn') return els['evo-btn'];
            if (sel.startsWith('#')) return els[sel.slice(1)] || null;
            return null;
        },
        querySelectorAll: () => [],
        createElement: (tag) => makeEl(tag),
        addEventListener: (ev, fn, cap) => {
            docListeners[ev] = docListeners[ev] || [];
            docListeners[ev].push({ fn, cap: !!cap });
        },
        removeEventListener: (ev, fn, cap) => {
            if (!docListeners[ev]) return;
            docListeners[ev] = docListeners[ev].filter(x => x.fn !== fn || x.cap !== !!cap);
        }
    };

    const windowMock = {
        innerWidth: 1280,
        innerHeight: 800,
        _humanId: 'SM_1',
        getComputedStyle: (el) => ({ display: el.style.display || 'block' }),
        addEventListener: (ev, fn) => {
            winListeners[ev] = winListeners[ev] || [];
            winListeners[ev].push(fn);
        },
        ModernIntro: { state: 'SWINGING' },
        appLogger: { log: () => {} },
        localStorage: { getItem: () => 'zh-TW', setItem: () => {} },
        AutoNextRoundTimer: {
            isPaused: false,
            pause: () => { windowMock.AutoNextRoundTimer.isPaused = true; },
            resume: () => { windowMock.AutoNextRoundTimer.isPaused = false; },
            stop: () => { windowMock.AutoNextRoundTimer.isPaused = false; }
        },
        getEffectiveHumanPlayerId: () => windowMock._humanId
    };
    windowMock.window = windowMock;
    windowMock.document = documentMock;

    const ctx = {
        window: windowMock,
        document: documentMock,
        localStorage: windowMock.localStorage,
        console: { log: console.log, warn: () => {}, error: console.error },
        setTimeout,
        clearTimeout,
        appLogger: windowMock.appLogger,
        uiState: { selectedCardValue: null, isSecondHandSelectingTwo: false, selectedCardValues: [] },
        checkAndLockPreciousCards: () => {},
        getEffectiveHumanPlayerId: () => windowMock.getEffectiveHumanPlayerId(),
        HTMLElement: function () {}
    };
    vm.createContext(ctx);
    for (const rel of ['locales/zh-TW.js', 'locales/en-US.js', 'js/core/i18n.js', 'js/core/config.js', 'js/core/abilities.js', 'js/ui/tutorial_mode.js']) {
        vm.runInContext(readProjectFile(rel), ctx);
    }
    ctx.GAME_CONFIG = windowMock.GAME_CONFIG;
    ctx.GAME_DATA = windowMock.GAME_DATA;
    ctx.i18n = windowMock.i18n;
    windowMock.i18n.setLanguage('zh-TW');
    docListeners.DOMContentLoaded.forEach(x => x.fn());

    const TM = windowMock.TutorialModeManager;
    const tooltipEl = els['tutorial-pointer-tooltip'];
    const textEl = els['tutorial-tooltip-text'];
    const bounceArrowEl = els['tutorial-bounce-arrow'];
    const nextStepBtn = els['next-step-btn'];

    // 1. 進場動畫尚未完成時不顯示，且不消耗歡迎詞配額；完成後連續兩次 updateUI 皆穩定保留且只有單一箭頭
    const gs1 = {
        gameMode: '5P',
        gameRound: 1,
        roundMarker: 1,
        phase: 'idle',
        gameEnded: false,
        currentRoundAIChoices: null,
        currentDrawnHourCards: [],
        hourPickOrder: [],
        players: [{ id: 'SM_1', name: 'SM_1', type: '時魔', roleCard: '時魔幼體 1', isHuman: true, mana: 3, hand: [{ value: 10 }] }]
    };
    windowMock.globalGameState = gs1;
    TM.resetTutorialProgress();
    TM.updateTutorialPointers(gs1);
    assert.equal(tooltipEl.classList.contains('hidden'), true, '開場動畫期間氣泡應保持隱藏');

    windowMock.ModernIntro.state = 'DONE';
    els['modern-intro-overlay'].style.display = 'none';
    TM.updateTutorialPointers(gs1);
    assert.equal(tooltipEl.classList.contains('hidden'), false, '動畫完成後歡迎詞應顯示');
    assert(textEl.innerHTML.includes('歡迎來到《Eaten into Memory》'), '應包含歡迎詞');
    assert.equal(bounceArrowEl.classList.contains('hidden'), false, '唯一跳動箭頭應顯示');
    assert.equal(nextStepBtn.classList.contains('tutorial-welcome-arrow'), false, '不應套用重複的 tutorial-welcome-arrow');

    TM.updateTutorialPointers(gs1);
    assert.equal(tooltipEl.classList.contains('hidden'), false, '連續第二次呼叫後歡迎詞必須繼續保留');
    assert(textEl.innerHTML.includes('歡迎來到《Eaten into Memory》'), '連續呼叫後歡迎詞內容必須保持');

    // 關閉、重播、開關切換、resize 皆不重複彈出歡迎詞
    els['tutorial-close-btn'].dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.equal(tooltipEl.classList.contains('hidden'), true, '按關閉應隱藏氣泡');
    TM.updateTutorialPointers(gs1);
    assert.equal(tooltipEl.classList.contains('hidden'), true, '關閉後不應自動重彈歡迎詞');

    TM.replayCurrentTutorial(gs1);
    assert(!textEl.innerHTML.includes('歡迎來到《Eaten into Memory》'), '重播提示不應重複出現歡迎詞');
    assert(textEl.innerHTML.includes('展開第一回合競標'), '重播提示應顯示操作指引');

    const beforeResize = textEl.innerHTML;
    winListeners.resize.forEach(fn => fn());
    assert.equal(textEl.innerHTML, beforeResize, 'resize 不應改動或重觸發歡迎詞');

    els['tutorial-toggle'].checked = true;
    els['tutorial-toggle'].dispatchEvent({ type: 'change', target: els['tutorial-toggle'] });
    TM.updateTutorialPointers(gs1);
    assert(!textEl.innerHTML.includes('歡迎來到《Eaten into Memory》'), '同局切換教學開關不應重現歡迎詞');

    // 2. 第 1 回合選牌再取消選牌，應維持步驟 1 不穿透
    gs1.currentRoundAIChoices = {};
    gs1.currentDrawnHourCards = [{ number: 5 }, { number: 8 }];
    TM.updateTutorialPointers(gs1);
    assert(textEl.innerHTML.includes('步驟 1：挑選一張分鐘卡出牌'), '應進入步驟 1 出牌教學');
    ctx.uiState.selectedCardValue = 10;
    TM.updateTutorialPointers(gs1);
    assert(textEl.innerHTML.includes('確認出牌'), '選牌後應顯示確認出牌指引');
    ctx.uiState.selectedCardValue = null;
    TM.updateTutorialPointers(gs1);
    assert(textEl.innerHTML.includes('步驟 1：挑選一張分鐘卡出牌'), '取消選牌後應回到步驟 1');
    assert.equal(TM.isAwaitingClickAck(), false, '取消選牌不應誤觸發點擊鎖定');

    // 3. 無須挑選小時卡點擊任意處放行鎖 + AutoNextRoundTimer 暫停與恢復
    gs1.currentRoundAIChoices = null;
    gs1.hourPickOrder = [{ playerId: 'AI_1' }, { playerId: 'AI_2' }];
    gs1.nextHourPickerIndex = 0;
    TM.updateTutorialPointers(gs1);
    assert(textEl.innerHTML.includes('戰術提醒：無須挑選小時卡'), '應顯示無須挑選小時卡');
    assert(textEl.innerHTML.includes('點擊畫面任意處繼續下一條教學'), '應包含點擊繼續提示');
    assert.equal(TM.isAwaitingClickAck(), true, '應進入等待點擊確認鎖定');
    assert.equal(windowMock.AutoNextRoundTimer.isPaused, true, '鎖定期間應暫停自動倒數');

    await new Promise(r => setTimeout(r, 15));
    gs1.hourPickOrder = [];
    gs1.currentDrawnHourCards = [];
    TM.updateTutorialPointers(gs1);
    assert(textEl.innerHTML.includes('戰術提醒：無須挑選小時卡'), '未點擊前不得被後續更新覆寫');

    docListeners.click.filter(x => x.cap).forEach(x => x.fn({ target: els['tutorial-prev-btn'] }));
    assert.equal(TM.isAwaitingClickAck(), true, '點擊歷史導覽按鈕應保持鎖定');

    docListeners.click.filter(x => x.cap).forEach(x => x.fn({ target: documentMock.body }));
    await new Promise(r => setTimeout(r, 15));
    assert.equal(TM.isAwaitingClickAck(), false, '點擊任意處應立即解鎖');
    assert.equal(windowMock.AutoNextRoundTimer.isPaused, false, '解鎖後應恢復自動倒數');
    assert(textEl.innerHTML.includes('回合結算完畢'), '解鎖後應切入下一條回合結算教學');
    assert(textEl.innerHTML.includes('時之惡') && textEl.innerHTML.includes('受詛者') && textEl.innerHTML.includes('護盾'), '5P 下一回合教學應提醒時魔與時之惡、受詛者扣分方式不同');

    // 第 2 回合（已看過 step4_next_round）解鎖後應乾淨關閉
    gs1.roundMarker = 2;
    gs1.currentRoundAIChoices = null;
    gs1.hourPickOrder = [{ playerId: 'AI_1' }];
    gs1.nextHourPickerIndex = 0;
    TM.updateTutorialPointers(gs1, true);
    await new Promise(r => setTimeout(r, 15));
    gs1.hourPickOrder = [];
    docListeners.click.filter(x => x.cap).forEach(x => x.fn({ target: documentMock.body }));
    await new Promise(r => setTimeout(r, 15));
    assert.equal(tooltipEl.classList.contains('hidden'), true, '第 2 回合點擊確認後應乾淨關閉');

    // 4. 3P 不誤觸發進化賀詞；5P 實際進化才觸發一次
    TM.resetTutorialProgress();
    windowMock._humanId = 'P1';
    const gs3p = {
        gameMode: '3P',
        gameRound: 1,
        roundMarker: 1,
        phase: 'minute',
        gameEnded: false,
        currentRoundAIChoices: {},
        currentDrawnHourCards: [{ number: 3 }],
        hourDeck: [{ number: 2 }],
        players: [{ id: 'P1', name: 'P1', type: '時魔', roleCard: '時針', isHuman: true, mana: 3, hand: [{ value: 1 }, { value: 2 }] }]
    };
    windowMock.globalGameState = gs3p;
    TM.updateTutorialPointers(gs3p);
    assert(!textEl.innerHTML.includes('恭喜進化'), '3P 開局完全體不應顯示進化賀詞');

    TM.resetTutorialProgress();
    windowMock._humanId = 'SM_1';
    const youngP = {
        id: 'SM_1',
        name: '時魔 幼體 1',
        type: '時魔',
        roleCard: '時魔幼體 1',
        isHuman: true,
        mana: 3,
        hand: [{ value: 10 }, { value: 20 }],
        hourCards: [
            { number: 1, ageGroup: '幼年', isPrecious: true },
            { number: 2, ageGroup: '少年', isPrecious: false },
            { number: 3, ageGroup: '青年', isPrecious: false }
        ]
    };
    const gs5p = {
        gameMode: '5P',
        gameRound: 1,
        roundMarker: 2,
        phase: 'minute',
        gameEnded: false,
        currentRoundAIChoices: {},
        currentDrawnHourCards: [{ number: 5 }],
        clockFace: Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] })),
        players: [youngP]
    };
    assert.equal(ctx.attemptRoleUpgrade(youngP, gs5p), true, '5P 幼體應進化成功');
    assert.equal(youngP.hasEvolvedThisGame, true, '進化後應標記 hasEvolvedThisGame');
    windowMock.globalGameState = gs5p;
    TM.updateTutorialPointers(gs5p);
    assert(textEl.innerHTML.includes('恭喜進化為'), '真實進化應顯示恭喜進化提示');

    // 5. 第 2 回合 4 種能力單次引導與單一重播綁定
    windowMock.GAME_CONFIG.enableAbilities = true;
    for (const tc of [
        { name: 'hour', roleCard: '時針', type: '時魔', phase: 'preMinute', extra: { hourHandMoveCount: 0 }, expect: '時針能力（出牌前可用）' },
        { name: 'sin', roleCard: '時之惡', type: '時之惡', phase: 'preMinute', extra: {}, expect: '時之惡能力（出牌前可用）' },
        { name: 'second', roleCard: '秒針', type: '時魔', phase: 'minute', extra: {}, expect: '秒針能力（出牌前可用）' },
        { name: 'young', roleCard: '時魔幼體 1', type: '時魔', phase: 'minute', extra: { shieldUsed: false }, expect: '幼體自動防禦就緒' }
    ]) {
        TM.resetTutorialProgress();
        const p = {
            id: 'P_TEST',
            name: 'P_TEST',
            type: tc.type,
            roleCard: tc.roleCard,
            isHuman: true,
            mana: 3,
            hand: [{ value: 1 }, { value: 2 }],
            isEjected: false,
            specialAbilityUsed: false,
            ...tc.extra
        };
        windowMock._humanId = 'P_TEST';
        const gsAb = {
            gameMode: '5P',
            gameRound: 1,
            roundMarker: 1,
            phase: tc.phase,
            gameEnded: false,
            abilityMarker: false,
            currentRoundAIChoices: {},
            currentDrawnHourCards: [{ number: 4 }],
            hourDeck: [{ number: 2 }],
            players: [p]
        };
        windowMock.globalGameState = gsAb;
        TM.updateTutorialPointers(gsAb);
        gsAb.roundMarker = 2;
        TM.updateTutorialPointers(gsAb);
        assert(textEl.innerHTML.includes(tc.expect), `能力教學 (${tc.name}) 應正確觸發`);
    }

    assert.equal(els['btn-replay-tutorial']._listeners.click.length, 1, '#btn-replay-tutorial 應僅有單一點擊監聽器');
    windowMock._humanId = 'SM_CUSTOM';
    windowMock.globalGameState = {
        players: [
            { id: 'SM_1', type: '時魔', roleCard: '時魔幼體 1', isHuman: false },
            { id: 'SM_CUSTOM', type: '時之惡', roleCard: '時之惡', isHuman: false }
        ]
    };
    els['human-role-display'].dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert(textEl.innerHTML.includes('時之惡 · 獵殺與得分指南'), '角色徽章點擊應遵循 getEffectiveHumanPlayerId');

    // 5. 純競標模式：僅於開局顯示一次簡易規則說明，開始出牌與後續回合不再逐動作教學
    TM.resetTutorialProgress();
    windowMock._humanId = 'SM_1';
    const gsPure = {
        gameMode: 'PURE_4P',
        gameRound: 1,
        roundMarker: 1,
        phase: 'idle',
        gameEnded: false,
        currentRoundAIChoices: null,
        currentDrawnHourCards: [],
        hourPickOrder: [],
        players: [
            { id: 'SM_1', name: '玩家 1', type: 'pure', roleCard: '純競標', isHuman: true, mana: 0, hand: [{ value: 10 }] },
            { id: 'PURE_2', name: '對手 2', type: 'pure', roleCard: '純競標', isHuman: false, mana: 0, hand: [{ value: 20 }] }
        ]
    };
    windowMock.globalGameState = gsPure;
    TM.updateTutorialPointers(gsPure);
    assert.equal(tooltipEl.classList.contains('hidden'), false, '純競標模式開局應顯示一次簡易規則教學');
    assert(textEl.innerHTML.includes('純競標模式 · 簡易規則說明'), '應包含純競標模式規則說明');
    assert(textEl.innerHTML.includes('共進行 2 局'), '應依人數帶入輪替局數');

    gsPure.currentRoundAIChoices = {};
    gsPure.currentDrawnHourCards = [{ number: 3 }, { number: 7 }];
    TM.updateTutorialPointers(gsPure);
    assert.equal(tooltipEl.classList.contains('hidden'), true, '純競標模式開始出牌後不應顯示逐動作教學');

    gsPure.currentRoundAIChoices = null;
    gsPure.waitingHourChoice = true;
    gsPure.waitingHourChoicePlayerId = 'SM_1';
    TM.updateTutorialPointers(gsPure);
    assert.equal(tooltipEl.classList.contains('hidden'), true, '純競標模式挑選小時卡時不應顯示逐動作教學');

    return '新手教學系統行為與邊界條件全數通過 (歡迎流程 / 任意點擊鎖 / 3P-5P 進化 / 4 種能力 / 單一箭頭 / 純競標單次說明)';
}

