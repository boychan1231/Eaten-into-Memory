import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 1：核心 JS 語法檢查 (node --check)
// =========================================================
export function stage1SyntaxCheck() {
    const coreFiles = [
        'js/core/i18n.js',
        'js/core/config.js',
        'js/core/logger.js',
        'js/core/audio.js',
        'js/core/abilities.js',
        'js/core/game_setup.js',
        'js/core/ai_engine.js',
        'js/core/game.js',
        'js/ui/ui_modals.js',
        'js/ui/ui_components.js',
        'js/ui/ui_animations.js',
        'js/ui/ui_panels.js',
        'js/ui/ui_hand_drag.js',
        'js/ui/ui_settlement.js',
        'js/ui/tutorial_mode.js',
        'js/ui/ui.js',
        'js/modern/modern_board.js',
        'js/modern/modern_intro.js',
        'locales/zh-TW.js',
        'locales/en-US.js',
        'locales/stories_data.js',
        'scripts/verify.js'
    ];

    const optionalSplitFiles = [
        'js/core/game_resolution.js'
    ];

    const targets = coreFiles.concat(optionalSplitFiles.filter(fileExists));

    for (const rel of targets) {
        const full = path.join(ROOT_DIR, rel);
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    }

    return `語法檢查全數通過 (${targets.length} 個檔案)`;
}

