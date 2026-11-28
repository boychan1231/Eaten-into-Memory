import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function readProjectFile(relPath) {
    return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

function parseArgs(argv) {
    const opts = {
        games: 50,
        seed: 20261121,
        modes: ['5P', '4P', '3P'],
        abilities: true,
        difficulty: 'normal'
    };
    for (const arg of argv) {
        if (arg.startsWith('--games=')) {
            const n = Number(arg.slice('--games='.length));
            if (Number.isFinite(n) && n > 0) opts.games = Math.floor(n);
        } else if (arg.startsWith('--seed=')) {
            const s = Number(arg.slice('--seed='.length));
            if (Number.isFinite(s)) opts.seed = s >>> 0;
        } else if (arg.startsWith('--mode=')) {
            opts.modes = arg.slice('--mode='.length).split(',').map(s => s.trim()).filter(Boolean);
        } else if (arg.startsWith('--abilities=')) {
            opts.abilities = arg.slice('--abilities='.length) !== 'false';
        } else if (arg.startsWith('--difficulty=')) {
            opts.difficulty = arg.slice('--difficulty='.length);
        }
    }
    return opts;
}

function runSingleMatch({ mode, seed, enableAbilities, aiDifficulty, humanId, threePRole }) {
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
                throw new Error(`計時器迴圈上限超出 (mode=${mode}, seed=${seed})`);
            }
            timerQueue.shift().fn();
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
    for (const rel of ['js/core/config.js', 'js/core/logger.js', 'js/core/abilities.js', 'js/core/game_setup.js', 'js/core/ai_engine.js', 'js/core/penalty.js', 'js/core/game.js']) {
        vm.runInContext(readProjectFile(rel), ctx);
    }

    ctx.setRandomSeed(seed);
    ctx.GAME_CONFIG.gameMode = mode;
    ctx.GAME_CONFIG.enableAbilities = enableAbilities;
    ctx.GAME_CONFIG.aiDifficulty = aiDifficulty;
    ctx.GAME_CONFIG.threePStartingRole = threePRole;
    ctx.GAME_CONFIG.testMode = false;
    ctx.GAME_CONFIG.tutorialMode = false;
    if (typeof ctx.setHumanPlayerId === 'function') {
        ctx.setHumanPlayerId(humanId);
    }

    const gs = ctx.initializeGame(mode);
    let steps = 0;
    const maxSteps = 450;

    while (!gs.gameEnded && steps < maxSteps) {
        steps++;
        flushTimers();
        if (gs.gameEnded) break;

        const effectiveHumanId = typeof ctx.getEffectiveHumanPlayerId === 'function' ? ctx.getEffectiveHumanPlayerId() : humanId;
        const human = gs.players.find(p => p.id === effectiveHumanId) || gs.players[0];

        if (gs.waitingSecondHandFinalChoice && Array.isArray(gs.secondHandPendingCards) && gs.secondHandPendingCards.length > 0) {
            ctx.handleHumanSecondHandFinalChoice(gs, gs.secondHandPendingCards[0].value);
        } else if (gs.currentRoundAIChoices !== null) {
            // 讓代打人類也使用 AI 出牌邏輯（傳入淺拷貝避免 makeAIChoice 直接 splice 原手牌）
            let chosenVal = human.hand[0].value;
            const aiFn = (mode === '3P') ? ctx.makeAIChoice3P : ctx.makeAIChoice;
            if (typeof aiFn === 'function') {
                const humanCopy = { ...human, hand: [...human.hand] };
                const picked = aiFn(humanCopy, gs);
                if (picked && typeof picked.value === 'number' && human.hand.some(c => c.value === picked.value)) {
                    chosenVal = picked.value;
                }
            }
            ctx.handleHumanChoice(gs, chosenVal);
        } else if (gs.waitingHourChoice) {
            let pickIdx = 0;
            const hourAiFn = (mode === '3P') ? ctx.chooseHourCardForAI3P : ctx.chooseHourCardForAI;
            if (typeof hourAiFn === 'function' && Array.isArray(gs.currentDrawnHourCards) && gs.currentDrawnHourCards.length > 0) {
                const copy = [...gs.currentDrawnHourCards];
                const picked = hourAiFn(gs, human, copy);
                const foundIdx = gs.currentDrawnHourCards.indexOf(picked);
                if (foundIdx >= 0) pickIdx = foundIdx;
            }
            ctx.handleHumanHourCardChoice(gs, pickIdx);
        } else if (gs.waitingMinuteHandChoice) {
            ctx.handleHumanAbilityChoice(gs, 'skip');
        } else {
            ctx.startRound(gs);
        }

        flushTimers();
    }

    if (!gs.gameEnded) {
        const flags = {
            gameRound: gs.gameRound,
            roundMarker: gs.roundMarker,
            waitingHourChoice: gs.waitingHourChoice,
            waitingMinuteHandChoice: gs.waitingMinuteHandChoice,
            waitingAbilityChoice: gs.waitingAbilityChoice,
            waitingSecondHandFinalChoice: gs.waitingSecondHandFinalChoice,
            currentRoundAIChoices: gs.currentRoundAIChoices !== null,
            drawnLen: (gs.currentDrawnHourCards || []).length,
            pickOrderLen: (gs.hourPickOrder || []).length
        };
        throw new Error(`對局未於 ${maxSteps} 步內結束 (mode=${mode}, seed=${seed}, flags=${JSON.stringify(flags)})`);
    }

    return gs;
}

function summarizeMode(mode, opts) {
    const stats = new Map();
    const specialWinCounts = new Map();
    const rolePool5P = ['SM_1', 'SM_2', 'SM_3', 'sin', 'SCZ'];
    const rolePool4P = ['SM_1', 'SM_2', 'SM_3', 'sin'];
    const threePRoles = ['時針', '分針', '秒針'];

    for (let i = 0; i < opts.games; i++) {
        const matchSeed = (opts.seed + i * 7919 + mode.charCodeAt(0) * 131) >>> 0;
        const humanId = mode === '5P'
            ? rolePool5P[i % rolePool5P.length]
            : (mode === '4P' ? rolePool4P[i % rolePool4P.length] : 'SM_1');
        const threePRole = threePRoles[i % threePRoles.length];
        const gs = runSingleMatch({
            mode,
            seed: matchSeed,
            enableAbilities: opts.abilities,
            aiDifficulty: opts.difficulty,
            humanId,
            threePRole
        });

        const maxScore = Math.max(...gs.players.map(p => Number(p.score) || 0));
        const winnerIds = new Set(
            Array.isArray(gs.winners) && gs.winners.length > 0
                ? gs.winners.map(w => (typeof w === 'string' ? w : w.id))
                : gs.players.filter(p => (Number(p.score) || 0) === maxScore).map(p => p.id)
        );

        const winTag = gs.specialVictoryType || gs.winReason || '一般積分勝利';
        specialWinCounts.set(winTag, (specialWinCounts.get(winTag) || 0) + 1);

        // 統計每位玩家在 scoreHistory 中被吞噬的總次數
        const ejectCountById = new Map();
        if (Array.isArray(gs.scoreHistory)) {
            for (const roundEntry of gs.scoreHistory) {
                if (!Array.isArray(roundEntry.players)) continue;
                for (const pEntry of roundEntry.players) {
                    if (pEntry.wasEjected) {
                        ejectCountById.set(pEntry.id, (ejectCountById.get(pEntry.id) || 0) + 1);
                    }
                }
            }
        }

        for (const p of gs.players) {
            const key = (mode === '5P' || mode === '4P') ? `${p.id} (${p.type})` : (p.roleCard || p.id);
            if (!stats.has(key)) {
                stats.set(key, { key, games: 0, wins: 0, totalScore: 0, totalEjections: 0 });
            }
            const rec = stats.get(key);
            rec.games++;
            if (winnerIds.has(p.id)) rec.wins++;
            rec.totalScore += Number(p.score) || 0;
            rec.totalEjections += ejectCountById.get(p.id) || 0;
        }
    }

    console.log(`\n=== 模式：${mode}｜場次：${opts.games}｜異能：${opts.abilities ? '開' : '關'}｜難度：${opts.difficulty}｜種子：${opts.seed} ===`);
    console.log('角色 / 座位'.padEnd(22) + '勝率'.padStart(10) + '平均總分'.padStart(12) + '場均被吞噬'.padStart(12));
    console.log('-'.repeat(58));
    for (const rec of [...stats.values()].sort((a, b) => b.wins - a.wins)) {
        const winRate = ((rec.wins / rec.games) * 100).toFixed(1) + '%';
        const avgScore = (rec.totalScore / rec.games).toFixed(2);
        const avgEject = (rec.totalEjections / rec.games).toFixed(2);
        console.log(rec.key.padEnd(22) + winRate.padStart(10) + avgScore.padStart(12) + avgEject.padStart(12));
    }

    const winSummary = [...specialWinCounts.entries()]
        .map(([k, v]) => `${k}: ${v} 場 (${((v / opts.games) * 100).toFixed(1)}%)`)
        .join(' | ');
    console.log(`勝利類型分佈：${winSummary}`);
}

const opts = parseArgs(process.argv.slice(2));
console.log('《蝕入記憶》(Eaten into Memory) 角色勝率與平衡性模擬報告');
for (const mode of opts.modes) {
    summarizeMode(mode, opts);
}
