# 🔤 字型資源目錄 (Fonts Directory)

本目錄用於存放《蝕入記憶》專案所使用的自訂本地字型檔案（例如 `.woff2`, `.woff`, `.ttf`, `.otf`）。

---

## 📌 建議字型格式與優先級
1. **`.woff2`**（強烈推薦）：壓縮率最高、載入最快，現代主流瀏覽器皆完整支援。
2. **`.woff`**：次選網頁字型格式。
3. **`.ttf` / `.otf`**：傳統字型檔，體積較大但相容性高。

---

## 🛠️ 如何套用本地字型至四大資訊維度

將字型檔案放置於本目錄（例如 `fonts/CustomNumber.woff2`）後，開啟 [`modern.css`](file:///home/antigravity/boychan1231/Eaten-into-Memory/modern.css) 或 [`style.css`](file:///home/antigravity/boychan1231/Eaten-into-Memory/style.css)：

### 步驟 1：宣告 `@font-face`
```css
@font-face {
    font-family: 'CustomNumberFont';
    src: url('fonts/CustomNumber.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
```

### 步驟 2：於 `:root` 變數中指派對應資訊分類
```css
:root {
    /* 1. 介面文字 (按鈕、抽屜、面板、日誌) */
    --font-ui: 'Noto Sans TC', Inter, sans-serif;

    /* 2. 數值與一般計量 (GP/MP計量、倒數計時) */
    --font-number: 'Courier New', monospace;

    /* 3. 標題與角色 (遊戲標題、角色名稱、徽章) */
    --font-title: 'Cinzel-VariableFont', 'Cinzel', serif;

    /* 4. 故事與手冊 (背景故事、回憶錄、規則手冊內文) */
    --font-story: 'Noto Serif TC', serif;

    /* 5. 鐘面刻度與鐘面文字 */
    --font-clock: 'Cinzel-VariableFont', 'Cinzel', serif;

    /* 6. 分鐘卡牌數字 (Playfair Display Regular 400 Italic) */
    --font-minute-card: 'Playfair Display', serif;
}
```

---

## 💡 若使用 Google Fonts / 線上 CDN
若直接使用 Google Fonts 等線上字型，**不需要**下載檔案至本目錄，只需在 CSS 頂部 `@import url(...)`，並直接填入字型名稱即可！
