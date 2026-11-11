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
                log: '📝 遊戲日誌',
                players: '👥 角色',
                scores: '🏆 積分',
                players_scores: '👥 各角色與積分',
                played_cards: '⚔️ 本回合出牌',
                history: '📜 出牌記錄',
                played_scores: '📊 出牌與積分',
                size_reset: '重置預設尺寸',
                resize_grip: '拖曳調整大小 (雙擊重置)'
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
                zoom_in: '放大鐘面',
                zoom_out: '縮小鐘面',
                restart: '🔄 再玩一局',
                view_board: '👀 查看盤面'
            },
            discard_pile: {
                title: '出牌記錄',
                empty: '尚無出牌',
                empty_sub: '點擊查看出牌記錄',
                last_played: '上一張出牌',
                modal_title: '📜 出牌記錄',
                modal_subtitle: '第 {round} 局 · 共出 {count} 張分鐘卡',
                tab_history: '各角色歷程',
                tab_timeline: '依回合記錄',
                tab_matrix: '數字盤 (1~60)',
                trick_title: '第 {trick} 回合',
                cards_count: '{count} 張',
                unplayed_count: '剩餘未出 {count} 張',
                tooltip: '點擊查看出牌記錄 (共 {count} 張)',
                retrieve_badge: '↩ 收回'
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
                tab_standings: '🏆 即時總分',
                tab_history: '📜 得分歷程',
                round_summary: '第 {round} 局結算',
                empty_title: '第 1 局進行中',
                empty_desc: '每局結算後，此處將記錄各角色的當局得分、逐出狀態與累計分數變化。'
            },
            settings: {
                title: '⚙️ 遊戲設定',
                language: '🌐 語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)',
                ai_difficulty_title: '🤖 AI 對戰難度',
                ai_difficulty_normal: '一般 (新改良演算法)',
                ai_difficulty_easy: '簡單 (原始基礎行為)',
                ai_difficulty_desc: '「一般」具備進化目標渴求與長線資源規劃；「簡單」維持原版基礎避險出牌。',
                sequential_effects: '特效依序播放（逐一發生）',
                sequential_effects_desc: '數值變動浮字、受傷扣血與落位動態依序播放，避免多個特效同時堆疊。'
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
        },
        abilities: {
            target_role: '目標身份：',
            no_available_role: '無可用身份',
            condition_met: '✨ 條件達成！回合結束時進化',
            cond_ages: '1. 時代 {ages}/3, 珍貴 {precious}/1',
            cond_numbers: '2. 數字 {numbers}/4, 珍貴 {precious}/1',
            cond_total: '3. 總數 {total}/5, 珍貴 {precious}/2',
            cond_precious: '4. 珍貴 {precious}/3 (任意)',
            hour_desc: '👁️預知牌頂 + ⚡1 Mana：牌頂移底',
            hour_top_card: '👁️ 牌庫頂：<strong>{number}</strong> <span style="font-size:0.8rem; color:#ccc;">{age}</span> {star}',
            hour_deck_empty: '(牌庫已空)',
            hour_predict_disabled: '🚫 預知能力失效',
            hour_move_btn: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">將頂牌移至底部</span>',
            hour_move_again_btn: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:bold;">🔄 再移動一次 (剩1次)</span>',
            min_desc: '⚡2 Mana：移至下一個有小時卡的格子',
            min_prompt: '⚡請選擇移動方向 (將跳至下一個有卡片的格子)：',
            min_btn_ccw: '↺ 逆時針',
            min_btn_cw: '↻ 順時針',
            min_btn_skip: '略過',
            min_passive_text: '取得小時卡時，可消耗 {cost} Mana 跳躍至順/逆時針下一個有卡片的格子。',
            min_passive_disabled: '<span style="color:#888; text-decoration:line-through;">取得小時卡時，可消耗 {cost} Mana 移動。</span><br><span style="color:#ff6b6b; font-weight:bold;">(🚫 本回合失效)</span>',
            sec_desc: '⚡3 Mana：出牌二選一',
            sec_btn_play: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">蓋 2 張，翻牌後二選一</span>',
            sec_btn_cancel: '取消選擇',
            sec_pick_one_prompt: '請選擇一張牌...',
            sec_pick_two_hint: '👆 請點擊上方 2 張手牌',
            sin_mode_near: '扣滅目標：距離最近 (已變更)',
            sin_mode_max: '扣滅目標：數值最大 (預設)',
            sin_btn_pull: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">惡之牽引</span>',
            sin_pull_tip: '改為懲罰「距離最近」者',
            sin_btn_seal: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">封鎖時魔</span>',
            sin_seal_tip: '本回合封印全體時魔能力',
            sin_acted: '已行動',
            sin_lack_mana: '缺 Mana ({cost})',
            locked_btn: '🚫 能力被封鎖'
        },
        tutorial: {
            turn_prefix: '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 可於「設定」隨時關閉教學模式</div>',
            welcome_prefix: '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>',
            step0_welcome: '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。',
            step1_drag_minute: '<strong>步驟 1：挑選一張分鐘卡出牌</strong><br>• <strong>操作方式：</strong>按住卡牌往鐘面方向拉動並放開，或<strong>點擊卡牌後點擊「確認出牌」</strong>。<br>💡 <strong>戰術思維：</strong>數字大者可搶佔鐘面安全位與回憶卡；數字較小未進前 2 名則無須進入鐘面，能安全避開受罰！',
            step1_select_minute_hint: '<strong>步驟 1：點擊「確認出牌」</strong><br>已選取 <strong>[{value}]</strong> 號分鐘卡，點擊「確認出牌」蓋牌送出，或直接將卡牌向上拖曳至鐘面！',
            step1_sec_ability_select: '<strong>秒針能力（{count}/2）：請點選 2 張分鐘卡</strong><br>選滿 2 張後再點擊右側「確認出牌」。',
            step1_sec_ability_confirm: '<strong>秒針能力：點擊「確認出牌」</strong><br>將挑選的 2 張分鐘卡蓋牌送出！',
            step3_select_hour: '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！',
            step3_no_hour_notice: '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險保命）：</strong>本回合不進入鐘面，<strong>完全免疫</strong>「受罰」扣減齒輪（生命值）的風險！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，將延緩達成角色進化（變身）的進度。',
            penalty_sin: '<br><span style="color:#feca57;">⚠️ 當前為「受罰：距離最近」，請遠離時之惡！</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">⚠️ 當前為「受罰：最高小時值」，接近 12 者將扣生命/護盾！</span>',
            step_minute_ability: '<strong>分針能力：選擇移動方向</strong><br>可消耗 Mana 順時針或逆時針跳躍至下一個有小時卡的格子（若想保留 Mana 可點擊略過）。',
            step_second_ability: '<strong>秒針能力：</strong>請在兩張蓋放的分鐘卡中選擇最終打出的一張！',
            step4_round_done: '<strong>回合結算完畢！</strong>點擊「下一回合」展開新回合競標。',
            step4_no_hour_card: '<strong>【戰術提醒：無須挑選小時卡】</strong><br>🛡️ <strong>優勢（避險）：</strong>本回合不進入鐘面，齒輪毫髮無損！<br>⚠️ <strong>劣勢（無收穫）：</strong>無法獲得小時卡，延緩變身進度。<br>點擊「<strong>下一回合</strong>」展開新回合競標！',
            step_next_round: '<strong>點擊「下一回合」</strong><br>結算當前移動並進入下一回合！',
            role_scoring_young: '<strong>【🐣 時魔幼體 · 得分與勝負指南】</strong><br>• <strong>基礎得分：</strong>每局結束時存活保留的齒輪將 1:1 轉換為總分！<br>• <strong>成長目標：</strong>爭奪小時卡湊齊 4 大配方進化為時、分、秒針！第 5 局結束時，已進化的時魔享有 <strong>+3 分</strong> 陣營加成！<br>• <strong>驅逐大勝：</strong>若合力將「時之惡」齒輪扣盡驅逐，時魔全體直接獲勝！<br>• <strong>保命防禦：</strong>Mana ≥ 3 且即將受罰時，可消耗全部 Mana 抵免傷害一次。',
            role_scoring_hour: '<strong>【👁️ 時針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>預知未來：</strong>每回合自動預覽小時牌庫頂牌數值。<br>• <strong>移底操弄：</strong>主動消耗 Mana 將 11、12 點高危毒牌移至底部，確保翻出的都是安全的小數字小時卡，保全自身齒輪！',
            role_scoring_minute: '<strong>【👟 分針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>躍遷避險：</strong>取得小時卡落子後，可消耗 2 Mana 順時針或逆時針跳躍至下一個有牌的刻度，甩開 12 點處決厄運，把受罰丟給對手！',
            role_scoring_second: '<strong>【🃏 秒針時魔 · 得分與勝負指南】</strong><br>• <strong>齒輪即積分：</strong>局末存活保留的齒輪轉換為最高總分！<br>• <strong>後手雙牌伏擊：</strong>關鍵回合消耗 3 Mana 暗蓋 2 張分鐘卡，看清全場牌後再二選一打出！精準搶下低刻度安全格或故意落入第 3 名避險！',
            role_scoring_sin: '<strong>【😈 時之惡 · 獵殺與得分指南】</strong><br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>🩸 特殊大勝：</strong>在 5 局內成功將全場 3 位時魔<strong>各驅逐一次</strong>，即可直接奪得特殊大勝！<br>• <strong>⚠️ 飢餓懲罰：</strong>若連續 2 局無人被驅逐時，將因飢餓扣除 1 齒輪！齒輪歸零時直接敗北！<br>• <strong>專屬異能：</strong>【惡之牽引 (2 Mana)】改變處決規則為「處決距離自己最近者」；【虛無封鎖 (3 Mana)】封印全場技能！',
            role_scoring_scz: '<strong>【👻 受詛者 · 鎖定與得分指南】</strong><br>• <strong>基礎得分：</strong>局末保留的齒輪轉為總分。<br>• <strong>🔒 核心任務：</strong>踩中帶有【★】的珍貴小時卡將其永久鎖定在鐘面！<br>• <strong>🏆 巨額階段分：</strong>第 2 / 3 / 4 局結束前累積鎖定 12 張，依序額外獲得 <strong>+9 / +5 / +2 巨額獎勵分</strong>！<br>• <strong>☠️ 終局生死線：</strong>第 5 局結束若<strong>未滿 12 張</strong>，總分將被重扣 <strong>-999 分</strong>！務必全力搶奪珍貴卡！',
            role_evolved_notice: '<strong>🎉【恭喜進化為 {roleName}！】</strong><br>您已成功變身！終局將享有 <strong>+3 分</strong> 陣營額外加分！請善用全新的專屬異能保護齒輪，爭取最高積分！',
            role_scz_hour_hint: '<br><span style="color:#00d2d3;">💡 <strong>受詛者專屬提示：</strong>請優先挑選【★ 珍貴卡】！踩上即可永久鎖定，衝刺 12 張任務目標以獲得巨額加分並免受 -999 分懲罰！</span>',
            role_sin_hour_hint: '<br><span style="color:#feca57;">💡 <strong>時之惡專屬提示：</strong>落子後可發動【惡之牽引 (2 Mana)】處決身邊獵物，加速達成「驅逐 3 位時魔各一次」的特殊大勝！</span>',
            role_progress_scz: '當前鐘面鎖定珍貴卡：{count}/12 張（第 {round} 局）',
            role_progress_sin: '特殊大勝進度：已逐出時魔 {count}/3 位',
            role_progress_young: '背包已收集小時卡：{count} 張，繼續收集以達成進化！'
        },
        logs: {
            round_start: '--- 開始第 {round} 局 第 {turn} 回合 ---',
            hour_drawn: '抽出的小時卡：[{c1}, {c2}]',
            waiting_minute: '等待玩家打出分鐘卡...',
            sin_pull_activated: '⚡【時之惡】發動能力！本回合距離「時之惡」最近者受罰。',
            sin_rule_default: '【時之惡】鐘面數值最大者受罰 (接近12)。',
            sin_seal_ai: '😈【時之惡】(AI) 耗用 {cost} Mana 發動「封鎖」！本回合所有時魔能力已被封印。',
            sec_ability_ai: '⏱️【秒針】{name} (AI) 耗用 {cost} Mana，蓋放 2 張分鐘卡（翻牌後二選一）。',
            evolution_success: '🎉【進化成功】{oldRole} 達成條件「{condition}」！變身為：{newRole}',
            hour_top_to_bottom: '🕒【時針能力】{name} 消耗 {cost} Mana，將頂牌 ({num}) 移至底部。',
            minute_hand_moved: '⏱️【分針能力】{name} 耗用 {cost} Mana，{dir}移至下一個有小時卡的位置 ({pos} 點)。',
            balance_g4: '⚖️【第4局平衡】牌庫>26，強制移除 {count} 張「非珍貴 1 號卡」。',
            balance_g5: '⚖️【第5局平衡】牌庫過厚 ({total}張)，系統已移除 {count} 張非珍貴卡，修正為 24 張。'
        },
        rules: {
            manual_html: `
					<h2 style="color: var(--accent-color); border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0;">遊戲規則說明</h2>
					<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #444;">
						<h3 style="color: #feca57; margin-top: 0; display: flex; align-items: center; gap: 8px;">
							<span>⏳</span> 核心機制
						</h3>
						<p><strong>目標：</strong> 玩家利用「分鐘卡」競標鐘面「小時卡」的選擇順序，從而得到安全的小時位置，保護擁有的齒輪（分數）。</p>
						<ul style="padding-left: 20px; margin-bottom: 0;">
							<li><strong>鐘面小時：</strong>小時位置最接近<strong>12</strong>的角色，在每回合結束時扣取一點<strong>齒輪</strong>。</li>
							<li><strong>小時卡 (場上)：</strong>分為少年、青年、中年三種時代。每局依照特定組合在三個時代中分配<strong>珍貴(★)</strong>小時卡。</li>
							<li><strong>分鐘卡 (手牌)：</strong>數值 1 - 60 不重覆的卡牌，用於競標小時卡，分鐘卡數字最大者先選擇小時卡，次者取得餘下的小時卡。</li>
							<li><strong>齒輪（分數） (生命/分數/Mana)：</strong>角色的生命值和Mana量。回合結束時，位置最差（數值最大）的玩家會扣除齒輪（分數），齒輪（分數）歸零則<strong>被驅逐 (下個遊戲局返回)。每回合剩餘的齒輪（分數）成為玩家的分數。</strong>。</li>
							<li><strong>未進入鐘面：</strong>若本回合分鐘卡點數較小未能取得小時卡，角色本回合不進入鐘面。雖然不進入鐘面能保護齒輪免受懲罰，但本回合也無法取得變身用的珍貴回憶卡。</li>
						</ul>
					</div>

					<h3 style="color: #4cd137; margin-bottom: 15px;">🔄 遊戲流程</h3>
					<div style="background: rgba(76, 209, 55, 0.08); padding: 15px; border-left: 4px solid #4cd137; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
						<ol style="padding-left: 20px; margin: 0; line-height: 1.8; color: #eee;">
							<li><strong>回合開始：</strong>系統抽出 2 張「小時卡」作為本回合競標目標。</li>
							<li><strong>暗拍競標：</strong>每位玩家從手牌中暗蓋 1 張「分鐘卡」。</li>
							<li><strong>翻牌移動：</strong>翻開分鐘卡，數字<strong>最大者</strong>優先挑選 1 張小時卡，並將靈魂移至該鐘面位置，第二大的角色取得餘下的小時卡並移動位置。</li>
							<li><strong>處決結算：</strong>位置數值<strong>最大 (最接近 12)</strong> 的玩家受罰，扣除護盾或齒輪（分數）。</li>
							<li><strong>收集進化：</strong>幼體時魔將卡片收入背包，滿足特定組合即可於回合末進化。</li>
							<li><strong>局次結算：</strong>12 回合結束後，將剩餘齒輪（分數）轉為分數。重新派發 12 張手牌進入下一局。</li>
						</ol>
						<div style="margin-top: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(76, 209, 55, 0.35); border-radius: 6px; padding: 10px 12px; font-size: 0.88rem; line-height: 1.6;">
							<strong style="color: #4cd137;">💡 獲得小時卡的分別（已進入鐘面 vs 未進入鐘面）：</strong><br>
							• <strong>🎯 已進入鐘面（前 2 名）：</strong>成功取得小時卡（第 1 名自選，第 2 名取餘下）。幼體時魔將卡片收入背包累積進化；完全體時魔將卡片留於鐘面；受詛者踩中珍貴卡則永久鎖定。但必須承擔回合末落於 12 點（或靠近時之惡）扣除齒輪的處決風險。<br>
							• <strong>🛡️ 未進入鐘面（第 3 名及以後）：</strong>完全無法取得本回合的小時卡（無法充實進化背包），但享有<strong>絕對免傷特權</strong>，完全不參與回合末處決，齒輪毫髮無損！面對高危毒牌（11、12）時，故意打小牌不進鐘面是最有效的保命避險戰術。
						</div>
						<div style="margin-top: 10px; font-size: 0.9em; color: #aaa;">
							<em>*註：若齒輪（分數）歸零且再次受傷，靈魂將被「驅逐」。時魔全滅或時之惡陣亡將直接結束遊戲。</em>
						</div>
					</div>

					<h3 style="color: #00d2d3; margin-bottom: 15px;">🎮 遊戲模式</h3>
					<div style="overflow-x: auto;">
						<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.9rem; background: rgba(255,255,255,0.05);">
							<thead>
								<tr style="background: rgba(255,255,255,0.1);">
									<th style="padding: 12px; border: 1px solid #555; text-align: left;">項目</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff9ff3;">⚔️ 3P 對抗模式</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff6b6b;">⚔️ 5P 扮演模式</th>
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
									<td style="padding: 10px; border: 1px solid #555;">遊戲結束時齒輪積分最高者勝</td>
									<td style="padding: 10px; border: 1px solid #555;">齒輪積分＋特殊勝利條件 (受詛者鎖定12張珍貴卡 / 驅逐時之惡)</td>
								</tr>
							</tbody>
						</table>
					</div>

					<h4>🧬 進化機制 (時魔專屬)</h4>
					<ul>
						<li><strong>久遠一生：</strong>3 張不同時代 + 當中至少 1 張珍貴。</li>
						<li><strong>命途節錄：</strong>4 張不同數字 + 當中至少 1 張珍貴。</li>
						<li><strong>漫長生涯：</strong>5 張任意卡 + 當中至少 2 張珍貴。</li>
						<li><strong>銘記珍重：</strong>3 張珍貴。</li>
					</ul>
            `
        }
    };
})();
