#!/usr/bin/env node
/**
 * 《蝕入記憶》(Eaten into Memory) — Google AI Studio 上下文整合打包工具
 * 執行方式：node ai_studio/build_context_bundle.js
 * 輸出檔案：ai_studio/AI_STUDIO_CONTEXT_BUNDLE.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'AI_STUDIO_CONTEXT_BUNDLE.md');

// 核心專案檔案清單（已排除 pixi.min.js、gsap.min.js、role_assets_data.js 等大型外部/圖資檔）
const CORE_FILES = [
    'README.md',
    'GAMEPLAY.md',
    'PROJECT_HANDOVER_NOTES.md',
    'package.json',
    'vite.config.ts',
    'config.js',
    'logger.js',
    'audio.js',
    'i18n.js',
    'locales/zh-TW.js',
    'locales/en-US.js',
    'abilities.js',
    'game_setup.js',
    'game.js',
    'ui_modals.js',
    'ui_components.js',
    'tutorial_mode.js',
    'ui.js',
    'modern_board.js',
    'modern_intro.js',
    'index.html',
    'classic.html',
    'modern.css',
    'style.css',
    'stories_data.js'
];

function getLangByExt(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.js': return 'javascript';
        case '.ts': return 'typescript';
        case '.html': return 'html';
        case '.css': return 'css';
        case '.md': return 'markdown';
        case '.json': return 'json';
        default: return 'text';
    }
}

function buildBundle() {
    const chunks = [];
    let totalBytes = 0;

    chunks.push(`# 《蝕入記憶》(Eaten into Memory) — Google AI Studio 完整專案上下文整合包\n`);
    chunks.push(`> 本檔案由 \`node ai_studio/build_context_bundle.js\` 自動產生，包含全專案 ${CORE_FILES.length} 個核心設計文件與原始碼檔案。\n`);
    chunks.push(`> 已排除第三方函式庫 (\`pixi.min.js\`, \`gsap.min.js\`) 與純 Base64 角色圖資 (\`role_assets_data.js\`) 以節省 Token。\n`);

    chunks.push(`## 包含檔案目錄 (Table of Contents)\n`);
    CORE_FILES.forEach((relPath, idx) => {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            chunks.push(`${idx + 1}. \`${relPath}\` (${(stat.size / 1024).toFixed(1)} KB)`);
        }
    });
    chunks.push('\n---\n');

    for (const relPath of CORE_FILES) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`[警告] 找不到檔案，已略過: ${relPath}`);
            continue;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        totalBytes += Buffer.byteLength(content, 'utf8');
        const lang = getLangByExt(relPath);

        chunks.push(`\n================================================================================`);
        chunks.push(`=== FILE: ${relPath} ===`);
        chunks.push(`================================================================================\n`);
        chunks.push(`\`\`\`\`\`${lang}`);
        chunks.push(content);
        chunks.push(`\`\`\`\`\`\n`);
    }

    const finalOutput = chunks.join('\n');
    fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');

    const outSizeKB = (Buffer.byteLength(finalOutput, 'utf8') / 1024).toFixed(1);
    console.log(`✅ 打包完成！共整合 ${CORE_FILES.length} 個檔案。`);
    console.log(`📦 輸出路徑: ${OUTPUT_FILE}`);
    console.log(`📊 總大小: ${outSizeKB} KB (預估約 ${Math.round(totalBytes / 4 / 1000)}k Tokens)`);
}

buildBundle();
