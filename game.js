// game.js (整合修正版：保留您的邏輯調整 + 修復缺失流程)
// ✅ 人類玩家 ID：改為可動態設定（支援角色選擇/測試），預設為 SM_1。
let HUMAN_PLAYER_ID = 'SM_1';

// 讓 UI/測試模式可安全取得「當前實際的人類玩家 id」
function getHumanPlayerId() { return HUMAN_PLAYER_ID; }
function setHumanPlayerId(newId) {
    if (typeof newId !== 'string' || !newId.trim()) return false;
    HUMAN_PLAYER_ID = newId.trim();
    if (typeof window !== 'undefined') {
        window.__HUMAN_PLAYER_ID_OVERRIDE = HUMAN_PLAYER_ID;
    }
    return true;
}
function getEffectiveHumanPlayerId() {
    // 1) UI 可能會把「人類玩家 id」存到 window 上（例如角色選擇）
    if (typeof window !== 'undefined') {
        const w = window;
        const v = w.__HUMAN_PLAYER_ID_OVERRIDE || w.__humanPlayerIdOverride || w.__humanPlayerId;
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    // 2) 也允許從 GAME_CONFIG 讀取（若未來加入）
    if (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG) {
        const v = GAME_CONFIG.humanPlayerId || GAME_CONFIG.humanRoleId;
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return HUMAN_PLAYER_ID;
}
if (typeof window !== 'undefined') {
    window.getHumanPlayerId = getHumanPlayerId;
    window.setHumanPlayerId = setHumanPlayerId;
    window.getEffectiveHumanPlayerId = getEffectiveHumanPlayerId;
}

let humanChoiceCardValue = null; 

// 遊戲設定（與 UI 共用同一份 window.GAME_CONFIG）
const GAME_CONFIG = (typeof window !== 'undefined' && window.GAME_CONFIG)
    ? window.GAME_CONFIG
    : { enableAbilities: false, testMode: false };

if (GAME_CONFIG.enableAbilities === undefined) GAME_CONFIG.enableAbilities = false;
if (GAME_CONFIG.testMode === undefined) GAME_CONFIG.testMode = false;

try { if (typeof window !== 'undefined') window.GAME_CONFIG = GAME_CONFIG; } catch (_) {}


// ✅ 對外提供同一份設定（給 ui.js / abilities.js 使用）
window.GAME_CONFIG = GAME_CONFIG;

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

// === 小時卡：少年 / 青年 / 中年 各 12 張（每種 1~12 各 1 張），總計 36 張 ===
// 每局開局：隨機從 3 組配置中選 1 組，決定哪一組年齡版本是「珍貴(★)」。
// 珍貴仍然是 12 張（每個數字 1~12 各 1 張是珍貴）。

const HOUR_AGE_GROUPS = ['少年', '青年', '中年'];

// 你指定的三組配置：決定各區間的珍貴年齡版本
const HOUR_PRECIOUS_CONFIGS = [
    {	id: 'CFG_1',
        label: 'hour123',
        // 將數字改為陣列格式
        mapping: { 
            '少年': [1, 5, 8, 10], 
            '青年': [2, 6, 7, 11], 
            '中年': [3, 4, 9, 12] 
        }
    },
    {	id: 'CFG_2',
        label: 'hour231',
        // 將數字改為陣列格式
        mapping: { 
            '少年': [2, 6, 7, 11], 
            '青年': [3, 4, 9, 12], 
            '中年': [1, 5, 8, 10] 
        }
    },    {	id: 'CFG_3',
        label: 'hour312',
        // 將數字改為陣列格式
        mapping: { 
            '少年': [3, 4, 9, 12], 
            '青年': [1, 5, 8, 10], 
            '中年': [2, 6, 7, 11]
        }
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
    // 遍歷 mapping 中的所有年齡層 (少年、青年、中年)
    for (const ageGroup in config.mapping) {
        const numbers = config.mapping[ageGroup];
        // 檢查目標數字是否在該年齡層的陣列中
        if (numbers.includes(number)) {
            return ageGroup;
        }
    }
    return null; // 若數字不符合任何設定 (防呆用)
}

/**
 * buildHourDeckWithRandomPrecious()
 * - 生成 36 張小時卡：少年/青年/中年 各 12 張（1~12）
 * - 隨機挑一個珍貴配置，將對應年齡版本標成 isPrecious=true
 * - 回傳：{ deck, config }
 */
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

    // （保險檢查，可留可刪）
    const preciousCount = deck.filter(c => c.isPrecious).length;
    if (preciousCount !== 12) {
        console.warn(`⚠️ 小時卡珍貴數量異常：${preciousCount}（預期 12）`);
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
		this.hourPreciousConfig = null; // 新增：紀錄本局抽到的珍貴配置（CFG_1/2/3）
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

        // 時之惡（sin）目標模式：default = 接近12；sin = 距離時之惡最近
        this.sinTargetingMode = 'default';
		// 記錄上一輪是否「安全」(沒有時魔被逐出)
        // 初始設為 false，確保第一輪就算安全也不會觸發「連續兩輪」的條件
        this.previousRoundSafe = false;
		// 記錄本輪是否有「時魔被逐出」事件（用於連續兩輪懲罰判定）
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

	// 生成「本局」小時牌庫（含隨機珍貴配置）
	const { deck: hourDeckCopy, config: hourConfig } = buildHourDeckWithRandomPrecious();
	shuffle(hourDeckCopy);

	const gameState = new GameState(roles);
	gameState.minuteDeck = minuteDeckCopy;
	gameState.hourDeck = hourDeckCopy;

	// 存起本局配置（方便日後 UI 顯示或除錯）
	gameState.hourPreciousConfig = hourConfig;
	console.log(`【小時卡設定】本局珍貴配置：${hourConfig.id}｜${hourConfig.label}`);


    const numCards = 12;
	
	// --- 測試模式：固定人類玩家第 1 輪起始手牌 ---
    const __humanIdForTest = getEffectiveHumanPlayerId();
    const __shouldApplyTestHand = !!(GAME_CONFIG.testMode && __humanIdForTest && gameState.gameRound === 1);
    let __testHandCards = null;
    let __testHumanIndex = -1;

    if (__shouldApplyTestHand) {
        __testHumanIndex = gameState.players.findIndex(p => p.id === __humanIdForTest);
        if (__testHumanIndex >= 0) {
            const __desiredValues = [1, 2, 3, 4, 5, 12, 36, 56, 57, 58, 59, 60];
            __testHandCards = [];

            // 從分鐘牌庫中抽出指定牌（移除，避免重複分配）
            __desiredValues.forEach(v => {
                const idx = gameState.minuteDeck.findIndex(c => c && c.value === v);
                if (idx >= 0) __testHandCards.push(gameState.minuteDeck.splice(idx, 1)[0]);
            });

            // 若因任何原因缺牌，使用剩餘牌庫補齊 12 張（仍避免中斷遊戲）
            while (__testHandCards.length < 12 && gameState.minuteDeck.length > 0) {
                __testHandCards.push(gameState.minuteDeck.pop());
            }
            __testHandCards = __testHandCards.slice(0, 12);

            console.log(`🧪【測試模式】人類玩家 ${__humanIdForTest} 第 1 輪起始手牌固定為：${__testHandCards.map(c => c.value).join(',')}`);
        } else {
            console.warn(`🧪【測試模式】找不到人類玩家 id=${__humanIdForTest}，未套用固定手牌。`);
        }
    }

    
    for (let i = 0; i < 5; i++) {
        const handSet = [];

        // 測試模式：指定人類玩家固定手牌（僅第 1 輪）
        if (__testHandCards && i === __testHumanIndex) {
            handSet.push(...__testHandCards);
        } else {
            for (let j = 0; j < numCards; j++) {
                if (gameState.minuteDeck.length > 0) {
                    handSet.push(gameState.minuteDeck.pop());
                }
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

    // 初始位置
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

function activateSinTargetingAbility(gameState) {
    if (!GAME_CONFIG.enableAbilities) return;

    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    if (!sinPlayer) return;

    if (sinPlayer.mana >= 2 && Math.random() < 0.5) {
        sinPlayer.mana -= 2;
        gameState.sinTargetingMode = 'sin';
        console.log(`⚡【時之惡】發動能力！本回合距離「時之惡」最近者受罰。`);
    } else {
        gameState.sinTargetingMode = 'default';
        console.log(`【時之惡】鐘面數值最大者受罰 (接近12)。`);
    }
}

function startRound(gameState) {
	 const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
	// 修正 3：當仍在等待人類輸入時，不允許進入下一回合（避免「未選牌也能按下一回合」）
    const waitingMinute = gameState && gameState.currentRoundAIChoices !== null;
    const waitingHour = gameState && !!gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId;
    const waitingAbility = gameState && !!gameState.waitingAbilityChoice && gameState.waitingAbilityChoicePlayerId === humanId;
    const waitingSecondFinal = gameState && !!gameState.waitingSecondHandFinalChoice && gameState.waitingSecondHandFinalChoicePlayerId === humanId;

	
    // ✅ 防呆：若仍在等待人類輸入（出牌/選卡/能力），禁止直接進入下一回合
    if (waitingMinute || waitingHour || waitingAbility || waitingSecondFinal) {
        console.log("[Game] 仍在等待人類操作（分鐘/小時/能力/秒針最終選擇），不能開始下一回合。");
        return;
    }

    gameState.currentMinuteChoices = null;
	
	// 每回合開始：重置「每回合一次」能力使用狀態（含時針頂牌放底）
	gameState.players.forEach(p => { p.specialAbilityUsed = false; });
 
    console.log(`--- 開始第 ${gameState.gameRound} 輪 第 ${gameState.roundMarker} 回合 ---`);
	// 每回合一次：重置能力使用狀態 + 本回合拿牌記錄
	
	// === 每回合重置：特殊能力使用狀態 & 本回合拿到的小時卡記錄 ===
	gameState.players.forEach(p => {
		p.specialAbilityUsed = false;          // 「每回合一次」能力用
		p.pickedHourThisTurn = false;          // 本回合是否真的有拿到小時卡
		p.pickedHourCardThisTurnNumber = null; // 本回合拿到的小時卡數值
	});

	gameState.players.forEach(p => {
		p.specialAbilityUsed = false;
		p.pickedHourCardThisTurnNumber = null;
		p.pickedMinHourThisTurn = false;
	});

    if (typeof activatesinPreRoundAbility === 'function') {
        activatesinPreRoundAbility(gameState); 
    }
    
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

	
	// 進入「出分鐘卡前」階段（時針能力可用）
	gameState.phase = 'preMinute';

	// AI 時針：回合前自動偷看/決策（人類時針由 UI 按鈕觸發）
	if (typeof hourHandPreMinuteAI === 'function') {
		hourHandPreMinuteAI(gameState);
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

    if (player.type === '時魔') {
        if (!hasPosition && drawnHours.some(c => c.number > 6)) {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
            else selectedIndex = pickIndex(1, 2, true);
        }
        else if (hasPosition && drawnHours.some(c => c.number > myPos)) {
            if (handSize > 8) selectedIndex = pickIndex(2, 3, true);
            else if (handSize >= 5) selectedIndex = pickIndex(1, 2, true);
            else selectedIndex = pickIndex(1, 1, true);
        }
        else if (hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number < myPos)) {
            if (handSize > 8) selectedIndex = pickIndex(2, 3, false);
            else if (handSize >= 5) selectedIndex = pickIndex(1, 2, false);
            else selectedIndex = pickIndex(1, 1, false);
        }
        else if (!hasPosition && drawnHours.length > 0 && drawnHours.every(c => c.number < 5)) {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, false);
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false);
            else selectedIndex = pickIndex(1, 2, false);
        }
        else {
            selectedIndex = Math.floor(handSize / 2);
        }
    } 
    else if (player.type === '時之惡') {
        const timeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
        const demonsNoPosCount = timeDemons.filter(p => p.currentClockPosition === null).length;
        const demonsLowPosCount = timeDemons.filter(p => p.currentClockPosition !== null && p.currentClockPosition < 4).length;
        
        const hasHourOver6 = drawnHours.some(c => c.number > 6);
        const allHoursUnder6 = drawnHours.length > 0 && drawnHours.every(c => c.number < 6);
        const allHoursOver8 = drawnHours.length > 0 && drawnHours.every(c => c.number > 8);

        if ( (demonsNoPosCount >= 2 && hasHourOver6) || (demonsLowPosCount >= 2) ) {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, true);
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true);
            else selectedIndex = pickIndex(1, 2, true);
        }
        else if (allHoursUnder6) {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, false);
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false);
            else selectedIndex = pickIndex(1, 2, false);
        }
        else if (allHoursOver8) {
            if (handSize > 8) selectedIndex = pickIndex(2, 3, true);
            else if (handSize >= 5) selectedIndex = pickIndex(1, 2, true);
            else selectedIndex = pickIndex(1, 1, true);
        }
        else {
            selectedIndex = handSize - 1; 
        }
    }
    else if (player.type === '受詛者') {
        const preciousCount = drawnHours.filter(c => c.isPrecious).length;
        if (preciousCount === 2) {
            if (handSize > 8) selectedIndex = pickIndex(2, 3, false); 
            else if (handSize >= 5) selectedIndex = pickIndex(1, 2, false); 
            else selectedIndex = pickIndex(1, 1, false); 
        }
        else if (preciousCount === 0) {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, true); 
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, true); 
            else selectedIndex = pickIndex(1, 2, true); 
        }
        else {
            if (handSize > 8) selectedIndex = pickIndex(3, 4, false); 
            else if (handSize >= 5) selectedIndex = pickIndex(2, 3, false); 
            else selectedIndex = pickIndex(1, 2, false); 
        }
    }
    else {
        selectedIndex = handSize - 1; 
    }

    const targetCardValue = sortedHand[selectedIndex].value;
    const originalIndex = player.hand.findIndex(c => c.value === targetCardValue);
    const chosenCard = player.hand.splice(originalIndex, 1)[0];
    
    //舊秒能力
	//if (GAME_CONFIG.enableAbilities && player.roleCard === '秒針' && !gameState.abilityMarker && player.mana >= 2) {
    //    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
        
    //    if (sinPlayer && sinPlayer.hand.length >= 3 && Math.random() < 0.5) { 
    //        player.mana -= 2; 
    //        const stolenCardIndex = Math.floor(Math.random() * sinPlayer.hand.length);
    //        const stolenCard = sinPlayer.hand.splice(stolenCardIndex, 1)[0];
            
    //        console.log(`【秒針】偷看了 時之惡 的手牌 (${stolenCard.value})。`);
            
    //        if (stolenCard.value > chosenCard.value) {
    //            sinPlayer.hand.push(chosenCard); 
    //            gameState.minuteDiscard.push(stolenCard); 
    //            console.log(`【秒針】使用時之惡的卡 (${stolenCard.value})。`);
    //            return stolenCard; 
    //        } else {
    //            sinPlayer.hand.push(stolenCard); 
    //            console.log(`【秒針】使用自己的卡 (${chosenCard.value})。`);
    //            return chosenCard; 
    //        }
    //    }
    //}
	
	// ✅ 秒針能力（新版）：消耗 3 Mana 蓋放 2 張，翻牌後二選一（AI 也可用）
	if (
		GAME_CONFIG.enableAbilities &&
		player.roleCard === '秒針' &&
		!gameState.abilityMarker &&
		!player.specialAbilityUsed &&
		player.mana >= 3 &&
		player.hand.length >= 1 // chosenCard 已拿走後，還要至少 1 張當第二張
	) {
		const usinbility = Math.random() < 0.6; // AI 使用機率，可自行調整

		if (usinbility) {
			const remainingSorted = [...player.hand].sort((a, b) => a.value - b.value);
			const altLow = remainingSorted[0];
			const altHigh = remainingSorted[remainingSorted.length - 1];

			// 選跟 chosenCard 差距較大的那張，讓 AI 有彈性
			const altCard =
				(Math.abs((altHigh?.value ?? 0) - chosenCard.value) >= Math.abs(chosenCard.value - (altLow?.value ?? 0)))
					? altHigh
					: altLow;

			const altIdx = player.hand.indexOf(altCard);
			if (altIdx !== -1) {
				player.hand.splice(altIdx, 1);
				// ...略... (執行能力)
			} else {
				// 如果找不到第二張牌，取消發動能力，把第一張牌放回去或直接當作普通出牌
				console.log("AI 秒針能力發動失敗：找不到第二張牌");
				// 這裡可以選擇不 return special type，直接 return chosenCard;
			}
		}
	}

	
	
	
    return chosenCard;
}

function processMinuteCardSelection(gameState) {
    const choices = [];
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId);

    gameState.players.filter(p => p.id !== humanId && !p.isEjected).forEach(player => {
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
    const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);
    if (!humanPlayer || humanPlayer.isEjected) return false;

    if (!GAME_CONFIG.enableAbilities || humanPlayer.roleCard !== '秒針') {
        console.warn("目前不能使用秒針能力。");
        return false;
    }
    if (gameState.abilityMarker) {
        console.warn("本回合能力被封鎖，不能使用秒針能力。");
        return false;
    }
    if (humanPlayer.specialAbilityUsed) {
        console.warn("本回合已使用過特殊能力。");
        return false;
    }
    if (humanPlayer.mana < 3) {
        console.warn("Mana 不足，不能使用秒針能力。");
        return false;
    }
    if (!Array.isArray(chosenCardValues) || chosenCardValues.length !== 2) {
        console.warn("秒針能力必須選 2 張分鐘卡。");
        return false;
    }

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

    // ✅ 只在成功蓋牌後扣 Mana
    humanPlayer.mana -= 3;
    humanPlayer.specialAbilityUsed = true;

    gameState.phase = 'postMinute';

    // 保存兩張備選卡
    gameState.secondHandPendingCards = [card1, card2];
    gameState.waitingSecondHandFinalChoice = true;
    gameState.waitingSecondHandFinalChoicePlayerId = HUMAN_PLAYER_ID;

    // 翻開其他玩家（AI）的牌
    const aiChoices = gameState.currentRoundAIChoices || [];
    gameState.secondHandRevealedChoices = [...aiChoices];

    // UI 的「本回合出牌」先顯示其他玩家翻牌
    gameState.currentMinuteChoices = [...aiChoices];

    // 清掉等待出牌（人類已完成「蓋牌」）
    gameState.currentRoundAIChoices = null;

    console.log(`⏱️【秒針】您耗用 3 Mana，蓋放 2 張分鐘卡（翻牌後二選一）。`);
    console.log("--- ✋ 翻牌時刻！ 🤚 ---");
    aiChoices.forEach(c => console.log(`🔸 ${c.playerName} 翻開了：[ ${c.card.value} ]`));
    console.log("⏳【秒針】請從 2 張蓋牌中選 1 張打出。");

    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}

function handleHumanSecondHandFinalChoice(gameState, chosenValue) {
    const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);
    if (!humanPlayer || humanPlayer.isEjected) return false;

    if (!gameState.waitingSecondHandFinalChoice || gameState.waitingSecondHandFinalChoicePlayerId !== HUMAN_PLAYER_ID) {
        return false;
    }

    const pending = gameState.secondHandPendingCards || [];
    if (pending.length !== 2) {
        console.warn("秒針備選卡不存在。");
        return false;
    }

    const [a, b] = pending;
    const chosen = (a.value === chosenValue) ? a : (b.value === chosenValue ? b : null);
    if (!chosen) {
        console.warn("無效的秒針選擇。");
        return false;
    }
    const other = (chosen === a) ? b : a;

    // 未選擇的卡回手牌
    humanPlayer.hand.push(other);

    const baseChoices = gameState.secondHandRevealedChoices || [];
    const allChoices = [...baseChoices, {
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        card: chosen,
        roleType: humanPlayer.type
    }];

    gameState.currentMinuteChoices = allChoices;

    // 清理狀態
    gameState.waitingSecondHandFinalChoice = false;
    gameState.waitingSecondHandFinalChoicePlayerId = null;
    gameState.secondHandPendingCards = null;
    gameState.secondHandRevealedChoices = null;

    console.log(`🔸 ${humanPlayer.name} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);

    // ✅ 進入既有流程，但跳過翻牌 log（避免重複顯示）
    resolveMinuteCardSelection(gameState, allChoices, { skipRevealLog: true });

    if (typeof updateUI === 'function') updateUI(gameState);
    return true;
}


function handleHumanChoice(gameState, chosenCardValue) {
    const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);
    const chosenCardIndex = humanPlayer.hand.findIndex(c => c.value === chosenCardValue);
    if (chosenCardIndex === -1) {
        console.warn("無效卡牌選擇，請重新選擇。");
        return false; 
    }
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

    // === 秒針能力（AI）：翻牌後二選一（在排序/選小時卡前完成）===
    const pendingChoices = choices.filter(c => c.card && c.card.type === 'seconds_pending');
    if (pendingChoices.length > 0) {
        pendingChoices.forEach(pc => {
            const player = gameState.players.find(p => p.id === pc.playerId);
            const opts = pc.card.options || [];
            if (opts.length !== 2) return;

            const [a, b] = opts;

            // 基本 AI 策略：選較大值（較可能先選小時卡/搶珍貴）
            const chosen = (a.value >= b.value) ? a : b;
            const other = (chosen === a) ? b : a;

            // 未選擇者回到手牌
            if (player && Array.isArray(player.hand)) player.hand.push(other);

            pc.card = chosen;

            if (!skipRevealLog) {
                console.log(`🔸 ${pc.playerName} (秒針) 從 2 張中選擇翻開：[ ${chosen.value} ]`);
            }
        });
    }

    choices.sort((a, b) => b.card.value - a.card.value);

    const drawnCards = gameState.currentDrawnHourCards || [];

    const _roundHourNums = (drawnCards || [])
        .map(c => c?.number)
        .filter(n => typeof n === 'number');
    gameState.roundMinHourNumber = _roundHourNums.length ? Math.min(..._roundHourNums) : null;

    gameState.currentMinuteChoices = choices;
	
	// ✅ 新增：把「這批分鐘卡」所屬回合鎖定下來
	// 之後 moveRoundMarker() 先 roundMarker++ 再 updateUI() 時，UI 也不會誤以為是下一回合的新資料
	gameState.uiMinuteChoicesTurnKey = `${gameState.gameRound}-${gameState.roundMarker}`;

    if (!drawnCards || drawnCards.length === 0) {
        gameState.currentDrawnHourCards = null;
        choices.forEach(c => gameState.minuteDiscard.push(c.card));
        deductGearCards(gameState);
        return;
    }

    const pickers = choices.slice(0, drawnCards.length);

    gameState.hourPickOrder = pickers;
    gameState.nextHourPickerIndex = 0;
    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;

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

    if (player.id === HUMAN_PLAYER_ID) {
        gameState.waitingHourChoice = true;
        gameState.waitingHourChoicePlayerId = player.id;
        console.log(`👉 ${player.name} 請在右側選擇一張小時卡。`);
        if (typeof updateUI === 'function') {
            updateUI(gameState);
        }
        return; 
    }

    const chosenCard = chooseHourCardForAI(gameState, player, drawnCards);
	
    if (!chosenCard) {
        finishHourSelection(gameState);
        return;
    }

    placeHourCardForPlayer(gameState, player, chosenCard, pickerInfo.playerName);

	if (typeof updateUI === 'function') {
        updateUI(gameState); 
    }

    gameState.nextHourPickerIndex++;
    setTimeout(() => {
        processNextHourPicker(gameState);
    }, 50); 
}

function chooseHourCardForAI(gameState, player, drawnCards) {
    if (!drawnCards || drawnCards.length === 0) return null;

    // 判斷「小時值是否為最大」：以所有未逐出的「時魔」玩家的鐘面位置做比較
    const activeTimeDemons = (gameState?.players || [])
        .filter(p => !p.isEjected && typeof p.currentClockPosition === 'number');

    const maxPos = activeTimeDemons.length
        ? Math.max(...activeTimeDemons.map(p => p.currentClockPosition))
        : null;

    const isAtMaxHourValue =
        (maxPos !== null &&
         typeof player?.currentClockPosition === 'number' &&
         player.currentClockPosition === maxPos);

    // 已持有的小時卡資訊
    const heldCards = (player && Array.isArray(player.hourCards)) ? player.hourCards : [];
    const heldNumbers = new Set(heldCards.map(c => c.number));
    const heldPreciousCount = heldCards.filter(c => c.isPrecious).length; // ✅ 計算目前擁有的珍貴卡數量

    // (1) 在小時值最大的時候：先取得「小時值低」的小時卡
    if (isAtMaxHourValue) {
        const sorted = drawnCards.slice().sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number; // 先比數值
            // 若數值相同：如果珍貴卡未滿 2 張，優先選珍貴；否則不特別優先
            if (heldPreciousCount < 2) {
                return (b.isPrecious === true) - (a.isPrecious === true);
            }
            return 0;
        });
        const target = sorted[0];
        const idx = drawnCards.findIndex(c => c === target);
        if (idx === -1) return null;
        return drawnCards.splice(idx, 1)[0];
    }

    // (2) 一般情況：避免挑到自己已持有的數字（若可避開）
    let candidate = drawnCards.slice();
    const nonDuplicate = candidate.filter(c => !heldNumbers.has(c.number));
    if (nonDuplicate.length > 0) {
        candidate = nonDuplicate;
    }

    // ✅ 修改重點：策略調整
    // 若「已持有 2 張以上珍貴卡」，則不再優先搶珍貴卡 (視為普通卡池)
    // 否則 (未滿 2 張)，依舊優先過濾出珍貴卡
    let pool = candidate;
    if (heldPreciousCount < 2) {
        const precious = candidate.filter(c => c.isPrecious);
        if (precious.length > 0) {
            pool = precious;
        }
    }

    // 從最終池中選數字最小的
    const targetCard = pool.slice().sort((a, b) => a.number - b.number)[0];
    const idx = drawnCards.findIndex(c => c === targetCard);
    if (idx === -1) return null;
    return drawnCards.splice(idx, 1)[0];
}

// 將選到的小時卡「放置」：依規則決定是給幼體時魔持有，或留在鐘面
function placeHourCardForPlayer(gameState, player, cardToPlace, playerNameForLog) {
    if (!gameState || !player || !cardToPlace) return;

    // 1) 永遠先更新玩家位置（站位一定會變）
    player.currentClockPosition = cardToPlace.number;

	// 本回合「實際取得」小時卡的紀錄（分針能力需要）
	player.pickedHourThisTurn = true;
	player.pickedHourCardThisTurnNumber = cardToPlace.number;


	// 記錄本回合實際取得的小時卡（給分針能力判定用）
	player.pickedHourCardThisTurnNumber = cardToPlace.number;
	player.pickedMinHourThisTurn =
		(player.roleCard === '分針' &&
		 gameState.roundMinHourNumber !== null &&
		 cardToPlace.number === gameState.roundMinHourNumber);


    const label = playerNameForLog || player.name;
    console.log(`${label} 挑選小時卡 [${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}]，移動到 ${cardToPlace.number} 格。`);

    // 2) 判定是否可持有：僅「幼體時魔」可持有；已進化或非時魔皆不可
    const isTimeDemon = player.type === '時魔' && !player.isEjected;
    const roleText = String(player.roleCard || '');
    const isYoungTimeDemon = isTimeDemon && roleText.includes('幼');

    if (!Array.isArray(player.hourCards)) player.hourCards = [];

    const alreadyHasSameNumber =
        isTimeDemon && player.hourCards.some(c => c.number === cardToPlace.number);

    // ✅ 規則：小時卡由幼體時魔持有（同數字不重複）；受詛者/時之惡不持有；已進化不持有
    if (isYoungTimeDemon && !alreadyHasSameNumber) {
        player.hourCards.push(cardToPlace);
        console.log(`🧠【持有】${label} 持有小時卡 ${cardToPlace.number}${cardToPlace.isPrecious ? '★' : ''}`);
        return;
    }

    // 3) 其他情況：不持有 → 留在鐘面（供珍貴留場/回收機制處理）
    const clockSpot = gameState.clockFace.find(s => s.position === cardToPlace.number);
    if (clockSpot) {
        clockSpot.cards.push(cardToPlace);
        return;
    }

    // 4) 防呆：若找不到鐘面格子，退回牌庫避免卡牌遺失（理論上不會發生）
    gameState.hourDeck.push(cardToPlace);
    console.warn(`⚠️ 找不到鐘面位置 ${cardToPlace.number}，已將小時卡退回牌庫避免遺失。`);
}



function handleHumanHourCardChoice(gameState, chosenIndex) {
    if (!gameState || !gameState.waitingHourChoice || gameState.waitingHourChoicePlayerId !== HUMAN_PLAYER_ID) {
        return;
    }

    const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);
    if (!humanPlayer) return;

    const drawnCards = gameState.currentDrawnHourCards || [];
    if (chosenIndex < 0 || chosenIndex >= drawnCards.length) {
        console.warn("所選小時卡不存在或已被拿走。");
        return;
    }

    const cardToPlace = drawnCards.splice(chosenIndex, 1)[0];
    placeHourCardForPlayer(gameState, humanPlayer, cardToPlace, humanPlayer.name);

    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.nextHourPickerIndex++;

    processNextHourPicker(gameState);

    if (typeof updateUI === 'function') {
        updateUI(gameState);
    }
}

// game.js - finishHourSelection 函式 (已修改：分針取得任意小時卡皆可觸發)

function finishHourSelection(gameState) {
    // 1. 清理上一階段狀態
    gameState.currentDrawnHourCards = null;
    gameState.waitingHourChoice = false;
    gameState.waitingHourChoicePlayerId = null;
    gameState.hourPickOrder = null;
    gameState.nextHourPickerIndex = 0;

    // 丟棄本回合分鐘卡
    const choices = gameState.currentMinuteChoices || [];
    choices.forEach(c => gameState.minuteDiscard.push(c.card));

    // 2. 檢查分針觸發條件
    const humanPlayer = gameState.players.find(p => p.id === HUMAN_PLAYER_ID);
    
    // 定義基礎條件
    const isMinuteHand = humanPlayer && humanPlayer.roleCard === '分針';
    const isAlive = humanPlayer && !humanPlayer.isEjected;
    const hasMana = humanPlayer && humanPlayer.mana >= 2;
    const notBlocked = !gameState.abilityMarker;
    const notUsed = humanPlayer && !humanPlayer.specialAbilityUsed;
    
    // ✅ 修改重點：只要「本回合有取得小時卡」即可 (移除 roundMinHourNumber 的比對)
    const gotCard = 
        humanPlayer &&
        humanPlayer.pickedHourThisTurn === true &&
        typeof humanPlayer.pickedHourCardThisTurnNumber === 'number';

    // 綜合判斷
    if (GAME_CONFIG.enableAbilities && isMinuteHand && isAlive && hasMana && notBlocked && notUsed && gotCard) {
        
        // 設定專屬等待狀態
        gameState.waitingMinuteHandChoice = true;
        
        console.log(`⏱️【分針觸發】條件達成 (取得小時卡 ${humanPlayer.pickedHourCardThisTurnNumber})，暫停遊戲，顯示能力面板。`);

        if (typeof updateUI === 'function') updateUI(gameState);
        return; // ⛔ 暫停流程，等待玩家操作
    }

    // 若沒觸發，直接進入扣血階段
    deductGearCards(gameState);
}

// 處理人類玩家的能力選擇結果
function handleHumanAbilityChoice(gameState, choice) {
    // 如果不是在等待分針選擇，就忽略
    if (!gameState || !gameState.waitingMinuteHandChoice) return;

    console.log(`收到分針選擇: ${choice}`);

    if (choice === 'ccw' || choice === 'cw') {
        // 呼叫 abilities.js 的函式 (需確保已載入)
        if (typeof activateMinuteHandAbility === 'function') {
            activateMinuteHandAbility(gameState, HUMAN_PLAYER_ID, choice);
        }
    } else {
        console.log("分針選擇略過能力。");
    }

    // ✅ 清除等待狀態
    gameState.waitingMinuteHandChoice = false;

    // ✅ 恢復遊戲流程
    deductGearCards(gameState);

    if (typeof updateUI === 'function') updateUI(gameState);
}


function handleDiceDeduction(player) {
    let gearCardDeducted = false;
    if (player.d6Die) {
        player.d6Die--; 
        if (player.d6Die < 1) { 
            player.gearCards--; 
            if (player.mana > player.gearCards) {
                player.mana = player.gearCards;
            }
            gearCardDeducted = true;
            console.log(`【${player.type}】${player.name} 骰子耗盡，扣除 1 齒輪。`);

            if (player.type === '時之惡') {
                player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 6));
            } else { 
                player.d6Die = Math.max(1, Math.min(player.gearCards, 6));
            }
        }
    }
    return gearCardDeducted;
}

// -------------------------------------------------------------
// --- 5. 扣除齒輪卡邏輯 (確認版) ---
function deductGearCards(gameState) {
    const targetingMode = gameState.sinTargetingMode || 'default';
    const modeText = targetingMode === 'sin' ? '距離時之惡最近' : '數值最大(接近12)';
    
    console.log(`--- 步驟 5: 扣除齒輪卡/骰子 (當前規則: ${modeText}) ---`);
    
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    // 若時之惡不在場，無人受罰 (直接檢查勝利條件)
    if (!sinPlayer || !sinPlayer.currentClockPosition) {
        checkEjectionAndWinCondition(gameState);
        return;
    }
    
    const sinPosition = sinPlayer.currentClockPosition;
    let playersToDeduct = [];

    // 1. 決定受罰對象
    if (targetingMode === 'default') {
        const candidates = gameState.players.filter(p =>
            (p.type === '時魔' || p.type === '受詛者' || p.type === '時之惡') &&
            !p.isEjected &&
            p.currentClockPosition
        );

        if (candidates.length > 0) {
            let maxPos = 0;
            candidates.forEach(p => {
                if (p.currentClockPosition > maxPos) maxPos = p.currentClockPosition;
            });
            playersToDeduct = candidates.filter(p => p.currentClockPosition === maxPos);
        }
    } else {
        const targets = gameState.players.filter(p =>
            (p.type === '時魔' || p.type === '受詛者') &&
            !p.isEjected &&
            p.currentClockPosition
        );
        if (targets.length > 0) {
            let closestDistance = 7; 
            targets.forEach(player => {
                const distance = getCircularDistance(player.currentClockPosition, sinPosition);
                if (distance < closestDistance) closestDistance = distance;
            });
            playersToDeduct = targets.filter(player =>
                getCircularDistance(player.currentClockPosition, sinPosition) === closestDistance
            );
        }
    }

    // 2. 執行扣除
    playersToDeduct.forEach(player => {
        if (player.type === '時魔') {
            // 檢查是否為「幼體」 (只有幼體有護盾)
            const isYoungTimeDemon = typeof player.roleCard === 'string' && player.roleCard.includes('幼');

            // 【幼體防禦】：若是幼體、未用過盾、且 Mana 足夠，則擋下傷害
            if (isYoungTimeDemon && !player.shieldUsed && player.mana >= 3) {
                const spent = player.mana;
                player.shieldUsed = true;
                player.mana = 0;
                console.log(`🛡️【幼體防禦】${player.name} 耗用所有 ${spent} Mana，抵擋本次攻擊。`);
                return; // 成功抵擋，不扣齒輪
            }

            // 若已進化 (非幼體) 或 Mana 不足，直接扣齒輪
            player.gearCards--;
            
            // Mana 不能超過當前齒輪數
            if (player.mana > player.gearCards) player.mana = Math.max(0, player.gearCards);
            
            console.log(`【時魔】${player.name} (${modeText}) 扣除 1 齒輪 (剩餘: ${player.gearCards})。`);

        } else if (player.type === '受詛者' || player.type === '時之惡') {
            handleDiceDeduction(player);
        }
    });
	
    // 3. 檢查是否有人因此死亡
    checkEjectionAndWinCondition(gameState);
}

// --- 檢查逐出與勝利條件 (確認版) ---
function checkEjectionAndWinCondition(gameState) {
    if (!gameState || !gameState.players) return;

    // 1. 檢查齒輪 < 0（即 -1）才逐出。 0 是安全的。
    gameState.players.forEach(player => {
        if (!player.isEjected && player.gearCards < 0) {
            player.isEjected = true;
            player.gearCards = 0; // 歸零僅為了 UI 顯示好看
            player.mana = 0;
            player.currentClockPosition = null;
            if (typeof player.d6Die === 'number') player.d6Die = 0;

            // 標記本輪有時魔死亡 (影響時之惡懲罰判定)
            if (player.type === '時魔') {
                gameState.roundHadTimeDemonEjection = true;
            }

            console.log(`⚠️【逐出】${player.name} 的齒輪耗盡 (${player.gearCards})，被逐出遊戲。`);
        }
    });

    // 2. 勝利判定
    const aliveTimeDemons = gameState.players.filter(p => p.type === '時魔' && !p.isEjected);
    const sinAlive = gameState.players.some(p => p.type === '時之惡' && !p.isEjected);

    if (!sinAlive || aliveTimeDemons.length === 0) {
        gameState.gameEnded = true;
        if (!sinAlive && aliveTimeDemons.length > 0) {
            console.log('🎉 遊戲結束：時之惡被逐出，時魔陣營勝利！');
        } else if (sinAlive && aliveTimeDemons.length === 0) {
            console.log('🎉 遊戲結束：所有時魔被逐出，時之惡陣營勝利！');
        } else {
            console.log('🎉 遊戲結束。');
        }
    }

    if (!gameState.gameEnded) {
        inRoundEndActions(gameState);
    } else {
        if (typeof updateUI === 'function') updateUI(gameState);
    }
}

function inRoundEndActions(gameState) {
	gameState.players.filter(p =>
		p.type === '時魔' &&
		!p.isEjected &&
		p.currentClockPosition &&
		typeof p.roleCard === 'string' &&
		p.roleCard.includes('幼')
	  )
	  .forEach(player => {
		const currentSpot = gameState.clockFace.find(s => s.position === player.currentClockPosition);
		if (!currentSpot || currentSpot.cards.length <= 1) return;

		const collectedCard = currentSpot.cards.pop();

		if (!Array.isArray(player.hourCards)) player.hourCards = [];

		const alreadyHas = player.hourCards.some(c => c.number === collectedCard.number);
		if (alreadyHas) {
		  // 不應收就放回去，避免卡被吃掉
		  currentSpot.cards.push(collectedCard);
		  return;
		}

		player.hourCards.push(collectedCard);
		console.log(`【時魔】${player.name} 取得小時卡 (${collectedCard.number})。`);
	  });


    // 時之惡封印能力
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    
    // ✅ 新增判定：計算場上「已進化」的時魔數量 (時針、分針、秒針)
    const evolvedCount = gameState.players.filter(p => 
        p.type === '時魔' && 
        !p.isEjected && 
        ['時針', '分針', '秒針'].includes(p.roleCard)
    ).length;

    // 修改觸發條件：
    // 1. 能力開啟
    // 2. Mana >= 4
    // 3. 場上已進化時魔 >= 2 (關鍵新條件)
    // 4. 機率觸發 (稍微提高機率到 0.4，因為條件變嚴苛了)
    if (GAME_CONFIG.enableAbilities && 
        sinPlayer && 
        sinPlayer.mana >= 4 && 
        evolvedCount >= 2 && 
        Math.random() < 0.4
    ) { 
        sinPlayer.mana -= 4; 
        gameState.abilityMarker = true; 
        console.log(`😈【時之惡】感知到威脅 (${evolvedCount} 名進化時魔)，耗用 4 Mana 封印全場特殊能力！`);
    }

    // 受詛者保護卡片
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
    
    // 角色升級嘗試
    gameState.players.filter(p => p.type === '時魔' && !p.isEjected).forEach(player => {
        if (typeof attemptRoleUpgrade === 'function') {
            attemptRoleUpgrade(player, gameState);
        }
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

// 【5P 專用】檢查受詛者任務
function checkSCZMissionSuccess(gameState) {
    let preciousOnFace = 0;
    gameState.clockFace.forEach(spot => {
        if (spot.cards.length > 0) {
            if (spot.cards.some(c => c.isPrecious)) {
                preciousOnFace++;
            }
        }
    });
    return (preciousOnFace >= 12); 
}

function endGameRound(gameState) {
    console.log(`=== 第 ${gameState.gameRound} 輪結束 ===`);
    const numPlayers = gameState.players.length;

    // 1. 計算分數（以本輪結束時的齒輪數為準）
    gameState.players.forEach(player => {
        player.score += player.gearCards;
        console.log(`【${player.name}】得分: ${player.gearCards}. 總分: ${player.score}`);
    });

    // 2. 「時之惡懲罰」：以「輪」為單位
    //    若本輪與上一輪，都沒有任何「時魔」被逐出 → 扣時之惡 1 齒輪
    const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
    const currentRoundSafe = !gameState.roundHadTimeDemonEjection;  // 本輪是否「無時魔被逐出」

    if (sinPlayer) {
        if (currentRoundSafe && gameState.previousRoundSafe) {
            sinPlayer.gearCards--;

			console.log(`【時之惡懲罰】連續 2 輪無人被逐出，${sinPlayer.name} 扣除 1 齒輪。`);

			// 齒輪 < 0（例如 -1）才逐出
			if (sinPlayer.gearCards < 0) {
				sinPlayer.isEjected = true;
				sinPlayer.gearCards = 0;
				sinPlayer.mana = 0;
				sinPlayer.currentClockPosition = null;
				if (typeof sinPlayer.d6Die === 'number') sinPlayer.d6Die = 0;
				console.log(`⚠️【逐出】${sinPlayer.name} 齒輪耗盡，被逐出遊戲。`);

				console.log('🎉 遊戲結束：時之惡被逐出，時魔陣營勝利！');
				endGame(gameState);
				return;
			}

			// 仍存活時，確保 Mana 不高於齒輪（且不為負）
			if (sinPlayer.mana > sinPlayer.gearCards) {
				sinPlayer.mana = sinPlayer.gearCards;
			}
			if (sinPlayer.mana < 0) sinPlayer.mana = 0;
        }
		
        // 更新「上一輪是否安全」標記
        gameState.previousRoundSafe = currentRoundSafe;
    } else {
        // 沒有存活的時之惡，就不再計算這個懲罰
        gameState.previousRoundSafe = false;
    }

    // 為下一輪重置「本輪是否有時魔被逐出」的紀錄
    gameState.roundHadTimeDemonEjection = false;

    // 【5P 專用】第 5 輪結算
    if (numPlayers === 5 && gameState.gameRound === 5) {
        const sczPlayer = gameState.players.find(p => p.type === '受詛者');
        if (sczPlayer) {
            if (checkSCZMissionSuccess(gameState)) {
                console.log("🎉【受詛者】任務達成！");
            } else {
                console.log("⚠️【受詛者】任務失敗。");
                sczPlayer.score -= 999;
            }
        }
    }

	// 2.5 幼體時魔交還小時卡：實體卡全部回到牌庫
	let returnedFromYoungDemons = [];

	gameState.players.forEach(player => {
	  if (
		player.type === '時魔' &&
		typeof player.roleCard === 'string' &&
		player.roleCard.includes('幼') &&
		Array.isArray(player.hourCards) &&
		player.hourCards.length > 0
	  ) {
		returnedFromYoungDemons.push(...player.hourCards);
		player.hourCards = [];
	  }
	});

	if (returnedFromYoungDemons.length > 0) {
	  shuffle(returnedFromYoungDemons);
	  gameState.hourDeck.push(...returnedFromYoungDemons);
	  console.log(`🔁 幼體時魔交還 ${returnedFromYoungDemons.length} 張小時卡，已回到小時卡庫。`);
	}

    // 3. 重置鐘面（珍貴留場，普通回牌庫）
    const cardsToReturnToDeck = [];
    gameState.clockFace.forEach(spot => {
        if (spot.cards.length === 0) return;

        const topCard = spot.cards[spot.cards.length - 1]; 
        
        if (topCard.isPrecious) {
            const cardsBelow = spot.cards.slice(0, -1); 
            if (cardsBelow.length > 0) {
                cardsToReturnToDeck.push(...cardsBelow);
            }
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
    
    // 4. 傳遞狀態 (手牌/齒輪)
    gameState.players.forEach((player, index) => {
        const handSetIndex = (index - gameState.gameRound + numPlayers) % numPlayers; 
        const initialGear = gameState.originalGearSets[handSetIndex];
        player.gearCards = initialGear; 
        player.mana = player.gearCards;
        player.hand = gameState.originalHandSets[handSetIndex].map(c => ({ ...c }));
        
        player.specialAbilityUsed = false; 

        // ✅ 修改重點：若為 時之惡 或 受詛者，保留位置（不設為 null）
        // 只有「非時之惡 且 非受詛者」的角色（即時魔們），才需要移出鐘面
        if (player.type !== '時之惡' && player.type !== '受詛者') {
            player.currentClockPosition = null;
        }
        
        player.isEjected = false;
        player.hourCards = []; 
    });
    console.log("🔄 玩家已接收新一輪的手牌與齒輪。");

    // 5. 重置骰子
    gameState.players.forEach(player => {
        if (player.type === '時之惡') {
            player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 6)); 
        } else if (player.type === '受詛者') {
            player.d6Die = Math.max(1, Math.min(player.gearCards, 6)); 
        }
    });

    // 6. 進入下一輪
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
        .forEach(player => {
            player.score += 5;
        });
    
    const finalScores = gameState.players.slice().sort((a, b) => b.score - a.score);
    finalScores.forEach((p, index) => {
        console.log(`#${index + 1}: ${p.name} (總分: ${p.score})`);
    });

    gameState.gameEnded = true;
    if (typeof updateUI === 'function') updateUI(gameState);
}

// ✅ 對 UI 暴露必要 API（避免 scope/載入差異導致 initializeGame 不可見）
try {
    if (typeof window !== 'undefined') {
        window.initializeGame = initializeGame;
        window.startRound = startRound;
        window.handleHumanChoice = handleHumanChoice;
        window.handleHumanHourCardChoice = handleHumanHourCardChoice;
        window.handleHumanAbilityChoice = handleHumanAbilityChoice;
        window.handleHumanSecondHandCommit = handleHumanSecondHandCommit;
        window.handleHumanSecondHandFinalChoice = handleHumanSecondHandFinalChoice;
        window.getEffectiveHumanPlayerId = getEffectiveHumanPlayerId;
    }
} catch (_) {}
