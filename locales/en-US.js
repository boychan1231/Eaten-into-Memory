// locales/en-US.js - English Language Pack
(function () {
    window.I18N_LOCALES = window.I18N_LOCALES || {};
    window.I18N_LOCALES['en-US'] = {
        lang_name: 'English',
        roles: {
            demon: 'Time Demon',
            sin: 'Time Sin',
            scz: 'Cursed One',
            hour: 'Hour Hand',
            min: 'Minute Hand',
            sec: 'Second Hand',
            young_demon: 'Young Demon',
            pure: 'Pure Bidder'
        },
        age_groups: {
            child: 'Child',
            youth: 'Youth',
            adult: 'Adult',
            middle: 'Middle-aged',
            death: 'Death'
        },
        ui: {
            drawers: {
                evolution: 'Abilities & Evolution',
                log: 'Game Log',
                players: 'Characters',
                scores: 'Scores',
                players_scores: 'Players & Standings',
                played_cards: 'Current Round',
                history: 'Minute History',
                played_scores: 'Played & Scores',
                size_reset: 'Reset to default size',
                resize_grip: 'Drag to resize (Double click to reset)'
            },
            buttons: {
                confirm_move: 'Confirm Play',
                next_round: 'Next Round',
                next_round_countdown: 'Next Round ({sec}s)',
                next_round_skip: 'Next Round (Skip Ability)',
                game_over: 'Game Over',
                start_game: 'Start New Game',
                view_collection: 'View Collection',
                sort: '⇅ Sort',
                recenter: 'Recenter Clock',
                zoom_in: 'Zoom In',
                zoom_out: 'Zoom Out',
                restart: 'Play Again',
                view_board: 'View Board',
                tutorial_hint: 'Hint',
                tutorial_hint_tip: 'Replay tutorial guidance for the current step'
            },
            phase_tracker: {
                bid: 'Minute Bidding',
                reveal: 'Card Reveal',
                pick: 'Hour Selection',
                resolve: 'Resolution',
                status_bid: 'Choose 1 Minute Card to play',
                status_reveal: 'Revealing cards & comparing ranks',
                status_pick: 'Claim Hour Cards in rank order',
                status_your_pick: '▶ [{rank}] Your turn to pick an Hour Card',
                status_ai_pick: '⧖ [{rank}] {name} is picking an Hour Card',
                status_minute_jump: '◈ Minute Hand: Decide jump direction',
                status_second_choice: '◈ Second Hand: Pick final card from 2 cards',
                status_resolve: 'Round resolved · Click "Next Round"',
                status_round_end: 'Resolving round penalties'
            },
            discard_pile: {
                title: 'Played Cards Record',
                empty: 'No Cards Played',
                empty_sub: 'Click to view played cards record',
                last_played: 'Last Played Card',
                modal_title: 'Played Cards Record',
                modal_subtitle: 'Round {round} · {count} cards played',
                tab_history: 'Player History',
                tab_timeline: 'By Trick / Round',
                tab_matrix: 'Number Matrix (1~60)',
                trick_title: 'Round {trick}',
                cards_count: '{count} cards',
                unplayed_count: '{count} remaining unplayed',
                tooltip: 'Click to view played cards record ({count} cards)',
                retrieve_badge: '↩ Retrieve',
                hand_count_tag: 'Hand'
            },
            labels: {
                you_are: 'You are: ',
                you_tag: '★Me',
                mana: 'MP',
                gear_hp: 'Life',
                shield: 'Shield',
                collected: 'Cards',
                hand_count: 'Hand: ',
                position: 'Pos: ',
                not_on_board: 'Not Placed',
                ejected: 'Devoured',
                round: 'Round {round}',
                game_round: 'Game {round}',
                deck_remain: 'Deck Left',
                precious: '★ Precious'
            },
            tabs: {
                game: 'Game Stage',
                rules: 'Rules',
                settings: 'Settings',
                current_round: 'Current',
                history: 'History',
                scores: 'Scores'
            },
            scores: {
                tab_standings: 'Standings',
                tab_special_victory: 'Victory',
                tab_history: 'Score History',
                round_summary: 'Round {round} Summary',
                empty_title: 'Round 1 in Progress',
                empty_desc: 'After each round ends, round scores, devouring status, and cumulative totals will appear here.',
                mini_hunt: 'Hunt',
                mini_lock: 'Lock',
                mini_sin: 'Time Sin',
                mini_sin_ejected: 'Devoured',
                mini_3p_survivors: 'Survived',
                view_details: 'Click to view details'
            },
            settings: {
                title: 'Game Settings',
                language: '語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)',
                ai_difficulty_title: 'AI Difficulty',
                ai_difficulty_normal: 'Normal (Enhanced Algorithm)',
                ai_difficulty_easy: 'Easy (Legacy Baseline)',
                ai_difficulty_desc: 'Normal features evolution-driven bidding and long-term card pacing; Easy retains the original baseline logic.',
                sequential_effects: 'Sequential Effects (One by One)',
                sequential_effects_desc: 'Play floating texts, damage effects, and board movements sequentially instead of simultaneously.',
                screen_shake: 'Screen Shake on GP Loss',
                screen_shake_desc: 'Trigger a brief screen shake feedback when Player 1 loses GP from penalties or encroachment.',
                reduced_motion: 'Reduced Motion (Accessibility)',
                reduced_motion_desc: 'Disable screen shake and minimize non-essential transitions and bouncing animations for visual comfort.',
                auto_play_timeout: 'Auto-Play on Inactivity (45s Failsafe)',
                auto_play_timeout_desc: 'When enabled, if no action is taken for 45 seconds during your turn, AI automatically plays or picks a card to prevent stalls.',
                fan_hand_layout: 'Fan-Shaped Hand Layout',
                fan_hand_layout_desc: 'Spread Minute Cards in a right-overlapping fan on Modern desktop view, lifting upright on hover (mobile stays flat horizontal scroll).',
                custom_font_title: 'Custom Font (Live Preview)',
                custom_font_upload_btn: 'Upload Font File (.ttf, .otf, .woff, .woff2)',
                custom_font_reset_btn: 'Reset to Default Font',
                custom_font_status_default: 'Using default system font',
                custom_font_status_applied: 'Live custom font applied: {name}',
                custom_font_status_error: 'Failed to load font. Please check the file format.',
                custom_font_preview_text: 'Eaten into Memory 0123456789 ── Gears & Clocks',
                tab_general: 'General',
                tab_fx_showcase: 'Added Effects',
                fx_showcase_title: 'Added Visual Effects Showcase',
                fx_showcase_desc: 'Inspect and preview visual effects and sprite animations currently integrated into the game.',
                fx_evolve_title: 'Time Demon Evolution Spark',
                fx_evolve_meta: 'assets/fx/hit-spark-white-32.png · 256×32 (8 slots / 7 active) · White ADD blend',
                fx_evolve_desc: 'Plays a frame-by-frame golden spark burst on the character token when a Juvenile Time Demon evolves into Hour, Minute, or Second Hand.',
                fx_shake_title: 'Hit Screen & Token Shake',
                fx_shake_meta: 'GSAP Timeline · Trigger: GP Loss / Execution / Erosion',
                fx_shake_desc: 'Triggers a brief screen shake and horizontal token jitter when a player loses GP from execution or Sin erosion.',
                fx_float_title: 'Combat Floating Numbers',
                fx_float_meta: 'ui_hud_fx.js · Shield Block / GP Change / MP Recharge',
                fx_float_desc: 'Spawns staggered, color-coded floating combat text above tokens or HUD cards.',
                fx_replay_btn: 'Replay Preview'
            },
            hints: {
                drag_to_play: '✦ Release to play',
                pick_hour: 'Select an Hour Card',
                waiting_input: 'Please play a card...',
                waiting_hour_choice: 'Pick an Hour Card on the board...',
                waiting_opponents: 'Waiting for opponents to pick hour cards...',
                waiting_minute_choice: 'Waiting for Minute Hand choice...',
                waiting_ability_choice: 'Decide whether to use ability...',
                waiting_second_final: 'Complete Second Hand pick...',
                comparing_minute: 'Comparing minute cards...',
                comparing_minute_skip: 'Comparing minute values... (Click anywhere to skip)',
                sec_ability_select_two: '◆ Second Hand: Select 2 minute cards.',
                sec_ability_ready: '◆ 2 cards selected. Click "Confirm Play".'
            },
            tactics: {
                danger: '▲ Danger',
                danger_max: '▲ High Risk (Max Hour)',
                danger_sin: '▲ High Risk (Near Sin)',
                safe: '⛨ Safe',
                recipe: '★ Evolution Fit',
                precious: '◆ Precious',
                tier_low: 'Safe Low',
                tier_mid: 'Mid Range',
                tier_high: 'High Bid'
            },
            combat_float: {
                penalty_max: '-1 GP (Max Hour Penalty)',
                penalty_sin: '-1 GP (Sin Encroachment)',
                ejected: '☠ Devoured!',
                shield_block: '⛨ Shield Blocked!',
                mana_spend: '-{n} MP',
                mana_gain: '+{n} MP',
                sin_recharge: '+{diff} MP (Evil Recharge)'
            },
            match_highlights: {
                champion: '★ Champion',
                collector: '◆ Memory Collector',
                survivor: '⛨ Resilient Survivor',
                pioneer: '◆ Speed Pioneer',
                destiny: '✦ Destiny Seeker',
                awakened: '⧖ Awakened',
                hunter: '◆ Apex Hunter'
            },
            clash: {
                gathering: '⧖ Players committed cards, preparing to reveal…',
                revealing: '◈ Revealing minute cards from all players…',
                comparing: '◆ Comparing values to decide turn order…',
                resolved: '✦ Turn order determined!',
                continue_prompt: '▲ Click anywhere to continue ({sec}s auto proceed)'
            },
            round_ready: {
                title: 'Game {round} Summary',
                subtitle: 'Hands redealt, preparing for Game {nextRound}',
                ready_btn: 'Ready',
                col_rank: 'Rank',
                col_player: 'Player',
                col_role: 'Role',
                col_round_score: 'Round Pts',
                col_total_score: 'Total Pts',
                pts_gear: '+{gear} GP',
                pts_total: '{pts} pts',
                ejected: '(Devoured)'
            },
            special_victory: {
                title: '★ Special Victory Progress',
                demon_hunt_title: '◆ Time Sin: Total Hunt (Bonus)',
                demon_hunt_desc: 'Devour all Time Demons once by Round 2/3/4 for +6/+4/+2 bonus points',
                demon_hunt_status_achieved: '✦ Achieved (Total Hunt Complete)',
                demon_hunt_status_in_progress: 'In Progress ({current}/3)',
                ejected_tag: '☠ Devoured',
                not_ejected_tag: '⛨ Never Devoured',
                curse_lock_title: '◈ The Cursed: Lock of Memory',
                curse_lock_desc: 'Lock 12 Precious Cards on the clock face',
                curse_lock_status_achieved: '✦ Achieved (Memories Locked)',
                curse_lock_status_in_progress: 'In Progress ({current}/12)',
                locked_marks: 'Locked Positions:',
                locked_none: 'None',
                time_demon_victory_title: '⚔️ Time Demons: Devour Time Sin',
                time_demon_victory_desc: 'Exhaust Time Sin gears to devour it',
                time_demon_status_achieved: '✦ Achieved (Time Sin Devoured)',
                time_demon_status_in_progress: 'Incomplete (Time Sin Alive, {gears} GP remaining)',
                mode_3p_title: '◈ 3P Pointer Speed Clash',
                mode_3p_desc: 'Pure gear score speed clash (highest score wins)',
                survived_tag: '⛨ Survived ({gears} GP)',
                defeated_tag: '☠ Devoured'
            }
        },
        abilities: {
            target_role: 'Target Role:',
            no_available_role: 'No Role Available',
            condition_met: '✦ Condition Met! Evolves at end of round',
            cond_ages: '1. Ages {ages}/3, Precious {precious}/1',
            cond_numbers: '2. Values {numbers}/4, Precious {precious}/1',
            cond_total: '3. Total {total}/5, Precious {precious}/2',
            cond_precious: '4. Precious {precious}/3 (Any)',
            hour_desc: '⧖ Scry Deck Top + ◆ 1 MP: Move top card to bottom',
            hour_top_card: '⧖ Top Card: <strong>{number}</strong> <span style="font-size:0.8rem; color:#ccc;">{age}</span> {star}',
            hour_deck_empty: '(Deck Empty)',
            hour_predict_disabled: '✕ Prediction Disabled',
            hour_move_btn: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">Move top card to bottom</span>',
            hour_move_again_btn: '{cost} MP<br><span style="font-size:0.8rem; font-weight:bold;">↻ Move again (1 left)</span>',
            min_desc: '◆ 2 MP: Jump to next space with Hour Card',
            min_prompt: '◆ Select move direction (jump to next occupied space):',
            min_btn_ccw: '↺ Counter-Clockwise',
            min_btn_cw: '↻ Clockwise',
            min_btn_skip: 'Skip',
            min_passive_text: 'When obtaining Hour Card, spend {cost} MP to jump to next space with cards.',
            min_passive_disabled: '<span style="color:#888; text-decoration:line-through;">Spend {cost} MP to move upon getting Hour Card.</span><br><span style="color:#ff6b6b; font-weight:bold;">(✕ Sealed this round)</span>',
            sec_desc: '◆ 3 MP: Play 2 cards, pick 1',
            sec_btn_play: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">Play 2, pick 1 upon reveal</span>',
            sec_btn_cancel: 'Cancel',
            sec_pick_one_prompt: 'Select 1 card...',
            sec_pick_two_hint: '▲ Select 2 cards from your hand',
            sec_btn_swap: '{cost} MP: Play [{from}] as [{to}]',
            sec_swap_hint: 'Play 60 as 1 if 1 was played; play 1 as 60 if 60 was played.',
            sin_mode_near: 'Penalty Target: Nearest (Modified)',
            sin_mode_max: 'Penalty Target: Highest Value (Default)',
            sin_btn_pull: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">Sin Pull</span>',
            sin_pull_tip: 'Penalize nearest player to Time Sin',
            sin_btn_seal: '{cost} MP<br><span style="font-size:0.8rem; font-weight:normal;">Seal Demon</span>',
            sin_seal_tip: 'Seal all demon abilities this round',
            sin_acted: 'Acted',
            sin_lack_mana: 'Need MP ({cost})',
            locked_btn: '✕ Ability Sealed'
        },
        tutorial: {
            prev_btn: '◀ Previous',
            next_btn: 'Next ▶',
            history_tag: '(History)',
            latest_tag: 'Latest',
            turn_prefix: '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">◈ Tutorial can be disabled in Settings</div>',
            welcome_prefix: '<strong>✦ Welcome to Eaten into Memory!</strong><br>',
            step0_welcome: '<strong>✦ Welcome to Eaten into Memory!</strong><br>Click "<strong>Next Round</strong>" to reveal Hour Cards and start bidding.',
            step0_start_action: 'Click "<strong>Next Round</strong>" to reveal Hour Cards and start bidding.',
            click_anywhere_continue: '<br><span style="color:#ffd27f; font-size:0.85em;">▸ Click anywhere to continue to the next tutorial</span>',
            step1_drag_minute: '<strong>Step 1: Choose a Minute Card to play</strong><br>• <strong>Controls:</strong> Drag toward the clock face and release, or <strong>click a card and then click "Confirm Play"</strong>.<br>◈ <strong>Tactics:</strong> Higher cards claim safe spots & memories; smaller cards stay off the clock face to safely avoid penalties!',
            step1_select_minute_hint: '<strong>Step 1: Click "Confirm Play"</strong><br>Selected card <strong>[{value}]</strong>. Click "Confirm Play" to commit face-down, or drag it up to the clock face!',
            step1_sec_ability_select: '<strong>Second Hand ({count}/2): Select 2 Minute Cards</strong><br>Click "Confirm Play" after picking 2 cards.',
            step1_sec_ability_confirm: '<strong>Second Hand: Click "Confirm Play"</strong><br>Commit both selected cards face-down!',
            step3_select_hour: '<strong>Step 3: Click a glowing Hour Space</strong><br>Move your piece there and claim the Hour Card!',
            step3_no_hour_notice: '<strong>【Tactical Notice: Staying Off the Clock Face】</strong><br>⛨ <strong>Advantage (Safety):</strong> You do not enter the clock face this round, <strong>completely avoiding</strong> GP/life penalties!<br>▲ <strong>Disadvantage:</strong> You gain no Hour Cards, delaying memory collection for character evolution.',
            penalty_sin: '<br><span style="color:#feca57;">▲ Current Rule: "Nearest to Sin penalized"!</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">▲ Current Rule: "Highest Hour penalized"! Stay away from 12!</span>',
            step_hour_ability: '<strong>Hour Hand Ability (Before Playing):</strong> Check the top Hour Card above. Spend 1 MP to move risky high cards to the bottom of the deck, or play a Minute Card directly to skip.',
            step_sin_ability: '<strong>Time Evil Abilities (Before Playing):</strong> Activate 【Sin\'s Pull (2 MP)】 to penalize the nearest player, or 【Seal Demon (3 MP)】 to block all demon abilities this round; or play a Minute Card directly to skip.',
            step_sec_ability_intro: '<strong>Second Hand Ability (Before Playing):</strong> Spend 3 MP to commit 2 Minute Cards face-down and pick 1 after reveal; or play 1 Minute Card normally.',
            step_young_shield: '<strong>⛨ Young Demon Auto-Shield Ready:</strong> With MP ≥ 3, if you are about to be penalized this game, all MP will automatically be spent to negate 1 hit (once per game).',
            step_minute_ability: '<strong>Minute Hand: Choose Move Direction</strong><br>Spend MP to jump clockwise or counter-clockwise (or click Skip).',
            step_second_ability: '<strong>Second Hand:</strong> Choose 1 final card from the two committed Minute Cards!',
            step4_round_done: '<strong>Round Resolved!</strong> Click "Next Round" to begin the next round.',
            step4_deduction_diff_note: '<br><span style="color:#ffd27f; font-size:0.88em;">※ <strong>Penalty Reminder:</strong> Time Demons lose GP directly on penalty (Young Demons with MP ≥ 3 can spend all MP to block once), while <strong>Time Evil</strong> (max 5 Shield) and <strong>Cursed One</strong> (max 3 Shield) <strong>spend 1 Shield first</strong> and only lose GP when Shield breaks.</span>',
            step_next_round: '<strong>Click "Next Round"</strong><br>Resolve movements and start next round!',
            role_scoring_young: '<strong>【◈ Young Time Demon: Scoring & Goal】</strong><br>• <strong>Base Score:</strong> Each surviving GP at the end of each game converts 1:1 to score points!<br>• <strong>Evolution Goal:</strong> Compete for Hour Cards to satisfy 4 recipe requirements and evolve into Hour, Minute, or Second Hand! Evolved demons gain a <strong>+3 pts</strong> faction bonus at the end of Game 5!<br>• <strong>Devour Victory:</strong> Devour Time Evil by draining its GP to win immediately!<br>• <strong>Emergency Shield:</strong> If MP ≥ 3, spend all MP to completely negate 1 incoming penalty.',
            role_scoring_hour: '<strong>【◈ Time Hand: Scoring & Tactics】</strong><br>• <strong>GP = Score:</strong> Retain GP until game end to convert to maximum total points!<br>• <strong>Foresight:</strong> Automatically reveals the next Hour Card atop the deck each round.<br>• <strong>Deck Manipulation:</strong> Spend MP to move lethal high cards (11, 12) to the bottom, ensuring safe low-number cards appear and preserving your GP!',
            role_scoring_minute: '<strong>【◈ Minute Hand: Scoring & Tactics】</strong><br>• <strong>GP = Score:</strong> Retain GP until game end to convert to maximum total points!<br>• <strong>Leap Evasion:</strong> After claiming an Hour Card, once the clock face holds at least as many Hour Cards as total players, spend MP to jump clockwise or counter-clockwise to the next card space, escaping lethal position 12 and forcing penalties onto rivals!',
            role_scoring_second: '<strong>【◈ Second Hand: Scoring & Tactics】</strong><br>• <strong>GP = Score:</strong> Retain GP until game end to convert to maximum total points!<br>• <strong>Dual-Card Ambush:</strong> Spend 3 MP on crucial turns to commit 2 face-down Minute Cards. After all others reveal, choose the ideal card to seize safe spots or intentionally take 3rd place to avoid penalties!',
            role_scoring_sin: '<strong>【◆ Time Evil: Hunting & Scoring Guide】</strong><br>• <strong>Shield & GP Mechanic:</strong> Starts and resets to 1–5 Shield (<code>GP + 1</code>, max 5). Penalties hit Shield first; losing your last Shield deducts 1 GP and refills Shield.<br>• <strong>Base Score:</strong> Remaining GP at game end convert to score.<br>• <strong>☠ Special Win:</strong> Devour each of the 3 Time Demons <strong>at least once</strong> across 5 games to achieve an instant Special Victory!<br>• <strong>◆ Evil Recharge:</strong> If penalty resolution applies solely to Time Evil itself, Time Evil still deducts Shield / GP normally and then <strong>recovers 1 MP</strong> (up to current GP count)!<br>• <strong>▲ Starvation:</strong> If no demon is devoured in a game, lose 2 GP from that game\'s score to hunger! (If GP drops below 0, Time Evil is devoured and loses!)<br>• <strong>Abilities:</strong> Before playing card, activate 【Sin\'s Pull (2 MP)】to penalize whoever is closest to you; 【Seal (3 MP)】blocks all demon abilities!',
            role_scoring_scz: '<strong>【◈ Cursed One: Memory Lock & Scoring Guide】</strong><br>• <strong>Shield & GP Mechanic:</strong> Starts and resets to 1–3 Shield (based on current GP, max 3). Penalties hit Shield first; losing your last Shield deducts 1 GP and refills Shield.<br>• <strong>Base Score:</strong> Remaining GP at game end convert to score.<br>• <strong>◈ Core Mission:</strong> Land on 【★ Precious Hour Cards】to lock them permanently onto the clock face!<br>• <strong>★ Huge Bonus Points:</strong> Locking 12 cards by end of Game 2 / 3 / 4 grants <strong>+9 / +5 / +2 huge bonus points</strong>!<br>• <strong>☠ Lethal Deadline:</strong> If fewer than 12 cards are locked by the end of Game 5, suffer a devastating <strong>-999 pts penalty</strong>! Prioritize Precious Cards!',
            role_evolved_notice: '<strong>✦【Evolved into {roleName}!】</strong><br>You have evolved! You will earn a <strong>+3 pts</strong> faction bonus at game end! Use your new powers to safeguard GP and maximize your score!',
            role_scz_hour_hint: '<br><span style="color:#00d2d3;">◈ <strong>Cursed One Tip:</strong> Prioritize 【★ Precious Cards】! Stepping on one permanently locks it, rushing towards 12 cards for huge bonus points and escaping the -999 penalty!</span>',
            role_sin_hour_hint: '<br><span style="color:#feca57;">◈ <strong>Time Evil Tip:</strong> Before playing cards, activate 【Sin\'s Pull (2 MP)】to penalize adjacent demons and work towards your 3-demon devouring Special Victory!</span>',
            role_progress_scz: 'Clock Face Locked Precious Cards: {count}/12 (Game {round})',
            role_progress_sin: 'Special Victory Progress: Not yet devoured: [{targets}] ({count}/3 devoured)',
            role_progress_sin_complete: 'Special Victory Progress: All 3 Time Demons have been devoured! ✦',
            role_progress_young: 'Backpack Hour Cards: {count} collected. Continue collecting to evolve!',
            pure_mode_intro: '<strong>【Pure Bidding Mode · Quick Rules】</strong><br>• <strong>No Roles or Abilities:</strong> All players are equal—no special abilities, no MP, no evolution, and no Precious Cards.<br>• <strong>Bidding & Movement:</strong> Each round reveals 2 Hour Cards; the top 2 Minute Card bidders pick an Hour Card and move there, while others stay as they are (players not yet on the clock face are immune to penalties).<br>• <strong>Penalty & Devour:</strong> At round end, the player(s) at the highest clock position (nearest 12) lose 1 GP; dropping below 0 GP devours you out of the current game.<br>• <strong>Victory:</strong> Play {rounds} rotating games—surviving GP converts 1:1 to score, and the highest total score wins!<br><br>Click "<strong>Next Round</strong>" to begin.'
        },
        logs: {
            round_start: '--- Game {round} Round {turn} Started ---',
            hour_drawn: 'Hour Cards Drawn: [{c1}, {c2}]',
            waiting_minute: 'Waiting for players to play Minute Cards...',
            sin_pull_activated: '◆【Time Sin】Ability activated! Nearest player will be penalized.',
            sin_rule_default: '【Time Sin】Highest clock position penalized (near 12).',
            sin_seal_ai: '◆【Time Sin】(AI) Spent {cost} MP on "Seal"! All demon abilities blocked this round.',
            sec_ability_ai: '⧖【Second Hand】{name} (AI) Spent {cost} MP to commit 2 cards (pick 1).',
            evolution_success: '✦【Evolved】{oldRole} met condition "{condition}"! Evolved into: {newRole}',
            hour_top_to_bottom: '⧖【Hour Hand】{name} spent {cost} MP to move top card ({num}) to bottom.',
            minute_hand_moved: '⧖【Minute Hand】{name} spent {cost} MP, moved {dir} to space {pos}.',
            balance_g4: '§【Balance G4】Deck > 26, removed {count} non-precious 1s.',
            balance_g5: '§【Balance G5】Deck trimmed by {count} cards to 24.'
        },
        rules: {
            manual_html: `
					<h2 style="color: var(--accent-color); border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0;">Game Rules & Guide</h2>
					<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #444;">
						<h3 style="color: #feca57; margin-top: 0; display: flex; align-items: center; gap: 8px;">
							<span>⧖</span> Core Mechanics
						</h3>
						<p><strong>Goal:</strong> Players use Minute Cards to bid for selection order of Hour Cards, securing safe positions on the clock face to protect their Gear Life.</p>
						<ul style="padding-left: 20px; margin-bottom: 0;">
							<li><strong>Clock Hours:</strong> The character whose position is closest to <strong>12</strong> loses 1 GP at round end.</li>
							<li><strong>Hour Cards (Board):</strong> Divided into Child (5), Youth (10), Adult (10), Middle-aged (10), and Death (1) eras. Precious (★) cards are distributed each game (12 in total, excluding Death).</li>
							<li><strong>Minute Cards (Hand):</strong> Values 1 - 60 used for blind bidding. Highest value picks first.</li>
							<li><strong>GP Points (Life / MP):</strong> Remaining GP become player score at each game (round) end. If GP drops to 0 and take damage again, the soul is <strong>Devoured (returns next game)</strong>.</li>
							<li><strong>Off-Clock Protection & Memory Cards:</strong> If you do not acquire an Hour Card in a round (due to lower Minute Card values), your character does not enter the clock face. While staying off the clock protects your GP from penalties, you cannot acquire the precious memory cards needed for evolution this round.</li>
							<li><strong>Time Evil Protection & Starvation:</strong> If penalty rules target Time Evil itself (no other characters penalized), Time Evil is immune to penalty and <strong>recovers 1 MP</strong> (up to current GP). If no demon is devoured in a game, Time Evil loses 2 GP from that game's score to hunger (if negative, Time Evil is devoured and loses).</li>
						</ul>
					</div>

					<h3 style="color: #4cd137; margin-bottom: 15px;">↻ Round Flow</h3>
					<div style="background: rgba(76, 209, 55, 0.08); padding: 15px; border-left: 4px solid #4cd137; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
						<ol style="padding-left: 20px; margin: 0; line-height: 1.8; color: #eee;">
							<li><strong>Draw Hours:</strong> 2 Hour Cards revealed on board.</li>
							<li><strong>Blind Bid:</strong> Each player commits 1 Minute Card face down (Time Evil can activate Sin's Pull before bidding).</li>
							<li><strong>Reveal & Move:</strong> Reveal cards; highest value picks an Hour Card and moves piece there.</li>
							<li><strong>Execution:</strong> Highest position (closest to 12) penalized by losing GP/shield.</li>
							<li><strong>Evolution:</strong> Young demons collecting needed sets evolve at round end.</li>
							<li><strong>Game Resolution:</strong> After 12 rounds, leftover GP convert to score. Redeal cards for next game.</li>
						</ol>
						<div style="margin-top: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(76, 209, 55, 0.35); border-radius: 6px; padding: 10px 12px; font-size: 0.88rem; line-height: 1.6;">
							<strong style="color: #4cd137;">◈ Hour Cards: Entering vs Staying Off the Clock Face:</strong><br>
							• <strong>▶ Entered Clock Face (Top 2):</strong> Claim revealed Hour Cards (1st chooses, 2nd takes remainder). Young Time Demons store them in inventory for evolution; Evolved demons leave cards on the board; Cursed One locks precious cards. However, players must face end-of-round penalty risks near 12 o'clock.<br>
							• <strong>⛨ Off the Clock Face (3rd place and below):</strong> Gain NO Hour Cards this round (evolution progress pauses), but receive <strong>absolute immunity</strong> from penalties—GP are 100% safe! Playing low cards to intentionally stay off the board is a prime tactic when lethal cards (11, 12) appear.
						</div>
					</div>

					<h3 style="color: #00d2d3; margin-bottom: 15px;">✦ Game Modes</h3>
					<div style="overflow-x: auto;">
						<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.9rem; background: rgba(255,255,255,0.05);">
							<thead>
								<tr style="background: rgba(255,255,255,0.1);">
									<th style="padding: 12px; border: 1px solid #555; text-align: left;">Feature</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff9ff3;">◈ 3P Confrontation</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff6b6b;">◈ 5P Role Play</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>Players & Games</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">3 Players (Hour, Min, Sec), 3 Games</td>
									<td style="padding: 10px; border: 1px solid #555;">5 Players (3 Young Demons, 1 Time Sin, 1 Cursed One), 5 Games</td>
								</tr>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>Starting Form</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">Evolved Forms (with active abilities)</td>
									<td style="padding: 10px; border: 1px solid #555;">Young Demons start unevolved (collect cards to evolve)</td>
								</tr>
								<tr>
									<td style="padding: 10px; border: 1px solid #555;"><strong>Victory</strong></td>
									<td style="padding: 10px; border: 1px solid #555;">Highest Gear Score wins</td>
									<td style="padding: 10px; border: 1px solid #555;">Gear Score + bonuses/special victory (Cursed One: +9/+5/+2 for locking 12; Time Sin Total Hunt: +6/+4/+2 in 5P by R2/3/4; Devour Time Sin)</td>
								</tr>
							</tbody>
						</table>
					</div>
            `,
            btn_detailed: 'Detailed Rules',
            detailed_title: 'Detailed Game Rules',
            btn_back_basic: 'Back to Summary',
            tab_flow: 'Core Flow',
            tab_modes: 'Game Modes',
            tab_roles: 'Roles & Evolution',
            tab_scoring: 'Penalty & Scoring',
            tab_faq: 'FAQ',
            detailed_flow: `
                <div class="rules-detail-card">
                    <h3>Core Resources: GP (Gears) &amp; MP</h3>
                    <ul>
                        <li><strong>GP (Gear Points):</strong> Represents both your health and end-of-round score. Penalties remove 1 Shield first, or 1 GP if unshielded. Dropping below <strong>0 (negative)</strong> devours the player for the current game (revives next game with rotated hand).</li>
                        <li><strong>MP:</strong> Energy used for active/passive abilities and Young Demon defense. Refills to starting GP each game (unused in Pure Bidding).</li>
                        <li><strong>Clock Positions (1-12):</strong> Higher numbers near <strong>12</strong> carry the highest penalty risk. Players who do not enter the clock face are completely immune to end-of-turn penalties.</li>
                    </ul>
                </div>
                <div class="rules-detail-card">
                    <h3>4-Step Turn Flow (12 Turns per Game)</h3>
                    <ol>
                        <li><strong>Turn Start &amp; Reveal:</strong> Draw 2 Hour Cards. In <strong>4P Mode Turn 1</strong>, Time Sin must discard either its lowest or highest Minute Card before play.</li>
                        <li><strong>Simultaneous Bid:</strong> Surviving players commit 1 Minute Card face-down. Time Hand / Time Sin may trigger pre-bid abilities; Second Hand may spend MP for Double Bid or 1 / 60 Swap.</li>
                        <li><strong>Reveal &amp; Draft:</strong> Highest Minute Card picks 1 Hour Card and moves to that position; 2nd highest takes the remaining card. 3rd+ stay off the clock safely. Minute Hand may jump spaces after drafting.</li>
                        <li><strong>Penalty &amp; Settlement:</strong> Resolve penalties and shields/GP. After Turn 12 (or early termination), remaining GP converts 1:1 into score and hands rotate for the next game.</li>
                    </ol>
                </div>
            `,
            detailed_modes: `
                <div class="rules-detail-card" style="overflow-x:auto;">
                    <h3>4 Game Modes Comparison</h3>
                    <table class="rules-detail-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>5P Full Mode</th>
                                <th>4P Hunt Mode</th>
                                <th>3P Speed Mode</th>
                                <th>Pure Bidding (3P/4P/5P)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Roster &amp; Games</strong></td>
                                <td>3 Time Demons, 1 Time Sin, 1 Cursed One | 5 Games</td>
                                <td>3 Time Demons, 1 Time Sin | 4 Games</td>
                                <td>Hour, Minute, Second Hand | 3 Games</td>
                                <td>No Roles/Abilities | 3 / 4 / 5 Games</td>
                            </tr>
                            <tr>
                                <td><strong>Hand / Hour Deck</strong></td>
                                <td>12 Minute Cards | 36 Hour (12 Precious)</td>
                                <td>13 Minute Cards | 24 Hour (No Precious)</td>
                                <td>13 Minute Cards | 24 Hour (No Precious)</td>
                                <td>12 (5P) / 13 (3P/4P) | 24 Hour</td>
                            </tr>
                            <tr>
                                <td><strong>Ability MP Costs</strong></td>
                                <td>Minute 2 MP / Second 3 MP</td>
                                <td>Minute 2 MP / Second 3 MP</td>
                                <td>Minute 3 MP / Second 2 MP</td>
                                <td>Disabled</td>
                            </tr>
                            <tr>
                                <td><strong>Mode Specials</strong></td>
                                <td>Total Hunt bonus (+6/+4/+2); Cursed One (+9/+5/+2 or -999)</td>
                                <td><strong>No Total Hunt bonus</strong>; Time Sin discards lowest/highest card each game; sole lowest-scoring Time Demon gets 1 extra unused card in Game 4</td>
                                <td>Sole lowest-scoring Time Demon gets 1 extra unused card in Game 3</td>
                                <td>Pure GP survival; game ends early if 1 or fewer survive</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `,
            detailed_roles: `
                <div class="rules-detail-grid">
                    <div class="rules-detail-card" style="border-left:4px solid #54a0ff;">
                        <h3 style="color:#54a0ff;">Young Time Demon (5P / 4P)</h3>
                        <p><strong>Passive Shield:</strong> Once per match, if MP &ge; 3 when penalized, automatically spend all MP to negate the damage.</p>
                        <p><strong>4 Evolution Recipes:</strong></p>
                        <ul>
                            <li>Long Life: 3 different ages (at least 1 Precious in 5P).</li>
                            <li>Fate Excerpt: 4 distinct numbers (1 Precious in 5P).</li>
                            <li>Grand Career: 5 cards (2 Precious in 5P).</li>
                            <li>Cherished Memory: 3 Precious cards (5P only).</li>
                        </ul>
                        <p>Evolved Time Demons earn <strong>+3 bonus</strong> at match end.</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #ff9ff3;">
                        <h3 style="color:#ff9ff3;">Time Hand</h3>
                        <p><strong>Passive:</strong> Automatically peeks the top Hour Card of the deck each turn.</p>
                        <p><strong>Active (1 MP):</strong> Move the top Hour Card to the bottom before bidding (may repeat once for 2 MP).</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #f368e0;">
                        <h3 style="color:#f368e0;">Minute Hand</h3>
                        <p><strong>Active (2 MP | 3 MP in 3P):</strong> After drafting an Hour Card, jump clockwise or counter-clockwise to the next occupied space.</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #00d2d3;">
                        <h3 style="color:#00d2d3;">Second Hand</h3>
                        <p><strong>Double Bid (3 MP | 2 MP in 3P):</strong> Commit 2 Minute Cards face-down and choose 1 after others reveal (the other returns to hand).</p>
                        <p><strong>1 / 60 Swap (1 MP):</strong> If 1 was already played this game, play 60 as 1 for 1 MP; if 60 was played, play 1 as 60 for 1 MP.</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #feca57;">
                        <h3 style="color:#feca57;">Time Sin (5P / 4P)</h3>
                        <p><strong>Sin Pull (2 MP):</strong> Change penalty target to the player nearest to Time Sin.</p>
                        <p><strong>Seal (3 MP):</strong> Lock all Time Demon abilities this turn.</p>
                        <p><strong>Shield &amp; Hunger:</strong> Shield resets to <code>clamp(GP + 1, 1, 5)</code>; recovers 1 MP if penalized alone; loses 2 GP at game end if no Demon was devoured. 5P Total Hunt grants <strong>+6/+4/+2</strong> by Game 2/3/4; 4P discards 1 lowest/highest card before each game.</p>
                    </div>
                    <div class="rules-detail-card" style="border-left:4px solid #7bed9f;">
                        <h3 style="color:#7bed9f;">The Cursed One (5P Only)</h3>
                        <p><strong>Contact Lock:</strong> Stepping on Precious Cards permanently locks them. Shield resets to <code>clamp(GP, 1, 3)</code>.</p>
                        <p><strong>Mission:</strong> Lock 12 Precious Cards by Game 2/3/4 for <strong>+9/+5/+2</strong> bonus; failing by Game 5 incurs <strong>-999</strong>.</p>
                    </div>
                </div>
            `,
            detailed_scoring: `
                <div class="rules-detail-card">
                    <h3>Penalty Resolution &amp; Shields</h3>
                    <ul>
                        <li><strong>Default Target:</strong> The player on the highest-numbered clock position takes the penalty (all tied players suffer together).</li>
                        <li><strong>Sin Pull Target:</strong> The player at the shortest circular distance from Time Sin takes the penalty.</li>
                        <li><strong>Shields:</strong> Time Sin and Cursed One absorb 1 penalty per Shield point; once depleted, the next hit reduces 1 GP and refills Shields based on the new GP.</li>
                    </ul>
                </div>
                <div class="rules-detail-card">
                    <h3>Hand Rotation, Catch-up &amp; Tiebreakers</h3>
                    <ul>
                        <li><strong>Hand Rotation:</strong> Each game rotates the initial Minute Card hands and starting GP clockwise for fairness.</li>
                        <li><strong>Catch-up Card (3P Game 3 / 4P Game 4):</strong> If there is a single lowest-scoring Time Demon, they draw 1 random extra card from the unused Minute Deck. Tied lowest scores receive nothing.</li>
                        <li><strong>Tiebreakers:</strong> Pure Bidding breaks ties by fewer devourings, then highest single-game GP.</li>
                    </ul>
                </div>
            `,
            detailed_faq: `
                <div class="rules-detail-card">
                    <h3>Quick FAQ</h3>
                    <ul>
                        <li><strong>Q: Am I devoured immediately at 0 GP?</strong><br>No. At 0 GP you are still alive; you are devoured only when taking another unshielded hit (dropping below 0).</li>
                        <li><strong>Q: Why is Second Hand 1 / 60 Swap disabled?</strong><br>The target card (1 or 60) must already be in this game's discard pile, you must hold the opposite card, have &ge; 1 MP, and not be Sealed.</li>
                        <li><strong>Q: Does Time Sin's score count for the 4P Catch-up Card?</strong><br>No. Only the 3 Time Demons are compared for the sole lowest score.</li>
                    </ul>
                </div>
            `
        }
    };
})();
