// game.js (整合修正版：修復變數未定義崩潰 + 優化重置邏輯)
let HUMAN_PLAYER_ID = 'SM_1'; 
function setHumanPlayerId(newId) {
    if (typeof newId !== 'string' || !newId.trim()) return;
    HUMAN_PLAYER_ID = newId.trim();
    try { if (typeof window !== 'undefined') window.HUMAN_PLAYER_ID = HUMAN_PLAYER_ID; } catch (_) {}
}
function getHumanPlayerId() { return HUMAN_PLAYER_ID; }
try {
    if (typeof window !== 'undefined') {
        window.setHumanPlayerId = setHumanPlayerId;
        window.getHumanPlayerId = getHumanPlayerId;
        window.HUMAN_PLAYER_ID = HUMAN_PLAYER_ID;
    }
} catch (_) {}

let humanChoiceCardValue = null; 

// 遊戲設定
const GAME_CONFIG = {
    enableAbilities: false 
};

// --- 1. 卡牌定義 ---

function getGearCount(value) {
    if (value >= 1 && value <= 11) return 0;
    else if (value >= 12 && value <= 25) return 0.5;
    else if (value >= 26 && value <= 35) return 1;
    else if (value >= 36 && value <= 49) return 0.5;
    else if (value >= 50 && value <= 60) return 0;
    return 0;
}

function createMinuteCard(value) {
    const gear = getGearCount(value);
    return { type: 'minute', value, gear };
}

const DECK_MINUTE_CARDS = [];
for (let i = 1; i <= 60; i++) {
    DECK_MINUTE_CARDS.push(createMinuteCard(i));
}

// === 小時卡配置邏輯 ===
const HOUR_AGE_GROUPS = ['少年', '中年', '老年'];
const HOUR_PRECIOUS_CONFIGS = [
    {
        id: 'CFG_1',
        label: '少年(1-4)／中年(5-8)／老年(9-12)',
        mapping: { '1-4': '少年', '5-8': '中年', '9-12': '老年' }
    },
    {
        id: 'CFG_2',
        label: '中年(1-4)／老年(5-8)／少年(9-12)',
        mapping: { '1-4': '中年', '5-8': '老年', '9-12': '少年' }
    },
    {
        id: 'CFG_3',
        label: '老年(1-4)／少年(5-8)／中年(9-12)',
        mapping: { '1-4': '老年', '5-8': '少年', '9-12': '中年' }
    }
];

function createHourCard(number, ageGroup, isPrecious = false) {
    return { type: 'hour', number, ageGroup, isPrecious };
}

function pickRandomPreciousConfig() {
    const idx = Math.floor(Math.random() * HOUR_PRECIOUS_CONFIGS.length);
    return HOUR_PRECIOUS_CONFIGS[idx];
}

function getPreciousAgeGroupForNumber(config, number) {
    if (number >= 1 && number <= 4) return config.mapping['1-4'];
    if (number >= 5 && number <= 8) return config.mapping['5-8'];
    return config.mapping['9-12']; 
}

function buildHourDeckWithRandomPrecious() {
    const config = pickRandomPreciousConfig();
    const deck = [];

    for (const age of HOUR_AGE_GROUPS) {
        for (let n = 1; n <= 12; n++) {
            const preciousAge = getPreciousAgeGroupForNumber(config, n);
            const isPrecious = (age === preciousAge);
            deck.push(createHourCard(n, age, isPrecious));
        }
    }
    return { deck, config };
}

// --- 2. 玩家/角色定義 ---
const PLAYER_ROLES = [
    { id: 'SM_1', name: '時魔幼體 1', type: '時魔' },
    { id: 'SM_2', name: '時魔幼體 2 ', type: '時魔' },
    { id: 'SM_3', name: '時魔幼體 3 ', type: '時魔' },
    { id: 'sin', name: '時之惡', type: '時之惡' },
    { id: 'SCZ', name: '受詛者', type: '受詛者' }
];

// --- 3. 遊戲狀態類別 ---
class GameState {
    constructor(players) {
        this.players = players.map(role => ({
            ...role,
            hand: [],
            gearCards: 0,
            hourCards: [],
            roleCard: role.name,
            d6Die: role.type === '時之惡' || role.type === '受詛者' ? 6 : null,
            isEjected: false,
			shieldUsed: false,
            specialAbilityUsed: false,
            giftCards: [],
            score: 0,
            currentClockPosition: null 
        }));
        
        this.minuteDeck = [...DECK_MINUTE_CARDS];
        this.hourDeck = [];
		this.hourPreciousConfig = null;
        this.minuteDiscard = [];
        this.clockFace = Array(12).fill(null).map((_, i) => ({
            position: i + 1,
            cards: []
        }));
        
        this.roundMarker = 1;
        this.gameRound = 1;
        this.activePlayerIndex = 0;
        this.abilityMarker = false;
        this.gameEnded = false;
        this.currentRoundAIChoices = null;
		
		this.phase = 'idle';

        this.originalHandSets = [];
        this.originalGearSets = []; 
        
        this.currentMinuteChoices = null; 
        this.hourPickOrder = null;        
        this.nextHourPickerIndex = 0;     
        this.waitingHourChoice = false;   
        this.waitingHourChoicePlayerId = null; 

        this.sinTargetingMode = 'default';
        this.previousRoundSafe = false;
        this.roundHadTimeDemonEjection = false;
    }
}

// --- 4. 輔助函式 ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getCircularDistance(pos1, pos2) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff); 
}

// --- 5. 遊戲初始化邏輯 ---
function initializeGame(roles = PLAYER_ROLES) {
    const minuteDeckCopy = [...DECK_MINUTE_CARDS];
	shuffle(minuteDeckCopy);

	const { deck: hourDeckCopy, config: hourConfig } = buildHourDeckWithRandomPrecious();
	shuffle(hourDeckCopy);

	const gameState = new GameState(roles);
	gameState.minuteDeck = minuteDeckCopy;
	gameState.hourDeck = hourDeckCopy;
	gameState.hourPreciousConfig = hourConfig;
	console.log(`【小時卡設定】本局珍貴配置：${hourConfig.id}｜${hourConfig.label}`);

    const numCards = 12;
    for (let i = 0; i < 5; i++) {
        const handSet = [];
        for (let j = 0; j < numCards; j++) {
            if (gameState.minuteDeck.length > 0) {
                handSet.push(gameState.minuteDeck.pop());
            }
        }
        gameState.originalHandSets.push(handSet);
        const setTotalGear = handSet.reduce((sum, card) => sum + card.gear, 0);
        const setGearCount = Math.floor(setTotalGear);
        gameState.originalGearSets.push(setGearCount);
    }
    
    gameState.players.forEach((player, index) => {
        player.hand = gameState.originalHandSets[index].map(card => ({...card}));
        const initialGear = gameState.originalGearSets[index];
        player.gearCards = initialGear; 
        player.mana = player.gearCards;
        
        if (player.type === '時之惡') {
            player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 6)); 
        } else if (player.type === '受詛者') {
            player.d6Die = Math.max(1, Math.min(player.gearCards, 6)); 
        }
    });

    const sinPlayerStart = gameState.players.find(p => p.type === '時之惡');
    if (sinPlayerStart) {
        sinPlayerStart.currentClockPosition = 12;
        console.log("【初始設定】時之惡 位於位置 12");
    }

    const sczPlayerStart = gameState.players.find(p => p.type === '受詛者');
    if (sczPlayerStart) {
        sczPlayerStart.currentClockPosition = 1;
        console.log("【初始設定】受詛者 位於位置 1");
    }
    
    console.log("遊戲初始化完成！");
    return gameState;
}

// --- 6. 遊戲流程控制 ---

// 取得目前人類玩家 ID
function getEffectiveHumanPlayerId() {
	let v = null;
    try {
        if (typeof window !== 'undefined' && typeof window.getHumanPlayerId === 'function') {
            v = window.getHumanPlayerId();
        }
    } catch (_) {}
    try {
        if (!v && typeof getHumanPlayerId === 'function') {
            v = getHumanPlayerId();
        }
    } catch (_) {}
    try {
        if (!v && typeof HUMAN_PLAYER_ID !== 'undefined') {
            v = HUMAN_PLAYER_ID;}
    } catch (_) {}
    return v;
}

function activatesinTargetingAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer) return;
	
	const humanId = getEffectiveHumanPlayerId();
	if (humanId && sinPlayer.id === humanId) return;

    if (sinPlayer.mana >= 2 && Math.random() < 0.5) {
        sinPlayer.mana -= 2;
        gameState.sinTargetingMode = 'sin'; 
        console.log(`⚡【時之惡】耗用 2 Mana 發動能力！本回合扣取規則改為：距離「時之惡」最近者受罰。`);
    } else {
        gameState.sinTargetingMode = 'default';
        console.log(`【時之惡】保持原樣。本回合扣取規則：鐘面數值最大者受罰 (接近12)。`);
    }
}

function handleHumansinTargetingChoice(gameState, usinbility) {
    if (!gameState) return;
    const sinPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    if (!sinPlayer || sinPlayer.type !== '時之惡' || sinPlayer.isEjected) return;
    if (!GAME_CONFIG.enableAbilities) return;

    const isPreMinute = (typeof gameState.phase === 'string') ? (gameState.phase === 'preMinute') : false;
    if (!isPreMinute || sinPlayer.specialAbilityUsed) return;

    if (usinbility) {
        if (sinPlayer.mana < 2) return;
        sinPlayer.mana -= 2;
        sinPlayer.specialAbilityUsed = true;
        gameState.sinTargetingMode = 'sin';
        console.log('⚡【時之惡】耗用 2 Mana 發動能力！本回合扣取規則改為：距離「時之惡」最近者受罰。');
    } else {
        gameState.sinTargetingMode = 'default';
        console.log('【時之惡】保持原樣。本回合扣取規則：鐘面數值最大者受罰 (接近12)。');
    }
}

function handleHumansinsinlAll(gameState) {
    if (!gameState) return;
    const sinPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    if (!sinPlayer || sinPlayer.type !== '時之惡' || sinPlayer.isEjected) return;
    if (!GAME_CONFIG.enableAbilities) return;

    const isPreMinute = (typeof gameState.phase === 'string') ? (gameState.phase === 'preMinute') : false;
    if (!isPreMinute || sinPlayer.specialAbilityUsed || gameState.abilityMarker) return;

    if (sinPlayer.mana < 4) return;
    sinPlayer.mana -= 4;
    sinPlayer.specialAbilityUsed = true;
    gameState.abilityMarker = true;
    console.log('【時之惡】耗用 4 Mana，禁止所有時魔特殊能力！');
}

function sinsinlAllPreMinuteAI(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer || sinPlayer.id === getEffectiveHumanPlayerId()) return;

    if (sinPlayer.specialAbilityUsed || gameState.abilityMarker || sinPlayer.mana < 4) return;

    if (Math.random() < 0.2) {
        sinPlayer.mana -= 4;
        sinPlayer.specialAbilityUsed = true;
        gameState.abilityMarker = true;
        console.log(`【時之惡】耗用 4 Mana，禁止所有時魔特殊能力！`);
    }
}

function startRound(gameState) {
    gameState.currentMinuteChoices = null;
    gameState.sinTargetingMode = 'default';
	gameState.players.forEach(p => { 
        p.specialAbilityUsed = false; 
        p.pickedHourThisTurn = false;
        p.pickedHourCardThisTurnNumber = null;
        p.pickedMinHourThisTurn = false;
    });
 
    console.log(`--- 開始第 ${gameState.gameRound} 輪 第 ${gameState.roundMarker} 回合 ---`);
    
    const drawnCards = [];
    if (gameState.hourDeck.length >= 2) {
        drawnCards.push(gameState.hourDeck.pop()); 
        drawnCards.push(gameState.hourDeck.pop()); 
    } else {
        console.warn("小時卡牌庫不足。");
    }
    gameState.currentDrawnHourCards = drawnCards; 
	
	const nums = drawnCards.map(c => c?.number).filter(n => typeof n === 'number');
	gameState.roundMinHourNumber = nums.length ? Math.min(...nums) : null;

	gameState.phase = 'preMinute';

	if (typeof hourHandPreMinuteAI === 'function') {
		hourHandPreMinuteAI(gameState);
    }
    
    // 時之惡AI決策
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (sinPlayer && GAME_CONFIG.enableAbilities && sinPlayer.id !== getEffectiveHumanPlayerId()) {
        activatesinTargetingAbility(gameState);
        sinsinlAllPreMinuteAI(gameState);
    }

    console.log(`抽出的小時卡：[${drawnCards[0]?.number || 'X'}, ${drawnCards[1]?.number || 'X'}]`);
    console.log("等待玩家選擇並打出分鐘卡...");
    processMinuteCardSelection(gameState); 
}

function makeAIChoice(player, gameState) {
    if (player.hand.length === 0) return null;

    const sortedHand = [...player.hand].sort((a, b) => a.value - b.value);
    const handSize = sortedHand.length;
    const drawnHours = gameState.currentDrawnHourCards || [];
    const myPos = player.currentClockPosition; 
    const hasPosition = myPos !== null;

    function pickIndex(rankA, rankB, isFromSmallest) {
        const chosenRank = Math.random() < 0.5 ? rankA : rankB;
        if (isFromSmallest) {
            return Math.min(chosenRank - 1, handSize - 1);
        } else {
            return Math.max(handSize - chosenRank, 0);
        }
    }

    let selectedIndex = 0; 

    // 簡化的 AI 策略
    if (player.type === '時魔') {
        if (!hasPosition && drawnHours.some(c => c.number > 6)) selectedIndex = pickIndex(3, 4, true);
        else selectedIndex = Math.floor(handSize / 2);
    } else if (player.type === '時之惡') {
        selectedIndex = handSize - 1; 
    } else {
        selectedIndex = handSize - 1; 
    }

    const targetCardValue = sortedHand[selectedIndex].value;
    const originalIndex = player.hand.findIndex(c => c.value === targetCardValue);
    const chosenCard = player.hand.splice(originalIndex, 1)[0];
    
	// ✅ 秒針能力（新版）：消耗 3 Mana 蓋放 2 張，翻牌後二選一（AI 也可用）
	if (
		GAME_CONFIG.enableAbilities &&
		player.roleCard === '秒針' &&
		!gameState.abilityMarker &&
		!player.specialAbilityUsed &&
		player.mana >= 3 &&
		player.hand.length >= 1 
	) {
		const usinbility = Math.random() < 0.6; 
		if (usinbility) {
			const remainingSorted = [...player.hand].sort((a, b) => a.value - b.value);
			const altCard = remainingSorted[remainingSorted.length - 1]; // 簡單選最大
			const altIdx = player.hand.indexOf(altCard);
			if (altIdx !== -1) {
				player.hand.splice(altIdx, 1);
				player.mana -= 3;
				player.specialAbilityUsed = true;
				console.log(`⏱️【秒針】${player.name} 耗用 3 Mana，蓋放 2 張分鐘卡（翻牌後再決定）。`);
				return { type: 'seconds_pending', options: [chosenCard, altCard] };
			}
		}
	}
    return chosenCard;
}

function processMinuteCardSelection(gameState) {
    const choices = [];
    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());

    gameState.players.filter(p => p.id !== getEffectiveHumanPlayerId() && !p.isEjected).forEach(player => {
        const card = makeAIChoice(player, gameState);
        if (card) {
            choices.push({ playerId: player.id, playerName: player.name, card, roleType: player.type });
            console.log(`${player.name} (AI) 已蓋牌。`);
        }
    });

    if (humanPlayer && !humanPlayer.isEjected && humanPlayer.hand.length > 0) {
        console.log(`\n🚨${humanPlayer.name} 回合！請選擇您的卡牌。 🚨`);
        gameState.currentRoundAIChoices = choices; 
        document.getElementById('next-step-btn').disabled = true;
        return; 
    } else if (humanPlayer && humanPlayer.hand.length === 0) {
        console.log(`\n⚠️${humanPlayer.name} 已無手牌，本回合自動略過。`);
    }
    
    resolveMinuteCardSelection(gameState, choices);
}

function handleHumanSecondHandCommit(gameState, chosenCardValues) {
    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    if (!humanPlayer || humanPlayer.isEjected) return false;

    // ... (檢查條件省略，與原版一致)
    const [v1, v2] = chosenCardValues;
    const idx1 = humanPlayer.hand.findIndex(c => c.value === v1);
    if (idx1 === -1) return false;
    const card1 = humanPlayer.hand.splice(idx1, 1)[0];

    const idx2 = humanPlayer.hand.findIndex(c => c.value === v2);
    if (idx2 === -1) {
        humanPlayer.hand.push(card1);
        return false;
    }
    const card2 = humanPlayer.hand.splice(idx2, 1)[0];

    humanPlayer.mana -= 3;
    humanPlayer.specialAbilityUsed = true;
    gameState.phase = 'postMinute';

    gameState.secondHandPendingCards = [card1, card2];
    gameState.waitingSecondHandFinalChoice = true;
    gameState.waitingSecondHandFinalChoicePlayerId = getEffectiveHumanPlayerId();

    const aiChoices = gameState.currentRoundAIChoices || [];
    gameState.secondHandRevealedChoices = [...aiChoices];
    gameState.currentMinuteChoices = [...aiChoices];
    gameState.currentRoundAIChoices = null;

    console.log(`⏱️【秒針】您耗用 3 Mana，蓋放 2 張分鐘卡（翻牌後二選一）。`);
    aiChoices.forEach(c => console.log(`🔸 ${c.playerName} 翻開了：[ ${c.card.value} ]`));
    
    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}

function handleHumanSecondHandFinalChoice(gameState, chosenValue) {
    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    if (!humanPlayer) return false;

    const pending = gameState.secondHandPendingCards || [];
    const [a, b] = pending;
    const chosen = (a.value === chosenValue) ? a : (b.value === chosenValue ? b : null);
    if (!chosen) return false;
    const other = (chosen === a) ? b : a;

    humanPlayer.hand.push(other);

    const baseChoices = gameState.secondHandRevealedChoices || [];
    const allChoices = [...baseChoices, {
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        card: chosen,
        roleType: humanPlayer.type
    }];

    gameState.currentMinuteChoices = allChoices;
    gameState.waitingSecondHandFinalChoice = false;
    gameState.waitingSecondHandFinalChoicePlayerId = null;
    gameState.secondHandPendingCards = null;
    gameState.secondHandRevealedChoices = null;

    console.log(`🔸 ${humanPlayer.name} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);
    resolveMinuteCardSelection(gameState, allChoices, { skipRevealLog: true });

    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}

function handleHumanChoice(gameState, chosenCardValue) {
    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    const chosenCardIndex = humanPlayer.hand.findIndex(c => c.value === chosenCardValue);
    if (chosenCardIndex === -1) return false; 
    
    const chosenCard = humanPlayer.hand.splice(chosenCardIndex, 1)[0];
    const allChoices = gameState.currentRoundAIChoices || [];
    allChoices.push({ 
        playerId: humanPlayer.id, 
        playerName: humanPlayer.name, 
        card: chosenCard, 
        roleType: humanPlayer.type 
    });
    console.log(`您 (人類) 打出了 ${chosenCard.value} 號分鐘卡。`);

    resolveMinuteCardSelection(gameState, allChoices);
    gameState.currentRoundAIChoices = null;
    return true; 
}

function resolveMinuteCardSelection(gameState, choices, options = {}) {
    gameState.phase = 'postMinute';
    const skipRevealLog = !!options.skipRevealLog;

    if (!choices || choices.length === 0) {
        deductGearCards(gameState);
        return;
    }

    if (!skipRevealLog) {
        console.log("--- ✋ 翻牌時刻！ 🤚 ---");
        choices.forEach(c => {
            if (c.card && c.card.type === 'seconds_pending') {
                console.log(`🔸 ${c.playerName} (秒針) 蓋放了 2 張卡牌。`);
            } else {
                console.log(`🔸 ${c.playerName} 翻開了：[ ${c.card.value} ]`);
            }
        });
    }

    // 秒針 AI 決策
    const pendingChoices = choices.filter(c => c.card && c.card.type === 'seconds_pending');
    if (pendingChoices.length > 0) {
        pendingChoices.forEach(pc => {
            const player = gameState.players.find(p => p.id === pc.playerId);
            const opts = pc.card.options || [];
            if (opts.length !== 2) return;
            const [a, b] = opts;
            const chosen = (a.value >= b.value) ? a : b;
            const other = (chosen === a) ? b : a;
            if (player) player.hand.push(other);
            pc.card = chosen;
            if (!skipRevealLog) console.log(`🔸 ${pc.playerName} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);
        });
    }

    choices.sort((a, b) => b.card.value - a.card.value);
    const drawnCards = gameState.currentDrawnHourCards || [];
    
    // 記錄本回合出牌
    gameState.currentMinuteChoices = choices;
	gameState.uiMinuteChoicesTurnKey = `${gameState.gameRound}-${gameState.roundMarker}`;

    if (!drawnCards || drawnCards.length === 0) {
        gameState.currentDrawnHourCards = null;
        choices.forEach(c => gameState.minuteDiscard.push(c.card));
        deductGearCards(gameState);
        return;
    }

    gameState.hourPickOrder = choices.slice(0, drawnCards.length);
    gameState.nextHourPickerIndex = 0;
    gameState.waitingHourChoice = false;
    processNextHourPicker(gameState);
}

function processNextHourPicker(gameState) {
    const drawnCards = gameState.currentDrawnHourCards || [];
    const pickers = gameState.hourPickOrder || [];

    if (!pickers || drawnCards.length === 0 || gameState.nextHourPickerIndex >= pickers.length) {
        finishHourSelection(gameState);
        return;
    }

    const pickerInfo = pickers[gameState.nextHourPickerIndex];
    const player = gameState.players.find(p => p.id === pickerInfo.playerId);

    if (!player || player.isEjected) {
        gameState.nextHourPickerIndex++;
        setTimeout(() => processNextHourPicker(gameState), 0);
        return;
    }

    if (player.id === getEffectiveHumanPlayerId()) {
        gameState.waitingHourChoice = true;
        gameState.waitingHourChoicePlayerId = player.id;
        console.log(`👉 ${player.name} 請在右側選擇一張小時卡。`);
        if (typeof updateUI === 'function') updateUI(gameState);
        return; 
    }

    const chosenCard = chooseHourCardForAI(gameState, player, drawnCards);
    if (!chosenCard) {
        finishHourSelection(gameState);
        return;
    }
    placeHourCardForPlayer(gameState, player, chosenCard, pickerInfo.playerName);
	if (typeof updateUI === 'function') updateUI(gameState); 
    gameState.nextHourPickerIndex++;
    setTimeout(() => processNextHourPicker(gameState), 50); 
}

function chooseHourCardForAI(gameState, player, drawnCards) {
    if (!drawnCards || drawnCards.length === 0) return null;

    const activeTimeDemons = (gameState?.players || [])
        .filter(p => !p.isEjected && typeof p.currentClockPosition === 'number');
    const maxPos = activeTimeDemons.length ? Math.max(...activeTimeDemons.map(p => p.currentClockPosition)) : null;
    const isAtMaxHourValue = (maxPos !== null && player.currentClockPosition === maxPos);

    // AI 策略：如果自己是場上最大數值（將被打），選數字小的卡逃跑；否則優先選珍貴
    if (isAtMaxHourValue) {
        const sorted = drawnCards.slice().sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number; 
            return (b.isPrecious === true) - (a.isPrecious === true);
        });
        const target = sorted[0];
        const idx = drawnCards.findIndex(c => c === target);
        return drawnCards.splice(idx, 1)[0];
    }

    const precious = drawnCards.filter(c => c.isPrecious);
    const targetCard = (precious.length > 0) ? precious[0] : drawnCards[0];
    const idx = drawnCards.findIndex(c => c === targetCard);
    return drawnCards.splice(idx, 1)[0];
}

function placeHourCardForPlayer(gameState, player, cardToPlace, playerNameForLog) {
    if (!gameState || !player || !cardToPlace) return;

    player.currentClockPosition = cardToPlace.number;
	player.pickedHourThisTurn = true;
	player.pickedHourCardThisTurnNumber = cardToPlace.number;
	player.pickedMinHourThisTurn = (player.roleCard === '分針' && gameState.roundMinHourNumber !== null && cardToPlace.number === gameState.roundMinHourNumber);

    const label = playerNameForLog || player.name;
    console.log(`${label} 挑選小時卡 [${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}]，移動到 ${cardToPlace.number} 格。`);

    const isTimeDemon = player.type === '時魔' && !player.isEjected;
    const roleText = String(player.roleCard || '');
    const isYoungTimeDemon = isTimeDemon && roleText.includes('幼');

    if (isYoungTimeDemon) {
        if (!Array.isArray(player.hourCards)) player.hourCards = [];
        if (!player.hourCards.some(c => c.number === cardToPlace.number)) {
            player.hourCards.push(cardToPlace);
            console.log(`🧠【持有】${label} 持有小時卡 ${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}`);
            return;
        }
    }

    const clockSpot = gameState.clockFace.find(s => s.position === cardToPlace.number);
    if (clockSpot) clockSpot.cards.push(cardToPlace);
}

function handleHumanHourCardChoice(gameState, chosenHourNumber) {
    if (!gameState || !gameState.waitingHourChoice || gameState.waitingHourChoicePlayerId !== getEffectiveHumanPlayerId()) return;

    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    const drawnCards = gameState.currentDrawnHourCards || [];
    const idx = drawnCards.findIndex(c => c.number === chosenHourNumber);
    if (idx === -1) return;

    const cardToPlace = drawnCards.splice(idx, 1)[0];
    placeHourCardForPlayer(gameState, humanPlayer, cardToPlace, humanPlayer.name);

    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.nextHourPickerIndex++;
    processNextHourPicker(gameState);
    if (typeof updateUI === 'function') updateUI(gameState);
}

function finishHourSelection(gameState) {
    gameState.currentDrawnHourCards = null;
    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.hourPickOrder = null;
    gameState.nextHourPickerIndex = 0;

    const choices = gameState.currentMinuteChoices || [];
    choices.forEach(c => gameState.minuteDiscard.push(c.card));

    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());
    
    // 分針能力：若人類分針符合條件，跳出詢問
    const canPromptMinuteHand =
        GAME_CONFIG.enableAbilities &&
        humanPlayer && !humanPlayer.isEjected &&
        humanPlayer.roleCard === '分針' &&
        !gameState.abilityMarker && !humanPlayer.specialAbilityUsed &&
        humanPlayer.mana >= 2 &&
        humanPlayer.pickedMinHourThisTurn;

    if (canPromptMinuteHand) {
        const base = humanPlayer.pickedHourCardThisTurnNumber;
        if (base > 1) { // 規則：1 不能移到 12
            gameState.waitingAbilityChoice = true;
            gameState.waitingAbilityChoiceType = 'minuteHandShiftMinus1';
            gameState.waitingAbilityChoicePlayerId = getEffectiveHumanPlayerId();
            gameState.waitingAbilityBaseNumber = base;
            console.log(`⏱️【分針】${humanPlayer.name} 取得本回合較小小時卡 ${base}。請決定是否耗 2 Mana 移動到 ${base - 1}。`);
            if (typeof updateUI === 'function') updateUI(gameState);
            return;
        }
    }

    deductGearCards(gameState);
}

function handleHumanAbilityChoice(gameState, usinbility) {
    if (!gameState || !gameState.waitingAbilityChoice) return;
    const type = gameState.waitingAbilityChoiceType;
    const humanPlayer = gameState.players.find(p => p.id === getEffectiveHumanPlayerId());

    if (type === 'minuteHandShiftMinus1') {
        if (humanPlayer && usinbility) {
            if (typeof activateMinuteHandAbility === 'function') {
                activateMinuteHandAbility(gameState, getEffectiveHumanPlayerId());
            }
        } else {
            console.log(`⏭️【分針】${humanPlayer.name} 選擇略過本回合分針能力。`);
        }
    }

    gameState.waitingAbilityChoice = false;
    gameState.waitingAbilityChoiceType = null;
    deductGearCards(gameState);
    if (typeof updateUI === 'function') updateUI(gameState);
}

function handleDiceDeduction(player) {
    let gearCardDeducted = false;
    if (player.d6Die) {
        player.d6Die--; 
        if (player.d6Die < 1) { 
            player.gearCards--; 
            if (player.mana > player.gearCards) player.mana = player.gearCards;
            gearCardDeducted = true;
            console.log(`【${player.type}】${player.name} 骰子耗盡，扣除 1 齒輪。`);
            player.d6Die = (player.type === '時之惡') ? Math.max(1, Math.min(player.gearCards + 1, 6)) : Math.max(1, Math.min(player.gearCards, 6));
        }
    }
    return gearCardDeducted;
}

function deductGearCards(gameState) {
    const targetingMode = gameState.sinTargetingMode || 'default';
    const modeText = targetingMode === 'sin' ? '距離時之惡最近' : '數值最大(接近12)';
    
    console.log(`--- 步驟 5: 扣除齒輪卡/骰子 (當前規則: ${modeText}) ---`);
    
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer || !sinPlayer.currentClockPosition) {
        checkEjectionAndWinCondition(gameState);
        return;
    }
    
    const sinPosition = sinPlayer.currentClockPosition;
    let playersToDeduct = [];

    if (targetingMode === 'default') {
        const candidates = gameState.players.filter(p => (p.type === '時魔' || p.type === '受詛者' || p.type === '時之惡') && !p.isEjected && p.currentClockPosition);
        if (candidates.length > 0) {
            let maxPos = 0;
            candidates.forEach(p => { if (p.currentClockPosition > maxPos) maxPos = p.currentClockPosition; });
            playersToDeduct = candidates.filter(p => p.currentClockPosition === maxPos);
        }
    } else {
        const targets = gameState.players.filter(p => (p.type === '時魔' || p.type === '受詛者') && !p.isEjected && p.currentClockPosition);
        if (targets.length > 0) {
            let closestDistance = 7; 
            targets.forEach(player => {
                const distance = getCircularDistance(player.currentClockPosition, sinPosition);
                if (distance < closestDistance) closestDistance = distance;
            });
            playersToDeduct = targets.filter(player => getCircularDistance(player.currentClockPosition, sinPosition) === closestDistance);
        }
    }

    playersToDeduct.forEach(player => {
        if (player.type === '時魔') {
            const isYoungTimeDemon = typeof player.roleCard === 'string' && player.roleCard.includes('幼');
            if (isYoungTimeDemon && !player.shieldUsed && player.mana >= 3) {
                const spent = player.mana;
                player.shieldUsed = true;
                player.mana = 0;
                console.log(`🛡️【幼體防禦】${player.name} 耗用所有 ${spent} Mana，抵擋本次攻擊。`);
                return;
            }
            player.gearCards--;
            if (player.mana > player.gearCards) player.mana = player.gearCards;
            console.log(`【時魔】${player.name} (${modeText}) 扣除 1 齒輪。`);
        } else if (player.type === '受詛者' || player.type === '時之惡') {
            handleDiceDeduction(player);
        }
    });
    
    checkEjectionAndWinCondition(gameState);
}

function checkEjectionAndWinCondition(gameState) {
    if (!gameState || !gameState.players) return;

    let anyEjectedThisRound = false;

    // 1. 檢查逐出：這裡【修正了】原本會造成 Crash 的變數引用
    gameState.players.forEach(player => {
        if (!player.isEjected && player.gearCards <= 0) {
            player.isEjected = true;
            player.gearCards = 0;
            player.mana = 0;
            // 被逐出者立即失去位置
            player.currentClockPosition = null; 
            
            if (typeof player.d6Die === 'number') player.d6Die = 0;
            anyEjectedThisRound = true;

            if (player.type === '時魔') {
                gameState.roundHadTimeDemonEjection = true;
            }
            console.log(`⚠️【逐出】${player.name} 的齒輪耗盡，被逐出遊戲。`);
        }
    });

    const aliveTimeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
    const sinAlive = gameState.players.some(p => p.type === '時之惡' && !p.isEjected);

    if (!sinAlive || aliveTimeDemons.length === 0) {
        gameState.gameEnded = true;
        if (!sinAlive) console.log('🎉 遊戲結束：時之惡被逐出，時魔陣營勝利！');
        else console.log('🎉 遊戲結束：所有時魔被逐出，時之惡陣營勝利！');
    }

    if (!gameState.gameEnded) {
        inRoundEndActions(gameState);
    } else {
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function inRoundEndActions(gameState) {
	// ... (幼體收集、時之惡封印、受詛者保護邏輯同上，為節省篇幅省略部分內容，保持原樣)
    // 幼體時魔收集鐘面卡牌
	gameState.players.filter(p => p.type === '時魔' && !p.isEjected && p.currentClockPosition && typeof p.roleCard === 'string' && p.roleCard.includes('幼'))
	  .forEach(player => {
		const currentSpot = gameState.clockFace.find(s => s.position === player.currentClockPosition);
		if (!currentSpot || currentSpot.cards.length <= 1) return;
		const collectedCard = currentSpot.cards.pop();
		if (!Array.isArray(player.hourCards)) player.hourCards = [];
		if (player.hourCards.some(c => c.number === collectedCard.number)) {
		  currentSpot.cards.push(collectedCard); return;
		}
		player.hourCards.push(collectedCard);
		console.log(`【時魔】${player.name} 取得小時卡 (${collectedCard.number})。`);
	  });

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    const humanId = getEffectiveHumanPlayerId();
	if (GAME_CONFIG.enableAbilities && sinPlayer && (!humanId || sinPlayer.id !== humanId) && sinPlayer.mana >= 4 && Math.random() < 0.2) {
        sinPlayer.mana -= 4; 
        gameState.abilityMarker = true; 
        console.log(`【時之惡】耗用 4 Mana，禁止所有時魔特殊能力！`);
    }

    const sczPlayer = gameState.players.find(p => p.type === '受詛者' && !p.isEjected);
    if (sczPlayer && sczPlayer.currentClockPosition) {
        const currentSpot = gameState.clockFace.find(s => s.position === sczPlayer.currentClockPosition);
        const preciousCardIndex = currentSpot.cards.findIndex(c => c.isPrecious);
        if (currentSpot && preciousCardIndex !== -1) {
            const preciousCard = currentSpot.cards.splice(preciousCardIndex, 1)[0];
            currentSpot.cards.unshift(preciousCard); 
            console.log(`🛡️【受詛者】將珍貴小時卡 [${preciousCard.number}] 移至鐘面最底部保護。`);
        }
    }
    
    gameState.players.filter(p => p.type === '時魔' && !p.isEjected).forEach(player => {
        if (typeof attemptRoleUpgrade === 'function') attemptRoleUpgrade(player, gameState);
    });

    moveRoundMarker(gameState);
}

function moveRoundMarker(gameState) {
    gameState.roundMarker++; 
    gameState.abilityMarker = false; 
    gameState.sinTargetingMode = 'default';
    gameState.phase = 'idle';

    if (gameState.roundMarker > 12) {
        endGameRound(gameState);
    } else {
        console.log(`--- 回合結束，準備進入第 ${gameState.roundMarker} 回合 ---`);
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function checkSCZMissionSuccess(gameState) {
    let preciousOnFace = 0;
    gameState.clockFace.forEach(spot => {
        if (spot.cards.length > 0 && spot.cards.some(c => c.isPrecious)) preciousOnFace++;
    });
    return (preciousOnFace >= 10); 
}

function endGameRound(gameState) {
    console.log(`=== 第 ${gameState.gameRound} 輪結束 ===`);
    const numPlayers = gameState.players.length;

    gameState.players.forEach(player => {
        player.score += player.gearCards;
        console.log(`【${player.name}】得分: ${player.gearCards}. 總分: ${player.score}`);
    });

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    const currentRoundSafe = !gameState.roundHadTimeDemonEjection;

    if (sinPlayer) {
        if (currentRoundSafe && gameState.previousRoundSafe) {
            sinPlayer.gearCards--;
            if (sinPlayer.mana > sinPlayer.gearCards) sinPlayer.mana = sinPlayer.gearCards;
            console.log(`【時之惡懲罰】連續 2 輪無人被逐出，${sinPlayer.name} 扣除 1 齒輪。`);
            if (sinPlayer.gearCards <= 0) {
                sinPlayer.isEjected = true;
                gameState.gameEnded = true;
                console.log('🎉 遊戲結束：時之惡被逐出，時魔陣營勝利！');
                endGame(gameState);
                return;
            }
        }
        gameState.previousRoundSafe = currentRoundSafe;
    } else {
        gameState.previousRoundSafe = false;
    }
    gameState.roundHadTimeDemonEjection = false;

    if (numPlayers === 5 && gameState.gameRound === 5) {
        const sczPlayer = gameState.players.find(p => p.type === '受詛者');
        if (sczPlayer) {
            if (checkSCZMissionSuccess(gameState)) console.log("🎉【受詛者】任務達成！");
            else { console.log("⚠️【受詛者】任務失敗。"); sczPlayer.score -= 999; }
        }
    }

	let returnedFromYoungDemons = [];
	gameState.players.forEach(player => {
	  if (player.type === '時魔' && typeof player.roleCard === 'string' && player.roleCard.includes('幼') && Array.isArray(player.hourCards) && player.hourCards.length > 0) {
		returnedFromYoungDemons.push(...player.hourCards);
		player.hourCards = [];
	  }
	});
	if (returnedFromYoungDemons.length > 0) {
	  shuffle(returnedFromYoungDemons);
	  gameState.hourDeck.push(...returnedFromYoungDemons);
	  console.log(`🔁 幼體時魔交還 ${returnedFromYoungDemons.length} 張小時卡，已回到小時卡庫。`);
	}

    const cardsToReturnToDeck = [];
    gameState.clockFace.forEach(spot => {
        if (spot.cards.length === 0) return;
        const topCard = spot.cards[spot.cards.length - 1]; 
        if (topCard.isPrecious) {
            const cardsBelow = spot.cards.slice(0, -1); 
            if (cardsBelow.length > 0) cardsToReturnToDeck.push(...cardsBelow);
            spot.cards = [topCard]; 
        } else {
            cardsToReturnToDeck.push(...spot.cards);
            spot.cards = [];
        }
    });
    if (cardsToReturnToDeck.length > 0) {
        shuffle(cardsToReturnToDeck);
        gameState.hourDeck.push(...cardsToReturnToDeck);
        console.log(`♻️ 回收了 ${cardsToReturnToDeck.length} 張鐘面卡片回牌庫。`);
    }
    
    // --- 手牌輪轉與位置重置邏輯 (修正版) ---
    // 先暫存特殊角色的位置
    const preservedPositions = {
        sin: gameState.players.find(x => x.id === 'sin')?.currentClockPosition,
        SCZ: gameState.players.find(x => x.id === 'SCZ')?.currentClockPosition
    };

    gameState.players.forEach((player, index) => {
        const handSetIndex = (index - gameState.gameRound + numPlayers) % numPlayers; 
        const initialGear = gameState.originalGearSets[handSetIndex];
        player.gearCards = initialGear; 
        player.mana = player.gearCards;
        player.hand = gameState.originalHandSets[handSetIndex].map(c => ({ ...c }));
        
        player.specialAbilityUsed = false; 
        player.isEjected = false;
        player.hourCards = []; 
        
        // 預設清空所有位置
        player.currentClockPosition = null;
    });

    // 還原特殊角色位置
    const sinKeep = gameState.players.find(p => p.id === 'sin');
    if (sinKeep && preservedPositions.sin != null) sinKeep.currentClockPosition = preservedPositions.sin;

    const sczKeep = gameState.players.find(p => p.id === 'SCZ');
    if (sczKeep && preservedPositions.SCZ != null) sczKeep.currentClockPosition = preservedPositions.SCZ;

    console.log("🔄 玩家已接收新一輪的手牌與齒輪。");

    gameState.players.forEach(player => {
        if (player.type === '時之惡') player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 6)); 
        else if (player.type === '受詛者') player.d6Die = Math.max(1, Math.min(player.gearCards, 6)); 
    });

    gameState.gameRound++;
    gameState.roundMarker = 1;
    gameState.currentRoundAIChoices = null;
    gameState.sinTargetingMode = 'default'; 
    
    if (gameState.gameRound > numPlayers) {
        endGame(gameState); 
    } else {
        console.log(`--- 準備開始第 ${gameState.gameRound} 輪遊戲 ---`);
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function endGame(gameState) {
    console.log("=== 遊戲結束 ===");
    gameState.players
        .filter(p => p.type === '時魔' && typeof ROLE_UPGRADE_REQUIREMENTS !== 'undefined' && ROLE_UPGRADE_REQUIREMENTS[p.roleCard])
        .forEach(player => { player.score += 5; });
    
    const finalScores = gameState.players.slice().sort((a, b) => b.score - a.score);
    finalScores.forEach((p, index) => {
        console.log(`#${index + 1}: ${p.name} (總分: ${p.score})`);
    });

    gameState.gameEnded = true;
    if (typeof updateUI === 'function') updateUI(gameState);
}