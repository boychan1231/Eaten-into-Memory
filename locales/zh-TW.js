// locales/zh-TW.js - 繁體中文語言包
(function () {
    window.I18N_LOCALES = window.I18N_LOCALES || {};
    window.I18N_LOCALES['zh-TW'] = {
        lang_name: '繁體中文',
        roles: {
            demon: '時魔',
            sin: '時之惡',
            scz: '受詛者',
            hour: '時針',
            min: '分針',
            sec: '秒針',
            young_demon: '時魔幼體'
        },
        age_groups: {
            youth: '少年',
            adult: '青年',
            middle: '中年'
        },
        ui: {
            drawers: {
                evolution: '⚡ 能力與進化',
                log: '📜 遊戲日誌',
                players: '👥 各角色狀態',
                played_scores: '📊 出牌與積分'
            },
            buttons: {
                confirm_move: '確認出牌',
                next_round: '下一回合',
                next_round_countdown: '下一回合 ({sec}s)',
                next_round_skip: '下一回合 (略過能力)',
                game_over: '遊戲結束',
                start_game: '開始新遊戲',
                view_collection: '查看已收集卡片',
                sort: '⇅ 排序',
                recenter: '置中鐘面',
                restart: '🔄 再玩一局',
                view_board: '👀 查看盤面'
            },
            labels: {
                you_are: '您是：',
                you_tag: '★我',
                mana: 'Mana',
                gear_hp: '生命',
                shield: '護盾',
                collected: '🃏 收集',
                hand_count: '手牌：',
                position: '位置：',
                not_on_board: '未上場',
                ejected: '驅逐',
                round: '回合 {round}',
                game_round: '第 {round} 局',
                deck_remain: '牌庫剩餘'
            },
            tabs: {
                game: '遊戲舞台',
                rules: '遊戲規則',
                settings: '設定',
                current_round: '本回合',
                history: '歷史',
                scores: '積分'
            },
            settings: {
                title: '⚙️ 遊戲設定',
                language: '🌐 語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)'
            },
            hints: {
                drag_to_play: '⚡ 放開以出牌',
                pick_hour: '請點選小時卡',
                waiting_input: '請出牌...',
                waiting_hour_choice: '請在鐘面挑選小時卡...',
                waiting_minute_choice: '等待分針特殊選擇...',
                waiting_ability_choice: '請決定是否使用特殊能力...',
                waiting_second_final: '請完成秒針二選一...',
                comparing_minute: '比較分鐘數值中...',
                comparing_minute_skip: '比較分鐘數值中…（點擊畫面可提前跳過）',
                sec_ability_select_two: '⚡ 秒針能力：請點選 2 張分鐘卡。',
                sec_ability_ready: '⚡ 已選 2 張卡牌，請點擊「確認出牌」。'
            },
            clash: {
                gathering: '⏳ 各玩家已蓋牌集結，準備翻牌…',
                revealing: '🃏 揭曉各玩家打出的分鐘卡…',
                comparing: '⚡ 比較分鐘數值大小，排列行動次序…',
                resolved: '✨ 分鐘卡大小次序已確定！',
                continue_prompt: '👆 點擊畫面任意處繼續（{sec}s 後自動進入挑選小時卡）'
            },
            round_ready: {
                title: '第 {round} 局結算',
                subtitle: '已重新分配手牌，準備進入第 {nextRound} 局',
                ready_btn: '準備完成',
                col_rank: '排名',
                col_player: '角色',
                col_role: '身份',
                col_round_score: '本局得分',
                col_total_score: '累計總分',
                pts_gear: '+{gear} 齒',
                pts_total: '{pts} 分',
                ejected: '(逐出)'
            }
        }
    };
})();
