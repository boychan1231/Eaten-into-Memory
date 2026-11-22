import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 4：無頭對戰壓力測試 (5P × 20 場 + 3P × 20 場 = 40 場)
// =========================================================
export function stage4HeadlessStressTest() {
    const rawSeed = process.env.VERIFY_SEED;
    const baseSeed = (rawSeed !== undefined && rawSeed !== '' && Number.isFinite(Number(rawSeed)))
        ? (Number(rawSeed) >>> 0)
        : 20261121;

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
    for (const pureMode of ['PURE_3P', 'PURE_4P', 'PURE_5P']) {
        scenarios.push({ mode: pureMode, enableAbilities: false, aiDifficulty: 'normal', humanId: 'SM_1', threePRole: '時針' });
        scenarios.push({ mode: pureMode, enableAbilities: false, aiDifficulty: 'easy', humanId: 'SM_1', threePRole: '時針' });
    }

    let totalTurnsSimulated = 0;

    scenarios.forEach((sc, idx) => {
        const scenarioSeed = (baseSeed + idx * 1009) >>> 0;
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
                    throw new Error(`場次 #${idx + 1} (${sc.mode}, seed=${scenarioSeed}) 發生無限計時器迴圈`);
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
        for (const rel of ['js/core/config.js', 'js/core/logger.js', 'js/core/abilities.js', 'js/core/game_setup.js', 'js/core/ai_engine.js', 'js/core/game.js']) {
            vm.runInContext(readProjectFile(rel), ctx);
        }

        if (typeof ctx.setRandomSeed === 'function') {
            ctx.setRandomSeed(scenarioSeed);
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
        if (sc.mode.startsWith('PURE')) {
            const expectedPlayers = sc.mode === 'PURE_3P' ? 3 : (sc.mode === 'PURE_5P' ? 5 : 4);
            assert.equal(gs.players.length, expectedPlayers, `${sc.mode} 玩家人數應為 ${expectedPlayers}`);
            assert.equal(gs.hourDeck.length, 24, `${sc.mode} 小時牌庫應為 24 張`);
            gs.players.forEach(p => {
                assert.equal(p.currentClockPosition, null, `${sc.mode} 開局不應隨機指派初始鐘面位置`);
                assert.equal(p.mana, 0, `${sc.mode} 不應有 MP`);
                assert.equal(p.d6Die, null, `${sc.mode} 不應有 d6Die 護盾`);
            });
        }
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

    // 額外回歸檢查：handleHumanChoice 清除時序與 finishHourSelection 前空窗防呆
    {
        const guardTimerQueue = [];
        let guardTimerId = 1;
        const guardWin = {
            appLogger: { log: () => {}, warn: () => {}, error: () => {} },
            AutoNextRoundTimer: { start: () => {}, stop: () => {}, pause: () => {}, resume: () => {} },
            updateUI: () => {},
            renderGameOverPanel: () => {}
        };
        guardWin.window = guardWin;
        const guardDoc = {
            getElementById: () => ({ disabled: false, textContent: '', classList: { add: () => {}, remove: () => {} }, style: {} }),
            querySelector: () => null,
            querySelectorAll: () => []
        };
        const guardCtx = {
            window: guardWin,
            document: guardDoc,
            console: { log: () => {}, warn: () => {}, error: console.error },
            setTimeout: (fn) => { const id = guardTimerId++; guardTimerQueue.push({ id, fn }); return id; },
            clearTimeout: (id) => { const pos = guardTimerQueue.findIndex(t => t.id === id); if (pos >= 0) guardTimerQueue.splice(pos, 1); },
            appLogger: guardWin.appLogger,
            updateUI: () => {},
            renderGameOverPanel: () => {}
        };
        vm.createContext(guardCtx);
        for (const rel of ['js/core/config.js', 'js/core/logger.js', 'js/core/abilities.js', 'js/core/game_setup.js', 'js/core/ai_engine.js', 'js/core/game.js']) {
            vm.runInContext(readProjectFile(rel), guardCtx);
        }
        guardCtx.GAME_CONFIG.gameMode = '5P';
        guardCtx.GAME_CONFIG.enableAbilities = false;
        guardCtx.GAME_CONFIG.testMode = false;
        guardCtx.GAME_CONFIG.tutorialMode = false;
        guardCtx.setHumanPlayerId('SM_1');

        const guardGs = guardCtx.initializeGame('5P');
        guardCtx.startRound(guardGs);
        const origResolve = guardCtx.resolveMinuteCardSelection;
        let aiChoicesDuringResolve = 'UNSET';
        guardCtx.resolveMinuteCardSelection = (g, c, o) => {
            aiChoicesDuringResolve = g.currentRoundAIChoices;
            return origResolve(g, c, o);
        };
        const humanP = guardGs.players.find(p => p.id === 'SM_1');
        assert(humanP && humanP.hand.length > 0, '回歸檢查需要人類玩家手牌');
        guardCtx.handleHumanChoice(guardGs, humanP.hand[0].value);
        assert.equal(aiChoicesDuringResolve, null, '進入 resolveMinuteCardSelection 時 currentRoundAIChoices 必須已清空為 null');

        // 模擬 AI 剛拿走最後一張小時卡、尚未執行 finishHourSelection() 的空窗期
        guardGs.currentRoundAIChoices = null;
        guardGs.waitingHourChoice = false;
        guardGs.waitingHourChoicePlayerId = null;
        guardGs.waitingAbilityChoice = false;
        guardGs.waitingSecondHandFinalChoice = false;
        guardGs.waitingMinuteHandChoice = false;
        guardGs.isPlayingMinuteClash = false;
        guardGs.currentDrawnHourCards = [];
        guardGs.hourPickOrder = [{ playerId: 'SM_1' }, { playerId: 'AI_1' }];
        guardGs.nextHourPickerIndex = 2;
        const deckLenBefore = guardGs.hourDeck.length;
        const pickOrderBefore = guardGs.hourPickOrder;
        guardCtx.startRound(guardGs);
        assert.equal(guardGs.hourDeck.length, deckLenBefore, 'hourPickOrder 尚未結束時 startRound 不得提前抽牌開新回合');
        assert.equal(guardGs.hourPickOrder, pickOrderBefore, 'hourPickOrder 尚未結束時 startRound 應被防呆攔截');

        // 受詛者護盾抵消與耗盡重置邏輯回歸檢查
        const sczTest = { id: 'SCZ', name: '受詛者', type: '受詛者', gearCards: 4, mana: 4, d6Die: 3 };
        assert.equal(guardCtx.handleDiceDeduction(sczTest), false, '受詛者護盾 3 -> 2 應抵消不扣 GP');
        assert.equal(sczTest.d6Die, 2);
        assert.equal(sczTest.gearCards, 4);
        assert.equal(sczTest.lastShieldOutcome, 'blocked');
        assert.equal(guardCtx.handleDiceDeduction(sczTest), false, '受詛者護盾 2 -> 1 應抵消不扣 GP');
        assert.equal(sczTest.d6Die, 1);
        assert.equal(guardCtx.handleDiceDeduction(sczTest), true, '受詛者最後 1 點護盾耗盡應扣 1 GP');
        assert.equal(sczTest.gearCards, 3);
        assert.equal(sczTest.d6Die, 3, '受詛者扣 GP 後護盾應重置為 min(gearCards, 3)');
        assert.equal(sczTest.lastShieldOutcome, 'broken');

        const zeroShieldScz = { id: 'SCZ', name: '受詛者', type: '受詛者', gearCards: 2, mana: 2, d6Die: 0 };
        assert.equal(guardCtx.handleDiceDeduction(zeroShieldScz), true, 'd6Die 為 0 時仍應正常扣 GP');
        assert.equal(zeroShieldScz.gearCards, 1);

        // 時之惡單獨受罰：如常先扣盾再扣 GP 並重置，結算後仍存活再回 1 MP
        const sinAloneGs = {
            gameMode: '5P',
            gameRound: 1,
            roundMarker: 1,
            sinTargetingMode: 'default',
            clockFace: Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] })),
            players: [
                { id: 'sin', name: '時之惡', type: '時之惡', roleCard: '時之惡', isEjected: false, gearCards: 4, mana: 1, d6Die: 3, currentClockPosition: 12, hourCards: [] },
                { id: 'SM_1', name: '時魔 1', type: '時魔', roleCard: '時魔幼體 1', isEjected: false, gearCards: 4, mana: 4, d6Die: null, currentClockPosition: 5, hourCards: [] }
            ]
        };
        guardCtx.deductGearCards(sinAloneGs);
        const sinActor = sinAloneGs.players[0];
        assert.equal(sinActor.d6Die, 2, '時之惡單獨受罰應先扣 1 點護盾 (3 -> 2)');
        assert.equal(sinActor.gearCards, 4, '護盾未歸零時不扣 GP');
        assert.equal(sinActor.mana, 2, '時之惡單獨受罰結算後應恢復 1 MP (1 -> 2)');

        // 剩 1 點護盾時單獨受罰：先扣盾歸零 -> 扣 1 GP 並重置護盾為 min(GP+1, 5) -> 再回 1 MP (上限為新 GP)
        sinActor.d6Die = 1;
        sinActor.mana = 1;
        guardCtx.deductGearCards(sinAloneGs);
        assert.equal(sinActor.gearCards, 3, '時之惡最後 1 點護盾耗盡應扣 1 GP (4 -> 3)');
        assert.equal(sinActor.d6Die, 4, '時之惡護盾應重置為 min(3+1, 5) = 4');
        assert.equal(sinActor.mana, 2, '時之惡扣 GP 並重置後仍應恢復 1 MP (1 -> 2)');

        // 分針目標搜尋輔助函式驗證（含跨 1/12 邊界與無牌時回傳 null）
        const minTargetClock = Array.from({ length: 12 }, (_, i) => ({ position: i + 1, cards: [] }));
        minTargetClock[3].cards.push({ number: 4 });
        minTargetClock[5].cards.push({ number: 6 });
        assert.equal(guardCtx.findMinuteHandTargetPosition({ clockFace: minTargetClock }, 5, 'ccw'), 4);
        assert.equal(guardCtx.findMinuteHandTargetPosition({ clockFace: minTargetClock }, 5, 'cw'), 6);
        assert.equal(guardCtx.findMinuteHandTargetPosition({ clockFace: minTargetClock }, 1, 'ccw'), 6);
        assert.equal(guardCtx.findMinuteHandTargetPosition({ clockFace: minTargetClock }, 12, 'cw'), 4);

        // 種子亂數可重現性驗證
        guardCtx.setRandomSeed(123456);
        const seqA = [guardCtx.getRandom(), guardCtx.getRandom(), guardCtx.getRandomInt(60)];
        guardCtx.setRandomSeed(123456);
        const seqB = [guardCtx.getRandom(), guardCtx.getRandom(), guardCtx.getRandomInt(60)];
        assert.deepEqual(seqA, seqB, '相同種子應產生完全一致的亂數序列');
        guardCtx.clearRandomSeed();

        // GameScheduler 集中排程與重開新局自動清除驗證
        let staleFired = false;
        const pendingBefore = guardCtx.GameScheduler.pendingCount();
        guardCtx.GameScheduler.schedule(() => { staleFired = true; }, 50);
        assert.equal(guardCtx.GameScheduler.pendingCount(), pendingBefore + 1, 'GameScheduler 應追蹤待執行計時器');
        guardCtx.initializeGame('5P');
        assert.equal(guardCtx.GameScheduler.pendingCount(), 0, 'initializeGame 應清除所有殘留計時器');
        while (guardTimerQueue.length > 0) {
            guardTimerQueue.shift().fn();
        }
        assert.equal(staleFired, false, '重開新局後舊計時器不應再被觸發');
    }

    return `${scenarios.length} 場完整對局壓力測試通過 (seed=${baseSeed})，0 例外 / 0 死鎖 (累計推進 ${totalTurnsSimulated} 步)`;
}

