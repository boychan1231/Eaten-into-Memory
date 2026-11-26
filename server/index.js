import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8080);

// 記憶體房間表：roomId -> Room
const rooms = new Map();

function createRoom(roomId) {
  return {
    id: roomId,
    round: 1,
    players: new Map(), // playerId -> { id, name, ws, playedCard: number | null }
  };
}

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room, payload) {
  for (const player of room.players.values()) {
    sendJson(player.ws, payload);
  }
}

function serializeRoomState(room, viewerId) {
  const playersList = [];
  for (const p of room.players.values()) {
    playersList.push({
      id: p.id,
      name: p.name,
      hasPlayed: p.playedCard !== null,
      // 暗拍防作弊：未開牌前僅對本人顯示已出點數，其他玩家只看得到 hasPlayed
      playedCard: p.id === viewerId ? p.playedCard : null,
    });
  }
  return {
    roomId: room.id,
    round: room.round,
    players: playersList,
  };
}

function broadcastRoomState(room) {
  for (const p of room.players.values()) {
    sendJson(p.ws, {
      type: 'ROOM_STATE',
      state: serializeRoomState(room, p.id),
    });
  }
}

// HTTP 伺服器（提供 Google Cloud Run 健康檢查端點）
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'eaten-into-memory-server',
        activeRooms: rooms.size,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });

let nextSeq = 1;

wss.on('connection', (ws) => {
  const playerId = `P_${Date.now().toString(36)}_${nextSeq++}`;
  let currentRoom = null;

  console.log(`[WS] 玩家連線: ${playerId}`);
  sendJson(ws, { type: 'WELCOME', playerId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf-8'));
    } catch {
      sendJson(ws, { type: 'ERROR', message: '無效的 JSON 封包格式' });
      return;
    }

    switch (msg.type) {
      case 'PING': {
        sendJson(ws, { type: 'PONG', serverTime: Date.now() });
        break;
      }

      case 'JOIN_ROOM': {
        const roomId = String(msg.roomId || 'TEST01').trim().toUpperCase();
        const playerName = String(msg.name || `玩家${nextSeq}`).trim().slice(0, 20);

        // 若原本在別的房間，先離開
        if (currentRoom) {
          currentRoom.players.delete(playerId);
          if (currentRoom.players.size === 0) {
            rooms.delete(currentRoom.id);
          } else {
            broadcastRoomState(currentRoom);
          }
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, createRoom(roomId));
        }
        currentRoom = rooms.get(roomId);
        currentRoom.players.set(playerId, {
          id: playerId,
          name: playerName,
          ws,
          playedCard: null,
        });

        console.log(`[Room ${roomId}] ${playerName} (${playerId}) 加入，目前人數: ${currentRoom.players.size}`);
        sendJson(ws, { type: 'JOINED', roomId, playerId, name: playerName });
        broadcastRoomState(currentRoom);
        break;
      }

      case 'PLAY_MINUTE_CARD': {
        if (!currentRoom) {
          sendJson(ws, { type: 'ERROR', message: '尚未加入房間' });
          return;
        }
        const player = currentRoom.players.get(playerId);
        const value = Number(msg.value);
        if (!player || !Number.isInteger(value) || value < 1 || value > 60) {
          sendJson(ws, { type: 'ERROR', message: '無效的分鐘卡點數 (1~60)' });
          return;
        }
        if (player.playedCard !== null) {
          sendJson(ws, { type: 'ERROR', message: '本回合已完成暗拍出牌' });
          return;
        }

        player.playedCard = value;
        console.log(`[Room ${currentRoom.id}] ${player.name} 暗拍出牌（已隱藏）`);

        // 通知房內所有人此玩家已完成蓋牌（不洩漏點數）
        broadcastRoom(currentRoom, {
          type: 'PLAYER_BID_LOCKED',
          playerId: player.id,
          playerName: player.name,
        });
        broadcastRoomState(currentRoom);

        // 檢查是否房內所有玩家都已出牌
        const allPlayed = Array.from(currentRoom.players.values()).every(
          (p) => p.playedCard !== null
        );
        if (allPlayed) {
          const bids = Array.from(currentRoom.players.values())
            .map((p) => ({
              playerId: p.id,
              playerName: p.name,
              value: p.playedCard,
            }))
            .sort((a, b) => b.value - a.value);

          console.log(`[Room ${currentRoom.id}] 第 ${currentRoom.round} 回合開牌:`, bids);
          broadcastRoom(currentRoom, {
            type: 'REVEAL_BIDS',
            round: currentRoom.round,
            bids,
            winner: bids[0] || null,
          });

          // 推進至下一回合並重置蓋牌狀態
          currentRoom.round += 1;
          for (const p of currentRoom.players.values()) {
            p.playedCard = null;
          }
          broadcastRoomState(currentRoom);
        }
        break;
      }

      default:
        sendJson(ws, { type: 'ERROR', message: `未知指令: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    console.log(`[WS] 玩家離線: ${playerId}`);
    if (currentRoom) {
      currentRoom.players.delete(playerId);
      if (currentRoom.players.size === 0) {
        rooms.delete(currentRoom.id);
      } else {
        broadcastRoomState(currentRoom);
      }
      currentRoom = null;
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`《蝕入記憶》多人伺服器已啟動：ws://0.0.0.0:${PORT}`);
});
