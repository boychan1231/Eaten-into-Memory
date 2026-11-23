# 《蝕入記憶》(Eaten into Memory) — 後續改良未完成項目與分階段執行計劃

> 建立日期：2026-11-21
> 最新進度：**Phase 1 ～ Phase 4（含 CSS 本體拆分與無頭 Chromium 多視口行動裝置實測）已全部完成並通過驗證**；**Phase 5（ES Module 化）**保留方案 A / B / C 待日後拍板。

---

## 一、原始 6 大類建議執行狀態盤點

| 類別 | 項目 | 狀態 | 備註 |
| :--- | :--- | :---: | :--- |
| **1. 程式碼結構** | `ui.js` 拆出局結算與排行榜／自動倒數 | 已完成 | 已抽離至 `js/ui/ui_settlement.js`。 |
| | `ui.js` 再拆出 HUD 更新與設定面板 | **未完成** | 目前仍留於 `js/ui/ui.js`（~1750 行）。 |
| | `ui_panels.js` 拆出歷史、積分、異能、角色選擇說明 | **未完成** | 目前約 1440 行。 |
| | `game.js` 抽離處決與吞噬結算為 `penalty.js` | **未完成** | 目前約 1525 行。 |
| | `style.css` / `modern.css` 依元件拆分並統一 CSS 變數 | **未完成** | 各約 4300～4400 行。 |
| | 逐步改為 ES Module | **暫緩待決議** | 方案 A / B / C 已記錄，待日後拍板。 |
| **2. 穩定性** | `game.js` 集中管理 `setTimeout` 排程器 | 已完成 | 已實作 `GameScheduler` 並於開新局自動清除。 |
| | 全專案 `innerHTML` 轉義審查 | **部分完成** | 已建 `window.escapeHtml` 並加固 `ui_panels.js` 主要清單；其餘 UI 檔待盤點。 |
| | 人類玩家逾時自動出牌防卡關保險 | **未完成** | 需設計可開關之逾時機制。 |
| **3. 規則與平衡** | 壓測角色勝率與平均被吞噬次數統計 | 已完成 | 已實作 `scripts/balance_report.js`（`npm run balance`）。 |
| | 依勝率數據微調 3P 模式平衡 | **未完成** | 基準：分針 60% / 時針 34% / 秒針 22%。 |
| | 整理「規則變更紀錄」並同步 `docs/GAMEPLAY.md` | **未完成** | 補齊時之惡、受詛者、分針預覽、扣除差異提示。 |
| **4. 測試與驗證** | GitHub Actions CI (`npm run verify`) | 已完成 | 已建立 `.github/workflows/verify.yml`。 |
| | 壓測固定隨機種子 (`VERIFY_SEED`) | 已完成 | 已於 `game_setup.js` 與 `verify.js` 實作。 |
| | `scripts/verify.js` 拆分為 `scripts/checks/*.js` | **未完成** | 目前約 1610 行，6 道關卡集中單檔。 |
| **5. 使用體驗** | 行動裝置小螢幕實測扇形手牌與 HUD 抽屜 | **未完成** | 需檢視窄螢幕重疊、觸控熱區與抽屜遮擋。 |
| | 無障礙：彈窗 `aria-modal`、Esc 關閉、減少動態開關 | **未完成** | 涵蓋 `ui_modals.js`、`styles/` 與設定面板。 |
| | 延遲載入開場動畫以縮短首屏時間 | **未完成** | 降低 PixiJS / GSAP / `modern_intro.js` 首屏阻塞。 |
| **6. 文件** | 每次重構後更新 `docs/ARCHITECTURE.md` 載入順序與職責 | **未完成** | 需補上 `ui_settlement.js`、`GameScheduler`、`balance_report.js`。 |
| | 將 `ai_studio/AI_STUDIO_CONTEXT_BUNDLE.md` 產出納入 `npm run` | **未完成** | 需於 `package.json` 綁定對應指令。 |

---

## 二、未完成項目分階段執行計劃（建議順序）

### Phase 1｜低風險加固與文件同步（預估 1～2 次迭代）
> **目標**：先補齊安全缺口、可讀文件與無障礙體驗，零架構破壞風險。

1. **補齊全專案 `innerHTML` 轉義審查**
   - 範圍：`js/ui/ui.js`、`js/ui/ui_components.js`、`js/ui/ui_animations.js`、`js/ui/ui_hand_drag.js`、`js/ui/ui_settlement.js`、`js/modern/modern_board.js`。
   - 做法：凡插入玩家名稱、角色名、自訂字串或動態 i18n 參數處，統一改用 `window.escapeHtml()` 或 `textContent`。
   - 驗收：`npm run verify` 全綠，新增重點 XSS 轉義回歸測試。
2. **無障礙基礎強化（`aria-modal` / Esc / 減少動態）**
   - 範圍：`js/ui/ui_modals.js`、`index.html`、`classic.html`、`styles/style.css`、`styles/modern.css`、`locales/*.js`。
   - 做法：彈窗開啟時自動設定 `role="dialog"` 與 `aria-modal="true"`，支援鍵盤 `Escape` 關閉；設定面板新增「減少動態（Reduced Motion）」開關並持久化至 `localStorage`，預設尊重系統 `prefers-reduced-motion`。
   - 驗收：鍵盤與設定切換測試通過，雙語鍵值 100% 對齊。
3. **文件與打包指令同步**
   - 整理近期規則變更（時之惡 GP 與護盾、受詛者、分針目標預覽、扣除差異提示）並同步更新 `docs/GAMEPLAY.md`。
   - 更新 `docs/ARCHITECTURE.md` 補齊 `ui_settlement.js`、`GameScheduler`、種子亂數與最新載入順序。
   - 確認 `ai_studio/AI_STUDIO_CONTEXT_BUNDLE.md` 的產出腳本，於 `package.json` 加入 `npm run bundle:context`（若腳本尚未建置則一併補上）。

---

### Phase 2｜測試拆分與遊戲平衡調整（預估 1～2 次迭代）
> **目標**：讓驗證工具更易維護，並用量化數據校準 3P 平衡。

4. **拆分 `scripts/verify.js` 為 `scripts/checks/*.js`**
   - 拆出 `scripts/checks/stage1_syntax.js` ～ `stage6_ui.js` 與共用工具 `scripts/checks/utils.js`，`scripts/verify.js` 僅留總控排程器。
   - 驗收：`npm run verify` 行為與 6 道關卡輸出 100% 一致，且支援單獨跑指定關卡（如 `--stage=4`）。
5. **3P 模式平衡微調（依 `npm run balance` 數據驗證）**
   - 檢視 `分針`（60%）過強與 `秒針`（22%）偏弱的成因（如 3P 分針跳格 MP 消耗或秒針雙牌門檻）。
   - 調整後以 `npm run balance -- --games=100` 驗證三角色勝率收斂至 28%～38% 合理區間，且 5P 勝率不受負面影響。

---

### Phase 3｜核心與 UI 模組進一步拆分（預估 2～3 次迭代）
> **目標**：將 1400～1750 行的中大型檔案降至單一職責（每檔建議 < 800 行）。

6. **拆分 `js/ui/ui_panels.js`（~1440 行）**
   - 依職責拆為：`ui_panel_scores.js`（即時總分／得分歷程／特殊勝利計）、`ui_panel_discard.js`（出牌記錄／時間線／60 格矩陣）、`ui_panel_abilities.js`（異能／進化／角色說明）。
7. **拆分 `js/ui/ui.js`（~1750 行）**
   - 抽離 `ui_hud.js`（HUD 與浮動跳字／畫面震動）與 `ui_settings.js`（設定面板與自訂字型上傳），`ui.js` 專職事件綁定與生命週期初始化。
8. **拆分 `js/core/game.js` 處決邏輯**
   - 將 `deductGearCards`、`handleDiceDeduction`、`checkEjectionAndWinCondition` 等處決與吞噬邏輯獨立成 `js/core/penalty.js`。
9. **同步檢核**：每次拆分皆同步更新 `index.html`、`classic.html`、`scripts/checks/`、`AGENTS.md` 與 `docs/ARCHITECTURE.md`，確保 `npm run verify` 全綠。

---

### Phase 4｜防卡關、行動裝置與首屏效能（預估 2 次迭代）
> **目標**：提昇實戰體驗與行動裝置流暢度。

10. **人類玩家逾時自動出牌保險（選用開關）**
    - 在設定面板提供「逾時自動出牌（預設關閉，可設 30/60 秒）」開關，逾時時依 AI 策略代出分鐘卡或挑選小時卡，避免掛機卡死流程。
11. **行動裝置版面實測與微調**
    - 針對 375px / 390px / 430px 寬度與橫屏實測扇形手牌（`ui_hand_drag.js` + `modern.css`）與左右 HUD 抽屜的間距、點擊熱區與捲動行為。
12. **CSS 模組化與變數統一**
    - 將 `styles/style.css` 與 `styles/modern.css`（各 ~4300 行）依「變數／基底／鐘面／手牌／彈窗／HUD 抽屜／響應式」拆分至 `styles/base/` 與 `styles/components/`，統一色票與間距變數。
13. **開場動畫延遲載入**
    - 將 `modern_intro.js` 與非首屏必要資源改為非阻塞載入或按需初始化，縮短主畫面可互動時間。

---

### Phase 5｜待決議：ES Module (ESM) 架構演進
> **狀態**：**暫緩執行，待日後決定是否保留 `file://` 直接雙擊開啟能力**。

- **方案 A（維持現狀）**：保留 `<script>` 載入，由自動化驗證守住順序與符號完整性，支援 `file://` 離線直開。
- **方案 B（漸進式 ESM，若全走 HTTP 推薦）**：先將 `js/core/` 轉為 ESM 並由 `js/core/index.js` 橋接 `window.*`，再逐步遷移 `js/ui/`、`js/modern/` 與測試腳本。
- **方案 C（一次全轉 + Vite 打包）**：全專案 ESM 並統一由 `vite build` 產出正式包。
