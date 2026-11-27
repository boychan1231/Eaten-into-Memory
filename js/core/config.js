// config.js - 遊戲全域設定檔

window.globalGameState = null; 

// 1. 系統開關 (System Toggles)
// 0. 核心資料識別碼（獨立於自然語言，供邏輯判定與多語系/語音索引使用）
window.GAME_IDS = {
    ROLES: {
        HOUR: 'hour',
        MINUTE: 'min',
        SECOND: 'sec'
    },
    TYPES: {
        TIME_DEMON: 'demon',
        TIME_SIN: 'sin',
        CURSED_ONE: 'scz',
        YOUNG_DEMON: 'young_demon'
    },
    AGE_GROUPS: {
        CHILD: 'child',
        YOUTH: 'youth',
        ADULT: 'adult',
        MIDDLE: 'middle'
    }
};

// 雙向相容層 (Legacy Adapter)
window.getNormalizedRole = function (role) {
    if (!role) return '';
    if (role === '時針' || role === 'hour' || role === 'Hour Hand') return 'hour';
    if (role === '分針' || role === 'min' || role === 'Minute Hand') return 'min';
    if (role === '秒針' || role === 'sec' || role === 'Second Hand') return 'sec';
    return role;
};

window.getNormalizedType = function (type) {
    if (!type) return '';
    if (type === '時魔' || type === 'demon' || type === 'Time Demon') return 'demon';
    if (type === '時之惡' || type === 'sin' || type === 'Time Sin') return 'sin';
    if (type === '受詛者' || type === 'scz' || type === 'Cursed One') return 'scz';
    if (type === '幼體時魔' || type === '時魔幼體' || type === 'young_demon' || type === 'Young Demon') return 'young_demon';
    return type;
};

window.isPureMode = function (mode) {
    return typeof mode === 'string' && mode.startsWith('PURE');
};

window.getPurePlayerCount = function (mode) {
    if (mode === 'PURE_3P') return 3;
    if (mode === 'PURE_4P') return 4;
    if (mode === 'PURE_5P') return 5;
    return 4;
};

window.GAME_CONFIG = {
    enableAbilities: false, // 預設是否啟用特殊能力 (可被 UI 開關覆蓋)
    testMode: false,        // 預設是否開啟測試模式 (可被 UI 開關覆蓋)
    tutorialMode: true,     // 預設是否開啟新手教學引導模式
    defaultHumanId: 'SM_1',  // 預設人類玩家 ID
    gameMode: '5P',          // 遊戲模式: '5P' (預設)、'3P' 或 'PURE_3P' / 'PURE_4P' / 'PURE_5P'
    threePStartingRole: '時針', // 3P 模式下人類玩家初始身份
    purePlayerCount: 4,      // 純競標模式預設人數 (3 / 4 / 5)
    aiDifficulty: 'normal'   // AI 對戰難度: 'normal' (一般，新改良演算法) 或 'easy' (簡單，原始基礎行為)
};

// 2. 介面外觀 (UI Appearance)
window.UI_CONFIG = {
    SEQUENTIAL_EFFECTS: true,  // 預設是否啟用「特效依序播放 (逐一發生)」
    EFFECT_INTERVAL_MS: 260,   // 特效逐一播放間隔時間 (毫秒，推薦 200~300ms 輕快節奏)
    SCREEN_SHAKE: true,        // 預設是否啟用「扣除 GP 時畫面震動特效」
    FAN_HAND_LAYOUT: true,     // 預設是否於現代版桌機啟用「扇形手牌列」
    LOG_SPEED: 360,          // 日誌顯示速度 (毫秒，越小越快)
    LOG_RETENTION_LIMIT: 200, // 日誌保留上限 (DOM)
    HISTORY_LIMIT: 12,       // 右側歷史記錄顯示的回合數
    LOG_TO_UI: true,         // 是否輸出日誌到 UI
    LOG_TO_CONSOLE: true,    // 是否輸出日誌到瀏覽器 Console
	
	// 手牌排序預設值 ('asc' = 由小到大, 'desc' = 由大到小)
    HAND_SORT_ORDER: 'asc',
    
    // 角色顏色定義
    ROLE_COLORS: {
        '時魔': '#ff6b6b',
        '時之惡': '#feca57',
        '受詛者': '#54a0ff',
        '時針': '#ff9ff3',
        '分針': '#f368e0',
        '秒針': '#00d2d3',
        'demon': '#ff6b6b',
        'sin': '#feca57',
        'scz': '#54a0ff',
        'hour': '#ff9ff3',
        'min': '#f368e0',
        'sec': '#00d2d3',
        'pure': '#a29bfe',
        '純競標': '#a29bfe'
    }
};

// 3. 遊戲核心數據 (Game Data)
window.GAME_DATA = {
    // 角色列表定義 (保持不變)
    PLAYER_ROLES: [
        { id: 'SM_1', name: '時魔幼體 1', type: '時魔' },
        { id: 'SM_2', name: '時魔幼體 2', type: '時魔' },
        { id: 'SM_3', name: '時魔幼體 3', type: '時魔' },
        { id: 'sin', name: '時之惡', type: '時之惡' },
        { id: 'SCZ', name: '受詛者', type: '受詛者' }
    ],
    
    // 能力消耗與參數設定 (集中管理平衡數值)
    ABILITY_COSTS: {
        TIME_HAND_MOVE: 1,          // 時針：移牌到底部
        MINUTE_HAND_MOVE: 2,        // 分針：移動一格 (5P)
        MINUTE_HAND_MOVE_3P: 3,     // 分針：移動一格 (3P 平衡：降低過強逃生頻率)
        SECOND_HAND_SELECT: 3,      // 秒針：二選一 (5P)
        SECOND_HAND_SELECT_3P: 2,   // 秒針：二選一 (3P 平衡：提昇雙牌伏擊可用性)
        SECOND_HAND_SWAP: 1,        // 秒針：1/60 互換打出
        SIN_PULL: 2,                // 時之惡：惡之牽引
        SIN_SEAL: 3,                // 時之惡：全場封印
        YOUNG_SHIELD: 3             // 幼體：護盾
    },

    // ✅ 小時卡珍貴配置 (幼年 1、少年 4、青年 4、中年 3、死亡 0；共 12 張珍貴卡，1~12 每刻度恰好 1 張)
    HOUR_PRECIOUS_CONFIGS: [
        {   id: 'CFG_1', label: 'hour_rot1',
            mapping: { '幼年': [1], '少年': [3, 6, 10, 12], '青年': [4, 7, 9, 11], '中年': [2, 5, 8] }
        },
        {   id: 'CFG_2', label: 'hour_rot2',
            mapping: { '幼年': [2], '少年': [1, 3, 7, 9], '青年': [4, 6, 11, 12], '中年': [5, 8, 10] }
        },
        {   id: 'CFG_3', label: 'hour_rot3',
            mapping: { '幼年': [3], '少年': [6, 8, 11, 12], '青年': [1, 5, 7, 10], '中年': [2, 4, 9] }
        },
        {   id: 'CFG_4', label: 'hour_rot4',
            mapping: { '幼年': [4], '少年': [1, 2, 8, 10], '青年': [6, 7, 9, 12], '中年': [3, 5, 11] }
        },
        {   id: 'CFG_5', label: 'hour_rot5',
            mapping: { '幼年': [5], '少年': [3, 7, 11, 12], '青年': [1, 8, 9, 10], '中年': [2, 4, 6] }
        }
    ],

    // 卡牌基礎設定 (幼年 5、少年 10、青年 10、中年 10、死亡 1，共 36 張)
    HOUR_CARDS: {
        ageGroups: ['幼年', '少年', '青年', '中年', '死亡'],
        countsPerGroup: { '幼年': 5, '少年': 10, '青年': 10, '中年': 10, '死亡': 1 },
        total: 36
    },
    MINUTE_CARDS: { total: 60 }
};

    // 小時卡故事庫已獨立至 locales/stories_data.js，由 window.getHourCardStory 統一存取
    window.GAME_DATA.HOUR_STORIES = window.GAME_DATA.HOUR_STORIES || {};
