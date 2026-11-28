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
            young_demon: '時魔幼體',
            pure: '純競標'
        },
        age_groups: {
            child: '幼年',
            youth: '少年',
            adult: '青年',
            middle: '中年',
            death: '死亡'
        },
        ui: {
            drawers: {
                evolution: '能力與進化',
                log: '遊戲日誌',
                players: '角色',
                scores: '積分',
                players_scores: '角色與積分',
                played_cards: '本回合出牌',
                history: '出牌記錄',
                played_scores: '出牌與積分',
                size_reset: '重置尺寸',
                resize_grip: '拖曳調整大小'
            },
            buttons: {
                confirm_move: '確認出牌',
                next_round: '下一回合',
                next_round_countdown: '下一回合 ({sec}s)',
                next_round_skip: '下一回合 (略過能力)',
                game_over: '遊戲結束',
                start_game: '開新遊戲',
                view_collection: '查看已收集卡片',
                sort: '⇅ 排序',
                recenter: '置中鐘面',
                zoom_in: '放大鐘面',
                zoom_out: '縮小鐘面',
                restart: '再玩一局',
                view_board: '查看盤面',
                tutorial_hint: '教學提示',
                tutorial_hint_tip: '重新顯示教學提示'
            },
            phase_tracker: {
                bid: '出牌競標',
                reveal: '比牌揭曉',
                pick: '挑選小時卡',
                resolve: '懲罰結算',
                status_bid: '請打出分鐘卡',
                status_reveal: '揭開分鐘卡·比較大小排序',
                status_pick: '依名次挑選小時卡',
                status_your_pick: '▶ 【{rank}】輪到您挑選小時卡',
                status_ai_pick: '⧖ 【{rank}】{name} 正在挑選小時卡',
                status_minute_jump: '▶ 分針能力：決定是否躍遷刻度',
                status_second_choice: '◈ 秒針能力：二選一決定打出卡牌',
                status_resolve: '結算完畢 · 請點擊「下一回合」',
                status_round_end: '回合結算中'
            },
            discard_pile: {
                title: '出牌記錄',
                empty: '尚無出牌',
                empty_sub: '點擊查看出牌記錄',
                last_played: '上一張出牌',
                modal_title: '出牌記錄',
                modal_subtitle: '第 {round} 局 · 共出 {count} 張分鐘卡',
                tab_history: '各角色歷程',
                tab_timeline: '依回合記錄',
                tab_matrix: '數字盤 (1~60)',
                trick_title: '第 {trick} 回合',
                cards_count: '{count} 張',
                unplayed_count: '剩餘未出 {count} 張',
                tooltip: '查看出牌記錄 (共 {count} 張)',
                retrieve_badge: '↩ 收回',
                hand_count_tag: '手牌'
            },
            labels: {
                you_are: '您是：',
                you_tag: '★我',
                mana: 'MP',
                gear_hp: '生命',
                shield: '護盾',
                collected: '收集',
                hand_count: '手牌：',
                position: '位置：',
                not_on_board: '未上場',
                ejected: '被吞噬',
                round: '回合 {round}',
                game_round: '第 {round} 局',
                deck_remain: '牌庫剩餘',
                precious: '★ 珍貴'
            },
            tabs: {
                game: '遊戲舞台',
                rules: '遊戲規則',
                settings: '設定',
                current_round: '本回合',
                history: '歷史',
                scores: '積分'
            },
            scores: {
                tab_standings: '即時總分',
                tab_special_victory: '勝利進度',
                tab_history: '得分歷程',
                round_summary: '第 {round} 局結算',
                empty_title: '第 1 局進行中',
                empty_desc: '每局結算後，此處將記錄各角色的當局得分、吞噬狀態與累計分數變化。',
                mini_hunt: '狩獵',
                mini_lock: '記憶',
                mini_sin: '時之惡',
                mini_sin_ejected: '已吞噬',
                mini_3p_survivors: '生還',
                view_details: '點擊查看特殊勝利詳情'
            },
            settings: {
                title: '遊戲設定',
                language: '語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)',
                ai_difficulty_title: 'AI 對戰難度',
                ai_difficulty_normal: '一般 (新改良演算法)',
                ai_difficulty_easy: '簡單 (原始基礎行為)',
                ai_difficulty_desc: '「一般」具備進化目標渴求與長線資源規劃；「簡單」維持原版基礎避險出牌。',
                sequential_effects: '特效依序播放（逐一發生）',
                sequential_effects_desc: '數值變動浮字、受傷扣血與落位動態依序播放，避免多個特效同時堆疊。',
                screen_shake: '扣除 GP 時畫面震動',
                screen_shake_desc: '當人類玩家受到懲罰或侵蝕扣除 GP 時，觸發短暫畫面搖晃受擊回饋。',
                reduced_motion: '減少動態效果（無障礙）',
                reduced_motion_desc: '停用畫面震動並縮短非必要轉場與跳動動畫，提昇視覺舒適度。',
                auto_play_timeout: '逾時自動代打（45 秒防卡關）',
                auto_play_timeout_desc: '開啟後，若輪到你操作且連續 45 秒未行動，系統將自動依 AI 策略代出牌或選卡。',
                fan_hand_layout: '扇形手牌列',
                fan_hand_layout_desc: '桌機現代版以右側交疊扇形展開分鐘手牌，懸停可直立抽出檢視（手機端維持橫向滑動平列）。',
                custom_font_title: '自訂字型 (即時套用)',
                custom_font_upload_btn: '上傳字型檔案 (.ttf, .otf, .woff, .woff2)',
                custom_font_reset_btn: '還原預設字型',
                custom_font_status_default: '使用預設字型',
                custom_font_status_applied: '已即時套用字型：{name}',
                custom_font_status_error: '字型載入失敗，請確認檔案格式',
                custom_font_preview_text: '蝕入記憶 Eaten into Memory 0123456789 ── 機芯齒輪與命運之針',
                tab_general: '一般設定',
                tab_fx_showcase: '已加入特效展示',
                fx_showcase_title: '已加入特效展示',
                fx_showcase_desc: '檢視並即時預覽遊戲目前已實裝的視覺特效與序列圖資源。',
                fx_evolve_title: '幼體時魔進化火花',
                fx_evolve_meta: 'assets/fx/hit-spark-white-32.png · 256×32 (8 格 / 前 7 格有效) · 白色原色疊加 (ADD)',
                fx_evolve_desc: '當幼體時魔達成記憶碎片條件並進化為時針、分針或秒針時，於角色棋子中心播放的序列幀火花特效。',
                fx_shake_title: '受擊畫面與棋子震動',
                fx_shake_meta: 'GSAP 時間軸補間 · 觸發條件：扣除 GP / 處決 / 侵蝕',
                fx_shake_desc: '當玩家受到最高刻度處決或時之惡侵蝕扣除 GP 時，觸發短暫畫面震動與目標棋子水平抖動回饋。',
                fx_float_title: '戰鬥數值浮動跳字',
                fx_float_meta: 'ui_hud_fx.js · 護盾抵免 / GP 變動 / MP 充能',
                fx_float_desc: '依序於棋子或狀態卡上方彈出帶有錯位防重疊的彩色數值提示文字。',
                fx_replay_btn: '重播預覽'
            },
            hints: {
                drag_to_play: '✦ 放開以出牌',
                pick_hour: '請點選小時卡',
                waiting_input: '請出牌',
                waiting_hour_choice: '請挑選小時卡',
                waiting_opponents: '等待對手挑選小時卡',
                waiting_minute_choice: '等待分針特殊選擇',
                waiting_ability_choice: '是否使用特殊能力？',
                waiting_second_final: '請完成秒針 2 選 1',
                comparing_minute: '比較分鐘數值中',
                comparing_minute_skip: '比較分鐘數值中（點擊畫面跳過）',
                sec_ability_select_two: '◈ 秒針能力：挑選 2 張分鐘卡，揭牌後再 2 選 1',
                sec_ability_ready: '✦ 已選 2 張卡牌，請點擊「確認出牌」。'
            },
            tactics: {
                danger: '▲ 高危',
                danger_max: '▲ 高危 (受罰預警)',
                danger_sin: '▲ 高危 (接近時之惡)',
                safe: '⛨ 安全',
                recipe: '★ 契合配方',
                precious: '✦ 珍貴回憶',
                tier_low: '避險小牌',
                tier_mid: '中位牌',
                tier_high: '先驅強奪'
            },
            combat_float: {
                penalty_max: '-1 GP (最高刻度懲罰)',
                penalty_sin: '-1 GP (時之惡侵蝕)',
                ejected: '☠ 被吞噬出局!',
                shield_block: '⛨ 護盾抵免!',
                mana_spend: '-{n} MP',
                mana_gain: '+{n} MP',
                sin_recharge: '+{diff} MP (惡念充能)'
            },
            match_highlights: {
                champion: '★ 榮耀之冠',
                collector: '◈ 記憶收藏家',
                survivor: '⛨ 堅毅生還',
                pioneer: '▶ 競速先鋒',
                destiny: '✧ 命運探索者',
                awakened: '⧖ 覺醒者',
                hunter: '☠ 終焉獵手'
            },
            clash: {
                gathering: '⧖ 各玩家已蓋牌集結，準備翻牌…',
                revealing: '✦ 揭曉各玩家打出的分鐘卡…',
                comparing: '◆ 比較分鐘數值大小，排列行動次序…',
                resolved: '✦ 分鐘卡大小次序已確定',
                continue_prompt: '點擊繼續（{sec}s 後自動進入挑選小時卡）'
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
                ejected: '(被吞噬)'
            },
            special_victory: {
                title: '特殊勝利達成進度',
                demon_hunt_title: '時之惡：完全狩獵（獎勵分）',
                demon_hunt_desc: '第 2 / 3 / 4 局結束前將所有時魔各吞噬一次，依序獲得 +6 / +4 / +2 獎勵分',
                demon_hunt_status_achieved: '★ 達成 (狩獵完成)',
                demon_hunt_status_in_progress: '進行中 ({current}/3)',
                ejected_tag: '☠ 已吞噬',
                not_ejected_tag: '⛨ 未曾被吞噬',
                curse_lock_title: '受詛者：記憶之鎖',
                curse_lock_desc: '在鐘面上鎖定 12 張珍貴卡',
                curse_lock_status_achieved: '★ 達成 (記憶解放)',
                curse_lock_status_in_progress: '進行中 ({current}/12)',
                locked_marks: '已鎖定刻度：',
                locked_none: '無',
                time_demon_victory_title: '時魔陣營：吞噬時之惡',
                time_demon_victory_desc: '耗盡時之惡齒輪令其自噬出局',
                time_demon_status_achieved: '★ 達成 (時之惡已被吞噬)',
                time_demon_status_in_progress: '未達成 (時之惡存活，剩餘 {gears} GP)',
                mode_3p_title: '3P 指針競速對決',
                mode_3p_desc: '純指針齒輪積分爭奪賽 (以最高積分獲勝)',
                survived_tag: '⛨ 生還 ({gears} GP)',
                defeated_tag: '☠ 遭吞噬'
            }
        },
        abilities: {
            target_role: '目標身份：',
            no_available_role: '無可用身份',
            condition_met: '✦ 條件達成回合結束時進化',
            cond_ages: '1. 時代 {ages}/3, 珍貴 {precious}/1',
            cond_numbers: '2. 數字 {numbers}/4, 珍貴 {precious}/1',
            cond_total: '3. 總數 {total}/5, 珍貴 {precious}/2',
            cond_precious: '4. 珍貴 {precious}/3 (任意)',
            hour_desc: '⧖ 預知牌頂 + 1 MP：牌頂移底',
            hour_top_card: '⧖ 牌庫頂：<strong>{number}</strong> <span style="font-size:0.8rem; color:#ccc;">{age}</span> {star}',
            hour_deck_empty: '(牌庫已空)',
            hour_predict_disabled: '✕ 預知能力失效',
            hour_move_btn: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>',
            hour_move_again_btn: '{cost} MP<br><span style="font-size:0.8rem; font-weight:bold;">↻ 再移動一次 (剩1次)</span>',
            min_desc: '2 MP：移至下一個有小時卡位置',
            min_prompt: '選擇移動方向 (將跳至下一個有卡片的格子)：',
            min_btn_ccw: '↺ 逆時針',
            min_btn_cw: '↻ 順時針',
            min_btn_skip: '略過',
            min_passive_text: '取得小時卡時，可消耗 {cost} MP 跳躍至順/逆時針下一個有卡片的格子。',
            min_passive_disabled: '<span style="color:#888; text-decoration:line-through;">取得小時卡時，可消耗 {cost} MP 移動。</span><br><span style="color:#ff6b6b; font-weight:bold;">(✕ 本回合失效)</span>',
            sec_desc: '3 MP：出牌二選一',
            sec_btn_play: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>',
            sec_btn_cancel: '取消選擇',
            sec_pick_one_prompt: '請選擇一張牌',
            sec_pick_two_hint: '▲ 請點擊上方 2 張手牌',
            sec_btn_swap: '{cost} MP：將 [{from}] 當成 [{to}] 打出',
            sec_swap_hint: '本局 1 已打出時可將 60 當 1；60 已打出時可將 1 當 60。',
            sin_mode_near: '扣滅目標：距離最近 (已變更)',
            sin_mode_max: '扣滅目標：數值最大 (預設)',
            sin_btn_pull: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">惡之牽引</span>',
            sin_pull_tip: '改為懲罰「距離最近」者',
            sin_btn_seal: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">封鎖時魔</span>',
            sin_seal_tip: '本回合封印全體時魔能力',
            sin_acted: '已行動',
            sin_lack_mana: '缺 MP ({cost})',
            locked_btn: '✕ 能力被封鎖'
        },
        tutorial: {
            prev_btn: '◀ 上一則教學',
            next_btn: '下一則 ▶',
            history_tag: '（歷史閱覽）',
            latest_tag: '最新進度',
            turn_prefix: '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">※ 可於「設定」隨時關閉教學模式</div>',
            welcome_prefix: '<strong>歡迎來到《Eaten into Memory》</strong><br>',
            step0_welcome: '<strong>歡迎來到《Eaten into Memory》</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。',
            step0_start_action: '請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。',
            click_anywhere_continue: '<br><span style="color:#ffd27f; font-size:0.85em;">▸ 點擊畫面任意處繼續下一條教學</span>',
            step1_drag_minute: '<strong>步驟 1：挑選一張分鐘卡出牌</strong><br>• 按住卡牌往鐘面方向拉動並放開，或點擊卡牌後點擊「確認出牌」，或直接雙擊卡牌。<br>※ <strong>戰術思維：</strong>數字大者可搶佔鐘面安全位與回憶卡；數字較小未進前 2 名則無須進入鐘面，能安全避開受罰',
            step1_select_minute_hint: '<strong>步驟 1：</strong><br>已選取 <strong>[{value}]</strong> 號分鐘卡，點擊「確認出牌」，或將卡牌向上拖曳至鐘面，或直接雙擊卡牌',
            step1_sec_ability_select: '<strong>秒針能力（{count}/2）：請點選 2 張分鐘卡</strong><br>選滿 2 張後再點擊右側「確認出牌」。',
            step1_sec_ability_confirm: '<strong>秒針能力：點擊「確認出牌」</strong><br>將挑選的 2 張分鐘卡蓋牌送出',
            step3_select_hour: '<strong>步驟 3：點擊小時卡或鐘面上發光的小時格</strong><br>您的角色將移動至該位置並獲得該小時卡',
            step3_no_hour_notice: '<strong>【戰術提醒：無須挑選小時卡】</strong><br>⛨ <strong>優勢（避險）：</strong>本回合不進入鐘面，<strong>完全免疫</strong>「受罰」扣減 GP 的風險<br>※ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，將延緩達成角色進化（變身）的進度。',
            penalty_sin: '<br><span style="color:#feca57;">▲ 當前為「受罰：距離最近」</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">▲ 當前為「受罰：最高小時值」</span>',
            step_hour_ability: '<strong>時針能力（出牌前可用）：</strong>可先檢視上方「牌庫頂」小時卡，若為高危牌可點擊按鈕消耗 1 MP 將頂牌移至牌庫底，或直接出分鐘卡略過。',
            step_sin_ability: '<strong>時之惡能力（出牌前可用）：</strong>可點擊發動【惡之牽引 (2 MP)】改為懲罰距離自己最近者，或【封鎖時魔 (3 MP)】封印本回合所有時魔能力；亦可直接出分鐘卡略過。',
            step_sec_ability_intro: '<strong>秒針能力（出牌前可用）：</strong>MP 足夠時可點擊按鈕消耗 3 MP 改蓋 2 張分鐘卡，等全場翻牌後再二選一；亦可直接出 1 張分鐘卡。',
            step_young_shield: '<strong>⛨ 幼體自動防禦就緒：</strong>目前 MP ≥ 3，本局若即將受罰會自動消耗全部 MP 抵免一次傷害（每局限觸發 1 次）。',
            step_minute_ability: '<strong>分針能力：選擇移動方向</strong><br>可消耗 MP 順時針或逆時針跳躍至下一個有小時卡的格子（可略過）。',
            step_second_ability: '<strong>秒針能力：</strong>請選擇最終打出的分鐘卡',
            step4_round_done: '<strong>回合結算完畢，</strong>點擊「下一回合」展開新回合競標。',
            step4_deduction_diff_note: '<br><span style="color:#ffd27f; font-size:0.88em;">※ <strong>扣分機制提醒：</strong>時魔受罰會直接扣除 GP（幼體僅 MP ≥ 3 可消耗全部 MP 抵免 1 次）；而<strong>時之惡</strong>（護盾上限 5）與<strong>受詛者</strong>（護盾上限 3）皆會<strong>先扣 1 點護盾抵消</strong>，護盾歸零才會扣除 GP 並重新補充護盾。</span>',
            step_next_round: '<strong>點擊「下一回合」</strong><br>結算當前移動並進入下一回合',
            role_scoring_young: '<strong>【時魔幼體 · 得分與勝負指南】</strong><br>• <strong>基礎得分：</strong>每局結束時存活保留的齒輪會轉換為分數<br>• <strong>成長目標：</strong>爭奪小時卡湊齊 4 大配方進化為時、分、秒針第 5 局結束時，已進化的時魔享有 <strong>+3 分</strong> 陣營加成<br>• <strong>吞噬勝利：</strong>若合力將「時之惡」齒輪扣盡吞噬，時魔全體直接獲勝<br>• <strong>保命防禦：</strong>MP ≥ 3 且即將受罰時，可消耗全部 MP 抵免傷害一次。',
            role_scoring_hour: '<strong>【時針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>每局結束時存活保留的齒輪會轉換為分數<br>• <strong>預知未來：</strong>每回合自動預覽小時牌庫頂牌數值。<br>• <strong>移底操弄：</strong>主動消耗 MP 將 11、12 點高危毒牌移至底部，確保翻出的都是安全的小數字小時卡，保全自身齒輪',
            role_scoring_minute: '<strong>【分針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>每局結束時存活保留的齒輪會轉換為分數<br>• <strong>躍遷避險：</strong>取得小時卡落子後，若鐘面上小時卡張數已達玩家人數，可消耗 MP 順時針或逆時針跳躍至下一個有牌的刻度，甩開 12 點懲罰厄運',
            role_scoring_second: '<strong>【秒針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>每局結束時存活保留的齒輪會轉換為分數<br>• <strong>後手雙牌伏擊：</strong>關鍵回合消耗 3 MP 暗蓋 2 張分鐘卡，看清全場牌後再二選一打出精準搶下低刻度安全格或故意落入第 3 名避險',
            role_scoring_sin: '<strong>【時之惡 · 獵殺與得分指南】</strong><br>• <strong>護盾與 GP 機制：</strong>起始與護盾歸零重置為 1～5 點（<code>GP + 1</code> 上限 5）。受罰先扣 1 點護盾抵消，護盾歸零才扣 1 GP 並重新補充。<br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>✦ 特殊加分：</strong>在 5 局內將全場 3 位時魔<strong>各吞噬一次</strong>，即可直接奪得特殊加分<br>• <strong>◆ 惡念充能：</strong>若懲罰結算僅適用至時之惡自身（全場無其他角色受罰），時之惡如常先扣盾／GP 並重置，若仍存活再<strong>恢復 1 點 MP</strong>（上限為當前齒輪數）<br>• <strong>※ 飢餓懲罰：</strong>若該局無時魔被吞噬，將因飢餓從該局得分中扣除 2 GP（如扣至負數則達成吞噬時之惡）<br>• <strong>專屬異能：</strong>出牌前可發動【惡之牽引 (2 MP)】改變懲罰規則為「懲罰離自己最近者」；【虛無封鎖 (3 MP)】封印全場技能',
            role_scoring_scz: '<strong>【受詛者 · 鎖定與得分指南】</strong><br>• <strong>護盾與 GP 機制：</strong>起始與護盾歸零重置為 1～3 點（依當前 GP，上限 3）。受罰先扣 1 點護盾抵消，護盾歸零才扣 1 GP 並依新 GP 重新補充護盾。<br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>◈ 核心任務：</strong>踩中帶有【★】的珍貴小時卡將其永久鎖定在鐘面<br>• <strong>★超前完成獎勵：</strong>第 2 / 3 / 4 局結束前累積鎖定 12 張，依序額外獲得 <strong>+9 / +5 / +2 巨額獎勵分</strong><br>• <strong>☠ 終局生死線：</strong>第 5 局結束若<strong>未滿 12 張</strong>，總分將被重扣 <strong>-999 分</strong>務必全力搶奪珍貴卡',
            role_evolved_notice: '<strong>✦【恭喜進化為 {roleName}！】</strong><br>您已成功變身！終局將享有 <strong>+3 分</strong> 陣營額外加分，請善用全新的專屬異能保護齒輪！',
            role_scz_hour_hint: '<br><span style="color:#00d2d3;">※ <strong>受詛者提示：</strong>優先挑選【★ 珍貴卡】，永久鎖定 12 張珍貴小時卡以避免受到 -999 分懲罰</span>',
            role_sin_hour_hint: '<br><span style="color:#feca57;">※ <strong>時之惡提示：</strong>出牌前可發動【惡之牽引 (2 MP)】攻擊身邊獵物，加速達成「吞噬 3 位時魔各一次」的特殊加分</span>',
            role_progress_scz: '當前鐘面鎖定珍貴卡：{count}/12 張（第 {round} 局）',
            role_progress_sin: '特殊加分：未吞噬【{targets}】（已吞噬 {count}/3 位）',
            role_progress_sin_complete: '特殊加分：全場時魔都曾被吞噬！★',
            role_progress_young: '背包已收集小時卡：{count} 張，繼續收集以達成進化',
            pure_mode_intro: '<strong>【純競標模式 · 簡易規則說明】</strong><br>• <strong>無角色與能力：</strong>全場玩家規則完全對等，無特殊異能、無 MP 消耗、無進化與珍貴卡。<br>• <strong>開局與競標：</strong>每回合翻開 2 張小時卡，打出最大與次大分鐘卡的前 2 名依序挑選小時卡並移動至該刻度；未取得小時卡者維持原狀（未上鐘面者不參與受罰）。<br>• <strong>懲罰與吞噬：</strong>每回合結束時，鐘面位置數字最大（最接近 12）者扣除 1 GP；GP 扣至負數即「被吞噬」出局。<br>• <strong>勝負結算：</strong>共進行 {rounds} 局手牌輪替，保留下來的 GP 即為分數，累計總分最高者獲勝！<br><br>點擊「<strong>下一回合</strong>」即可開始第 1 回合。'
        },
        logs: {
            round_start: '--- 開始第 {round} 局 第 {turn} 回合 ---',
            hour_drawn: '抽出的小時卡：[{c1}, {c2}]',
            waiting_minute: '等待玩家打出分鐘卡',
            sin_pull_activated: '◆【時之惡】發動能力，本回合距離「時之惡」最近者受罰。',
            sin_rule_default: '【時之惡】鐘面數值最大者受罰 (接近12)。',
            sin_seal_ai: '【時之惡】(AI) 耗用 {cost} MP 發動「封鎖」，本回合所有時魔能力已被封印。',
            sec_ability_ai: '【秒針】{name} (AI) 耗用 {cost} MP，蓋放 2 張分鐘卡（翻牌後二選一）。',
            evolution_success: '【進化】{oldRole} 達成條件「{condition}」變身為：{newRole}',
            hour_top_to_bottom: '【時針能力】{name} 消耗 {cost} MP，將頂牌 ({num}) 移至底部。',
            minute_hand_moved: '️【分針能力】{name} 耗用 {cost} MP，{dir}移至下一個有小時卡的位置 ({pos} 點)。',
            balance_g4: '§【第4局平衡】牌庫>26，強制移除 {count} 張「非珍貴 1 號卡」。',
            balance_g5: '§【第5局平衡】牌庫過厚 ({total}張)，系統已移除 {count} 張非珍貴卡，修正為 24 張。'
        },
        rules: {
            manual_html: `
					<h2 style="color: var(--accent-color); border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0;">遊戲規則說明</h2>
					<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #444;">
						<h3 style="color: #feca57; margin-top: 0; display: flex; align-items: center; gap: 8px;">
							<span></span> 核心機制
						</h3>
						<p><strong>目標：</strong> 玩家利用「分鐘卡」競標鐘面「小時卡」的選擇順序，從而得到安全的小時位置，保護擁有的齒輪（分數）。</p>
						<ul style="padding-left: 20px; margin-bottom: 0;">
							<li><strong>鐘面小時：</strong>小時位置最接近<strong>12</strong>的角色，在每回合結束時扣取一點<strong>齒輪</strong>。</li>
							<li><strong>小時卡 (場上)：</strong>分為幼年（5張）、少年（10張）、青年（10張）、中年（10張）與死亡（1張）五個時代。每局依照特定組合在各時代中分配<strong>珍貴(★)</strong>小時卡（共12張，死亡不含珍貴卡）。</li>
							<li><strong>分鐘卡 (手牌)：</strong>數值 1 - 60 不重覆的卡牌，用於競標小時卡，分鐘卡數字最大者先選擇小時卡，次者取得餘下的小時卡。</li>
							<li><strong>齒輪（分數） (生命/分數/MP)：</strong>角色的生命值和MP量。回合結束時，位置最差（數值最大）的玩家會扣除 1 點齒輪（分數）；若齒輪歸零且再次受傷，靈魂將<strong>被吞噬出局 (下個遊戲局返回)</strong>。每局（12 回合）結束時剩餘的齒輪 1:1 轉換為該局得分。</li>
							<li><strong>未進入鐘面：</strong>若本回合分鐘卡點數較小未能取得小時卡，角色本回合不進入鐘面。雖然不進入鐘面能保護齒輪免受懲罰，但本回合也無法取得變身用的珍貴回憶卡。</li>
							<li><strong>時之惡惡念充能與飢餓：</strong>若懲罰規則僅判定至時之惡自身（全場無其他角色受罰），時之惡如常先扣盾／GP 並重置，結算後再<strong>恢復 1 點 MP</strong>（上限為當前齒輪數）。但若該局無時魔被吞噬，時之惡將因飢餓從該局得分中扣除 2 齒輪（如扣至負數則達成吞噬時之惡，時魔陣營勝利）。</li>
						</ul>
					</div>

					<h3 style="color: #4cd137; margin-bottom: 15px;">↻ 遊戲流程</h3>
					<div style="background: rgba(76, 209, 55, 0.08); padding: 15px; border-left: 4px solid #4cd137; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
						<ol style="padding-left: 20px; margin: 0; line-height: 1.8; color: #eee;">
							<li><strong>回合開始：</strong>系統抽出 2 張「小時卡」作為本回合競標目標。</li>
							<li><strong>暗拍競標：</strong>每位玩家從手牌中暗蓋 1 張「分鐘卡」（時之惡可於蓋牌前發動「惡之牽引」）。</li>
							<li><strong>翻牌移動：</strong>翻開分鐘卡，數字<strong>最大者</strong>優先挑選 1 張小時卡，並將靈魂移至該鐘面位置，第二大的角色取得餘下的小時卡並移動位置。</li>
							<li><strong>懲罰結算：</strong>位置數值<strong>最大 (最接近 12)</strong> 的玩家受罰，扣除護盾或 GP。</li>
							<li><strong>收集進化：</strong>幼體時魔將卡片收入背包，滿足特定組合即可於回合末進化。</li>
							<li><strong>局次結算：</strong>12 回合結束後，將剩餘 GP 轉為分數。重新派發手牌進入下一局。</li>
						</ol>
						<div style="margin-top: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(76, 209, 55, 0.35); border-radius: 6px; padding: 10px 12px; font-size: 0.88rem; line-height: 1.6;">
							<strong style="color: #4cd137;">※ 獲得小時卡的分別（已進入鐘面 vs 未進入鐘面）：</strong><br>
							• <strong>▶ 已進入鐘面（前 2 名）：</strong>取得小時卡（第 1 名自選，第 2 名取餘下）。幼體時魔將卡片收入背包累積進化；完全體時魔將卡片留於鐘面；受詛者踩中珍貴卡則永久鎖定。但必須承擔回合末落於 12 點（或靠近時之惡）扣除 GP 的風險。<br>
							• <strong>⛨ 未進入鐘面（第 3 名及以後）：</strong>完全無法取得本回合的小時卡（無法充實進化背包），但享有<strong>絕對免傷特權</strong>，完全不參與回合末懲罰，GP 毫髮無損面對高危毒牌（11、12）時，故意打小牌不進鐘面是最有效的保命避險戰術。
						</div>
						<div style="margin-top: 10px; font-size: 0.9em; color: #aaa;">
							<em>*註：若 GP 歸零且再次受傷，靈魂將「被吞噬」。時魔全滅或時之惡陣亡（被吞噬）將直接結束遊戲。</em>
						</div>
					</div>

					<h3 style="color: #00d2d3; margin-bottom: 15px;">◆ 遊戲模式</h3>
					<div style="overflow-x: auto;">
						<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.9rem; background: rgba(255,255,255,0.05);">
							<thead>
								<tr style="background: rgba(255,255,255,0.1);">
									<th style="padding: 12px; border: 1px solid #555; text-align: left;">項目</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff9ff3;">3P 對抗模式</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff6b6b;">5P 扮演模式</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>玩家人數及局數</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">3 人 (時、分、秒針)，3 局遊戲</td>
									<td style="padding: 10px; border: 1px solid #555;">5 人 (3幼體時魔 vs 1時之惡 vs 1受詛者)，5 局遊戲</td>
								</tr>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>角色狀態</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">直接扮演<strong>進化形態</strong> (擁有特殊能力)</td>
									<td style="padding: 10px; border: 1px solid #555;">時魔由<strong>幼體</strong>開始 (需收集卡片進化)</td>
								</tr>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>勝利條件</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">遊戲結束時 GP 積分最高者勝</td>
									<td style="padding: 10px; border: 1px solid #555;"><u><strong>GP 積分 ＋ 特殊勝利條件</strong></u><br>
										• <strong>受詛者：</strong>第 2 / 3 / 4 局結束前累積鎖定 12 張珍貴卡，依序額外獲得 <strong>+9 / +5 / +2</strong> 巨額獎勵分第 5 局結束若未滿 12 張則重扣 <strong>-999 分</strong><br>
										• <strong>時魔 特殊勝利：</strong>合力將時之惡 GP 耗盡達成「吞噬時之惡」<br>
										• <strong>時之惡 完全狩獵（5P 獎勵分）：</strong>第 2 / 3 / 4 局結束前將所有時魔「各吞噬一次」，依序獲得 <strong>+6 / +4 / +2</strong> 獎勵分
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<h4>✦ 進化機制 (時魔專屬)</h4>
					<p>幼體時魔收集到指定條件的小時卡後可成長為時、分、秒三種形態。第 5 局結束時，已進化的時魔享有 <strong>+3 分</strong> 陣營額外加分</p>
					<ul>
						<li><strong>久遠一生：</strong>3 張不同時代 + 當中至少 1 張珍貴。</li>
						<li><strong>命途節錄：</strong>4 張不同數字 + 當中至少 1 張珍貴。</li>
						<li><strong>漫長生涯：</strong>5 張任意卡 + 當中至少 2 張珍貴。</li>
						<li><strong>銘記珍重：</strong>3 張珍貴。</li>
					</ul>
            `,
            btn_detailed: '詳細說明',
            detailed_title: '詳細遊戲規則說明',
            btn_back_basic: '返回簡明規則',
            tab_flow: '核心流程',
            tab_modes: '四大模式',
            tab_roles: '角色與進化',
            tab_scoring: '處決與計分',
            tab_faq: '常見問答',
            detailed_flow: `
                <div class="rules-detail-card">
                    <h3>核心資源：GP（生命齒輪）與 MP</h3>
                    <ul>
                        <li><strong>GP（生命齒輪）：</strong>等同玩家的生命值與局末積分來源。受到懲罰會先扣護盾，無護盾則扣 1 GP；若 GP 扣至 <strong>小於 0（負數）</strong>，該玩家即「被吞噬」出局（本局不再行動，下一局輪替手牌後復活）。</li>
                        <li><strong>MP：</strong>用於發動角色主動／被動異能的能量。每局開始時補充為起始 GP 數量（純競標模式無 MP）。</li>
                        <li><strong>鐘面刻度（1～12）：</strong>鐘面共有 12 個位置，越接近 <strong>12</strong> 的刻度越危險；未進入鐘面的玩家完全免受回合末處決。</li>
                    </ul>
                </div>
                <div class="rules-detail-card">
                    <h3>單回合 4 步驟詳細流程（每局共 12 回合）</h3>
                    <ol>
                        <li><strong>開局與翻牌：</strong>每回合從小時牌庫翻出 2 張小時卡。若為 <strong>4P 模式第 1 回合</strong>，時之惡必須先從手牌棄掉 1 張數值最低或最高的分鐘卡。</li>
                        <li><strong>暗拍出牌：</strong>所有存活玩家從手牌蓋放 1 張分鐘卡。出牌前，時針可發動「頂牌移底」、時之惡可發動「封鎖」或「惡之牽引」；出牌時，秒針可消耗 MP 發動「蓋 2 選 1」或「1 / 60 互換打出」。</li>
                        <li><strong>翻牌移動與挑卡：</strong>公開所有分鐘卡，由 <strong>數值最大者</strong> 先挑 1 張小時卡並移至對應刻度，<strong>次大者</strong> 取餘下 1 張並移動；第 3 名及以後不進鐘面且絕對免傷。分針挑卡後可消耗 MP 跳格。</li>
                        <li><strong>處決與局末結算：</strong>依本回合處決規則判定受罰者並扣減護盾／GP；第 12 回合結束（或場上僅剩 1 名以下純競標玩家／牌庫耗盡）時進入局末結算，剩餘 GP 1:1 轉為積分並輪替下一位玩家的手牌。</li>
                    </ol>
                </div>
            `,
            detailed_modes: `
                <div class="rules-detail-card" style="overflow-x:auto;">
                    <h3>四大遊戲模式完整對照</h3>
                    <table class="rules-detail-table">
                        <thead>
                            <tr>
                                <th>項目</th>
                                <th>5P 完整模式</th>
                                <th>4P 狩獵模式</th>
                                <th>3P 競速模式</th>
                                <th>純競標（3P / 4P / 5P）</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>陣容與局數</strong></td>
                                <td>時魔 ×3、時之惡 ×1、受詛者 ×1｜5 局</td>
                                <td>時魔 ×3、時之惡 ×1｜4 局</td>
                                <td>時針、分針、秒針各 1｜3 局</td>
                                <td>全體無身份純競標｜3 / 4 / 5 局</td>
                            </tr>
                            <tr>
                                <td><strong>起始手牌 / 小時卡</strong></td>
                                <td>12 張分鐘卡｜36 張（含 12 張珍貴卡）</td>
                                <td>13 張分鐘卡｜24 張（無珍貴卡）</td>
                                <td>13 張分鐘卡｜24 張（無珍貴卡）</td>
                                <td>5P 為 12 張，3P/4P 為 13 張｜24 張</td>
                            </tr>
                            <tr>
                                <td><strong>異能 MP 差異</strong></td>
                                <td>分針 2 MP / 秒針二選一 3 MP</td>
                                <td>分針 2 MP / 秒針二選一 3 MP</td>
                                <td>分針 3 MP / 秒針二選一 2 MP</td>
                                <td>無角色與特殊能力</td>
                            </tr>
                            <tr>
                                <td><strong>模式專屬規則</strong></td>
                                <td>完全狩獵獎勵（+6/+4/+2）；受詛者任務（+9/+5/+2 / -999）</td>
                                <td><strong>無完全狩獵加分</strong>；時之惡每局開局棄最低或最高 1 張；第 4 局唯一最低分時魔額外抽 1 張未使用分鐘卡</td>
                                <td>第 3 局唯一最低分時魔額外抽 1 張未使用分鐘卡</td>
                                <td>僅靠存活保留 GP 決勝負，場上剩 1 人以下提前結束該局</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `,
            detailed_roles: `
                <div class="rules-detail-grid">
                    <div class="rules-detail-card" style="border-left:4px solid #54a0ff;">
                        <h3 style="color:#54a0ff;">幼體時魔（5P / 4P）</h3>
                        <p><strong>被動防禦：</strong>整場遊戲一次，若 MP ≥ 3 且即將受罰，自動消耗全部 MP 抵免該次傷害。</p>
                        <p><strong>4 大進化配方（收集小時卡達成）：</strong></p>
                        <ul>
                            <li>久遠一生：3 張不同時代（至少 1 張珍貴／或 4P 任意 3 不同時代）。</li>
                            <li>命途節錄：4 張不同數字（5P 需至少 1 張珍貴）。</li>
                            <li>漫長生涯：5 張任意卡（5P 需至少 2 張珍貴）。</li>
                            <li>銘記珍重：3 張珍貴卡（僅 5P）。</li>
                        </ul>
                        <p>已進化時魔在終局結束時額外獲得 <strong>+3 分</strong> 陣營加成。</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #ff9ff3;">
                        <h3 style="color:#ff9ff3;">時針（Time Hand）</h3>
                        <p><strong>被動：</strong>每回合自動預知小時牌庫頂牌數值。</p>
                        <p><strong>主動（1 MP）：</strong>出牌前將小時牌庫頂牌移至牌庫底，同回合可再消耗 2 MP 執行第 2 次。</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #f368e0;">
                        <h3 style="color:#f368e0;">分針（Minute Hand）</h3>
                        <p><strong>主動（2 MP｜3P 為 3 MP）：</strong>取得小時卡後，可選擇順時針或逆時針跳躍至下一個已有卡片的鐘面刻度。</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #00d2d3;">
                        <h3 style="color:#00d2d3;">秒針（Second Hand）</h3>
                        <p><strong>雙牌伏擊（3 MP｜3P 為 2 MP）：</strong>出牌時改蓋 2 張分鐘卡，待其他玩家翻牌後再二選一打出（未選卡退回手牌）。</p>
                        <p><strong>1 / 60 互換打出（1 MP）：</strong>若本局「1」已打出，可消耗 1 MP 將手中「60」當成「1」打出；若「60」已打出，可將手中「1」當成「60」打出。</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #feca57;">
                        <h3 style="color:#feca57;">時之惡（5P / 4P）</h3>
                        <p><strong>惡之牽引（2 MP）：</strong>本回合改為處決距離時之惡最近的鐘面角色。</p>
                        <p><strong>封鎖（3 MP）：</strong>封印本回合所有時魔特殊能力。</p>
                        <p><strong>護盾與飢餓：</strong>開局與破盾補充為 <code>clamp(GP + 1, 1, 5)</code>；若全場僅自己受罰可回復 1 MP；局末若無時魔被吞噬扣 2 GP。5P 於第 2/3/4 局結束前將所有時魔各吞噬一次額外獲 <strong>+6/+4/+2</strong> 分；4P 每局開局須棄最低或最高分鐘卡 1 張。</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #7bed9f;">
                        <h3 style="color:#7bed9f;">受詛者（僅 5P）</h3>
                        <p><strong>接觸鎖定：</strong>踏上含珍貴卡的刻度時將其永久鎖定。護盾為 <code>clamp(GP, 1, 3)</code>。</p>
                        <p><strong>任務與懲罰：</strong>第 2/3/4 局鎖滿 12 張珍貴卡額外獲 <strong>+9/+5/+2</strong> 分；第 5 局結束仍未滿 12 張則重扣 <strong>-999 分</strong>。</p>
                    </div>
                </div>
            `,
            detailed_scoring: `
                <div class="rules-detail-card">
                    <h3>處決判定與護盾結算</h3>
                    <ul>
                        <li><strong>預設處決：</strong>場上（鐘面內）位置數值最大的玩家受罰（若同格則全員一起受罰）。</li>
                        <li><strong>惡之牽引處決：</strong>改為鐘面上圓周距離時之惡最近的玩家受罰。</li>
                        <li><strong>護盾機制：</strong>時之惡與受詛者受罰時先扣 1 點護盾；護盾歸零後的下一次受罰才扣 1 GP 並依新 GP 重補護盾。</li>
                    </ul>
                </div>
                <div class="rules-detail-card">
                    <h3>局末輪替、落後追趕與終局勝負</h3>
                    <ul>
                        <li><strong>手牌輪替：</strong>每局結束後，所有玩家會依座位順時針輪替接手下一副原始手牌與起始 GP，確保整場對局牌運公平。</li>
                        <li><strong>落後追趕（3P 第 3 局 / 4P 第 4 局）：</strong>開局發牌時，若時魔陣營中有唯一 1 位累積分數最低者，會從本局未使用的分鐘卡中隨機額外獲得 1 張分鐘卡；若有 2 位以上同分最低則不發放。</li>
                        <li><strong>平手順位：</strong>純競標模式若總分相同，依「整場被吞噬次數較少 → 單局最高保留 GP 較高」分出勝負。</li>
                    </ul>
                </div>
            `,
            detailed_faq: `
                <div class="rules-detail-card">
                    <h3>常見問題與實戰速查</h3>
                    <ul>
                        <li><strong>Q：GP 扣到 0 會立刻被吞噬嗎？</strong><br>不會。GP 歸 0 仍存活；必須在 GP 為 0 且沒有護盾時再次受傷（扣至負數）才會被吞噬出局。</li>
                        <li><strong>Q：秒針的「1 / 60 互換打出」為什麼有時候不能按？</strong><br>必須同時滿足：本局棄牌堆中已經出現過目標點數（1 或 60）、手牌持有另一張、MP ≥ 1、本回合尚未使用過特殊能力且未被時之惡「封鎖」。</li>
                        <li><strong>Q：4P / 3P 落後追趕機制會比較時之惡的分數嗎？</strong><br>不會。4P 僅比較 3 位時魔的累積分數，由唯一最低分的時魔獲得額外 1 張分鐘卡。</li>
                        <li><strong>Q：4P 模式中時之惡為什麼每局開局會少 1 張牌？</strong><br>4P 每人發 13 張牌、每局打 12 回合；時之惡開局必須先棄掉最低或最高點數 1 張牌，因此每局剛好以 12 張手牌應戰。</li>
                    </ul>
                </div>
            `
        }
    };
})();
