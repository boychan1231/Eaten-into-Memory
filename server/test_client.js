import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://127.0.0.1:8080';

function connectPlayer(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    const client = {
      ws,
      name,
      playerId: null,
      latestState: null,
      allEvents: [],
      errors: [],
    };
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString('utf-8'));
      if (msg.type === 'WELCOME') client.playerId = msg.playerId;
      if (msg.type === 'GAME_STATE') {
        client.latestState = msg.state;
        if (Array.isArray(msg.events)) client.allEvents.push(...msg.events);
      }
      if (msg.type === 'ERROR') client.errors.push(msg);
    });
    ws.on('open', () => resolve(client));
    ws.on('error', reject);
  });
}

function send(client, payload) {
  client.ws.send(JSON.stringify(payload));
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(predicate, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await wait(15);
  }
  throw new Error('等待伺服器狀態超時');
}

async function runFullGameTest(mode, roomId, seed) {
  const p1 = await connectPlayer('玩家A');
  const p2 = await connectPlayer('玩家B');

  send(p1, { type: 'JOIN_ROOM', roomId, name: '玩家A' });
  await waitFor(() => p1.latestState?.status === 'lobby' && p1.latestState.players.length === 1);
  send(p2, { type: 'JOIN_ROOM', roomId, name: '玩家B' });
  await waitFor(() => p2.latestState?.status === 'lobby' && p2.latestState.players.length === 2);

  // 非房主不得開局
  send(p2, { type: 'START_GAME', mode, enableAbilities: !mode.startsWith('PURE'), seed });
  await waitFor(() => p2.errors.some((e) => e.code === 'NOT_HOST'));
  p2.errors.length = 0;

  send(p1, { type: 'START_GAME', mode, enableAbilities: !mode.startsWith('PURE'), seed });
  await waitFor(() => p1.latestState?.status === 'playing' && p2.latestState?.status === 'playing');

  // 對局進行中不得重開
  send(p1, { type: 'START_GAME', mode, enableAbilities: !mode.startsWith('PURE'), seed });
  await waitFor(() => p1.errors.some((e) => e.code === 'GAME_IN_PROGRESS'));
  p1.errors.length = 0;

  // 1. 驗證視野過濾（Fog of War）：看得到自己手牌，絕對看不到對手手牌
  const p1Me = p1.latestState.players.find((p) => p.seatId === p1.latestState.mySeatId);
  const p1Other = p1.latestState.players.find((p) => p.seatId === p2.latestState.mySeatId);
  assert(Array.isArray(p1Me.hand) && p1Me.hand.length > 0, `${mode} 玩家A應看得到自己的分鐘卡手牌`);
  assert.equal(p1Other.hand, null, `${mode} 視野過濾失敗：玩家A不應看到玩家B手牌`);

  // 2. 驗證暗拍點數隱藏：玩家A先出牌時，玩家B看玩家A的 hasPlayedMinute=true 但看不到點數且尚未開牌
  const firstCardVal = p1Me.hand[0].value;
  send(p1, { type: 'PLAY_MINUTE_CARD', value: firstCardVal });
  await waitFor(() => {
    const aInB = p2.latestState.players.find((p) => p.seatId === p1.latestState.mySeatId);
    return aInB?.hasPlayedMinute === true;
  });
  assert.equal(
    p2.allEvents.some((e) => e.type === 'REVEAL_BIDS'),
    false,
    `${mode} 玩家B尚未出牌前不應收到開牌事件`
  );

  // 3. 自動推進跑完完整一場對局（含暗拍、選小時卡、異能、GP/MP 變化與跨局結算）
  let steps = 0;
  const maxSteps = 500;
  while (!p1.latestState.gameEnded && steps < maxSteps) {
    steps++;
    const st = p1.latestState;
    const action = st.pendingAction;

    if (action.type === 'PLAY_MINUTE_CARD') {
      for (const client of [p1, p2]) {
        const mySeat = client.latestState.mySeatId;
        if (action.waitingSeatIds.includes(mySeat)) {
          const me = client.latestState.players.find((p) => p.seatId === mySeat);
          if (me && Array.isArray(me.hand) && me.hand.length > 0) {
            send(client, { type: 'PLAY_MINUTE_CARD', value: me.hand[0].value });
          }
        }
      }
    } else if (action.type === 'PICK_HOUR_CARD') {
      const targetSeat = action.waitingSeatIds[0];
      const actor = p1.latestState.mySeatId === targetSeat ? p1 : p2;
      send(actor, { type: 'PICK_HOUR_CARD', cardIndex: 0 });
    } else if (action.type === 'MINUTE_HAND_MOVE') {
      const targetSeat = action.waitingSeatIds[0];
      const actor = p1.latestState.mySeatId === targetSeat ? p1 : p2;
      send(actor, { type: 'USE_ABILITY', ability: 'MINUTE_HAND_MOVE', choice: 'skip' });
    } else if (action.type === 'SECOND_HAND_FINAL') {
      const targetSeat = action.waitingSeatIds[0];
      const actor = p1.latestState.mySeatId === targetSeat ? p1 : p2;
      const me = actor.latestState.players.find((p) => p.seatId === targetSeat);
      const val = me?.secondHandPendingCards?.[0]?.value;
      send(actor, { type: 'USE_ABILITY', ability: 'SECOND_HAND_FINAL', value: val });
    } else if (action.type === 'NEXT_ROUND') {
      send(p1, { type: 'NEXT_ROUND' });
    }

    await wait(12);
  }

  assert.equal(p1.latestState.gameEnded, true, `${mode} 超過 ${maxSteps} 步仍未完成整場對局`);
  assert.equal(p1.errors.length, 0, `${mode} 玩家A不應收到錯誤封包: ${JSON.stringify(p1.errors)}`);
  assert.equal(p2.errors.length, 0, `${mode} 玩家B不應收到錯誤封包: ${JSON.stringify(p2.errors)}`);

  const eventTypes = new Set(p1.allEvents.map((e) => e.type));
  assert(eventTypes.has('REVEAL_BIDS'), `${mode} 應產生 REVEAL_BIDS 事件`);
  assert(eventTypes.has('MOVE_TOKEN'), `${mode} 應產生 MOVE_TOKEN 事件`);
  assert(eventTypes.has('UPDATE_GP_MP'), `${mode} 應產生 UPDATE_GP_MP 事件`);
  assert(eventTypes.has('GAME_OVER'), `${mode} 應產生 GAME_OVER 事件`);

  console.log(
    `✅ [${mode}] 雙人類 + 補AI 完整對局驗證通過！（共 ${steps} 步，涵蓋事件：${Array.from(eventTypes).join(', ')}）`
  );

  p1.ws.close();
  p2.ws.close();
}

async function run() {
  await runFullGameTest('5P', 'FULL5P', 20261127);
  await runFullGameTest('4P', 'FULL4P', 20261128);
  await runFullGameTest('3P', 'FULL3P', 20261129);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ 驗證失敗:', err);
  process.exit(1);
});
