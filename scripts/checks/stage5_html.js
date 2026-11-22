import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT_DIR, readProjectFile, fileExists, collectLocaleKeys } from './utils.js';

// =========================================================
// 關卡 5：雙入口 HTML Script 存在性與載入順序檢查
// =========================================================
export function stage5HtmlLoadOrderCheck() {
    const requiredOrder = [
        'locales/zh-TW.js',
        'locales/en-US.js',
        'js/core/i18n.js',
        'js/core/config.js',
        'js/core/abilities.js',
        'js/core/game_setup.js',
        'js/core/ai_engine.js',
        'js/core/penalty.js',
        'js/core/game.js',
        'js/ui/ui_components.js',
        'js/ui/ui_animations.js',
        'js/ui/ui_panels.js',
        'js/ui/ui_panel_abilities.js',
        'js/ui/ui_hand_drag.js',
        'js/ui/ui_settlement.js',
        'js/ui/ui_hud_fx.js',
        'js/ui/tutorial_mode.js',
        'js/ui/ui.js'
    ];

    let assetRefsChecked = 0;

    for (const htmlFile of ['index.html', 'classic.html']) {
        const html = readProjectFile(htmlFile);
        const scripts = [];
        const scriptRe = /<script\s+[^>]*src=["']([^"']+)["']/gi;
        let match;
        while ((match = scriptRe.exec(html)) !== null) {
            const src = match[1];
            if (!/^https?:\/\//i.test(src)) {
                scripts.push(src);
                assert(fileExists(src), `${htmlFile} 引用的腳本檔案不存在: ${src}`);
            }
        }

        let lastIdx = -1;
        for (const req of requiredOrder) {
            const idx = scripts.indexOf(req);
            assert(idx >= 0, `${htmlFile} 缺少核心腳本: ${req}`);
            assert(idx > lastIdx, `${htmlFile} 腳本載入順序錯誤: ${req} 必須晚於 ${requiredOrder[requiredOrder.indexOf(req) - 1] || '前項'}`);
            lastIdx = idx;
        }

        const linkTagRe = /<link\s+[^>]*>/gi;
        while ((match = linkTagRe.exec(html)) !== null) {
            const tag = match[0];
            if (!/\brel=["']stylesheet["']/i.test(tag)) continue;
            const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
            if (!hrefMatch) continue;
            const href = hrefMatch[1];
            if (!/^(https?:|data:|#)/i.test(href)) {
                assert(fileExists(href), `${htmlFile} 引用的樣式檔案不存在: ${href}`);
                assetRefsChecked++;
            }
        }

        const imgRe = /<img\s+[^>]*src=["']([^"']+)["']/gi;
        while ((match = imgRe.exec(html)) !== null) {
            const imgSrc = match[1];
            if (!/^(https?:|data:|#)/i.test(imgSrc)) {
                assert(fileExists(imgSrc), `${htmlFile} 引用的圖片檔案不存在: ${imgSrc}`);
                assetRefsChecked++;
            }
        }
    }

    for (const cssRel of ['styles/style.css', 'styles/modern.css']) {
        const cssText = readProjectFile(cssRel);
        const cssDir = path.posix.dirname(cssRel);
        const urlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
        let match;
        while ((match = urlRe.exec(cssText)) !== null) {
            const rawUrl = match[1].trim();
            if (!rawUrl || /^(https?:|data:|#)/i.test(rawUrl)) continue;
            assert(!rawUrl.startsWith('fonts/') && !rawUrl.startsWith('assets/'), `${cssRel} 仍使用舊根目錄相對路徑: ${rawUrl}`);
            const resolvedRel = path.posix.normalize(path.posix.join(cssDir, rawUrl));
            if (resolvedRel.startsWith('assets/')) {
                assert(fileExists(resolvedRel), `${cssRel} 引用的圖片資源不存在: ${rawUrl} -> ${resolvedRel}`);
            }
            assetRefsChecked++;
        }
    }

    return `index.html 與 classic.html 載入順序正確，且 ${assetRefsChecked} 筆 HTML/CSS 資源路徑無斷鏈`;
}

