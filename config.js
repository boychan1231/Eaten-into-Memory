// config.js - 遊戲全域設定檔

// 1. 系統開關 (System Toggles)
window.GAME_CONFIG = {
    enableAbilities: false, // 預設是否啟用特殊能力 (可被 UI 開關覆蓋)
    testMode: false,        // 預設是否開啟測試模式 (可被 UI 開關覆蓋)
    defaultHumanId: 'SM_1',  // 預設人類玩家 ID
    gameMode: '5P',          // 遊戲模式: '5P' (預設) 或 '3P'
    threePStartingRole: '時針' // 3P 模式下人類玩家初始身份
};

// 2. 介面外觀 (UI Appearance)
window.UI_CONFIG = {
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
        '秒針': '#00d2d3'
    }
};

// 3. 遊戲核心數據 (Game Data)
window.GAME_DATA = {
    // 角色列表定義 (保持不變)
    PLAYER_ROLES: [
        { id: 'SM_1', name: '時魔幼體 1', type: '時魔' },
        { id: 'SM_2', name: '時魔幼體 2 ', type: '時魔' },
        { id: 'SM_3', name: '時魔幼體 3 ', type: '時魔' },
        { id: 'sin', name: '時之惡', type: '時之惡' },
        { id: 'SCZ', name: '受詛者', type: '受詛者' }
    ],
    
    // 能力消耗與參數設定 (集中管理平衡數值)
    ABILITY_COSTS: {
        TIME_HAND_MOVE: 1,      // 時針：移牌到底部
        MINUTE_HAND_MOVE: 2,    // 分針：移動一格
        SECOND_HAND_SELECT: 3,  // 秒針：二選一
        SIN_PULL: 2,            // 時之惡：惡之牽引
        SIN_SEAL: 3,            // 時之惡：全場封印
        YOUNG_SHIELD: 3         // 幼體：護盾
    },

    // ✅ 新增：小時卡珍貴配置 (原本在 game.js)
    HOUR_PRECIOUS_CONFIGS: [
        {   id: 'CFG_1', label: 'hour123',
            mapping: { '少年': [1, 5, 8, 10], '青年': [2, 6, 7, 11], '中年': [3, 4, 9, 12] }
        },
        {   id: 'CFG_2', label: 'hour231',
            mapping: { '少年': [2, 6, 7, 11], '青年': [3, 4, 9, 12], '中年': [1, 5, 8, 10] }
        },
        {   id: 'CFG_3', label: 'hour312',
            mapping: { '少年': [3, 4, 9, 12], '青年': [1, 5, 8, 10], '中年': [2, 6, 7, 11] }
        }
    ],

    // 卡牌基礎設定 (保持不變)
    HOUR_CARDS: { ageGroups: ['少年', '青年', '中年'], countsPerGroup: 12 },
    MINUTE_CARDS: { total: 60 }
};
