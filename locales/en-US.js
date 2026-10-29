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
        }
    };
})();
