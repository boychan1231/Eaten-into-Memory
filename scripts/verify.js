import { stage1SyntaxCheck } from './checks/stage1_syntax.js';
import { stage2LocaleAndFormatCheck } from './checks/stage2_locales.js';
import { stage3TutorialBehaviorTest } from './checks/stage3_tutorial.js';
import { stage4HeadlessStressTest } from './checks/stage4_stress.js';
import { stage5HtmlLoadOrderCheck } from './checks/stage5_html.js';
import { stage6UiModulesSmokeTest } from './checks/stage6_ui.js';

// =========================================================
// 主執行流程（支援 --stage=1..6 單獨執行指定關卡）
// =========================================================
async function main() {
    const stages = [
        [1, '關卡 1/6｜核心 JS 語法檢查', stage1SyntaxCheck],
        [2, '關卡 2/6｜雙語字典、標籤、Emoji 與規範檢查', stage2LocaleAndFormatCheck],
        [3, '關卡 3/6｜新手教學系統行為測試', stage3TutorialBehaviorTest],
        [4, '關卡 4/6｜5P / 3P 無頭對戰壓力測試 (40 場)', stage4HeadlessStressTest],
        [5, '關卡 5/6｜雙入口 HTML Script 載入順序檢查', stage5HtmlLoadOrderCheck],
        [6, '關卡 6/6｜UI 拆分模組載入與符號完整性測試', stage6UiModulesSmokeTest]
    ];

    const stageArg = process.argv.slice(2).find(a => a.startsWith('--stage='));
    const filterNum = stageArg ? Number(stageArg.slice('--stage='.length)) : null;
    const selected = Number.isInteger(filterNum) ? stages.filter(([n]) => n === filterNum) : stages;

    if (selected.length === 0) {
        throw new Error(`找不到指定關卡: ${stageArg} (可用值: 1~6)`);
    }

    console.log('=== 《蝕入記憶》(Eaten into Memory) 自動化驗證開始 ===');
    for (const [, label, fn] of selected) {
        const summary = await fn();
        console.log(`[PASS] ${label}: ${summary}`);
    }
    console.log(filterNum
        ? `=== 指定驗證關卡 ${filterNum}/6 通過 ===`
        : '=== 全部 6 道自動化驗證關卡通過 ===');
}

main().catch((err) => {
    console.error('[FAIL] 自動化驗證失敗：');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
