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
                players: '👥 各角色狀態',
                players_scores: '👥 各角色與積分',
                played_cards: '⚔️ 本回合出牌',
                history: '📜 出牌記錄',
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
            step0_welcome: '<strong>✨ 歡迎來到《Eaten into Memory》！</strong><br>請點擊「<strong>下一回合</strong>」翻開鐘面上的小時卡，展開第一回合競標。',
            step1_drag_minute: '<strong>步驟 1：向上拖曳一張分鐘卡至鐘面出牌</strong><br>按住卡牌往鐘面方向拉動並放開即可出牌（數字越大越優先挑選小時卡）！',
            step1_sec_ability_select: '<strong>秒針能力（{count}/2）：請點選 2 張分鐘卡</strong><br>選滿 2 張後再點擊右側「確認出牌」。',
            step1_sec_ability_confirm: '<strong>秒針能力：點擊「確認出牌」</strong><br>將挑選的 2 張分鐘卡蓋牌送出！',
            step3_select_hour: '<strong>步驟 3：點擊鐘面上發光的小時格</strong><br>將您的角色移動至該位置並獲得小時卡！',
            penalty_sin: '<br><span style="color:#feca57;">⚠️ 當前為「受罰：距離最近」，請遠離時之惡！</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">⚠️ 當前為「受罰：最高小時值」，接近 12 者將扣生命/護盾！</span>',
            step_minute_ability: '<strong>分針能力：選擇移動方向</strong><br>可消耗 Mana 順時針或逆時針跳躍至下一個有小時卡的格子（若想保留 Mana 可點擊略過）。',
            step_second_ability: '<strong>秒針能力：</strong>請在兩張蓋放的分鐘卡中選擇最終打出的一張！',
            step4_round_done: '<strong>回合結算完畢！</strong>點擊「下一回合」展開新回合競標。',
            step_next_round: '<strong>點擊「下一回合」</strong><br>結算當前移動並進入下一回合！'
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
