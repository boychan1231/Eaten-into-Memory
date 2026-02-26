// game.js
var appLogger = (typeof window !== 'undefined' && window.appLogger) || {
    log: (...args) => console.log(...args)
};

// ✅ 人類玩家 ID：改為可動態設定（支援角色選擇/測試），預設讀取設定檔。
let HUMAN_PLAYER_ID = (typeof window !== 'undefined' && window.GAME_CONFIG?.defaultHumanId)
    ? window.GAME_CONFIG.defaultHumanId
    : 'SM_1';

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
if (GAME_CONFIG.gameMode === undefined) GAME_CONFIG.gameMode = '5P';
if (GAME_CONFIG.threePStartingRole === undefined) GAME_CONFIG.threePStartingRole = '時針';

try { if (typeof window !== 'undefined') window.GAME_CONFIG = GAME_CONFIG; } catch (_) {}

// ✅ 對外提供同一份設定（給 ui.js / abilities.js 使用）
if (typeof window !== 'undefined') {
    window.GAME_CONFIG = GAME_CONFIG;
}

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
const THREE_PLAYER_HAND_ROLES = ['時針', '分針', '秒針'];

function createHourCard(number, ageGroup, isPrecious = false) {
    return { type: 'hour', number, ageGroup, isPrecious };
}

//讀取 window.GAME_DATA
function pickRandomPreciousConfig() {
    const configs = window.GAME_DATA?.HOUR_PRECIOUS_CONFIGS || [];
    if (configs.length === 0) return null; // 防呆
    const idx = getRandomInt(configs.length);
    return configs[idx];
}


function getPreciousAgeGroupForNumber(config, number) {
    if (!config || !config.mapping) return null;
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
    if (!config || !config.mapping) {
        console.warn("⚠️ 未載入小時卡珍貴配置，將以非珍貴卡建立牌庫。");
    }
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

function buildHourDeckForThreePlayer() {
    const deck = [];
    for (let i = 0; i < 2; i++) {
        for (let n = 1; n <= 12; n++) {
            deck.push(createHourCard(n, null, false));
        }
    }
    return { deck, config: null };
}

function getGameMode() {
    const mode = GAME_CONFIG?.gameMode || (typeof window !== 'undefined' ? window.GAME_CONFIG?.gameMode : null);
    return mode === '3P' ? '3P' : '5P';
}

function getRolesForMode(mode) {
    if (mode === '3P') {
        return PLAYER_ROLES.filter(role => role.type === '時魔');
    }
    return PLAYER_ROLES;
}

function formatTimeDemonName(player, roleName) {
    const name = String(player.name || '').trim();
    let m = name.match(/時魔\s*幼體\s*(\d+)/);
    if (!m) m = name.match(/時魔\s*(\d+)/);
    if (!m) m = String(player.id || '').match(/SM_(\d+)/);
    const idxText = m ? m[1] : (String(player.id || '').replace(/^SM_/, '') || '');
    return `時魔 ${idxText} (${roleName})`;
}

function assignThreePlayerRoles(gameState) {
    if (!gameState || !Array.isArray(gameState.players)) return;
    const humanId = (typeof getEffectiveHumanPlayerId === 'function') ? getEffectiveHumanPlayerId() : HUMAN_PLAYER_ID;
    const humanPlayer = gameState.players.find(p => p.id === humanId) || gameState.players[0];
    const preferredRole = (GAME_CONFIG?.threePStartingRole || window.GAME_CONFIG?.threePStartingRole);
    const rolePool = [...THREE_PLAYER_HAND_ROLES];
    const humanRole = rolePool.includes(preferredRole) ? preferredRole : rolePool[0];

    if (humanPlayer) {
        humanPlayer.roleCard = humanRole;
        humanPlayer.name = formatTimeDemonName(humanPlayer, humanRole);
    }

    const remainingRoles = rolePool.filter(role => role !== humanRole);
    shuffle(remainingRoles);

    gameState.players
        .filter(p => p !== humanPlayer)
        .forEach((player, idx) => {
            const roleName = remainingRoles[idx % remainingRoles.length];
            player.roleCard = roleName;
            player.name = formatTimeDemonName(player, roleName);
        });
}

// --- 2. 玩家/角色定義 ---
// ✅ 修改：從 config.js 讀取角色列表
const PLAYER_ROLES = window.GAME_DATA?.PLAYER_ROLES || [
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
			// 加入 ID 判斷，確保受詛者一定有護盾
            d6Die: (role.type === '時之惡' || role.type === '受詛者' || role.id === 'SCZ') ? 6 : null,
            isEjected: false,
            hasEverBeenEjected: false,// 永久記錄是否曾被驅逐 (用於時之惡勝利判定)
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
		
		// 防止結算面板重複彈出
        this.hasShownGameOverPanel = false; 
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
		// 記錄上一局是否「安全」(沒有時魔被逐出)
        // 初始設為 false，確保第一局就算安全也不會觸發「連續兩局」的條件
        this.previousRoundSafe = false;
		// 記錄本局是否有「時魔被逐出」事件（用於連續兩局懲罰判定）
        this.roundHadTimeDemonEjection = false;
    }
}


// --- 4. 輔助函式 ---

// ✅ 新增：統一亂數核心
// 目前是直接回傳 Math.random()，未來可在此替換為 Seeded Random (種子亂數)
function getRandom() {
    return Math.random();
}

// ✅ 新增：機率判定 (輸入 0.0 ~ 1.0)
// 用法：if (checkChance(0.5)) { ... } 代表 50% 機率成功
function checkChance(probability) {
    return getRandom() < probability;
}

// ✅ 新增：取得 0 到 max-1 的隨機整數 (用於陣列取值)
// 用法：getRandomInt(10) 會回傳 0~9
function getRandomInt(max) {
    return Math.floor(getRandom() * max);
}

// 掛載到 window，讓 abilities.js 也能呼叫
if (typeof window !== 'undefined') {
    window.getRandom = getRandom;
    window.checkChance = checkChance;
    window.getRandomInt = getRandomInt;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
		const j = getRandomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getCircularDistance(pos1, pos2) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff); 
}

// --- 5. 遊戲初始化邏輯 ---

function initializeGame(roles = null) {
    const resolvedGameMode = roles ? (roles.length === 3 ? '3P' : '5P') : getGameMode();
    const resolvedRoles = roles || getRolesForMode(resolvedGameMode);
    const minuteDeckCopy = [...DECK_MINUTE_CARDS];
	shuffle(minuteDeckCopy);

	// 生成「本局」小時牌庫（含隨機珍貴配置）
	const { deck: hourDeckCopy, config: hourConfig } = (resolvedGameMode === '3P')
        ? buildHourDeckForThreePlayer()
        : buildHourDeckWithRandomPrecious();
	shuffle(hourDeckCopy);

	const gameState = new GameState(resolvedRoles);
    gameState.gameMode = resolvedGameMode;
	gameState.minuteDeck = minuteDeckCopy;
	gameState.hourDeck = hourDeckCopy;

	// 存起本局配置（方便日後 UI 顯示或除錯）
	gameState.hourPreciousConfig = hourConfig;
	if (hourConfig && hourConfig.id) {
	    appLogger.log(`【小時卡設定】本局珍貴配置：${hourConfig.id}｜${hourConfig.label}`);
	} else {
	    appLogger.log("【小時卡設定】3P 模式：不使用珍貴小時卡。");
	}


    const numCards = (resolvedGameMode === '3P') ? 13 : 12;
    const numPlayers = gameState.players.length;
	
	// --- 測試模式：固定人類玩家第 1 局起始手牌 ---
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
            __testHandCards = __testHandCards.slice(0, numCards);

            appLogger.log(`🧪【測試模式】人類玩家 ${__humanIdForTest} 第 1 局起始手牌固定為：${__testHandCards.map(c => c.value).join(',')}`);
        } else {
            console.warn(`🧪【測試模式】找不到人類玩家 id=${__humanIdForTest}，未套用固定手牌。`);
        }
    }

    
    for (let i = 0; i < numPlayers; i++) {
        const handSet = [];

        // 測試模式：指定人類玩家固定手牌（僅第 1 局）
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
            player.d6Die = Math.max(1, Math.min(player.gearCards + 1, 5)); 
        } else if (player.type === '受詛者') {
            player.d6Die = Math.max(1, Math.min(player.gearCards, 3)); 
        }
    });

    // 初始位置
    const sinPlayerStart = gameState.players.find(p => p.type === '時之惡');
    if (sinPlayerStart) {
        sinPlayerStart.currentClockPosition = 12;
        appLogger.log("【初始設定】時之惡 位於位置 12");
    }

    const sczPlayerStart = gameState.players.find(p => p.type === '受詛者');
    if (sczPlayerStart) {
        sczPlayerStart.currentClockPosition = 1;
        appLogger.log("【初始設定】受詛者 位於位置 1");
    }

    if (resolvedGameMode === '3P') {
        assignThreePlayerRoles(gameState);
    }
    
    appLogger.log("遊戲初始化完成！");
    return gameState;
}

