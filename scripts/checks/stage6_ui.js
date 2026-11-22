import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 6：UI 拆分模組載入與全域符號完整性煙霧測試
// =========================================================
export function stage6UiModulesSmokeTest() {
    const noop = () => {};
    const nextStepBtnMock = {
        id: 'next-step-btn',
        disabled: false,
        textContent: '',
        onclick: noop,
        style: {},
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false }
    };
    const windowMock = {
        innerWidth: 1280,
        addEventListener: noop,
        removeEventListener: noop,
        localStorage: { getItem: () => null, setItem: noop },
        UI_CONFIG: undefined,
        GAME_CONFIG: undefined,
        getEffectiveHumanPlayerId: () => 'SM_1',
        setHumanPlayerId: noop,
        renderGameOverPanel: noop
    };
    windowMock.window = windowMock;

    let hasModernOverlay = false;
    const documentMock = {
        readyState: 'loading',
        getElementById: (id) => {
            if (id === 'modern-intro-overlay' && hasModernOverlay) return { id: 'modern-intro-overlay' };
            if (id === 'next-step-btn') return nextStepBtnMock;
            return null;
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: noop,
        removeEventListener: noop,
        createElement: () => ({
            className: '',
            style: {},
            classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
            setAttribute: noop,
            appendChild: noop,
            addEventListener: noop
        })
    };
    windowMock.document = documentMock;

    const ctx = {
        window: windowMock,
        document: documentMock,
        localStorage: windowMock.localStorage,
        console: { log: noop, warn: noop, error: console.error },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        getEffectiveHumanPlayerId: () => 'SM_1',
        setHumanPlayerId: noop,
        renderGameOverPanel: noop
    };
    vm.createContext(ctx);

    const loadOrder = [
        'locales/zh-TW.js',
        'locales/en-US.js',
        'js/core/i18n.js',
        'js/core/config.js',
        'js/ui/ui_modals.js',
        'js/ui/ui_components.js',
        'js/ui/ui_animations.js',
        'js/ui/ui_panels.js',
        'js/ui/ui_hand_drag.js',
        'js/ui/ui_settlement.js'
    ];

    for (const rel of loadOrder) {
        vm.runInContext(readProjectFile(rel), ctx);
    }

    // 驗證頂層狀態/函式與 window.* 導出完整無缺（Node vm 中 const/let 位於詞法作用域，需以 runInContext 查驗）
    assert.equal(vm.runInContext('typeof uiState', ctx), 'object', '缺少全域物件 uiState');
    assert.equal(vm.runInContext('typeof ROLE_COLORS', ctx), 'object', '缺少全域物件 ROLE_COLORS');
    assert.equal(vm.runInContext('typeof AnimationController', ctx), 'object', '缺少 AnimationController');
    assert.equal(vm.runInContext('typeof EffectQueue', ctx), 'object', '缺少 EffectQueue');
    assert(windowMock.AnimationController && typeof windowMock.AnimationController === 'object', '缺少 window.AnimationController 導出');
    assert(windowMock.EffectQueue && typeof windowMock.EffectQueue === 'object', '缺少 window.EffectQueue 導出');

    const expectedFunctions = [
        'updateUI',
        'createGearChainHtml',
        'createManaGaugeHtml',
        'renderAIPlayers',
        'renderHumanPlayerArea',
        'bindMinuteCardDragToPlay',
        'renderScorePanel',
        'renderDiscardPileModal',
        'renderEvolutionPanel',
        'resetMinuteHistory',
        'resetRightPanels',
        'applyHandFanLayout',
        'isModernFanHandEnabled'
    ];
    for (const fnName of expectedFunctions) {
        assert.equal(typeof ctx[fnName], 'function', `缺少全域函式 ${fnName}`);
    }

    const expectedWindowExports = [
        'playMinuteClashAnimation',
        'playCardDealAnimation',
        'playHourCardDisintegrateAnimation',
        'createGearChainHtml',
        'createManaGaugeHtml',
        'renderAIPlayers',
        'renderHumanPlayerArea',
        'renderScorePanel',
        'renderDiscardPileModal',
        'applyHandFanLayout',
        'isModernFanHandEnabled'
    ];
    for (const expName of expectedWindowExports) {
        assert.equal(typeof windowMock[expName], 'function', `缺少 window.${expName} 導出`);
    }

    // 扇形手牌列邏輯與斷點/開關測試
    assert.equal(windowMock.UI_CONFIG.FAN_HAND_LAYOUT, true, '預設應開啟 FAN_HAND_LAYOUT');

    function makeStyleBox() {
        const map = new Map();
        return {
            setProperty: (k, v) => map.set(k, String(v)),
            getPropertyValue: (k) => map.get(k) || '',
            removeProperty: (k) => map.delete(k)
        };
    }

    function makeClassBox() {
        const set = new Set();
        return {
            add: (...cls) => cls.forEach(c => set.add(c)),
            remove: (...cls) => cls.forEach(c => set.delete(c)),
            contains: (c) => set.has(c)
        };
    }

    function makeMockHand(count) {
        const cards = Array.from({ length: count }, () => {
            const listeners = {};
            return {
                style: makeStyleBox(),
                classList: makeClassBox(),
                dataset: {},
                addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
                dispatchEvent: (ev) => { (listeners[ev] || []).forEach(fn => fn()); }
            };
        });
        const handListeners = {};
        return {
            cards,
            style: makeStyleBox(),
            classList: makeClassBox(),
            querySelectorAll: (sel) => (sel === '.minute-card' ? cards : []),
            addEventListener: (ev, fn) => { (handListeners[ev] = handListeners[ev] || []).push(fn); },
            dispatchEvent: (ev) => { (handListeners[ev] || []).forEach(fn => fn()); }
        };
    }

    // 1) 現代桌機模式：1 張與 12 張驗證
    hasModernOverlay = true;
    windowMock.innerWidth = 1280;
    windowMock.UI_CONFIG.FAN_HAND_LAYOUT = true;

    const hand1 = makeMockHand(1);
    assert.equal(windowMock.applyHandFanLayout(hand1), true, '現代桌機應啟用扇形手牌列');
    assert.equal(hand1.classList.contains('hand-fan-layout'), true);
    assert.equal(hand1.style.getPropertyValue('--fan-overlap'), '0px', '1 張牌不應重疊');
    assert.equal(hand1.cards[0].style.getPropertyValue('--fan-angle'), '0deg', '1 張牌角度應為 0deg');
    assert.equal(hand1.cards[0].style.getPropertyValue('--fan-y'), '0px', '1 張牌高度偏移應為 0px');

    const hand12 = makeMockHand(12);
    assert.equal(windowMock.applyHandFanLayout(hand12), true);
    assert.equal(hand12.style.getPropertyValue('--fan-overlap'), '-12px', '12 張牌右側交疊負邊距應為 -12px');
    const firstAngle = parseFloat(hand12.cards[0].style.getPropertyValue('--fan-angle'));
    const lastAngle = parseFloat(hand12.cards[11].style.getPropertyValue('--fan-angle'));
    const firstY = parseFloat(hand12.cards[0].style.getPropertyValue('--fan-y'));
    const lastY = parseFloat(hand12.cards[11].style.getPropertyValue('--fan-y'));
    const midY = parseFloat(hand12.cards[5].style.getPropertyValue('--fan-y'));
    assert.equal(firstAngle, -lastAngle, '首尾角度必須嚴格對稱互為相反數');
    assert(lastAngle > 0, '右側末張牌角度應為正值');
    assert.equal(firstY, lastY, '首尾高度偏移必須相等');
    assert(midY < firstY, '中央卡牌應高於兩端卡牌');
    hand12.cards.forEach((c, idx) => {
        assert.equal(c.style.getPropertyValue('--fan-index'), String(idx), '--fan-index 應遞增確保右側疊在左側之上');
    });

    // 懸停撥開鄰牌測試
    hand12.cards[5].dispatchEvent('pointerenter');
    assert.equal(hand12.cards[4].style.getPropertyValue('--fan-spread-x'), '-10px', '左鄰牌應向左撥開');
    assert.equal(hand12.cards[6].style.getPropertyValue('--fan-spread-x'), '12px', '右鄰牌應向右撥開');
    hand12.cards[5].dispatchEvent('pointerleave');
    assert.equal(hand12.cards[4].style.getPropertyValue('--fan-spread-x'), '0px', '離開懸停應重置撥開');

    // 2) 停用設定應移除扇形並清除變數
    windowMock.UI_CONFIG.FAN_HAND_LAYOUT = false;
    assert.equal(windowMock.applyHandFanLayout(hand12), false, '關閉開關時應停用扇形');
    assert.equal(hand12.classList.contains('hand-fan-layout'), false);
    assert.equal(hand12.style.getPropertyValue('--fan-overlap'), '');
    assert.equal(hand12.cards[0].style.getPropertyValue('--fan-angle'), '');

    // 3) 手機寬度 (<= 768) 應維持原本橫向滑動平列
    windowMock.UI_CONFIG.FAN_HAND_LAYOUT = true;
    windowMock.innerWidth = 480;
    assert.equal(windowMock.applyHandFanLayout(hand12), false, '手機端應保持平列不啟用扇形');
    assert.equal(hand12.classList.contains('hand-fan-layout'), false);

    // 4) 經典版 (無現代版 DOM 標識) 不應套用扇形
    hasModernOverlay = false;
    windowMock.innerWidth = 1280;
    assert.equal(windowMock.applyHandFanLayout(hand12), false, '經典版不應套用扇形');
    assert.equal(hand12.classList.contains('hand-fan-layout'), false);

    // 5) next-step-btn 提示與禁用狀態機回歸測試 (9 種狀態)
    assert(windowMock.i18n && typeof windowMock.i18n.setLanguage === 'function', '缺少 window.i18n.setLanguage');
    windowMock.i18n.setLanguage('zh-TW');

    const makeNextBtnGs = (overrides) => Object.assign({
        gameMode: '5P',
        gameRound: 1,
        roundMarker: 1,
        phase: 'idle',
        gameEnded: false,
        hasShownGameOverPanel: false,
        players: [
            {
                id: 'SM_1',
                name: '時魔幼體 1',
                type: '時魔',
                roleCard: '分針',
                isHuman: true,
                isEjected: false,
                gearCards: 5,
                mana: 3,
                score: 0,
                d6Die: null,
                currentClockPosition: null,
                hand: [{ value: 10, gear: true }],
                hourCards: [],
                specialAbilityUsed: false
            },
            {
                id: 'AI_1',
                name: '對手A',
                type: '時魔',
                roleCard: '時針',
                isHuman: false,
                isEjected: false,
                gearCards: 5,
                mana: 3,
                score: 0,
                d6Die: null,
                currentClockPosition: null,
                hand: [],
                hourCards: []
            }
        ],
        hourDeck: [{ number: 1 }, { number: 2 }],
        clockFace: Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] })),
        minuteDiscard: [],
        currentRoundAIChoices: null,
        currentDrawnHourCards: null,
        currentMinuteChoices: null,
        hourPickOrder: null,
        nextHourPickerIndex: 0,
        waitingHourChoice: false,
        waitingHourChoicePlayerId: null,
        waitingAbilityChoice: false,
        waitingAbilityChoicePlayerId: null,
        waitingSecondHandFinalChoice: false,
        waitingSecondHandFinalChoicePlayerId: null,
        waitingMinuteHandChoice: false,
        isPlayingMinuteClash: false,
        sinTargetingMode: 'default'
    }, overrides);

    const nextBtnCases = [
        ['閒置／回合結束', {}, false, '下一回合'],
        ['等待人類出分鐘卡（已有預覽小時卡）', { currentDrawnHourCards: [{ number: 5 }, { number: 8 }], currentRoundAIChoices: [{ playerId: 'AI_1', card: { value: 12 } }], hourPickOrder: null }, true, '請出牌'],
        ['秒針 2 選 1 階段（尚有預覽小時卡）', { currentDrawnHourCards: [{ number: 5 }, { number: 8 }], currentRoundAIChoices: null, waitingSecondHandFinalChoice: true, waitingSecondHandFinalChoicePlayerId: 'SM_1', secondHandPendingCards: [{ value: 10 }, { value: 20 }] }, true, '請完成秒針 2 選 1'],
        ['分鐘卡比牌動畫中', { currentDrawnHourCards: [{ number: 5 }, { number: 8 }], hourPickOrder: [{ playerId: 'AI_1' }, { playerId: 'SM_1' }], isPlayingMinuteClash: true }, true, '比較分鐘數值中'],
        ['對手挑選小時卡中', { currentDrawnHourCards: [{ number: 5 }, { number: 8 }], isPlayingMinuteClash: false, hourPickOrder: [{ playerId: 'AI_1' }, { playerId: 'SM_1' }], nextHourPickerIndex: 0, waitingHourChoice: false }, true, '等待對手挑選小時卡'],
        ['輪到人類挑選小時卡', { currentDrawnHourCards: [{ number: 5 }], isPlayingMinuteClash: false, hourPickOrder: [{ playerId: 'AI_1' }, { playerId: 'SM_1' }], nextHourPickerIndex: 1, waitingHourChoice: true, waitingHourChoicePlayerId: 'SM_1' }, true, '請挑選小時卡'],
        ['AI 第 2 順位剛拿走最後一張卡至結算前空窗', { currentDrawnHourCards: [], isPlayingMinuteClash: false, hourPickOrder: [{ playerId: 'SM_1' }, { playerId: 'AI_1' }], nextHourPickerIndex: 2, waitingHourChoice: false }, true, '等待對手挑選小時卡'],
        ['分針能力等待中', { currentDrawnHourCards: null, hourPickOrder: null, waitingMinuteHandChoice: true }, false, '下一回合 (略過能力)'],
        ['遊戲結束', { gameEnded: true, hasShownGameOverPanel: true }, true, '遊戲結束']
    ];

    for (const [caseName, overrides, expectedDisabled, expectedText] of nextBtnCases) {
        ctx.updateUI(makeNextBtnGs(overrides));
        assert.equal(nextStepBtnMock.disabled, expectedDisabled, `[${caseName}] next-step-btn.disabled 應為 ${expectedDisabled}`);
        assert.equal(nextStepBtnMock.textContent, expectedText, `[${caseName}] next-step-btn.textContent 應為「${expectedText}」`);
    }

    // 6) 跨局換局數值更換與重開新局不觸發畫面震動／受擊特效回歸測試
    {
        let screenShakeCount = 0;
        let tokenShakeCount = 0;
        let damageSfxCount = 0;
        let floatTextCount = 0;
        const floatTexts = [];

        const bodyClasses = new Set();
        const bodyMock = {
            offsetWidth: 0,
            classList: {
                add: (c) => {
                    bodyClasses.add(c);
                    if (c === 'screen-damage-shake') screenShakeCount++;
                },
                remove: (c) => bodyClasses.delete(c),
                contains: (c) => bodyClasses.has(c)
            },
            appendChild: (el) => {
                floatTextCount++;
                floatTexts.push(el && el.textContent ? el.textContent : '');
            }
        };

        const nextStepBtn2 = {
            id: 'next-step-btn',
            disabled: false,
            textContent: '',
            onclick: noop,
            style: {},
            classList: makeClassBox()
        };

        const uiWin = {
            innerWidth: 1280,
            innerHeight: 800,
            addEventListener: noop,
            removeEventListener: noop,
            localStorage: { getItem: () => null, setItem: noop },
            UI_CONFIG: undefined,
            GAME_CONFIG: undefined,
            getEffectiveHumanPlayerId: () => 'SM_1',
            setHumanPlayerId: noop,
            ModernBoard: {
                shakeToken: () => { tokenShakeCount++; },
                getTokenScreenPosition: () => ({ x: 400, y: 300 })
            },
            gameAudio: {
                playDamage: () => { damageSfxCount++; },
                playConfirm: noop,
                playChime: noop
            }
        };
        uiWin.window = uiWin;

        const uiDoc = {
            readyState: 'loading',
            body: bodyMock,
            documentElement: { style: makeStyleBox() },
            getElementById: (id) => (id === 'next-step-btn' ? nextStepBtn2 : null),
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: noop,
            removeEventListener: noop,
            createElement: () => ({
                className: '',
                textContent: '',
                style: {},
                classList: makeClassBox(),
                setAttribute: noop,
                appendChild: noop,
                remove: noop,
                addEventListener: noop
            })
        };
        uiWin.document = uiDoc;

        const uiCtx = {
            window: uiWin,
            document: uiDoc,
            localStorage: uiWin.localStorage,
            console: { log: noop, warn: noop, error: console.error },
            setTimeout: noop,
            clearTimeout: noop,
            setInterval: noop,
            clearInterval: noop,
            getEffectiveHumanPlayerId: () => 'SM_1',
            setHumanPlayerId: noop
        };
        vm.createContext(uiCtx);

        const fullLoadOrder = [
            'locales/zh-TW.js',
            'locales/en-US.js',
            'js/core/i18n.js',
            'js/core/config.js',
            'js/ui/ui_modals.js',
            'js/ui/ui_components.js',
            'js/ui/ui_animations.js',
            'js/ui/ui_panels.js',
            'js/ui/ui_hand_drag.js',
        'js/ui/ui_settlement.js',
            'js/ui/ui.js'
        ];
        for (const rel of fullLoadOrder) {
            vm.runInContext(readProjectFile(rel), uiCtx);
        }

        uiWin.i18n.setLanguage('zh-TW');
        uiWin.UI_CONFIG.SEQUENTIAL_EFFECTS = false;
        uiWin.UI_CONFIG.SCREEN_SHAKE = true;

        const makeRoundState = (gameRound, humanGear, humanMana, humanDie, aiGear = 4) => ({
            gameMode: '5P',
            gameRound,
            roundMarker: 1,
            phase: 'idle',
            gameEnded: false,
            hasShownGameOverPanel: false,
            players: [
                {
                    id: 'SM_1',
                    name: '時魔幼體 1',
                    type: '時魔',
                    roleCard: '時魔幼體 1',
                    isHuman: true,
                    isEjected: false,
                    gearCards: humanGear,
                    mana: humanMana,
                    score: 0,
                    d6Die: humanDie,
                    shieldUsed: false,
                    currentClockPosition: null,
                    hand: [{ value: 10, gear: true }],
                    hourCards: [],
                    specialAbilityUsed: false
                },
                {
                    id: 'AI_1',
                    name: '對手A',
                    type: '時之惡',
                    roleCard: '時之惡',
                    isHuman: false,
                    isEjected: false,
                    gearCards: aiGear,
                    mana: aiGear,
                    score: 0,
                    d6Die: 3,
                    shieldUsed: false,
                    currentClockPosition: null,
                    hand: [],
                    hourCards: []
                }
            ],
            hourDeck: [{ number: 1 }, { number: 2 }],
            clockFace: Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] })),
            minuteDiscard: [],
            currentRoundAIChoices: null,
            currentDrawnHourCards: null,
            currentMinuteChoices: null,
            hourPickOrder: null,
            nextHourPickerIndex: 0,
            waitingHourChoice: false,
            waitingHourChoicePlayerId: null,
            waitingAbilityChoice: false,
            waitingAbilityChoicePlayerId: null,
            waitingSecondHandFinalChoice: false,
            waitingSecondHandFinalChoicePlayerId: null,
            waitingMinuteHandChoice: false,
            isPlayingMinuteClash: false,
            sinTargetingMode: 'default'
        });

        // 情境 1：第 1 局初次渲染，建立基準，不觸發震動／受擊／浮字
        uiCtx.updateUI(makeRoundState(1, 5, 5, 3));
        assert.equal(screenShakeCount, 0, '[情境 1] 第 1 局初次渲染不應觸發畫面震動');
        assert.equal(tokenShakeCount, 0, '[情境 1] 第 1 局初次渲染不應觸發棋子震動');
        assert.equal(damageSfxCount, 0, '[情境 1] 第 1 局初次渲染不應播放受擊音效');
        assert.equal(floatTextCount, 0, '[情境 1] 第 1 局初次渲染不應產生浮動文字');

        // 情境 2：同局內人類玩家扣除 GP，應正常觸發一次畫面震動、棋子震動、音效與浮字
        uiCtx.updateUI(makeRoundState(1, 4, 5, 3));
        assert.equal(screenShakeCount, 1, '[情境 2] 同局內扣除 GP 應觸發 1 次畫面震動');
        assert.equal(tokenShakeCount, 1, '[情境 2] 同局內扣除 GP 應觸發 1 次棋子震動');
        assert.equal(damageSfxCount, 1, '[情境 2] 同局內扣除 GP 應播放 1 次受擊音效');
        assert.equal(floatTextCount, 1, '[情境 2] 同局內扣除 GP 應顯示 1 筆浮動文字');

        // 情境 3：直接呼叫 processFloatingText 模擬跨局切換（gameRound: 1 -> 2 且數值降低）
        uiCtx.processFloatingText(makeRoundState(2, 2, 2, 1, 2));
        assert.equal(screenShakeCount, 1, '[情境 3] 直接呼叫 processFloatingText 跨局更換數值不應觸發畫面震動');
        assert.equal(tokenShakeCount, 1, '[情境 3] 直接呼叫 processFloatingText 跨局更換數值不應觸發棋子震動');
        assert.equal(damageSfxCount, 1, '[情境 3] 直接呼叫 processFloatingText 跨局更換數值不應播放受擊音效');
        assert.equal(floatTextCount, 1, '[情境 3] 直接呼叫 processFloatingText 跨局更換數值不應產生浮動文字');

        // 情境 4：先同步第 2 局高數值，再經由完整 updateUI 跨局進入第 3 局低數值（5 -> 2）
        uiCtx.updateUI(makeRoundState(2, 5, 5, 3, 5));
        const beforeR3Screen = screenShakeCount;
        const beforeR3Token = tokenShakeCount;
        const beforeR3Sfx = damageSfxCount;
        const beforeR3Float = floatTextCount;
        uiCtx.updateUI(makeRoundState(3, 2, 2, 1, 2));
        assert.equal(screenShakeCount, beforeR3Screen, '[情境 4] updateUI 進入第 3 局重新分配較低數值不應觸發畫面震動');
        assert.equal(tokenShakeCount, beforeR3Token, '[情境 4] updateUI 進入第 3 局不應觸發棋子受擊震動');
        assert.equal(damageSfxCount, beforeR3Sfx, '[情境 4] updateUI 進入第 3 局不應播放受擊音效');
        assert.equal(floatTextCount, beforeR3Float, '[情境 4] updateUI 進入第 3 局不應產生數值浮動文字');

        // 情境 5：第 3 局內再度扣除 GP，證明新局基準已正確建立
        uiCtx.updateUI(makeRoundState(3, 1, 2, 1, 2));
        assert.equal(screenShakeCount, beforeR3Screen + 1, '[情境 5] 第 3 局內實際扣血應正常觸發畫面震動');
        assert.equal(tokenShakeCount, beforeR3Token + 1, '[情境 5] 第 3 局內實際扣血應正常觸發棋子震動');
        assert.equal(damageSfxCount, beforeR3Sfx + 1, '[情境 5] 第 3 局內實際扣血應正常播放受擊音效');
        assert.equal(floatTextCount, beforeR3Float + 1, '[情境 5] 第 3 局內實際扣血應正常產生浮動文字');

        // 情境 6：透過 resetRightPanels() 重開新局（同為 gameRound=1 但起始 GP 較低），不應觸發震動
        uiCtx.resetRightPanels(makeRoundState(1, 5, 5, 3));
        uiCtx.updateUI(makeRoundState(1, 5, 5, 3));
        const beforeRestartScreen = screenShakeCount;
        const restartGs = makeRoundState(1, 2, 2, 1, 2);
        uiCtx.resetRightPanels(restartGs);
        uiCtx.updateUI(restartGs);
        assert.equal(screenShakeCount, beforeRestartScreen, '[情境 6] resetRightPanels 重開新局不應觸發畫面震動');

        // 情境 7：同局內僅花費 MP（GP 不變），只顯示浮字，不得觸發棋子震動、受擊音效或畫面震動
        const beforeMpScreen = screenShakeCount;
        const beforeMpToken = tokenShakeCount;
        const beforeMpSfx = damageSfxCount;
        const beforeMpFloat = floatTextCount;
        uiCtx.updateUI(makeRoundState(1, 2, 1, 1, 2));
        assert.equal(screenShakeCount, beforeMpScreen, '[情境 7] 花費 MP 不應觸發畫面震動');
        assert.equal(tokenShakeCount, beforeMpToken, '[情境 7] 花費 MP 不應觸發棋子受擊震動');
        assert.equal(damageSfxCount, beforeMpSfx, '[情境 7] 花費 MP 不應播放受擊音效');
        assert.equal(floatTextCount, beforeMpFloat + 1, '[情境 7] 花費 MP 仍應顯示 1 筆浮動文字');

        // 情境 8：重開遊戲流程必須清空首次入鐘面追蹤器（避免模糊浮現特效不再播放）
        const uiSrc = readProjectFile('js/ui/ui.js');
        assert(/uiTokenMemory = \{\};[^\n]*\r?\n\s*trackedEnteredClockPlayerIds\.clear\(\);/.test(uiSrc), '[情境 8] 重開遊戲流程應呼叫 trackedEnteredClockPlayerIds.clear()');

        // 情境 9：玩家操控受詛者時，護盾抵消應顯示「護盾抵免」且不觸發受擊震動／音效；護盾耗盡重置不應顯示 +2 ⛨
        uiWin.getEffectiveHumanPlayerId = () => 'SCZ';
        uiCtx.getEffectiveHumanPlayerId = () => 'SCZ';
        const makeSczRoundState = (gear, die, extra = {}) => ({
            gameMode: '5P',
            gameRound: 1,
            roundMarker: 1,
            phase: 'idle',
            gameEnded: false,
            hasShownGameOverPanel: false,
            players: [
                Object.assign({
                    id: 'SCZ',
                    name: '受詛者',
                    type: '受詛者',
                    roleCard: '受詛者',
                    isHuman: true,
                    isEjected: false,
                    gearCards: gear,
                    mana: gear,
                    score: 0,
                    d6Die: die,
                    shieldUsed: false,
                    currentClockPosition: null,
                    hand: [{ value: 10, gear: true }],
                    hourCards: [],
                    specialAbilityUsed: false
                }, extra)
            ],
            hourDeck: [{ number: 1 }, { number: 2 }],
            clockFace: Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] })),
            minuteDiscard: [],
            currentRoundAIChoices: null,
            currentDrawnHourCards: null,
            currentMinuteChoices: null,
            hourPickOrder: null,
            nextHourPickerIndex: 0,
            waitingHourChoice: false,
            waitingHourChoicePlayerId: null,
            waitingAbilityChoice: false,
            waitingAbilityChoicePlayerId: null,
            waitingSecondHandFinalChoice: false,
            waitingSecondHandFinalChoicePlayerId: null,
            waitingMinuteHandChoice: false,
            isPlayingMinuteClash: false,
            sinTargetingMode: 'default'
        });
        uiCtx.resetRightPanels(makeSczRoundState(4, 3));
        uiCtx.updateUI(makeSczRoundState(4, 3));

        const beforeSczBlockScreen = screenShakeCount;
        const beforeSczBlockToken = tokenShakeCount;
        const beforeSczBlockSfx = damageSfxCount;
        const beforeSczBlockFloat = floatTexts.length;
        const sczBlockedState = makeSczRoundState(4, 2, { lastShieldOutcome: 'blocked', triggerShieldAnim: true });
        uiCtx.updateUI(sczBlockedState);
        assert.equal(screenShakeCount, beforeSczBlockScreen, '[情境 9] 受詛者護盾抵消不應觸發畫面震動');
        assert.equal(tokenShakeCount, beforeSczBlockToken, '[情境 9] 受詛者護盾抵消不應觸發棋子受擊震動');
        assert.equal(damageSfxCount, beforeSczBlockSfx, '[情境 9] 受詛者護盾抵消不應播放受擊音效');
        const blockTexts = floatTexts.slice(beforeSczBlockFloat);
        assert.equal(blockTexts.length, 1, '[情境 9] 受詛者護盾抵消應顯示 1 筆抵免浮字');
        assert(blockTexts[0].includes('護盾抵免'), `[情境 9] 浮字應包含「護盾抵免」，實為：${blockTexts[0]}`);
        assert.equal(sczBlockedState.players[0].lastShieldOutcome, undefined, '[情境 9] lastShieldOutcome 應已被消費清除');
        assert.equal(sczBlockedState.players[0].triggerShieldAnim, undefined, '[情境 9] triggerShieldAnim 應已被消費清除');

        // 先降到 1 點護盾（再抵消一次），接著觸發最後 1 點護盾破裂重置 (1 -> 0 -> 3, GP 4 -> 3)
        uiCtx.updateUI(makeSczRoundState(4, 1, { lastShieldOutcome: 'blocked', triggerShieldAnim: true }));
        const beforeSczBreakFloat = floatTexts.length;
        uiCtx.updateUI(makeSczRoundState(3, 3, { lastShieldOutcome: 'broken', triggerShieldAnim: true }));
        const breakTexts = floatTexts.slice(beforeSczBreakFloat);
        assert(breakTexts.some(t => t.includes('GP')), `[情境 9] 護盾耗盡應顯示 GP 扣減浮字：${breakTexts.join(', ')}`);
        assert(!breakTexts.some(t => t.includes('⛨') || t.includes('+2')), `[情境 9] 護盾破裂重置不應顯示誤導的 +2 ⛨：${breakTexts.join(', ')}`);

        // 情境 10：分針能力選擇面板應顯示 ↺ 逆時針 ( X ) 與 ↻ 順時針 ( Y ) 預覽目標數字
        const evoChildren = [];
        const evoAreaMock = {
            innerHTML: '',
            appendChild: (node) => {
                evoChildren.push(node);
                return node;
            }
        };
        const origGetById = uiDoc.getElementById;
        const origCreateEl = uiDoc.createElement;
        uiDoc.getElementById = (id) => (id === 'evolution-progress-area' ? evoAreaMock : origGetById(id));
        uiDoc.createElement = (tag) => {
            const el = origCreateEl(tag);
            el.children = [];
            el.appendChild = (child) => { el.children.push(child); return child; };
            return el;
        };
        uiWin.GAME_CONFIG.enableAbilities = true;
        const minClock = Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] }));
        minClock[3].cards.push({ number: 4 });
        minClock[5].cards.push({ number: 6 });
        uiCtx.renderEvolutionPanel({
            gameMode: '5P',
            abilityMarker: false,
            waitingMinuteHandChoice: true,
            clockFace: minClock,
            players: []
        }, {
            id: 'SM_1',
            type: '時魔',
            roleCard: '分針',
            isEjected: false,
            mana: 3,
            currentClockPosition: 5,
            hourCards: []
        });
        uiDoc.getElementById = origGetById;
        uiDoc.createElement = origCreateEl;
        const panelEl = evoChildren[0];
        const btnGroupEl = panelEl && Array.isArray(panelEl.children)
            ? panelEl.children.find(n => Array.isArray(n.children) && n.children.length === 3)
            : null;
        assert(btnGroupEl, '[情境 10] 分針能力應渲染 3 個按鈕');
        assert.equal(btnGroupEl.children[0].textContent, '↺ 逆時針 ( 4 )', '[情境 10] 逆時針按鈕應顯示前往刻度 4');
        assert.equal(btnGroupEl.children[1].textContent, '↻ 順時針 ( 6 )', '[情境 10] 順時針按鈕應顯示前往刻度 6');

        // 情境 11：escapeHtml 特殊字元轉義驗證
        assert.equal(typeof uiWin.escapeHtml, 'function', '[情境 11] window.escapeHtml 應已導出');
        assert.equal(
            uiWin.escapeHtml(`<script>"a"&'b'</script>`),
            '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;',
            '[情境 11] escapeHtml 應完整轉義 HTML 特殊字元'
        );
    }

    return `9 個 UI 依賴腳本載入 0 例外，${expectedFunctions.length} 個核心函式、${expectedWindowExports.length} 個 window 導出、扇形手牌、${nextBtnCases.length} 種按鈕狀態與換局震動防護測試全數通過`;
}

