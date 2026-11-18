import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function readProjectFile(relPath) {
    return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

function fileExists(relPath) {
    return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function collectLocaleKeys(obj, prefix = '') {
    const keys = [];
    for (const k of Object.keys(obj)) {
        const nextKey = prefix ? `${prefix}.${k}` : k;
        const val = obj[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            keys.push(...collectLocaleKeys(val, nextKey));
        } else {
            keys.push(nextKey);
        }
    }
    return keys;
}

// =========================================================
// 關卡 1：核心 JS 語法檢查 (node --check)
// =========================================================
function stage1SyntaxCheck() {
    const coreFiles = [
        'i18n.js',
        'config.js',
        'logger.js',
        'audio.js',
        'abilities.js',
        'game_setup.js',
        'ai_engine.js',
        'game.js',
        'ui_modals.js',
        'ui_components.js',
        'tutorial_mode.js',
        'ui.js',
        'modern_board.js',
        'modern_intro.js',
        'locales/zh-TW.js',
        'locales/en-US.js',
        'locales/stories_data.js',
        'scripts/verify.js'
    ];

    const optionalSplitFiles = [
        'game_resolution.js',
        'ui_animations.js',
        'ui_panels.js',
        'ui_hand_drag.js'
    ];

    const targets = coreFiles.concat(optionalSplitFiles.filter(fileExists));

    for (const rel of targets) {
        const full = path.join(ROOT_DIR, rel);
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    }

    return `語法檢查全數通過 (${targets.length} 個檔案)`;
}

// =========================================================
// 關卡 2：雙語字典、標籤成對、Emoji、重複箭頭與禁用詞檢查
// =========================================================
function stage2LocaleAndFormatCheck() {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readProjectFile('locales/zh-TW.js'), ctx);
    vm.runInContext(readProjectFile('locales/en-US.js'), ctx);

    const zh = ctx.window.I18N_LOCALES['zh-TW'];
    const en = ctx.window.I18N_LOCALES['en-US'];
    assert(zh && en, '語系物件 window.I18N_LOCALES["zh-TW"] / ["en-US"] 不可為空');

    const zk = new Set(collectLocaleKeys(zh));
    const ek = new Set(collectLocaleKeys(en));
    const onlyZh = [...zk].filter(k => !ek.has(k));
    const onlyEn = [...ek].filter(k => !zk.has(k));

    assert.deepEqual(onlyZh, [], `zh-TW 多出未對齊鍵值: ${onlyZh.join(', ')}`);
    assert.deepEqual(onlyEn, [], `en-US 多出未對齊鍵值: ${onlyEn.join(', ')}`);

    // 檢查 tutorial.* 內的 HTML 標籤是否成對
    for (const [langName, localeObj] of [['zh-TW', zh], ['en-US', en]]) {
        assert(localeObj.tutorial, `${langName} 缺少 tutorial 區塊`);
        for (const [k, rawVal] of Object.entries(localeObj.tutorial)) {
            const str = String(rawVal);
            const openStrong = (str.match(/<strong>/g) || []).length;
            const closeStrong = (str.match(/<\/strong>/g) || []).length;
            assert.equal(openStrong, closeStrong, `${langName}.tutorial.${k} 的 <strong> 標籤不成對`);

            const openSpan = (str.match(/<span\b[^>]*>/g) || []).length;
            const closeSpan = (str.match(/<\/span>/g) || []).length;
            assert.equal(openSpan, closeSpan, `${langName}.tutorial.${k} 的 <span> 標籤不成對`);
        }
    }

    // 檢查 Emoji 殘留
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u26A0]/gu;
    for (const rel of ['index.html', 'classic.html', 'tutorial_mode.js', 'locales/zh-TW.js', 'locales/en-US.js']) {
        const content = readProjectFile(rel);
        const matches = content.match(emojiRe) || [];
        assert.equal(matches.length, 0, `${rel} 仍殘留 ${matches.length} 個 Emoji (${matches.join(' ')})`);
    }

    // 檢查重複歡迎箭頭與重複 keyframe
    const styleCss = readProjectFile('style.css');
    const tutorialJs = readProjectFile('tutorial_mode.js');
    const keyframeCount = (styleCss.match(/@keyframes\s+tutorialBounceArrow\b/g) || []).length;
    assert.equal(keyframeCount, 1, `style.css 中 @keyframes tutorialBounceArrow 出現次數應為 1，實測為 ${keyframeCount}`);
    assert(!styleCss.includes('tutorial-welcome-arrow'), 'style.css 不應再包含 tutorial-welcome-arrow');
    assert(!tutorialJs.includes('tutorial-welcome-arrow'), 'tutorial_mode.js 不應再包含 tutorial-welcome-arrow');

    // 檢查專案禁用詞（遵守 AGENTS.md 規範）
    const bannedWordRe = new RegExp('\\u512a\\u5316');
    const checkList = [
        'abilities.js',
        'ai_engine.js',
        'game.js',
        'tutorial_mode.js',
        'ui_components.js',
        'ui.js',
        'locales/zh-TW.js',
        'locales/en-US.js',
        'index.html',
        'classic.html',
        'ARCHITECTURE.md',
        'scripts/verify.js'
    ];
    for (const rel of checkList) {
        const content = readProjectFile(rel);
        assert(!bannedWordRe.test(content), `${rel} 內含禁用詞`);
    }

    return `雙語 ${zk.size} 鍵 100% 對齊、標籤成對、0 Emoji、單一歡迎箭頭、0 禁用詞`;
}

// =========================================================
// 關卡 3：新手教學系統行為測試 (Node.js vm Mock DOM)
// =========================================================
async function stage3TutorialBehaviorTest() {
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
    for (const rel of ['locales/zh-TW.js', 'locales/en-US.js', 'i18n.js', 'config.js', 'abilities.js', 'tutorial_mode.js']) {
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

    return '新手教學系統行為與邊界條件全數通過 (歡迎流程 / 任意點擊鎖 / 3P-5P 進化 / 4 種能力 / 單一箭頭)';
}

// =========================================================
// 關卡 4：無頭對戰壓力測試 (5P × 20 場 + 3P × 20 場 = 40 場)
// =========================================================
function stage4HeadlessStressTest() {
    const scenarios = [];
    const fivePRoles = ['SM_1', 'sin', 'SCZ'];
    for (let i = 0; i < 15; i++) {
        scenarios.push({ mode: '5P', enableAbilities: true, aiDifficulty: 'normal', humanId: fivePRoles[i % fivePRoles.length], threePRole: '時針' });
    }
    for (let i = 0; i < 5; i++) {
        scenarios.push({ mode: '5P', enableAbilities: false, aiDifficulty: 'easy', humanId: 'SM_1', threePRole: '時針' });
    }
    const threePRoles = ['時針', '分針', '秒針'];
    for (let i = 0; i < 15; i++) {
        scenarios.push({ mode: '3P', enableAbilities: true, aiDifficulty: 'normal', humanId: 'SM_1', threePRole: threePRoles[i % threePRoles.length] });
    }
    for (let i = 0; i < 5; i++) {
        scenarios.push({ mode: '3P', enableAbilities: false, aiDifficulty: 'easy', humanId: 'SM_1', threePRole: '時針' });
    }

    let totalTurnsSimulated = 0;

    scenarios.forEach((sc, idx) => {
        const timerQueue = [];
        let nextTimerId = 1;

        const fakeSetTimeout = (fn) => {
            const id = nextTimerId++;
            timerQueue.push({ id, fn });
            return id;
        };
        const fakeClearTimeout = (id) => {
            const pos = timerQueue.findIndex(t => t.id === id);
            if (pos >= 0) timerQueue.splice(pos, 1);
        };
        const flushTimers = (maxFlush = 300) => {
            let count = 0;
            while (timerQueue.length > 0) {
                if (count++ >= maxFlush) {
                    throw new Error(`場次 #${idx + 1} (${sc.mode}) 發生無限計時器迴圈`);
                }
                const item = timerQueue.shift();
                item.fn();
            }
        };

        const windowMock = {
            appLogger: { log: () => {}, warn: () => {}, error: () => {} },
            AutoNextRoundTimer: { start: () => {}, stop: () => {}, pause: () => {}, resume: () => {} },
            updateUI: () => {},
            renderGameOverPanel: () => {}
        };
        windowMock.window = windowMock;

        const documentMock = {
            getElementById: () => ({ disabled: false, textContent: '', classList: { add: () => {}, remove: () => {} }, style: {} }),
            querySelector: () => null,
            querySelectorAll: () => []
        };

        const ctx = {
            window: windowMock,
            document: documentMock,
            console: { log: () => {}, warn: () => {}, error: console.error },
            setTimeout: fakeSetTimeout,
            clearTimeout: fakeClearTimeout,
            appLogger: windowMock.appLogger,
            updateUI: () => {},
            renderGameOverPanel: () => {}
        };
        vm.createContext(ctx);
        for (const rel of ['config.js', 'logger.js', 'abilities.js', 'game_setup.js', 'ai_engine.js', 'game.js']) {
            vm.runInContext(readProjectFile(rel), ctx);
        }

        ctx.GAME_CONFIG.gameMode = sc.mode;
        ctx.GAME_CONFIG.enableAbilities = sc.enableAbilities;
        ctx.GAME_CONFIG.aiDifficulty = sc.aiDifficulty;
        ctx.GAME_CONFIG.threePStartingRole = sc.threePRole;
        ctx.GAME_CONFIG.testMode = false;
        ctx.GAME_CONFIG.tutorialMode = false;
        if (typeof ctx.setHumanPlayerId === 'function') {
            ctx.setHumanPlayerId(sc.humanId);
        }

        const gs = ctx.initializeGame(sc.mode);
        let steps = 0;
        const maxSteps = 450;

        while (!gs.gameEnded && steps < maxSteps) {
            steps++;
            totalTurnsSimulated++;
            flushTimers();
            if (gs.gameEnded) break;

            const humanId = typeof ctx.getEffectiveHumanPlayerId === 'function' ? ctx.getEffectiveHumanPlayerId() : sc.humanId;
            const human = gs.players.find(p => p.id === humanId) || gs.players[0];

            if (gs.waitingSecondHandFinalChoice && Array.isArray(gs.secondHandPendingCards) && gs.secondHandPendingCards.length > 0) {
                ctx.handleHumanSecondHandFinalChoice(gs, gs.secondHandPendingCards[0].value);
            } else if (gs.currentRoundAIChoices !== null) {
                assert(human && Array.isArray(human.hand) && human.hand.length > 0, `場次 #${idx + 1} 等待人類出牌但手牌為空`);
                ctx.handleHumanChoice(gs, human.hand[0].value);
            } else if (gs.waitingHourChoice) {
                ctx.handleHumanHourCardChoice(gs, 0);
            } else if (gs.waitingMinuteHandChoice) {
                const choice = (idx % 3 === 0 && human && human.mana >= 2) ? 'cw' : 'skip';
                ctx.handleHumanAbilityChoice(gs, choice);
            } else {
                ctx.startRound(gs);
            }

            flushTimers();
        }

        assert.equal(gs.gameEnded, true, `場次 #${idx + 1} (${sc.mode}, abilities=${sc.enableAbilities}) 超過 ${maxSteps} 步仍未結束，疑似狀態機死鎖`);

        // 檢核全場玩家數值與指針身份唯一性
        const advancedRoles = [];
        for (const p of gs.players) {
            assert(Number.isFinite(p.score), `場次 #${idx + 1} 玩家 ${p.id} score 非有效數值: ${p.score}`);
            assert(Number.isFinite(p.gearCards) && p.gearCards >= 0, `場次 #${idx + 1} 玩家 ${p.id} gearCards 異常: ${p.gearCards}`);
            assert(Number.isFinite(p.mana) && p.mana >= 0, `場次 #${idx + 1} 玩家 ${p.id} mana 異常: ${p.mana}`);
            if (p.type === '時魔' && ['時針', '分針', '秒針'].includes(p.roleCard)) {
                advancedRoles.push(p.roleCard);
            }
        }
        const uniqueAdvancedRoles = new Set(advancedRoles);
        assert.equal(uniqueAdvancedRoles.size, advancedRoles.length, `場次 #${idx + 1} 時魔指針身份出現重複: ${advancedRoles.join(', ')}`);
    });

    return `40 場完整對局 (5P × 20 + 3P × 20) 壓力測試通過，0 例外 / 0 死鎖 (累計推進 ${totalTurnsSimulated} 步)`;
}

// =========================================================
// 關卡 5：雙入口 HTML Script 存在性與載入順序檢查
// =========================================================
function stage5HtmlLoadOrderCheck() {
    const requiredOrder = [
        'locales/zh-TW.js',
        'locales/en-US.js',
        'i18n.js',
        'config.js',
        'abilities.js',
        'game_setup.js',
        'ai_engine.js',
        'game.js',
        'ui_components.js',
        'tutorial_mode.js',
        'ui.js'
    ];

    for (const htmlFile of ['index.html', 'classic.html']) {
        const html = readProjectFile(htmlFile);
        const scripts = [];
        const scriptRe = /<script\s+[^>]*src=["']([^"']+)["']/gi;
        let match;
        while ((match = scriptRe.exec(html)) !== null) {
            const src = match[1];
            if (!/^https?:\/\//i.test(src)) {
                scripts.push(src);
                assert(fileExists(src), `${htmlFile} 引用的腳本檔案不存在: ${src}`);
            }
        }

        let lastIdx = -1;
        for (const req of requiredOrder) {
            const idx = scripts.indexOf(req);
            assert(idx >= 0, `${htmlFile} 缺少核心腳本: ${req}`);
            assert(idx > lastIdx, `${htmlFile} 腳本載入順序錯誤: ${req} 必須晚於 ${requiredOrder[requiredOrder.indexOf(req) - 1] || '前項'}`);
            lastIdx = idx;
        }
    }

    return 'index.html 與 classic.html 本地腳本存在性與載入順序全數正確';
}

// =========================================================
// 主執行流程
// =========================================================
async function main() {
    const stages = [
        ['關卡 1/5｜核心 JS 語法檢查', stage1SyntaxCheck],
        ['關卡 2/5｜雙語字典、標籤、Emoji 與規範檢查', stage2LocaleAndFormatCheck],
        ['關卡 3/5｜新手教學系統行為測試', stage3TutorialBehaviorTest],
        ['關卡 4/5｜5P / 3P 無頭對戰壓力測試 (40 場)', stage4HeadlessStressTest],
        ['關卡 5/5｜雙入口 HTML Script 載入順序檢查', stage5HtmlLoadOrderCheck]
    ];

    console.log('=== 《蝕入記憶》(Eaten into Memory) 自動化驗證開始 ===');
    for (const [label, fn] of stages) {
        const summary = await fn();
        console.log(`[PASS] ${label}: ${summary}`);
    }
    console.log('=== 全部 5 道自動化驗證關卡通過 ===');
}

main().catch((err) => {
    console.error('[FAIL] 自動化驗證失敗：');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
