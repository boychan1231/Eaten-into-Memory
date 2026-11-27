import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { HeadlessGameEngine, normalizeGameMode } from './game_engine.js';

const PORT = Number(process.env.PORT || 8080);

// 記憶體房間表：roomId -> Room
const rooms = new Map();

function createRoom(roomId, hostId) {
  return {
    id: roomId,
    hostId,
    members: new Map(), // playerId -> { id, name, ws }
    engine: null,       // HeadlessGameEngine | null
  };
}

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastLobbyState(room) {
  const membersList = Array.from(room.members.values()).map((m) => ({
    id: m.id,
    name: m.name,
    isHost: m.id === room.hostId,
  }));
  const payload = {
    type: 'GAME_STATE',
    state: {
      roomId: room.id,
      status: 'lobby',
      hostId: room.hostId,
      players: membersList,
    },
    events: [],
  };
  for (const m of room.members.values()) {
    sendJson(m.ws, payload);
  }
}

function broadcastGameState(room, events = []) {
  if (!room.engine) {
    broadcastLobbyState(room);
    return;
  }
  for (const m of room.members.values()) {
    const filteredState = room.engine.getStateForController(room.id, m.id);
    sendJson(m.ws, {
      type: 'GAME_STATE',
      state: filteredState,
      events,
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
      sendJson(ws, { type: 'ERROR', code: 'BAD_JSON', message: '無效的 JSON 封包格式' });
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

        if (currentRoom) {
          currentRoom.members.delete(playerId);
          if (currentRoom.engine) {
            currentRoom.engine.convertControllerToAI(playerId);
            const evts = currentRoom.engine.consumeEvents();
            broadcastGameState(currentRoom, evts);
          } else if (currentRoom.members.size > 0) {
            broadcastLobbyState(currentRoom);
          }
          if (currentRoom.members.size === 0) {
            rooms.delete(currentRoom.id);
          }
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, createRoom(roomId, playerId));
        }
        currentRoom = rooms.get(roomId);

        if (currentRoom.engine && !currentRoom.engine.gs.gameEnded) {
          sendJson(ws, { type: 'ERROR', code: 'ROOM_IN_PROGRESS', message: '此房間對局進行中，請建立或加入其他房號' });
          currentRoom = null;
          return;
        }

        currentRoom.members.set(playerId, { id: playerId, name: playerName, ws });
        if (!currentRoom.members.has(currentRoom.hostId)) {
          currentRoom.hostId = playerId;
        }

        console.log(`[Room ${roomId}] ${playerName} (${playerId}) 加入大廳，人數: ${currentRoom.members.size}`);
        sendJson(ws, {
          type: 'JOINED',
          roomId,
          playerId,
          name: playerName,
          isHost: currentRoom.hostId === playerId,
        });
        broadcastLobbyState(currentRoom);
        break;
      }

      case 'LEAVE_ROOM': {
        if (currentRoom) {
          currentRoom.members.delete(playerId);
          if (currentRoom.members.size === 0) {
            rooms.delete(currentRoom.id);
          } else {
            if (currentRoom.hostId === playerId) {
              currentRoom.hostId = currentRoom.members.keys().next().value;
            }
            if (currentRoom.engine) {
              currentRoom.engine.convertControllerToAI(playerId);
              const evts = currentRoom.engine.consumeEvents();
              broadcastGameState(currentRoom, evts);
            } else {
              broadcastLobbyState(currentRoom);
            }
          }
          currentRoom = null;
        }
        sendJson(ws, { type: 'LEFT_ROOM' });
        break;
      }

      case 'START_GAME': {
        if (!currentRoom) {
          sendJson(ws, { type: 'ERROR', code: 'NO_ROOM', message: '尚未加入房間' });
          return;
        }
        if (currentRoom.hostId !== playerId) {
          sendJson(ws, { type: 'ERROR', code: 'NOT_HOST', message: '只有房主可以開始對局' });
          return;
        }
        if (currentRoom.engine && !currentRoom.engine.gs.gameEnded) {
          sendJson(ws, { type: 'ERROR', code: 'GAME_IN_PROGRESS', message: '對局進行中，無法重新開始' });
          return;
        }
        const mode = normalizeGameMode(msg.mode || '5P');
        const enableAbilities = msg.enableAbilities !== undefined ? Boolean(msg.enableAbilities) : true;
        const aiDifficulty = msg.aiDifficulty === 'easy' ? 'easy' : 'normal';
        const seed = Number.isInteger(msg.seed) ? msg.seed : null;

        const humanPlayers = Array.from(currentRoom.members.values()).map((m) => ({
          controllerId: m.id,
          name: m.name,
        }));

        try {
          currentRoom.engine = new HeadlessGameEngine({
            mode,
            enableAbilities,
            aiDifficulty,
            seed,
            humanPlayers,
          });
          const events = currentRoom.engine.consumeEvents();
          console.log(`[Room ${currentRoom.id}] 開始對局 mode=${mode} 人類=${humanPlayers.length} 補AI=${currentRoom.engine.gs.players.length - humanPlayers.length}`);
          broadcastGameState(currentRoom, events);
        } catch (err) {
          console.error('[START_GAME] 初始化失敗:', err);
          sendJson(ws, { type: 'ERROR', code: 'START_FAILED', message: err.message });
        }
        break;
      }

      case 'PLAY_MINUTE_CARD': {
        if (!currentRoom || !currentRoom.engine) {
          sendJson(ws, { type: 'ERROR', code: 'NOT_PLAYING', message: '房間尚未開始對局，請先送出 START_GAME' });
          return;
        }
        const res = currentRoom.engine.playMinuteCard(playerId, msg);
        if (!res.ok) {
          sendJson(ws, { type: 'ERROR', code: 'INVALID_ACTION', message: res.message });
          return;
        }
        const events = currentRoom.engine.consumeEvents();
        broadcastGameState(currentRoom, events);
        break;
      }

      case 'PICK_HOUR_CARD': {
        if (!currentRoom || !currentRoom.engine) {
          sendJson(ws, { type: 'ERROR', code: 'NOT_PLAYING', message: '房間尚未開始對局' });
          return;
        }
        const res = currentRoom.engine.pickHourCard(playerId, msg.cardIndex);
        if (!res.ok) {
          sendJson(ws, { type: 'ERROR', code: 'INVALID_ACTION', message: res.message });
          return;
        }
        const events = currentRoom.engine.consumeEvents();
        broadcastGameState(currentRoom, events);
        break;
      }

      case 'USE_ABILITY': {
        if (!currentRoom || !currentRoom.engine) {
          sendJson(ws, { type: 'ERROR', code: 'NOT_PLAYING', message: '房間尚未開始對局' });
          return;
        }
        const res = currentRoom.engine.useAbility(playerId, msg);
        if (!res.ok) {
          sendJson(ws, { type: 'ERROR', code: 'INVALID_ACTION', message: res.message });
          return;
        }
        const events = currentRoom.engine.consumeEvents();
        broadcastGameState(currentRoom, events);
        break;
      }

      case 'NEXT_ROUND': {
        if (!currentRoom || !currentRoom.engine) {
          sendJson(ws, { type: 'ERROR', code: 'NOT_PLAYING', message: '房間尚未開始對局' });
          return;
        }
        const res = currentRoom.engine.advanceNextRound();
        if (!res.ok) {
          sendJson(ws, { type: 'ERROR', code: 'INVALID_ACTION', message: res.message });
          return;
        }
        const events = currentRoom.engine.consumeEvents();
        broadcastGameState(currentRoom, events);
        break;
      }

      default:
        sendJson(ws, { type: 'ERROR', code: 'UNKNOWN_TYPE', message: `未知指令: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    console.log(`[WS] 玩家離線: ${playerId}`);
    if (!currentRoom) return;

    currentRoom.members.delete(playerId);
    if (currentRoom.members.size === 0) {
      rooms.delete(currentRoom.id);
    } else {
      if (currentRoom.hostId === playerId) {
        currentRoom.hostId = currentRoom.members.keys().next().value;
      }
      if (currentRoom.engine) {
        currentRoom.engine.convertControllerToAI(playerId);
        const events = currentRoom.engine.consumeEvents();
        broadcastGameState(currentRoom, events);
      } else {
        broadcastLobbyState(currentRoom);
      }
    }
    currentRoom = null;
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`《蝕入記憶》權威多人伺服器已啟動：ws://0.0.0.0:${PORT}`);
});
