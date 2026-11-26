import { WebSocket } from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://127.0.0.1:8080';

function connectPlayer(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    const messages = [];
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString('utf-8')));
    });
    ws.on('open', () => resolve({ ws, messages, name }));
    ws.on('error', reject);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const p1 = await connectPlayer('玩家A');
  const p2 = await connectPlayer('玩家B');

  p1.ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'VERIFY', name: '玩家A' }));
  p2.ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'VERIFY', name: '玩家B' }));
  await wait(150);

  // 玩家A 先暗拍出 45
  p1.ws.send(JSON.stringify({ type: 'PLAY_MINUTE_CARD', value: 45 }));
  await wait(150);

  // 驗證：玩家B 收到的 ROOM_STATE 中，玩家A 的點數必須為 null（防作弊隱藏）
  const p2States = p2.messages.filter((m) => m.type === 'ROOM_STATE');
  const latestP2State = p2States[p2States.length - 1]?.state;
  const p1ViewInP2 = latestP2State?.players?.find((p) => p.name === '玩家A');
  if (!p1ViewInP2 || p1ViewInP2.hasPlayed !== true || p1ViewInP2.playedCard !== null) {
    throw new Error(`暗拍隱藏驗證失敗：${JSON.stringify(p1ViewInP2)}`);
  }

  // 玩家B 出 59，觸發統一開牌
  p2.ws.send(JSON.stringify({ type: 'PLAY_MINUTE_CARD', value: 59 }));
  await wait(150);

  const reveal = p1.messages.find((m) => m.type === 'REVEAL_BIDS');
  if (!reveal || reveal.winner?.playerName !== '玩家B' || reveal.winner?.value !== 59) {
    throw new Error(`開牌結算驗證失敗：${JSON.stringify(reveal)}`);
  }

  console.log('✅ WebSocket 暗拍隱藏與多人開牌驗證通過！', JSON.stringify(reveal));
  p1.ws.close();
  p2.ws.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ 驗證失敗:', err);
  process.exit(1);
});
