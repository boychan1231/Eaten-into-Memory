import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CORE_FILES = [
  'js/core/config.js',
  'js/core/logger.js',
  'js/core/abilities.js',
  'js/core/game_setup.js',
  'js/core/ai_engine.js',
  'js/core/penalty.js',
  'js/core/game.js',
];

const CORE_SOURCES = CORE_FILES.map((rel) => ({
  rel,
  code: fs.readFileSync(path.join(ROOT_DIR, rel), 'utf-8'),
}));

export function normalizeGameMode(rawMode) {
  const m = String(rawMode || '5P').trim().toUpperCase();
  if (['5P', '4P', '3P', 'PURE_3P', 'PURE_4P', 'PURE_5P'].includes(m)) return m;
  return '5P';
}

/**
 * 《蝕入記憶》無頭權威規則引擎（每個多人房間獨立一個 vm 隔離沙盒）
 * 直接複用 js/core/ 全套 3P/4P/5P 規則、角色異能、幼體進化與 AI 補位
 */
export class HeadlessGameEngine {
  constructor({
    mode = '5P',
    enableAbilities = true,
    aiDifficulty = 'normal',
    seed = null,
    humanPlayers = [], // [{ controllerId, name }]
  } = {}) {
    this.mode = normalizeGameMode(mode);
    this.isPure = this.mode.startsWith('PURE');
    this.enableAbilities = this.isPure ? false : Boolean(enableAbilities);
    this.aiDifficulty = aiDifficulty === 'easy' ? 'easy' : 'normal';
    this.seed = Number.isInteger(seed) ? seed : (Date.now() & 0x7fffffff);

    this.timerQueue = [];
    this.nextTimerId = 1;
    this.eventBuffer = [];
    this.roundHistory = [];

    // 多人類狀態追蹤
    this.seatToController = new Map(); // seatId -> controllerId
    this.controllerToSeat = new Map(); // controllerId -> seatId
    this.humanSeatIds = new Set();

    // 暗拍階段暫存（支援多人類同步蓋牌）
    this.pendingMinuteSeatIds = new Set();
    this.submittedMinuteChoices = new Map(); // seatId -> choice entry
    this.aiMinuteChoices = [];
    this.pendingSecondHandSeatId = null;

    // 建立隔離沙盒並載入原汁原味 js/core/
    this.ctx = this._createSandbox();
    this._installMultiplayerHooks();

    // 套用開局設定
    if (typeof this.ctx.setRandomSeed === 'function') {
      this.ctx.setRandomSeed(this.seed);
    }
    this.ctx.GAME_CONFIG.gameMode = this.mode;
    this.ctx.GAME_CONFIG.enableAbilities = this.enableAbilities;
    this.ctx.GAME_CONFIG.aiDifficulty = this.aiDifficulty;
    this.ctx.GAME_CONFIG.testMode = false;
    this.ctx.GAME_CONFIG.tutorialMode = false;

    // 初始化牌局
    this.gs = this.ctx.initializeGame(this.mode);

    // 將真實人類玩家依序綁定至席位，缺位自動由原生 AI 控制
    const maxHumans = Math.min(humanPlayers.length, this.gs.players.length);
    for (let i = 0; i < maxHumans; i++) {
      const seat = this.gs.players[i];
      const hp = humanPlayers[i];
      seat.name = hp.name || seat.name;
      this.humanSeatIds.add(seat.id);
      this.seatToController.set(seat.id, hp.controllerId);
      this.controllerToSeat.set(hp.controllerId, seat.id);
    }

    if (maxHumans > 0 && typeof this.ctx.setHumanPlayerId === 'function') {
      this.ctx.setHumanPlayerId(this.gs.players[0].id);
    }

    // 啟動第 1 局第 1 回合
    this._runWithDiff(() => {
      this.ctx.startRound(this.gs);
      this._flushTimers();
    });
  }

  _createSandbox() {
    const fakeSetTimeout = (fn) => {
      const id = this.nextTimerId++;
      this.timerQueue.push({ id, fn });
      return id;
    };
    const fakeClearTimeout = (id) => {
      const idx = this.timerQueue.findIndex((t) => t.id === id);
      if (idx >= 0) this.timerQueue.splice(idx, 1);
    };

    const windowMock = {
      appLogger: { log: () => {}, warn: () => {}, error: () => {} },
      AutoNextRoundTimer: { start: () => {}, stop: () => {}, pause: () => {}, resume: () => {} },
      updateUI: () => {},
      renderGameOverPanel: () => {},
    };
    windowMock.window = windowMock;

    const documentMock = {
      getElementById: () => ({
        disabled: false,
        textContent: '',
        classList: { add: () => {}, remove: () => {} },
        style: {},
      }),
      querySelector: () => null,
      querySelectorAll: () => [],
    };

    const ctx = {
      window: windowMock,
      document: documentMock,
      console: { log: () => {}, warn: () => {}, error: console.error },
      setTimeout: fakeSetTimeout,
      clearTimeout: fakeClearTimeout,
      appLogger: windowMock.appLogger,
      updateUI: () => {},
      renderGameOverPanel: () => {},
    };

    vm.createContext(ctx);
    for (const src of CORE_SOURCES) {
      vm.runInContext(src.code, ctx, { filename: src.rel });
    }
    return ctx;
  }

  _installMultiplayerHooks() {
    const engine = this;
    const ctx = this.ctx;
    const origResolveMinute = ctx.resolveMinuteCardSelection;
    const origStartRound = ctx.startRound;

    // 1. 記錄新回合開始與翻出的小時卡
    ctx.startRound = function (gs) {
      gs.__serverHumanSeatIds = Array.from(engine.humanSeatIds);
      const prevRound = gs.gameRound;
      const prevMarker = gs.roundMarker;
      origStartRound(gs);
      if (Array.isArray(gs.currentDrawnHourCards) && gs.currentDrawnHourCards.length > 0) {
        engine.eventBuffer.push({
          type: 'ROUND_STARTED',
          gameRound: gs.gameRound,
          roundMarker: gs.roundMarker,
          isNewGameRound: gs.gameRound !== prevRound || prevMarker === 1,
          drawnHourCards: gs.currentDrawnHourCards.map((c) => ({
            number: c.number,
            ageGroup: c.ageGroup,
            isPrecious: Boolean(c.isPrecious),
          })),
        });
      }
    };

    // 2. 多人類同步暗拍：AI 立即出牌，所有存活且有手牌的真實玩家進入等待集合
    ctx.processMinuteCardSelection = function (gs) {
      engine.pendingMinuteSeatIds.clear();
      engine.submittedMinuteChoices.clear();
      engine.aiMinuteChoices = [];
      engine.pendingSecondHandSeatId = null;

      for (const player of gs.players) {
        if (player.isEjected) continue;
        if (!Array.isArray(player.hand) || player.hand.length === 0) continue;

        if (engine.humanSeatIds.has(player.id)) {
          engine.pendingMinuteSeatIds.add(player.id);
        } else {
          const card = ctx.makeAIChoice(player, gs);
          if (card) {
            engine.aiMinuteChoices.push({
              playerId: player.id,
              playerName: player.name,
              card,
              roleType: player.type,
            });
          }
        }
      }

      if (engine.pendingMinuteSeatIds.size > 0) {
        gs.phase = 'minute';
        gs.currentRoundAIChoices = engine.aiMinuteChoices;
        return;
      }

      gs.currentRoundAIChoices = null;
      ctx.resolveMinuteCardSelection(gs, [...engine.aiMinuteChoices]);
    };

    // 3. 攔截開牌結算，輸出 REVEAL_BIDS 事件
    ctx.resolveMinuteCardSelection = function (gs, choices, options = {}) {
      origResolveMinute(gs, choices, options);
      if (Array.isArray(gs.currentMinuteChoices) && gs.currentMinuteChoices.length > 0) {
        const bids = gs.currentMinuteChoices
          .filter((c) => c && c.card && typeof c.card.value === 'number')
          .map((c) => ({
            seatId: c.playerId,
            name: c.playerName,
            value: c.card.value,
            gear: c.card.gear ?? 0,
          }));
        if (bids.length > 0) {
          engine.eventBuffer.push({
            type: 'REVEAL_BIDS',
            gameRound: gs.gameRound,
            roundMarker: gs.roundMarker,
            bids,
            winner: bids[0] || null,
          });
        }
      }
    };

    // 4. 多人類挑小時卡：依順位輪到真實人類即暫停，AI 則自動執行
    ctx.processNextHourPicker = function (gs) {
      const drawnCards = gs.currentDrawnHourCards || [];
      const pickers = gs.hourPickOrder || [];

      if (!pickers || drawnCards.length === 0 || gs.nextHourPickerIndex >= pickers.length) {
        ctx.finishHourSelection(gs);
        return;
      }

      const pickerInfo = pickers[gs.nextHourPickerIndex];
      const player = gs.players.find((p) => p.id === pickerInfo.playerId);

      if (!player || player.isEjected) {
        gs.nextHourPickerIndex++;
        ctx.processNextHourPicker(gs);
        return;
      }

      if (engine.humanSeatIds.has(player.id)) {
        gs.phase = 'hour';
        gs.waitingHourChoice = true;
        gs.waitingHourChoicePlayerId = player.id;
        return;
      }

      const chosenCard = ctx.chooseHourCardForAI(gs, player, drawnCards);
      if (!chosenCard) {
        ctx.finishHourSelection(gs);
        return;
      }

      ctx.placeHourCardForPlayer(gs, player, chosenCard, pickerInfo.playerName);
      gs.nextHourPickerIndex++;
      ctx.processNextHourPicker(gs);
    };

    // 5. 多人類放牌後分針跳格判定
    ctx.finishHourSelection = function (gs) {
      gs.currentDrawnHourCards = null;
      gs.waitingHourChoice = false;
      gs.waitingHourChoicePlayerId = null;
      gs.hourPickOrder = null;
      gs.nextHourPickerIndex = 0;

      const choices = gs.currentMinuteChoices || [];
      ctx.recordMinuteDiscard(gs, choices);

      if (engine.isPure) {
        ctx.deductGearCards(gs);
        return;
      }

      const minuteCost = engine.mode === '3P' ? 3 : 2;
      const hasEnoughClockCards =
        typeof ctx.hasEnoughClockCardsForMinuteHand === 'function'
          ? ctx.hasEnoughClockCardsForMinuteHand(gs)
          : true;

      // 先檢查是否有真實人類分針符合觸發條件
      const humanMinutePlayer = hasEnoughClockCards
        ? gs.players.find(
            (p) =>
              engine.humanSeatIds.has(p.id) &&
              p.roleCard === '分針' &&
              !p.isEjected &&
              p.mana >= minuteCost &&
              !gs.abilityMarker &&
              !p.specialAbilityUsed &&
              p.pickedHourThisTurn === true &&
              typeof p.pickedHourCardThisTurnNumber === 'number'
          )
        : null;

      if (ctx.GAME_CONFIG.enableAbilities && humanMinutePlayer) {
        if (typeof ctx.setHumanPlayerId === 'function') {
          ctx.setHumanPlayerId(humanMinutePlayer.id);
        }
        gs.phase = 'postHour';
        gs.waitingMinuteHandChoice = true;
        gs.waitingMinuteHandChoicePlayerId = humanMinutePlayer.id;
        return;
      }

      if (typeof ctx.minuteHandPostHourAI === 'function') {
        ctx.minuteHandPostHourAI(gs);
      }

      ctx.deductGearCards(gs);
    };
  }

  _flushTimers(maxFlush = 200) {
    let count = 0;
    while (this.timerQueue.length > 0) {
      if (count++ >= maxFlush) {
        throw new Error('伺服器計時器佇列超過上限，中止以防止死鎖');
      }
      const item = this.timerQueue.shift();
      item.fn();
    }
  }

  _snapshotPlayers() {
    return this.gs.players.map((p) => ({
      id: p.id,
      name: p.name,
      pos: p.currentClockPosition,
      gear: p.gearCards,
      mana: p.mana,
      ejected: Boolean(p.isEjected),
      score: p.score,
    }));
  }

  _runWithDiff(fn) {
    const beforePlayers = this._snapshotPlayers();
    const beforeGameRound = this.gs.gameRound;
    const beforeGameEnded = Boolean(this.gs.gameEnded);

    fn();

    const afterPlayers = this._snapshotPlayers();

    for (let i = 0; i < afterPlayers.length; i++) {
      const b = beforePlayers[i];
      const a = afterPlayers[i];
      if (!b || !a) continue;

      if (a.pos !== b.pos && a.pos !== null) {
        this.eventBuffer.push({
          type: 'MOVE_TOKEN',
          seatId: a.id,
          name: a.name,
          from: b.pos,
          to: a.pos,
        });
      }
      if (a.gear !== b.gear || a.mana !== b.mana) {
        this.eventBuffer.push({
          type: 'UPDATE_GP_MP',
          seatId: a.id,
          name: a.name,
          gearDelta: a.gear - b.gear,
          manaDelta: a.mana - b.mana,
          gearCards: a.gear,
          mana: a.mana,
        });
      }
      if (!b.ejected && a.ejected) {
        this.eventBuffer.push({
          type: 'EATEN',
          seatId: a.id,
          name: a.name,
        });
      }
    }

    if (this.gs.gameRound !== beforeGameRound) {
      const roundScores = afterPlayers.map((p) => ({ seatId: p.id, name: p.name, score: p.score, gear: p.gear, ejected: p.ejected }));
      this.roundHistory.push({ gameRound: beforeGameRound, scores: roundScores });
      this.eventBuffer.push({
        type: 'ROUND_ENDED',
        completedGameRound: beforeGameRound,
        nextGameRound: this.gs.gameRound,
        scores: afterPlayers.map((p) => ({ seatId: p.id, name: p.name, score: p.score })),
      });
    }

    if (!beforeGameEnded && this.gs.gameEnded) {
      const maxScore = Math.max(...afterPlayers.map((p) => p.score));
      const winners = afterPlayers.filter((p) => p.score === maxScore).map((p) => p.id);
      this.eventBuffer.push({
        type: 'GAME_OVER',
        winners,
        scores: afterPlayers.map((p) => ({ seatId: p.id, name: p.name, score: p.score })),
      });
    }
  }

  consumeEvents() {
    const events = this.eventBuffer.slice();
    this.eventBuffer.length = 0;
    return events;
  }

  getSeatIdByController(controllerId) {
    return this.controllerToSeat.get(controllerId) || null;
  }

  /**
   * 玩家斷線時自動切回 AI 代打，並立即推進卡住的等待階段
   */
  convertControllerToAI(controllerId) {
    const seatId = this.controllerToSeat.get(controllerId);
    if (!seatId) return false;

    this.controllerToSeat.delete(controllerId);
    this.seatToController.delete(seatId);
    this.humanSeatIds.delete(seatId);

    this._runWithDiff(() => {
      const player = this.gs.players.find((p) => p.id === seatId);
      if (player && this.pendingMinuteSeatIds.has(seatId)) {
        this.pendingMinuteSeatIds.delete(seatId);
        const card = this.ctx.makeAIChoice(player, this.gs);
        if (card) {
          this.submittedMinuteChoices.set(seatId, {
            playerId: player.id,
            playerName: player.name,
            card,
            roleType: player.type,
          });
        }
        if (this.pendingMinuteSeatIds.size === 0) {
          this._resolveAllMinuteBids();
        }
      }

      if (this.gs.waitingHourChoice && this.gs.waitingHourChoicePlayerId === seatId) {
        this.gs.waitingHourChoice = false;
        this.gs.waitingHourChoicePlayerId = null;
        this.ctx.processNextHourPicker(this.gs);
      }

      if (this.gs.waitingMinuteHandChoice && this.gs.waitingMinuteHandChoicePlayerId === seatId) {
        this.gs.waitingMinuteHandChoice = false;
        this.gs.waitingMinuteHandChoicePlayerId = null;
        this.ctx.deductGearCards(this.gs);
      }

      this._flushTimers();
    });

    return true;
  }

  /**
   * 處理客戶端指令：PLAY_MINUTE_CARD
   */
  playMinuteCard(controllerId, msg) {
    const seatId = this.getSeatIdByController(controllerId);
    if (!seatId) return { ok: false, message: '你不是本局參戰玩家' };
    if (!this.pendingMinuteSeatIds.has(seatId)) {
      return { ok: false, message: '目前不處於你的暗拍出牌階段' };
    }

    const player = this.gs.players.find((p) => p.id === seatId);
    if (!player || player.isEjected) {
      return { ok: false, message: '玩家已被吞噬，無法出牌' };
    }

    const useSecondHand = Boolean(msg.useSecondHand);

    if (useSecondHand) {
      if (!this.enableAbilities || player.roleCard !== '秒針') {
        return { ok: false, message: '目前不能使用秒針雙牌能力' };
      }
      if (this.gs.abilityMarker || player.specialAbilityUsed) {
        return { ok: false, message: '本回合異能被封印或已使用過' };
      }
      const cost = this.mode === '3P' ? 2 : 3;
      if (player.mana < cost) {
        return { ok: false, message: `MP 不足（需要 ${cost} MP）` };
      }
      const values = Array.isArray(msg.values) ? msg.values.map(Number) : [];
      if (values.length !== 2 || values[0] === values[1]) {
        return { ok: false, message: '秒針能力必須選擇 2 張不同的分鐘卡' };
      }
      const idx1 = player.hand.findIndex((c) => c.value === values[0]);
      const idx2 = player.hand.findIndex((c) => c.value === values[1]);
      if (idx1 === -1 || idx2 === -1) {
        return { ok: false, message: '手牌中找不到指定的秒針雙牌' };
      }

      this._runWithDiff(() => {
        const card1 = player.hand.splice(idx1, 1)[0];
        const nextIdx2 = player.hand.findIndex((c) => c.value === values[1]);
        const card2 = player.hand.splice(nextIdx2, 1)[0];
        player.mana -= cost;
        player.specialAbilityUsed = true;
        this.gs.secondHandPendingCards = [card1, card2];
        this.pendingSecondHandSeatId = seatId;

        this.submittedMinuteChoices.set(seatId, {
          playerId: player.id,
          playerName: player.name,
          card: { type: 'seconds_pending', options: [card1, card2] },
          roleType: player.type,
        });
        this.pendingMinuteSeatIds.delete(seatId);
        this.eventBuffer.push({
          type: 'PLAYER_BID_LOCKED',
          seatId: player.id,
          name: player.name,
          isSecondHand: true,
        });

        if (this.pendingMinuteSeatIds.size === 0) {
          this._enterSecondHandFinalOrResolve();
        }
        this._flushTimers();
      });
      return { ok: true };
    }

    const value = Number(msg.value);
    const swapTo = msg.swapTo !== undefined ? Number(msg.swapTo) : null;
    const isSwap = (value === 60 && swapTo === 1) || (value === 1 && swapTo === 60);
    if (msg.swapTo !== undefined && !isSwap) {
      return { ok: false, message: '無效的秒針 1/60 互換參數' };
    }

    if (isSwap) {
      if (!this.enableAbilities || player.roleCard !== '秒針') {
        return { ok: false, message: '目前不能使用秒針 1/60 互換能力' };
      }
      if (this.gs.abilityMarker || player.specialAbilityUsed) {
        return { ok: false, message: '本回合異能被封印或已使用過' };
      }
      if (player.mana < 1) {
        return { ok: false, message: 'MP 不足（需要 1 MP）' };
      }
      const targetPlayed = Array.isArray(this.gs.minuteDiscard)
        && this.gs.minuteDiscard.some((d) => d && (d.originalValue ?? d.value) === swapTo);
      if (!targetPlayed) {
        return { ok: false, message: `本局尚未打出分鐘卡 ${swapTo}，無法互換` };
      }
    }

    const idx = player.hand.findIndex((c) => c.value === value);
    if (idx === -1) {
      return { ok: false, message: `手牌中沒有點數 ${value} 的分鐘卡` };
    }

    this._runWithDiff(() => {
      const origCard = player.hand.splice(idx, 1)[0];
      let card = origCard;
      if (isSwap) {
        player.mana -= 1;
        player.specialAbilityUsed = true;
        card = {
          ...origCard,
          value: swapTo,
          originalValue: value,
          isSecondHandSwapped: true,
        };
      }
      this.submittedMinuteChoices.set(seatId, {
        playerId: player.id,
        playerName: player.name,
        card,
        roleType: player.type,
      });
      this.pendingMinuteSeatIds.delete(seatId);
      this.eventBuffer.push({
        type: 'PLAYER_BID_LOCKED',
        seatId: player.id,
        name: player.name,
      });

      if (this.pendingMinuteSeatIds.size === 0) {
        this._enterSecondHandFinalOrResolve();
      }
      this._flushTimers();
    });

    return { ok: true };
  }

  _enterSecondHandFinalOrResolve() {
    if (this.pendingSecondHandSeatId) {
      const allOthers = [
        ...this.aiMinuteChoices,
        ...Array.from(this.submittedMinuteChoices.values()).filter(
          (c) => c.playerId !== this.pendingSecondHandSeatId
        ),
      ];
      this.gs.phase = 'postMinute';
      this.gs.waitingSecondHandFinalChoice = true;
      this.gs.waitingSecondHandFinalChoicePlayerId = this.pendingSecondHandSeatId;
      this.gs.secondHandRevealedChoices = allOthers;
      this.gs.currentMinuteChoices = [
        ...allOthers,
        this.submittedMinuteChoices.get(this.pendingSecondHandSeatId),
      ];
      this.gs.currentRoundAIChoices = null;
      return;
    }
    this._resolveAllMinuteBids();
  }

  _resolveAllMinuteBids() {
    const allChoices = [
      ...this.aiMinuteChoices,
      ...Array.from(this.submittedMinuteChoices.values()),
    ];
    this.gs.currentRoundAIChoices = null;
    this.ctx.resolveMinuteCardSelection(this.gs, allChoices);
  }

  /**
   * 處理客戶端指令：PICK_HOUR_CARD
   */
  pickHourCard(controllerId, cardIndex) {
    const seatId = this.getSeatIdByController(controllerId);
    if (!seatId) return { ok: false, message: '你不是本局參戰玩家' };
    if (!this.gs.waitingHourChoice || this.gs.waitingHourChoicePlayerId !== seatId) {
      return { ok: false, message: '目前不是由你挑選小時卡' };
    }

    const idx = Number(cardIndex);
    const drawn = this.gs.currentDrawnHourCards || [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= drawn.length) {
      return { ok: false, message: '無效的小時卡索引' };
    }

    this._runWithDiff(() => {
      if (typeof this.ctx.setHumanPlayerId === 'function') {
        this.ctx.setHumanPlayerId(seatId);
      }
      this.ctx.handleHumanHourCardChoice(this.gs, idx);
      this._flushTimers();
    });

    return { ok: true };
  }

  /**
   * 處理客戶端指令：USE_ABILITY
   */
  useAbility(controllerId, msg) {
    const seatId = this.getSeatIdByController(controllerId);
    if (!seatId) return { ok: false, message: '你不是本局參戰玩家' };

    const ability = String(msg.ability || '').trim().toUpperCase();

    if (ability === 'SIN_PRE_ROUND_DISCARD') {
      if (!this.gs.waitingSinPreRoundDiscard || this.gs.waitingSinPreRoundDiscardPlayerId !== seatId) {
        return { ok: false, message: '目前不處於你的開局棄牌階段' };
      }
      let ok = false;
      this._runWithDiff(() => {
        ok = Boolean(this.ctx.handleHumanSinPreRoundDiscard(this.gs, msg.choice));
        this._flushTimers();
      });
      return ok ? { ok: true } : { ok: false, message: '無效的開局棄牌選擇' };
    }

    if (ability === 'SECOND_HAND_FINAL') {
      if (
        !this.gs.waitingSecondHandFinalChoice ||
        this.gs.waitingSecondHandFinalChoicePlayerId !== seatId
      ) {
        return { ok: false, message: '目前不處於你的秒針二選一階段' };
      }
      const value = Number(msg.value);
      let ok = false;
      this._runWithDiff(() => {
        if (typeof this.ctx.setHumanPlayerId === 'function') {
          this.ctx.setHumanPlayerId(seatId);
        }
        ok = Boolean(this.ctx.handleHumanSecondHandFinalChoice(this.gs, value));
        if (ok) {
          this.pendingSecondHandSeatId = null;
          this.eventBuffer.push({
            type: 'ABILITY_USED',
            seatId,
            ability: 'SECOND_HAND_FINAL',
            detail: value,
          });
        }
        this._flushTimers();
      });
      return ok ? { ok: true } : { ok: false, message: '無效的秒針二選一點數' };
    }

    if (ability === 'MINUTE_HAND_MOVE') {
      if (
        !this.gs.waitingMinuteHandChoice ||
        this.gs.waitingMinuteHandChoicePlayerId !== seatId
      ) {
        return { ok: false, message: '目前不處於你的分針跳格選擇階段' };
      }
      const choice = String(msg.choice || 'skip').toLowerCase();
      if (!['cw', 'ccw', 'skip'].includes(choice)) {
        return { ok: false, message: '無效的分針跳格方向 (cw / ccw / skip)' };
      }
      this._runWithDiff(() => {
        if (typeof this.ctx.setHumanPlayerId === 'function') {
          this.ctx.setHumanPlayerId(seatId);
        }
        this.gs.waitingMinuteHandChoicePlayerId = null;
        this.ctx.handleHumanAbilityChoice(this.gs, choice);
        this.eventBuffer.push({
          type: 'ABILITY_USED',
          seatId,
          ability: 'MINUTE_HAND_MOVE',
          detail: choice,
        });
        this._flushTimers();
      });
      return { ok: true };
    }

    if (ability === 'SET_TARGET_ROLE') {
      const player = this.gs.players.find((p) => p.id === seatId);
      const targetRole = String(msg.role || '').trim();
      if (!player || player.isEjected || player.type !== '時魔' || !String(player.roleCard || '').includes('幼')) {
        return { ok: false, message: '只有未進化的幼體時魔可以指定目標身份' };
      }
      if (!['時針', '分針', '秒針'].includes(targetRole)) {
        return { ok: false, message: '無效的目標進化身份' };
      }
      const taken = this.gs.players.some(
        (p) => p.id !== seatId && !p.isEjected && p.roleCard === targetRole
      );
      if (taken) {
        return { ok: false, message: `${targetRole} 已被其他存活玩家佔用` };
      }
      player.targetRoleName = targetRole;
      return { ok: true };
    }

    if (ability === 'HOUR_HAND_BOTTOM' && typeof this.ctx.hourHandMoveTopToBottom === 'function') {
      const player = this.gs.players.find((p) => p.id === seatId);
      if (!this.enableAbilities || !player || player.isEjected || player.roleCard !== '時針') {
        return { ok: false, message: '目前無法發動時針能力' };
      }
      if (this.gs.abilityMarker) {
        return { ok: false, message: '本回合異能已被封印' };
      }
      let ok = false;
      this._runWithDiff(() => {
        if (typeof this.ctx.setHumanPlayerId === 'function') this.ctx.setHumanPlayerId(seatId);
        ok = Boolean(this.ctx.hourHandMoveTopToBottom(this.gs, seatId));
        if (ok) {
          this.eventBuffer.push({ type: 'ABILITY_USED', seatId, ability: 'HOUR_HAND_BOTTOM' });
        }
        this._flushTimers();
      });
      return ok ? { ok: true } : { ok: false, message: '目前無法發動時針能力（MP 不足或次數已達上限）' };
    }

    if (ability === 'SIN_SEAL' && typeof this.ctx.activateSinSealAbility === 'function') {
      let ok = false;
      this._runWithDiff(() => {
        if (typeof this.ctx.setHumanPlayerId === 'function') this.ctx.setHumanPlayerId(seatId);
        ok = Boolean(this.ctx.activateSinSealAbility(this.gs, seatId));
        if (ok) {
          this.eventBuffer.push({ type: 'ABILITY_USED', seatId, ability: 'SIN_SEAL' });
        }
        this._flushTimers();
      });
      return ok ? { ok: true } : { ok: false, message: '目前無法發動時之惡封印能力' };
    }

    if (ability === 'SIN_TARGETING' && typeof this.ctx.activateSinAbility === 'function') {
      let ok = false;
      this._runWithDiff(() => {
        if (typeof this.ctx.setHumanPlayerId === 'function') this.ctx.setHumanPlayerId(seatId);
        ok = Boolean(this.ctx.activateSinAbility(this.gs, seatId));
        if (ok) {
          this.eventBuffer.push({ type: 'ABILITY_USED', seatId, ability: 'SIN_TARGETING' });
        }
        this._flushTimers();
      });
      return ok ? { ok: true } : { ok: false, message: '目前無法發動惡之牽引能力' };
    }

    return { ok: false, message: `不支援的異能類型: ${ability}` };
  }

  /**
   * 推進下一回合（若仍在等待操作則忽略）
   */
  advanceNextRound() {
    if (this.gs.gameEnded) return { ok: false, message: '對局已結束' };
    if (this.getPendingAction().type !== 'NEXT_ROUND') {
      return { ok: false, message: '目前仍有未完成的操作，不能進入下一回合' };
    }
    this._runWithDiff(() => {
      this.ctx.startRound(this.gs);
      this._flushTimers();
    });
    return { ok: true };
  }

  getPendingAction() {
    if (this.gs.gameEnded) {
      return { type: 'GAME_OVER', waitingSeatIds: [] };
    }
    if (this.gs.waitingSinPreRoundDiscard && this.gs.waitingSinPreRoundDiscardPlayerId) {
      return {
        type: 'SIN_PRE_ROUND_DISCARD',
        waitingSeatIds: [this.gs.waitingSinPreRoundDiscardPlayerId],
        options: this.gs.sinPreRoundDiscardOptions || null,
      };
    }
    if (this.gs.waitingSecondHandFinalChoice && this.gs.waitingSecondHandFinalChoicePlayerId) {
      return {
        type: 'SECOND_HAND_FINAL',
        waitingSeatIds: [this.gs.waitingSecondHandFinalChoicePlayerId],
      };
    }
    if (this.pendingMinuteSeatIds.size > 0) {
      return {
        type: 'PLAY_MINUTE_CARD',
        waitingSeatIds: Array.from(this.pendingMinuteSeatIds),
      };
    }
    if (this.gs.waitingHourChoice && this.gs.waitingHourChoicePlayerId) {
      return {
        type: 'PICK_HOUR_CARD',
        waitingSeatIds: [this.gs.waitingHourChoicePlayerId],
      };
    }
    if (this.gs.waitingMinuteHandChoice && this.gs.waitingMinuteHandChoicePlayerId) {
      return {
        type: 'MINUTE_HAND_MOVE',
        waitingSeatIds: [this.gs.waitingMinuteHandChoicePlayerId],
      };
    }
    return { type: 'NEXT_ROUND', waitingSeatIds: [] };
  }

  /**
   * 產生依指定玩家過濾的視野快照（Fog of War）
   */
  getStateForController(roomId, controllerId) {
    const mySeatId = this.getSeatIdByController(controllerId);
    const pendingAction = this.getPendingAction();

    const players = this.gs.players.map((p) => {
      const isMe = p.id === mySeatId;
      const isAI = !this.humanSeatIds.has(p.id);
      const hasPlayedMinute =
        this.submittedMinuteChoices.has(p.id) ||
        (isAI && this.aiMinuteChoices.some((c) => c.playerId === p.id));

      return {
        seatId: p.id,
        controllerId: this.seatToController.get(p.id) || null,
        name: p.name,
        isAI,
        type: p.type,
        roleCard: p.roleCard || null,
        gearCards: p.gearCards,
        mana: p.mana,
        score: p.score,
        currentClockPosition: p.currentClockPosition ?? null,
        isEjected: Boolean(p.isEjected),
        hasPlayedMinute,
        specialAbilityUsed: Boolean(p.specialAbilityUsed),
        hourHandMoveCount: Number(p.hourHandMoveCount || 0),
        targetRoleName: isMe ? (p.targetRoleName || '時針') : null,
        hourCardsCount: Array.isArray(p.hourCards) ? p.hourCards.length : 0,
        preciousCount: Array.isArray(p.hourCards) ? p.hourCards.filter((c) => c && c.isPrecious).length : 0,
        hourCards: (isMe || this.gs.gameEnded) && Array.isArray(p.hourCards)
          ? p.hourCards.map((c) => ({
              number: c.number,
              ageGroup: c.ageGroup,
              isPrecious: Boolean(c.isPrecious),
            }))
          : null,
        handCount: Array.isArray(p.hand) ? p.hand.length : 0,
        // 嚴格視野過濾：只有本人可取得完整分鐘卡手牌與秒針雙牌
        hand: isMe && Array.isArray(p.hand)
          ? p.hand.map((c) => ({ value: c.value, gear: c.gear ?? 0 }))
          : null,
        secondHandPendingCards:
          isMe &&
          this.gs.waitingSecondHandFinalChoice &&
          this.gs.waitingSecondHandFinalChoicePlayerId === p.id &&
          Array.isArray(this.gs.secondHandPendingCards)
            ? this.gs.secondHandPendingCards.map((c) => ({ value: c.value, gear: c.gear ?? 0 }))
            : null,
      };
    });

    const clockFace = (this.gs.clockFace || []).map((spot) => ({
      position: spot.position,
      cards: (spot.cards || []).map((c) => ({
        number: c.number,
        ageGroup: c.ageGroup,
        isPrecious: Boolean(c.isPrecious),
        isLocked: Boolean(c.isLocked),
      })),
    }));

    const drawnHours = Array.isArray(this.gs.currentDrawnHourCards)
      ? this.gs.currentDrawnHourCards.map((c) => ({
          number: c.number,
          ageGroup: c.ageGroup,
          isPrecious: Boolean(c.isPrecious),
        }))
      : [];

    const myPlayer = this.gs.players.find((p) => p.id === mySeatId);
    const canPeekTopHour =
      this.enableAbilities &&
      myPlayer &&
      !myPlayer.isEjected &&
      myPlayer.roleCard === '時針' &&
      Array.isArray(this.gs.hourDeck) &&
      this.gs.hourDeck.length > 0;
    const topHourCard = canPeekTopHour
      ? this.gs.hourDeck[this.gs.hourDeck.length - 1]
      : null;

    const minuteDiscard = Array.isArray(this.gs.minuteDiscard)
      ? this.gs.minuteDiscard.map((d) => ({
          value: d.value,
          originalValue: d.originalValue ?? d.value,
          gear: d.gear ?? 0,
          seatId: d.playerId,
          playerName: d.playerName,
          gameRound: d.gameRound,
          roundMarker: d.roundMarker,
        }))
      : [];

    return {
      roomId,
      status: this.gs.gameEnded ? 'ended' : 'playing',
      gameMode: this.mode,
      enableAbilities: this.enableAbilities,
      gameRound: this.gs.gameRound,
      totalGameRounds: this.gs.totalGameRounds || (this.mode === '3P' ? 3 : 5),
      roundMarker: this.gs.roundMarker,
      phase: this.gs.phase,
      abilityMarker: Boolean(this.gs.abilityMarker),
      sinTargetingMode: this.gs.sinTargetingMode || 'default',
      hourDeckCount: Array.isArray(this.gs.hourDeck) ? this.gs.hourDeck.length : 0,
      hourDeckTop: topHourCard
        ? {
            number: topHourCard.number,
            ageGroup: topHourCard.ageGroup,
            isPrecious: Boolean(topHourCard.isPrecious),
          }
        : null,
      currentDrawnHourCards: drawnHours,
      minuteDiscard,
      roundHistory: this.roundHistory,
      clockFace,
      mySeatId,
      pendingAction,
      players,
      gameEnded: Boolean(this.gs.gameEnded),
    };
  }
}
