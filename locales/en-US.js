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
                log: '📜 Game Log',
                players: '👥 Player Status',
                played_scores: '📊 Played & Scores'
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
                restart: '🔄 Play Again',
                view_board: '👀 View Board'
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
            settings: {
                title: '⚙️ Game Settings',
                language: '🌐 語言 / Language',
                lang_zh: '繁體中文 (Traditional Chinese)',
                lang_en: 'English (英文)'
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
            step0_welcome: '<strong>✨ Welcome to Eaten into Memory!</strong><br>Click "<strong>Next Round</strong>" to reveal Hour Cards and start bidding.',
            step1_drag_minute: '<strong>Step 1: Drag a Minute Card up to play</strong><br>Higher numbers pick Hour Cards first!',
            step1_sec_ability_select: '<strong>Second Hand ({count}/2): Select 2 Minute Cards</strong><br>Click "Confirm Play" after picking 2 cards.',
            step1_sec_ability_confirm: '<strong>Second Hand: Click "Confirm Play"</strong><br>Commit both selected cards face-down!',
            step3_select_hour: '<strong>Step 3: Click a glowing Hour Space</strong><br>Move your piece there and claim the Hour Card!',
            penalty_sin: '<br><span style="color:#feca57;">⚠️ Current Rule: "Nearest to Sin penalized"!</span>',
            penalty_max: '<br><span style="color:#ff6b6b;">⚠️ Current Rule: "Highest Hour penalized"! Stay away from 12!</span>',
            step_minute_ability: '<strong>Minute Hand: Choose Move Direction</strong><br>Spend Mana to jump clockwise or counter-clockwise (or click Skip).',
            step_second_ability: '<strong>Second Hand:</strong> Choose 1 final card from the two committed Minute Cards!',
            step4_round_done: '<strong>Round Resolved!</strong> Click "Next Round" to begin the next round.',
            step_next_round: '<strong>Click "Next Round"</strong><br>Resolve movements and start next round!'
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
