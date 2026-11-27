# 《蝕入記憶》(Eaten into Memory) — 多人線上對戰通訊協議規格書 (WebSocket JSON Protocol)

> **版本**：`v1.0`  
> **傳輸層**：WebSocket (`ws://` 本機測試 / `wss://` Google Cloud Run 正式環境)，UTF-8 JSON 字串  
> **架構原則**：**權威伺服器（Authoritative Server）**。所有發牌、暗拍比牌、小時卡放置、角色異能、GP/MP 增減與吞噬判定均於伺服器端 [`server/game_engine.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/server/game_engine.js)（沙盒載入 [`js/core/`](file:///home/antigravity/boychan1231/Eaten-into-Memory/js/core/game.js)）執行；客戶端僅傳送動作意圖，並依伺服器回傳之 `state`（視野過濾快照）與 `events`（有序動畫事件）更新畫面。

---

## 1. 遊戲模式對照表

客戶端於 `START_GAME` 可指定以下模式，缺位席次將由伺服器自動以 [`js/core/ai_engine.js`](file:///home/antigravity/boychan1231/Eaten-into-Memory/js/core/ai_engine.js) 補齊 AI：

| `mode` 值 | 人數 | 說明 | 預設是否啟用異能 |
| :--- | :---: | :--- | :---: |
| `"5P"` | 5 人 | 5 人陣營模式（時魔 ×2、幼體時魔、時之惡、受詛者） | 可選（預設 `true`） |
| `"3P"` | 3 人 | 3 人指針競速模式（時針、分針、秒針） | 可選（預設 `true`） |
| `"PURE_3P"` | 3 人 | 純粹模式（無異能、無 MP、無護盾，3 人） | `false` |
| `"PURE_4P"` | 4 人 | 純粹模式（無異能、無 MP、無護盾，4 人） | `false` |
| `"PURE_5P"` | 5 人 | 純粹模式（無異能、無 MP、無護盾，5 人） | `false` |

> 若傳入 `"4P"`，伺服器自動映射至 `"PURE_4P"`（4 人純粹模式）。

---

## 2. 客戶端上行指令 (Client → Server)

所有指令皆為 JSON 物件，必含 `type` 欄位。

### 2.1 心跳保活 `PING`
```json
{ "type": "PING" }
```

### 2.2 加入或建立房間 `JOIN_ROOM`
```json
{
  "type": "JOIN_ROOM",
  "roomId": "TEST01",
  "name": "玩家A"
}
```
* `roomId`：房號字串（大寫英數，若房間不存在則自動建立並設為房主）。
* `name`：顯示名稱（最多 20 字元）。

### 2.3 開始對局 `START_GAME`
由房主（或任一房內玩家於大廳狀態）發起，缺人自動補 AI：
```json
{
  "type": "START_GAME",
  "mode": "5P",
  "enableAbilities": true,
  "aiDifficulty": "normal",
  "seed": 20261127
}
```
* `mode`：`"5P"` | `"3P"` | `"4P"` | `"PURE_3P"` | `"PURE_4P"` | `"PURE_5P"`（預設 `"5P"`）。
* `enableAbilities`：`boolean`（`PURE_*` 強制 `false`）。
* `aiDifficulty`：`"normal"` | `"easy"`（預設 `"normal"`）。
* `seed`：選填整數隨機種子（供測試重現）。

### 2.4 打出分鐘卡暗拍 `PLAY_MINUTE_CARD`
普通出牌（單張）：
```json
{
  "type": "PLAY_MINUTE_CARD",
  "value": 45
}
```
秒針專屬雙牌暗拍（消耗 MP 蓋放 2 張，開牌後再二選一）：
```json
{
  "type": "PLAY_MINUTE_CARD",
  "values": [24, 53],
  "useSecondHand": true
}
```

### 2.5 挑選小時卡 `PICK_HOUR_CARD`
當 `state.pendingAction.type === "PICK_HOUR_CARD"` 且目標為本人時送出：
```json
{
  "type": "PICK_HOUR_CARD",
  "cardIndex": 0
}
```
* `cardIndex`：對應 `state.currentDrawnHourCards` 陣列索引（`0` 或 `1`）。

### 2.6 發動主動異能 / 階段確認 `USE_ABILITY`
```json
{
  "type": "USE_ABILITY",
  "ability": "MINUTE_HAND_MOVE",
  "choice": "cw"
}
```
支援的 `ability` 類型：
| `ability` | 觸發時機 | 參數 |
| :--- | :--- | :--- |
| `"SECOND_HAND_FINAL"` | 秒針翻牌後二選一 | `value: number`（二選一的分鐘卡點數） |
| `"MINUTE_HAND_MOVE"` | 分針取得小時卡後 | `choice: "cw" \| "ccw" \| "skip"` |
| `"HOUR_HAND_BOTTOM"` | 時針出牌前（將牌庫頂張放底） | 無額外參數 |
| `"SIN_SEAL"` | 時之惡出牌前（封印本回合全場異能） | 無額外參數 |
| `"SIN_TARGETING"` | 時之惡出牌前（切換處決規則為惡之牽引） | 無額外參數 |

### 2.7 推進下一回合 / 下一局 `NEXT_ROUND`
當本回合處決結算完畢進入等待下一回合（或局末結算）時送出（伺服器亦可設定自動推進）：
```json
{ "type": "NEXT_ROUND" }
```

---

## 3. 伺服器下行封包 (Server → Client)

### 3.1 基礎連線封包
* `WELCOME`：`{ "type": "WELCOME", "playerId": "P_xxx" }`
* `JOINED`：`{ "type": "JOINED", "roomId": "TEST01", "playerId": "P_xxx", "name": "玩家A", "isHost": true }`
* `PONG`：`{ "type": "PONG", "serverTime": 1700000000000 }`
* `ERROR`：`{ "type": "ERROR", "code": "INVALID_ACTION", "message": "錯誤說明" }`

### 3.2 房間與對局狀態同步 `GAME_STATE`（視野過濾快照）
每次動作或狀態變更時，伺服器會針對**每位連線玩家單獨產生**過濾後的 `state` 快照，並附帶本次變更產生的有序 `events` 陣列：

```json
{
  "type": "GAME_STATE",
  "state": {
    "roomId": "TEST01",
    "status": "playing",
    "gameMode": "5P",
    "enableAbilities": true,
    "gameRound": 1,
    "totalGameRounds": 5,
    "roundMarker": 3,
    "phase": "minute",
    "abilityMarker": false,
    "sinTargetingMode": "default",
    "hourDeckCount": 30,
    "currentDrawnHourCards": [
      { "number": 4, "ageGroup": "幼年", "isPrecious": true },
      { "number": 9, "ageGroup": "中年", "isPrecious": false }
    ],
    "clockFace": [
      { "position": 1, "cards": [] },
      { "position": 4, "cards": [{ "number": 4, "ageGroup": "少年", "isPrecious": false, "isLocked": false }] }
    ],
    "mySeatId": "SM_1",
    "pendingAction": {
      "type": "PLAY_MINUTE_CARD",
      "waitingSeatIds": ["SM_1", "SM_2"]
    },
    "players": [
      {
        "seatId": "SM_1",
        "controllerId": "P_xxx",
        "name": "玩家A",
        "isAI": false,
        "type": "時魔",
        "roleCard": "時針",
        "gearCards": 6,
        "mana": 3,
        "score": 0,
        "currentClockPosition": 4,
        "isEjected": false,
        "hasPlayedMinute": false,
        "handCount": 5,
        "hand": [
          { "value": 12, "gear": 0.5 },
          { "value": 27, "gear": 1 },
          { "value": 38, "gear": 0.5 },
          { "value": 45, "gear": 0.5 },
          { "value": 59, "gear": 0 }
        ],
        "secondHandPendingCards": null
      },
      {
        "seatId": "SM_2",
        "controllerId": "P_yyy",
        "name": "玩家B",
        "isAI": false,
        "type": "時魔",
        "roleCard": "分針",
        "gearCards": 6,
        "mana": 3,
        "score": 0,
        "currentClockPosition": 7,
        "isEjected": false,
        "hasPlayedMinute": true,
        "handCount": 4,
        "hand": null,
        "secondHandPendingCards": null
      }
    ],
    "gameEnded": false,
    "winnerSummary": null
  },
  "events": []
}
```

#### 視野過濾安全規則（Fog of War）
1. **本人（`seatId === mySeatId`）**：收到完整的 `hand` 與 `secondHandPendingCards`。
2. **其他玩家（`seatId !== mySeatId`）**：`hand` 與 `secondHandPendingCards` 一律為 `null`，僅提供 `handCount` 與 `hasPlayedMinute`。
3. **暗拍期間**：已蓋牌玩家的點數不會出現在任何人的 `state` 中，直到全員完成蓋牌才透過 `REVEAL_BIDS` 事件公開。

---

## 4. 有序演出事件佇列 (`events`)

客戶端（Godot 4 `EffectQueue`）收到 `GAME_STATE` 封包後，應依序 `await` 播放 `events` 陣列中的每個演出事件，最後對齊最新 `state` 快照：

| `event.type` | 觸發時機 | 欄位範例 |
| :--- | :--- | :--- |
| `ROUND_STARTED` | 新回合開始並翻出小時卡 | `{ "type": "ROUND_STARTED", "gameRound": 1, "roundMarker": 3, "drawnHourCards": [...] }` |
| `PLAYER_BID_LOCKED` | 某玩家完成暗拍蓋牌（隱藏點數） | `{ "type": "PLAYER_BID_LOCKED", "seatId": "SM_2", "name": "玩家B" }` |
| `REVEAL_BIDS` | 全員蓋牌完畢，公開比牌結果 | `{ "type": "REVEAL_BIDS", "round": 3, "bids": [{ "seatId": "SM_1", "name": "玩家A", "value": 59 }, ...] }` |
| `MOVE_TOKEN` | 玩家選取小時卡或異能移動至鐘面刻度 | `{ "type": "MOVE_TOKEN", "seatId": "SM_1", "from": 4, "to": 9, "hourCard": { "number": 9, "isPrecious": false } }` |
| `ABILITY_USED` | 玩家或 AI 發動角色異能 | `{ "type": "ABILITY_USED", "seatId": "SM_2", "ability": "MINUTE_HAND_MOVE", "detail": "cw" }` |
| `UPDATE_GP_MP` | 玩家 GP 或 MP 數值發生變化 | `{ "type": "UPDATE_GP_MP", "seatId": "SM_1", "gearDelta": -1, "manaDelta": 0, "gearCards": 5, "mana": 3 }` |
| `EATEN` | 玩家 GP 歸零或條件觸發遭到吞噬 | `{ "type": "EATEN", "seatId": "SM_Y", "name": "時魔幼體" }` |
| `ROUND_ENDED` | 本局結束，進入跨局分數結算 | `{ "type": "ROUND_ENDED", "gameRound": 1, "scores": [{ "seatId": "SM_1", "score": 6 }, ...] }` |
| `GAME_OVER` | 全場對局終結 | `{ "type": "GAME_OVER", "winners": ["SM_1"], "scores": [...] }` |
