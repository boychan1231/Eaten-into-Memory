# 《蝕入記憶》(Eaten into Memory) — 代理作業守則 (AGENTS.md)

本文件為專案層級的代理（Agent）執行規範。所有參與本專案開發、除錯、重構或維護的代理必須嚴格遵守以下準則。

---

## 一、目錄存取與檔案掃描規範（強制遵守）

> [!IMPORTANT]
> **嚴禁在任務啟動或執行過程中對全專案執行無差別深度掃描（如未指定路徑的 `find`、全域遞迴搜尋或讀取素材資料夾）！**

### 1. 代理檢索隔離目錄（非必要切勿讀取）
以下目錄包含大量二進位素材、音訊、圖片、編譯快取或已打包大檔，代理**不得**主動進行全文檢索或列舉：
- `SFX/`（所有 `.mp3`, `.wav` 等音訊檔）
- `assets/`（角色 Token、立繪貼圖與圖資）
- `node_modules/`, `dist/`, `build/`, `Temp/`, `Library/`
- 大型第三方庫與 Base64 檔案：`pixi.min.js`, `gsap.min.js`, `role_assets_data.js`
- 大型整合文件：`ai_studio/AI_STUDIO_CONTEXT_BUNDLE.md`（高達 1MB，僅供外部 AI Studio 匯入使用）

### 2. 精準讀取原則（Targeted Inspection Only）
代理僅在使用者明確指名特定路徑時，才可讀取上述目錄中的單一檔案：
- **涉及音訊調整**：只讀取 [`audio.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/audio.js) 中的路徑對照常數，不讀取 `SFX/` 目錄二進位檔案。
- **涉及視覺渲染**：只讀取 [`modern_board.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/modern_board.js) 或 [`modern.css`](file:///home/antigravity/boychan1231/Eaten-into-Memory/modern.css)，不讀取 `assets/` 底下圖資。
- **涉及核心遊戲邏輯**：直接定位核心代碼檔案（見下方對照表），禁止盲目搜尋全專案。

---

## 二、專案核心原始碼目錄與職責對照

| 模組類別 | 核心檔案路徑 | 代理檢索職責範圍 |
| :--- | :--- | :--- |
| **狀態機與規則** | [`game.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/game.js), [`game_setup.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/game_setup.js) | 局次回合推進、比牌暗拍、齒輪扣除、吞噬判定、飢餓機制、局末結算快照。 |
| **AI 決策引擎** | [`ai_engine.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ai_engine.js) | 3P/5P AI 出牌前異能、分鐘卡出牌、小時卡挑選與放牌後異能決策。 |
| **異能與進化** | [`abilities.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/abilities.js) | 角色專屬主動/被動異能、幼體時魔 4 大進化配方、指針身份唯一性維護。 |
| **UI 與互動** | [`ui.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui.js), [`ui_components.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui_components.js), [`ui_animations.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui_animations.js), [`ui_panels.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui_panels.js), [`ui_hand_drag.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui_hand_drag.js), [`ui_modals.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/ui_modals.js) | HUD 排程、鐘面繪製、比牌與特效排程、歷史/積分/棄牌與異能面板、手牌拖放、彈窗焦點管理。 |
| **鐘面繪製** | [`modern_board.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/modern_board.js) | PixiJS 鐘面刻度、角色棋子 Token、高危光圈、視窗縮放適配。 |
| **教學系統** | [`tutorial_mode.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/tutorial_mode.js) | 新手教學聚光燈高亮、引導泡泡與步驟推進。 |
| **雙語多國語系** | [`i18n.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/i18n.js), [`locales/zh-TW.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/locales/zh-TW.js), [`locales/en-US.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/locales/en-US.js) | 中英文 UI 文案、故事回憶、規則手冊文字字典。 |
| **入口結構** | [`index.html`](file:///home/antigravity/boychan1231/Eaten-into-Memory/index.html), [`classic.html`](file:///home/antigravity/boychan1231/Eaten-into-Memory/classic.html) | DOM 結構、內嵌規則說明視窗內容。 |

---

## 三、術語與行為鐵則 (Critical Constraints)

1. **嚴格禁用詞彙**：
   - 在所有回覆、程式碼註解、說明文件中，**嚴禁出現「優」+「化」**！
   - 一律使用**「強化」**、**「改良」**、**「精進」**或**「提昇」**替代。
2. **術語定義**：
   - 淘汰/出場統一稱為**「吞噬」**（主動）與**「被吞噬」**（被動狀態，`isEjected: true`）。
   - 法力/瑪那/乙太統一稱為**「MP」**。
   - 生命齒輪統一稱為**「GP」**。
3. **鏈接格式**：
   - 引用檔案與程式符號時，務必提供可點擊的 markdown 連結（`[檔名](file:///路徑)`）。
4. **自動提交與推送鐵則 (Auto Commit & Push)**：
   - 凡涉及任何程式碼、樣式、語系或文檔修改，驗證無誤後代理**必須主動執行 `git commit` 與 `git push origin main`**，並在回覆中附上最新 Commit 雜湊值，確保工作進度與 GitHub 遠端儲存庫保持即時同步。
