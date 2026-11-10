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
            young_demon: 'Young Demon'
        },
        age_groups: {
            youth: 'Youth',
            adult: 'Adult',
            middle: 'Middle-aged'
        },
        ui: {
            drawers: {
                evolution: '⚡ Abilities & Evolution',
                log: '📝 Game Log',
                players: '👥 Characters',
                scores: '🏆 Scores',
                players_scores: '👥 Players & Standings',
                played_cards: '⚔️ Current Round',
                history: '📜 Minute History',
                played_scores: '📊 Played & Scores',
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
                restart: '🔄 Play Again',
                view_board: '👀 View Board'
            },
            discard_pile: {
                title: 'Played Cards Record',
                empty: 'No Cards Played',
                empty_sub: 'Click to view played cards record',
                last_played: 'Last Played Card',
                modal_title: '📜 Played Cards Record',
                modal_subtitle: 'Round {round} · {count} cards played',
                tab_history: 'Player History',
                tab_timeline: 'By Trick / Round',
                tab_matrix: 'Number Matrix (1~60)',
                trick_title: 'Round {trick}',
                cards_count: '{count} cards',
                unplayed_count: '{count} remaining unplayed',
                tooltip: 'Click to view played cards record ({count} cards)',
                retrieve_badge: '↩ Retrieve'
            },
            labels: {
                you_are: 'You are: ',
                you_tag: '★Me',
                mana: 'Mana',
                gear_hp: 'Life',
                shield: 'Shield',
                collected: '🃏 Cards',
                hand_count: 'Hand: ',
                position: 'Pos: ',
                not_on_board: 'Not Placed',
                ejected: 'Ejected',
                round: 'Round {round}',
                game_round: 'Game {round}',
                deck_remain: 'Deck Left'
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
                tab_standings: '🏆 Standings',
                tab_history: '📜 Score History',
                round_summary: 'Round {round} Summary',
                empty_title: 'Round 1 in Progress',
                empty_desc: 'After each round ends, round scores, ejection status, and cumulative totals will appear here.'
            },
            settings: {
                title: '⚙️ Game Settings',
                language: '🌐 語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)',
                ai_difficulty_title: '🤖 AI Difficulty',
                ai_difficulty_normal: 'Normal (Enhanced Algorithm)',
                ai_difficulty_easy: 'Easy (Legacy Baseline)',
                ai_difficulty_desc: 'Normal features evolution-driven bidding and long-term card pacing; Easy retains the original baseline logic.',
                sequential_effects: 'Sequential Effects (One by One)',
                sequential_effects_desc: 'Play floating texts, damage effects, and board movements sequentially instead of simultaneously.'
            },
            hints: {
                drag_to_play: '⚡ Release to play',
                pick_hour: 'Select an Hour Card',
                waiting_input: 'Please play a card...',
                waiting_hour_choice: 'Pick an Hour Card on the board...',
                waiting_minute_choice: 'Waiting for Minute Hand choice...',
                waiting_ability_choice: 'Decide whether to use ability...',
                waiting_second_final: 'Complete Second Hand pick...',
                comparing_minute: 'Comparing minute cards...',
                comparing_minute_skip: 'Comparing minute values... (Click anywhere to skip)',
                sec_ability_select_two: '⚡ Second Hand: Select 2 minute cards.',
                sec_ability_ready: '⚡ 2 cards selected. Click "Confirm Play".'
            },
            clash: {
                gathering: '⏳ Players committed cards, preparing to reveal…',
                revealing: '🃏 Revealing minute cards from all players…',
                comparing: '⚡ Comparing values to decide turn order…',
                resolved: '✨ Turn order determined!',
                continue_prompt: '👆 Click anywhere to continue ({sec}s auto proceed)'
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
                pts_gear: '+{gear} Gears',
                pts_total: '{pts} pts',
                ejected: '(Ejected)'
            }
        },
        abilities: {
            target_role: 'Target Role:',
            no_available_role: 'No Role Available',
            condition_met: '✨ Condition Met! Evolves at end of round',
            cond_ages: '1. Ages {ages}/3, Precious {precious}/1',
            cond_numbers: '2. Values {numbers}/4, Precious {precious}/1',
            cond_total: '3. Total {total}/5, Precious {precious}/2',
            cond_precious: '4. Precious {precious}/3 (Any)',
            hour_desc: '👁️Scry Deck Top + ⚡1 Mana: Move top card to bottom',
            hour_top_card: '👁️ Top Card: <strong>{number}</strong> <span style="font-size:0.8rem; color:#ccc;">{age}</span> {star}',
            hour_deck_empty: '(Deck Empty)',
            hour_predict_disabled: '🚫 Prediction Disabled',
            hour_move_btn: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">Move top card to bottom</span>',
            hour_move_again_btn: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:bold;">🔄 Move again (1 left)</span>',
            min_desc: '⚡2 Mana: Jump to next space with Hour Card',
            min_prompt: '⚡Select move direction (jump to next occupied space):',
            min_btn_ccw: '↺ Counter-Clockwise',
            min_btn_cw: '↻ Clockwise',
            min_btn_skip: 'Skip',
            min_passive_text: 'When obtaining Hour Card, spend {cost} Mana to jump to next space with cards.',
            min_passive_disabled: '<span style="color:#888; text-decoration:line-through;">Spend {cost} Mana to move upon getting Hour Card.</span><br><span style="color:#ff6b6b; font-weight:bold;">(🚫 Sealed this round)</span>',
            sec_desc: '⚡3 Mana: Play 2 cards, pick 1',
            sec_btn_play: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">Play 2, pick 1 upon reveal</span>',
            sec_btn_cancel: 'Cancel',
            sec_pick_one_prompt: 'Select 1 card...',
            sec_pick_two_hint: '👆 Select 2 cards from your hand',
            sin_mode_near: 'Penalty Target: Nearest (Modified)',
            sin_mode_max: 'Penalty Target: Highest Value (Default)',
            sin_btn_pull: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">Sin Pull</span>',
            sin_pull_tip: 'Penalize nearest player to Time Sin',
            sin_btn_seal: '{cost} Mana<br><span style="font-size:0.8rem; font-weight:normal;">Seal Demon</span>',
            sin_seal_tip: 'Seal all demon abilities this round',
            sin_acted: 'Acted',
            sin_lack_mana: 'Need Mana ({cost})',
            locked_btn: '🚫 Ability Sealed'
        },
        tutorial: {
            turn_prefix: '<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">💡 Tutorial can be disabled in Settings</div>',
            welcome_prefix: '<strong>✨ Welcome to Eaten into Memory!</strong><br>',
            step0_welcome: '<strong>✨ Welcome to Eaten into Memory!</strong><br>Click "<strong>Next Round</strong>" to reveal Hour Cards and start bidding.',
            step1_drag_minute: '<strong>Step 1: Drag a Minute Card up to play</strong><br>Drag toward the clock face and release.<br>💡 <strong>Tactics:</strong> Higher cards claim safe spots & memories; smaller cards stay off the clock face to safely avoid penalties!',
            step1_sec_ability_select: '<strong>Second Hand ({count}/2): Select 2 Minute Cards</strong><br>Click "Confirm Play" after picking 2 cards.',
            step1_sec_ability_confirm: '<strong>Second Hand: Click "Confirm Play"</strong><br>Commit both selected cards face-down!',
            step3_select_hour: '<strong>Step 3: Click a glowing Hour Space</strong><br>Move your piece there and claim the Hour Card!',
            step3_no_hour_notice: '<strong>【Tactical Notice: Staying Off the Clock Face】</strong><br>🛡️ <strong>Advantage (Safety):</strong> You do not enter the clock face this round, <strong>completely avoiding</strong> gear/life penalties!<br>⚠️ <strong>Disadvantage:</strong> You gain no Hour Cards, delaying memory collection for character evolution.',
            penalty_sin: '<br><span style="color:#feca57;">⚠️ Current Rule: "Nearest to Sin penalized"!</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">⚠️ Current Rule: "Highest Hour penalized"! Stay away from 12!</span>',
            step_minute_ability: '<strong>Minute Hand: Choose Move Direction</strong><br>Spend Mana to jump clockwise or counter-clockwise (or click Skip).',
            step_second_ability: '<strong>Second Hand:</strong> Choose 1 final card from the two committed Minute Cards!',
            step4_round_done: '<strong>Round Resolved!</strong> Click "Next Round" to begin the next round.',
            step4_no_hour_card: '<strong>【Tactical Notice: Staying Off the Clock Face】</strong><br>🛡️ <strong>Advantage (Safety):</strong> Off the clock face—gears are completely safe from penalties!<br>⚠️ <strong>Disadvantage:</strong> No Hour Card claimed, delaying evolution progress.<br>Click "<strong>Next Round</strong>" to continue!',
            step_next_round: '<strong>Click "Next Round"</strong><br>Resolve movements and start next round!',
            role_scoring_young: '<strong>【🐣 Young Time Demon: Scoring & Goal】</strong><br>• <strong>Base Score:</strong> Each surviving gear at the end of each game converts 1:1 to score points!<br>• <strong>Evolution Goal:</strong> Compete for Hour Cards to satisfy 4 recipe requirements and evolve into Hour, Minute, or Second Hand! Evolved demons gain a <strong>+3 pts</strong> faction bonus at the end of Game 5!<br>• <strong>Ejection Victory:</strong> Eject Time Evil by draining its gears to win immediately!<br>• <strong>Emergency Shield:</strong> If Mana ≥ 3, spend all Mana to completely negate 1 incoming penalty.',
            role_scoring_hour: '<strong>【👁️ Time Hand: Scoring & Tactics】</strong><br>• <strong>Gears = Score:</strong> Retain gears until game end to convert to maximum total points!<br>• <strong>Foresight:</strong> Automatically reveals the next Hour Card atop the deck each round.<br>• <strong>Deck Manipulation:</strong> Spend Mana to move lethal high cards (11, 12) to the bottom, ensuring safe low-number cards appear and preserving your gears!',
            role_scoring_minute: '<strong>【👟 Minute Hand: Scoring & Tactics】</strong><br>• <strong>Gears = Score:</strong> Retain gears until game end to convert to maximum total points!<br>• <strong>Leap Evasion:</strong> After claiming an Hour Card, spend 2 Mana to jump clockwise or counter-clockwise to the next card space, escaping lethal position 12 and forcing penalties onto rivals!',
            role_scoring_second: '<strong>【🃏 Second Hand: Scoring & Tactics】</strong><br>• <strong>Gears = Score:</strong> Retain gears until game end to convert to maximum total points!<br>• <strong>Dual-Card Ambush:</strong> Spend 3 Mana on crucial turns to commit 2 face-down Minute Cards. After all others reveal, choose the ideal card to seize safe spots or intentionally take 3rd place to avoid penalties!',
            role_scoring_sin: '<strong>【😈 Time Evil: Hunting & Scoring Guide】</strong><br>• <strong>Base Score:</strong> Remaining gears at game end convert to score.<br>• <strong>🩸 Special Win:</strong> Eject each of the 3 Time Demons <strong>at least once</strong> across 5 games to achieve an instant Special Victory!<br>• <strong>⚠️ Starvation:</strong> If 2 consecutive games pass with no demon ejected, lose 1 gear to hunger! If gears hit 0, you lose immediately!<br>• <strong>Abilities:</strong> 【Sin\'s Pull (2 Mana)】penalizes whoever is closest to you; 【Seal (3 Mana)】blocks all demon abilities!',
            role_scoring_scz: '<strong>【👻 Cursed One: Memory Lock & Scoring Guide】</strong><br>• <strong>Base Score:</strong> Remaining gears at game end convert to score.<br>• <strong>🔒 Core Mission:</strong> Land on 【★ Precious Hour Cards】to lock them permanently onto the clock face!<br>• <strong>🏆 Huge Bonus Points:</strong> Locking 12 cards by end of Game 2 / 3 / 4 grants <strong>+9 / +5 / +2 huge bonus points</strong>!<br>• <strong>☠️ Lethal Deadline:</strong> If fewer than 12 cards are locked by the end of Game 5, suffer a devastating <strong>-999 pts penalty</strong>! Prioritize Precious Cards!',
            role_evolved_notice: '<strong>🎉【Evolved into {roleName}!】</strong><br>You have evolved! You will earn a <strong>+3 pts</strong> faction bonus at game end! Use your new powers to safeguard gears and maximize your score!',
            role_scz_hour_hint: '<br><span style="color:#00d2d3;">💡 <strong>Cursed One Tip:</strong> Prioritize 【★ Precious Cards】! Stepping on one permanently locks it, rushing towards 12 cards for huge bonus points and escaping the -999 penalty!</span>',
            role_sin_hour_hint: '<br><span style="color:#feca57;">💡 <strong>Time Evil Tip:</strong> After moving, activate 【Sin\'s Pull (2 Mana)】to penalize adjacent demons and work towards your 3-ejection Special Victory!</span>',
            role_progress_scz: 'Clock Face Locked Precious Cards: {count}/12 (Game {round})',
            role_progress_sin: 'Special Victory Progress: {count}/3 Demons Ejected',
            role_progress_young: 'Backpack Hour Cards: {count} collected. Continue collecting to evolve!'
        },
        logs: {
            round_start: '--- Game {round} Round {turn} Started ---',
            hour_drawn: 'Hour Cards Drawn: [{c1}, {c2}]',
            waiting_minute: 'Waiting for players to play Minute Cards...',
            sin_pull_activated: '⚡【Time Sin】Ability activated! Nearest player will be penalized.',
            sin_rule_default: '【Time Sin】Highest clock position penalized (near 12).',
            sin_seal_ai: '😈【Time Sin】(AI) Spent {cost} Mana on "Seal"! All demon abilities blocked this round.',
            sec_ability_ai: '⏱️【Second Hand】{name} (AI) Spent {cost} Mana to commit 2 cards (pick 1).',
            evolution_success: '🎉【Evolved】{oldRole} met condition "{condition}"! Evolved into: {newRole}',
            hour_top_to_bottom: '🕒【Hour Hand】{name} spent {cost} Mana to move top card ({num}) to bottom.',
            minute_hand_moved: '⏱️【Minute Hand】{name} spent {cost} Mana, moved {dir} to space {pos}.',
            balance_g4: '⚖️【Balance G4】Deck > 26, removed {count} non-precious 1s.',
            balance_g5: '⚖️【Balance G5】Deck trimmed by {count} cards to 24.'
        },
        rules: {
            manual_html: `
					<h2 style="color: var(--accent-color); border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0;">Game Rules & Guide</h2>
					<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #444;">
						<h3 style="color: #feca57; margin-top: 0; display: flex; align-items: center; gap: 8px;">
							<span>⏳</span> Core Mechanics
						</h3>
						<p><strong>Goal:</strong> Players use Minute Cards to bid for selection order of Hour Cards, securing safe positions on the clock face to protect their Gear Life.</p>
						<ul style="padding-left: 20px; margin-bottom: 0;">
							<li><strong>Clock Hours:</strong> The character whose position is closest to <strong>12</strong> loses 1 Gear at round end.</li>
							<li><strong>Hour Cards (Board):</strong> Divided into Youth, Adult, and Middle ages. Precious (★) cards are distributed each game.</li>
							<li><strong>Minute Cards (Hand):</strong> Values 1 - 60 used for blind bidding. Highest value picks first.</li>
							<li><strong>Gear Points (Life / Mana):</strong> Remaining gears become player score at game end. Zero life means ejection until next game.</li>
							<li><strong>Off-Clock Protection & Memory Cards:</strong> If you do not acquire an Hour Card in a round (due to lower Minute Card values), your character does not enter the clock face. While staying off the clock protects your gears from penalties, you cannot acquire the precious memory cards needed for evolution this round.</li>
						</ul>
					</div>

					<h3 style="color: #4cd137; margin-bottom: 15px;">🔄 Round Flow</h3>
					<div style="background: rgba(76, 209, 55, 0.08); padding: 15px; border-left: 4px solid #4cd137; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
						<ol style="padding-left: 20px; margin: 0; line-height: 1.8; color: #eee;">
							<li><strong>Draw Hours:</strong> 2 Hour Cards revealed on board.</li>
							<li><strong>Blind Bid:</strong> Each player commits 1 Minute Card face down.</li>
							<li><strong>Reveal & Move:</strong> Reveal cards; highest value picks an Hour Card and moves piece there.</li>
							<li><strong>Execution:</strong> Highest position (closest to 12) penalized by losing gear/shield.</li>
							<li><strong>Evolution:</strong> Young demons collecting needed sets evolve at round end.</li>
							<li><strong>Game Resolution:</strong> After 12 rounds, leftover gears convert to score. Redeal 12 cards for next game.</li>
						</ol>
						<div style="margin-top: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(76, 209, 55, 0.35); border-radius: 6px; padding: 10px 12px; font-size: 0.88rem; line-height: 1.6;">
							<strong style="color: #4cd137;">💡 Hour Cards: Entering vs Staying Off the Clock Face:</strong><br>
							• <strong>🎯 Entered Clock Face (Top 2):</strong> Claim revealed Hour Cards (1st chooses, 2nd takes remainder). Young Time Demons store them in inventory for evolution; Evolved demons leave cards on the board; Cursed One locks precious cards. However, players must face end-of-round penalty risks near 12 o'clock.<br>
							• <strong>🛡️ Off the Clock Face (3rd place and below):</strong> Gain NO Hour Cards this round (evolution progress pauses), but receive <strong>absolute immunity</strong> from penalties—gears are 100% safe! Playing low cards to intentionally stay off the board is a prime tactic when lethal cards (11, 12) appear.
						</div>
					</div>

					<h3 style="color: #00d2d3; margin-bottom: 15px;">🎮 Game Modes</h3>
					<div style="overflow-x: auto;">
						<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.9rem; background: rgba(255,255,255,0.05);">
							<thead>
								<tr style="background: rgba(255,255,255,0.1);">
									<th style="padding: 12px; border: 1px solid #555; text-align: left;">Feature</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff9ff3;">⚔️ 3P Confrontation</th>
									<th style="padding: 12px; border: 1px solid #555; color: #ff6b6b;">⚔️ 5P Role Play</th>
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
									<td style="padding: 10px; border: 1px solid #555;">Gear Score + special victory conditions</td>
								</tr>
							</tbody>
						</table>
					</div>
            `
        }
    };
})();
