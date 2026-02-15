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

// (原本的設定保留) ...

    // ✅ 新增：小時卡故事文本庫
    window.GAME_DATA.HOUR_STORIES = {
        '少年': {
            1: "那年夏天，時鐘第一次停擺。記憶中的青草香伴隨著莫名的恐懼，深植在靈魂深處...",
            2: "第二張少年卡的故事...",
            3: "第三張少年卡的故事...",
            // ... 請在此繼續填寫 4~12 號
        },
        '青年': {
            1: "齒輪開始加速轉動。曾經的理想被現實一點一點啃食，只剩下麻木的驅殼...",
            2: "第二張青年卡的故事...",
            // ... 請在此繼續填寫 3~12 號
        },
        '中年': {
            1: "時間的重壓終於讓人喘不過氣。看著鏡子裡疲憊的面容，才明白代價是什麼...",
            12: "這是一切的終結，也是輪迴的開始。時之惡在陰影中微笑。"
            // ... 請在此繼續填寫其他號碼
        }
    };
