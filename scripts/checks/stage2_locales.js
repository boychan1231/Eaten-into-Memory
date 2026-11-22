import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 2：雙語字典、標籤成對、Emoji、重複箭頭與禁用詞檢查
// =========================================================
export function stage2LocaleAndFormatCheck() {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readProjectFile('locales/zh-TW.js'), ctx);
    vm.runInContext(readProjectFile('locales/en-US.js'), ctx);

    const zh = ctx.window.I18N_LOCALES['zh-TW'];
    const en = ctx.window.I18N_LOCALES['en-US'];
    assert(zh && en, '語系物件 window.I18N_LOCALES["zh-TW"] / ["en-US"] 不可為空');

    const zk = new Set(collectLocaleKeys(zh));
    const ek = new Set(collectLocaleKeys(en));
    const onlyZh = [...zk].filter(k => !ek.has(k));
    const onlyEn = [...ek].filter(k => !zk.has(k));

    assert.deepEqual(onlyZh, [], `zh-TW 多出未對齊鍵值: ${onlyZh.join(', ')}`);
    assert.deepEqual(onlyEn, [], `en-US 多出未對齊鍵值: ${onlyEn.join(', ')}`);

    // 檢查 tutorial.* 內的 HTML 標籤是否成對
    for (const [langName, localeObj] of [['zh-TW', zh], ['en-US', en]]) {
        assert(localeObj.tutorial, `${langName} 缺少 tutorial 區塊`);
        for (const [k, rawVal] of Object.entries(localeObj.tutorial)) {
            const str = String(rawVal);
            const openStrong = (str.match(/<strong>/g) || []).length;
            const closeStrong = (str.match(/<\/strong>/g) || []).length;
            assert.equal(openStrong, closeStrong, `${langName}.tutorial.${k} 的 <strong> 標籤不成對`);

            const openSpan = (str.match(/<span\b[^>]*>/g) || []).length;
            const closeSpan = (str.match(/<\/span>/g) || []).length;
            assert.equal(openSpan, closeSpan, `${langName}.tutorial.${k} 的 <span> 標籤不成對`);
        }
    }

    // 檢查 Emoji 殘留
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u26A0]/gu;
    for (const rel of ['index.html', 'classic.html', 'js/ui/tutorial_mode.js', 'locales/zh-TW.js', 'locales/en-US.js']) {
        const content = readProjectFile(rel);
        const matches = content.match(emojiRe) || [];
        assert.equal(matches.length, 0, `${rel} 仍殘留 ${matches.length} 個 Emoji (${matches.join(' ')})`);
    }

    // 檢查重複歡迎箭頭與重複 keyframe
    const styleCss = readProjectFile('styles/style.css');
    const tutorialJs = readProjectFile('js/ui/tutorial_mode.js');
    const keyframeCount = (styleCss.match(/@keyframes\s+tutorialBounceArrow\b/g) || []).length;
    assert.equal(keyframeCount, 1, `styles/style.css 中 @keyframes tutorialBounceArrow 出現次數應為 1，實測為 ${keyframeCount}`);
    assert(!styleCss.includes('tutorial-welcome-arrow'), 'styles/style.css 不應再包含 tutorial-welcome-arrow');
    assert(!tutorialJs.includes('tutorial-welcome-arrow'), 'js/ui/tutorial_mode.js 不應再包含 tutorial-welcome-arrow');

    // 檢查專案禁用詞（遵守 AGENTS.md 規範）
    const bannedWordRe = new RegExp('\\u512a\\u5316');
    const checkList = [
        'js/core/config.js',
        'js/core/abilities.js',
        'js/core/ai_engine.js',
        'js/core/penalty.js',
        'js/core/game.js',
        'js/ui/tutorial_mode.js',
        'js/ui/ui_components.js',
        'js/ui/ui_animations.js',
        'js/ui/ui_panels.js',
        'js/ui/ui_panel_abilities.js',
        'js/ui/ui_hand_drag.js',
        'js/ui/ui_settlement.js',
        'js/ui/ui_hud_fx.js',
        'js/ui/ui.js',
        'locales/zh-TW.js',
        'locales/en-US.js',
        'index.html',
        'classic.html',
        'docs/ARCHITECTURE.md',
        'scripts/verify.js'
    ];
    for (const rel of checkList) {
        const content = readProjectFile(rel);
        assert(!bannedWordRe.test(content), `${rel} 內含禁用詞`);
    }

    return `雙語 ${zk.size} 鍵 100% 對齊、標籤成對、0 Emoji、單一歡迎箭頭、0 禁用詞`;
}

