// js/ui/ui_online_lobby.js — 網頁版「開始新遊戲」內嵌線上多人對戰大廳與跨平台實戰面板
(function () {
    const DEFAULT_SERVER_URL = 'wss://eaten-into-memory-server-952146793317.asia-east1.run.app';

    const STORAGE_KEYS = {
        SERVER_URL: 'eaten_online_server_url',
        PLAYER_NAME: 'eaten_online_player_name',
        ROOM_ID: 'eaten_online_room_id',
    };

    const state = {
        ws: null,
        playerId: '',
        roomId: '',
        isConnected: false,
        latestState: null,
        recentLogs: [],
    };

    function $(id) {
        return document.getElementById(id);
    }

    function normalizeWsUrl(raw) {
        let trimmed = String(raw || '').trim().replace(/\/+$/, '');
        if (!trimmed) return DEFAULT_SERVER_URL;
        if (/^https:\/\//i.test(trimmed)) return trimmed.replace(/^https:\/\//i, 'wss://');
        if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:\/\//i, 'ws://');
        if (!/^wss?:\/\//i.test(trimmed)) return 'wss://' + trimmed;
        return trimmed;
    }

    function randomRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    function setStatus(text, isError = false) {
        const el = $('online-lobby-status');
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('is-error', Boolean(isError));
    }

    function appendLog(line) {
        if (!line) return;
        state.recentLogs.unshift(line);
        if (state.recentLogs.length > 6) state.recentLogs.length = 6;
    }

    function sendJson(payload) {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send(JSON.stringify(payload));
            return true;
        }
        setStatus('尚未連線至伺服器，請先建立或加入房間。', true);
        return false;
    }

    function updateConnectionButtons() {
        const connectBtn = $('online-connect-btn');
        const disconnectBtn = $('online-disconnect-btn');
        if (connectBtn) {
            connectBtn.textContent = state.isConnected ? '切換 / 重新加入' : '建立 / 加入房間';
        }
        if (disconnectBtn) {
            disconnectBtn.classList.toggle('is-hidden', !state.isConnected);
        }
    }

    function disconnect() {
        if (state.ws) {
            try { state.ws.close(); } catch (_) {}
            state.ws = null;
        }
        state.isConnected = false;
        state.latestState = null;
        state.recentLogs = [];
        updateConnectionButtons();

        const roomPanel = $('online-room-panel');
        const matchPanel = $('online-match-panel');
        if (roomPanel) roomPanel.classList.add('is-hidden');
        if (matchPanel) matchPanel.classList.add('is-hidden');
        setStatus('已中斷連線。輸入房號後可再次加入。');
    }

    function connectAndJoin() {
        const urlInput = $('online-server-url');
        const nameInput = $('online-player-name');
        const roomInput = $('online-room-id');

        const wsUrl = normalizeWsUrl(urlInput ? urlInput.value : '');
        const playerName = String(nameInput ? nameInput.value : '').trim() || ('玩家_' + (Math.floor(Math.random() * 900) + 100));
        const roomId = String(roomInput ? roomInput.value : '').trim().toUpperCase() || 'TEST01';

        if (urlInput) urlInput.value = wsUrl;
        if (nameInput) nameInput.value = playerName;
        if (roomInput) roomInput.value = roomId;

        try {
            localStorage.setItem(STORAGE_KEYS.SERVER_URL, wsUrl);
            localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
            localStorage.setItem(STORAGE_KEYS.ROOM_ID, roomId);
        } catch (_) {}

        if (state.ws && state.ws.readyState === WebSocket.OPEN && state.ws.url === wsUrl) {
            setStatus(`正在加入房間 ${roomId} ...`);
            sendJson({ type: 'JOIN_ROOM', roomId, name: playerName });
            return;
        }

        if (state.ws) {
            try { state.ws.close(); } catch (_) {}
            state.ws = null;
        }

        setStatus(`正在連線至 ${wsUrl} ...`);
        let ws;
        try {
            ws = new WebSocket(wsUrl);
        } catch (err) {
            setStatus(`無法建立連線：${err.message || wsUrl}`, true);
            return;
        }

        state.ws = ws;
        ws.addEventListener('open', () => {
            if (state.ws !== ws) return;
            state.isConnected = true;
            updateConnectionButtons();
            setStatus(`連線成功，正在加入房間 ${roomId} ...`);
            sendJson({ type: 'JOIN_ROOM', roomId, name: playerName });
        });

        ws.addEventListener('message', (ev) => {
            if (state.ws !== ws) return;
            let msg;
            try {
                msg = JSON.parse(ev.data);
            } catch {
                return;
            }
            handleServerMessage(msg);
        });

        ws.addEventListener('error', () => {
            if (state.ws !== ws) return;
            setStatus('連線發生錯誤，請確認伺服器已啟動且網址為 ws:// 或 wss://。', true);
        });

        ws.addEventListener('close', () => {
            if (state.ws !== ws) return;
            state.isConnected = false;
            state.ws = null;
            updateConnectionButtons();
            setStatus('與伺服器連線已關閉。', false);
        });
    }

    function handleServerMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        switch (msg.type) {
            case 'WELCOME':
                state.playerId = String(msg.playerId || '');
                break;
            case 'JOINED':
                state.roomId = String(msg.roomId || '');
                setStatus(`已加入房間 ${state.roomId}（身分：${msg.name || ''}）`);
                break;
            case 'GAME_STATE':
                state.latestState = msg.state || null;
                processEvents(msg.events || []);
                renderOnlineState(state.latestState);
                break;
            case 'ERROR':
                setStatus(`伺服器訊息：${msg.message || '操作無效'}`, true);
                break;
            default:
                break;
        }
    }

    function processEvents(events) {
        if (!Array.isArray(events)) return;
        const logToMain = (line) => {
            appendLog(line);
            if (window.appLogger && typeof window.appLogger.log === 'function') {
                window.appLogger.log(`🌐 ${line}`);
            }
        };
        events.forEach((ev) => {
            if (!ev || !ev.type) return;
            if (ev.type === 'REVEAL_BIDS') {
                const winner = ev.winner ? `${ev.winner.name} (${ev.winner.value})` : '-';
                logToMain(`開牌結算：最高點 ${winner}`);
            } else if (ev.type === 'EATEN') {
                logToMain(`吞噬警報：${ev.name} 已遭到吞噬！`);
            } else if (ev.type === 'ROUND_ENDED') {
                logToMain(`第 ${ev.completedGameRound} 局結束，進入第 ${ev.nextGameRound} 局`);
            } else if (ev.type === 'GAME_OVER') {
                logToMain(`對局結束！最終勝者：${(ev.winners || []).join(', ')}`);
            }
        });
    }

    function closeMatchModals() {
        const gameModeOverlay = $('game-mode-overlay');
        if (gameModeOverlay) {
            gameModeOverlay.classList.add('hidden');
            gameModeOverlay.style.display = 'none';
            gameModeOverlay.setAttribute('aria-hidden', 'true');
        }
        const roleOverlay = $('role-choice-overlay');
        if (roleOverlay) {
            roleOverlay.classList.add('hidden');
            roleOverlay.style.display = 'none';
        }
        const introOverlay = $('modern-intro-overlay');
        if (introOverlay && introOverlay.style.display !== 'none') {
            introOverlay.classList.add('is-leaving');
            introOverlay.style.display = 'none';
        }
    }

    function adaptServerStateToLocal(gs) {
        const prevGs = window.globalGameState || null;
        const mySeatId = gs.mySeatId || state.playerId || 'SM_1';

        if (typeof window !== 'undefined') {
            window.__HUMAN_PLAYER_ID_OVERRIDE = mySeatId;
            if (typeof window.setHumanPlayerId === 'function') {
                window.setHumanPlayerId(mySeatId);
            } else {
                window.HUMAN_PLAYER_ID = mySeatId;
            }
        }

        const pending = gs.pendingAction || { type: '', waitingSeatIds: [] };
        const waitingIds = Array.isArray(pending.waitingSeatIds) ? pending.waitingSeatIds : [];
        const isMyTurn = waitingIds.includes(mySeatId);
        const gameMode = gs.gameMode || '5P';
        const isPureMode = String(gameMode).startsWith('PURE');

        const players = (Array.isArray(gs.players) ? gs.players : []).map((p) => {
            const pType = p.type || (isPureMode ? 'pure' : '時魔');
            const pRole = p.roleCard || pType;
            return {
                ...p,
                id: p.seatId || p.id,
                seatId: p.seatId || p.id,
                name: p.name || '玩家',
                type: pType,
                roleCard: pRole,
                isEjected: !!p.isEjected,
                gearCards: typeof p.gearCards === 'number' ? p.gearCards : 0,
                mana: typeof p.mana === 'number' ? p.mana : 0,
                score: typeof p.score === 'number' ? p.score : 0,
                d6Die: p.d6Die !== undefined ? p.d6Die : null,
                currentClockPosition: p.currentClockPosition !== undefined ? p.currentClockPosition : null,
                // 對手手牌／小時卡由伺服器隱藏（null），以數量建立佔位陣列，讓 UI 張數顯示正確
                hand: Array.isArray(p.hand)
                    ? p.hand.map(c => ({ value: c.value, gear: c.gear ?? '' }))
                    : Array.from({ length: Math.max(0, Number(p.handCount || 0)) }, () => ({ value: 0, gear: '', hidden: true })),
                hourCards: Array.isArray(p.hourCards)
                    ? p.hourCards
                    : Array.from({ length: Math.max(0, Number(p.hourCardsCount || 0)) }, () => ({ number: 0, isPrecious: false, hidden: true })),
                secondHandPendingCards: Array.isArray(p.secondHandPendingCards) ? p.secondHandPendingCards : [],
                playedMinuteCards: Array.isArray(p.playedMinuteCards) ? p.playedMinuteCards : [],
                discardPile: Array.isArray(p.discardPile) ? p.discardPile : []
            };
        });

        const clockFace = (Array.isArray(gs.clockFace) && gs.clockFace.length === 12)
            ? gs.clockFace
            : Array.from({ length: 12 }, (_, idx) => ({
                position: idx + 1,
                cards: [],
                lockedPreciousCount: 0
            }));

        const hourDeck = Array.isArray(gs.hourDeck)
            ? gs.hourDeck
            : new Array(Math.max(0, Number(gs.hourDeckCount || 0))).fill({});

        const gameEnded = Boolean(gs.gameEnded) || gs.status === 'ended' || gs.status === 'game_over' || pending.type === 'GAME_OVER';
        const me = players.find(p => p.id === mySeatId) || null;
        const isSecondHandFinal = pending.type === 'SECOND_HAND_FINAL' && isMyTurn;
        const minuteDiscard = (Array.isArray(gs.minuteDiscard) ? gs.minuteDiscard : [])
            .map(d => ({ ...d, playerId: d.playerId || d.seatId }));
        const isNewRoundOrMatch = !prevGs || !prevGs.isOnlineMatch || prevGs.onlineRoomId !== gs.roomId || prevGs.gameRound !== gs.gameRound;

        return {
            isOnlineMatch: true,
            onlineRoomId: gs.roomId || state.roomId,
            onlineHumanId: mySeatId,
            pendingOnlineActionType: pending.type || '',
            gameMode: gameMode,
            enableAbilities: Boolean(gs.enableAbilities),
            gameRound: gs.gameRound || 1,
            totalGameRounds: gs.totalGameRounds || (gameMode === '3P' ? 3 : (gameMode === '4P' ? 4 : 5)),
            roundMarker: gs.roundMarker || 1,
            players,
            clockFace,
            hourDeck,
            minuteDeck: Array.isArray(gs.minuteDeck) ? gs.minuteDeck : [],
            discardPile: Array.isArray(gs.discardPile) ? gs.discardPile : [],
            minuteDiscard,
            abilityMarker: gs.abilityMarker ?? null,
            phase: gs.phase || '',
            secondHandPendingCards: me ? me.secondHandPendingCards : [],
            currentDrawnHourCards: Array.isArray(gs.currentDrawnHourCards) ? gs.currentDrawnHourCards : [],
            playedMinuteCardsHistory: Array.isArray(gs.playedMinuteCardsHistory) ? gs.playedMinuteCardsHistory : [],
            currentRoundAIChoices: (pending.type === 'PLAY_MINUTE_CARD' && isMyTurn) ? {} : null,
            waitingHourChoice: pending.type === 'PICK_HOUR_CARD',
            waitingHourChoicePlayerId: isMyTurn ? mySeatId : (waitingIds[0] || ''),
            hourPickOrder: pending.type === 'PICK_HOUR_CARD' ? waitingIds : [],
            waitingMinuteHandChoice: pending.type === 'MINUTE_HAND_MOVE' && isMyTurn,
            waitingAbilityChoice: pending.type === 'MINUTE_HAND_MOVE' && isMyTurn,
            waitingAbilityChoicePlayerId: (pending.type === 'MINUTE_HAND_MOVE' && isMyTurn) ? mySeatId : '',
            waitingSecondHandFinalChoice: isSecondHandFinal,
            waitingSecondHandFinalChoicePlayerId: isSecondHandFinal ? mySeatId : '',
            waitingSinPreRoundDiscard: pending.type === 'SIN_PRE_ROUND_DISCARD' && isMyTurn,
            waitingSinPreRoundDiscardPlayerId: (pending.type === 'SIN_PRE_ROUND_DISCARD' && isMyTurn) ? mySeatId : '',
            sinPreRoundDiscardOptions: (pending.type === 'SIN_PRE_ROUND_DISCARD' && isMyTurn) ? (pending.options || null) : null,
            isPlayingMinuteClash: false,
            sinTargetingMode: gs.sinTargetingMode || 'default',
            gameEnded,
            hasShownGameOverPanel: gameEnded && prevGs ? !!prevGs.hasShownGameOverPanel : false,
            needsHandDealAnimation: isNewRoundOrMatch
        };
    }

    function renderOnlineState(gs) {
        const roomPanel = $('online-room-panel');
        const matchPanel = $('online-match-panel');
        if (!gs) return;

        if (gs.status === 'lobby') {
            if (roomPanel) roomPanel.classList.remove('is-hidden');
            if (matchPanel) matchPanel.classList.add('is-hidden');
            renderLobbyMembers(gs);
            return;
        }

        // 開局後自動關閉「開始新遊戲」彈窗，並將伺服器狀態同步渲染到主鐘面與主遊戲操作介面
        closeMatchModals();
        if (roomPanel) roomPanel.classList.add('is-hidden');
        if (matchPanel) matchPanel.classList.add('is-hidden');

        const adapted = adaptServerStateToLocal(gs);
        if (typeof window !== 'undefined') {
            // 同步房間異能開關，讓異能面板與單人模式行為一致
            if (window.GAME_CONFIG) window.GAME_CONFIG.enableAbilities = Boolean(gs.enableAbilities);
            window.globalGameState = adapted;
        }
        if (typeof globalGameState !== 'undefined') {
            globalGameState = adapted;
        }
        if (typeof window.updateUI === 'function') {
            window.updateUI(adapted);
        } else if (typeof updateUI === 'function') {
            updateUI(adapted);
        }
    }

    function renderLobbyMembers(gs) {
        const listEl = $('online-lobby-members');
        const titleEl = $('online-room-title');
        const players = Array.isArray(gs.players) ? gs.players : [];

        if (titleEl) {
            titleEl.textContent = `房間 ${gs.roomId} — 目前 ${players.length} 人在線（缺人自動補 AI）`;
        }
        if (!listEl) return;

        listEl.innerHTML = '';
        players.forEach((p) => {
            const item = document.createElement('li');
            item.className = 'online-member-item';
            const tags = [];
            if (p.id === state.playerId) tags.push('你');
            if (p.isHost) tags.push('房主');
            item.textContent = tags.length > 0 ? `${p.name} [${tags.join(' / ')}]` : p.name;
            listEl.appendChild(item);
        });
    }

    function renderActiveMatch(gs) {
        const summaryEl = $('online-match-summary');
        const playersEl = $('online-match-players');
        const actionsEl = $('online-match-actions');
        const handEl = $('online-match-hand');
        const logEl = $('online-match-logs');

        const mySeatId = gs.mySeatId;
        const pending = gs.pendingAction || { type: '', waitingSeatIds: [] };
        const isMyTurn = Array.isArray(pending.waitingSeatIds) && pending.waitingSeatIds.includes(mySeatId);

        if (summaryEl) {
            summaryEl.textContent = `房間 ${gs.roomId} | ${gs.gameMode} | 第 ${gs.gameRound}/${gs.totalGameRounds} 局 回合 ${gs.roundMarker}`;
        }

        if (playersEl) {
            playersEl.innerHTML = '';
            (gs.players || []).forEach((p) => {
                const card = document.createElement('div');
                card.className = 'online-player-row';
                if (p.seatId === mySeatId) card.classList.add('is-me');
                if (p.isEjected) card.classList.add('is-ejected');

                const role = p.roleCard || p.type || '';
                const aiMark = p.isAI ? ' [AI]' : (p.seatId === mySeatId ? ' (你)' : '');
                const posText = p.currentClockPosition == null ? '-' : String(p.currentClockPosition);
                const statusText = p.isEjected
                    ? `已被吞噬 | 總分:${p.score}`
                    : `GP:${p.gearCards} MP:${p.mana} 格:${posText} 分:${p.score}${p.hasPlayedMinute ? ' [已蓋牌]' : ''}`;

                card.textContent = `${p.name}${aiMark} (${role}) — ${statusText}`;
                playersEl.appendChild(card);
            });
        }

        if (actionsEl) {
            actionsEl.innerHTML = '';
            const drawn = Array.isArray(gs.currentDrawnHourCards) ? gs.currentDrawnHourCards : [];
            if (drawn.length > 0) {
                const heading = document.createElement('div');
                heading.className = 'online-sub-label';
                heading.textContent = (pending.type === 'PICK_HOUR_CARD' && isMyTurn)
                    ? '輪到你挑選小時卡（請點擊）：'
                    : '本回合翻出小時卡：';
                actionsEl.appendChild(heading);

                const row = document.createElement('div');
                row.className = 'online-btn-row';
                drawn.forEach((c, idx) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'selection-btn';
                    btn.textContent = `刻度 [${c.number}] ${c.ageGroup || ''}${c.isPrecious ? ' ★' : ''}`;
                    btn.disabled = !(pending.type === 'PICK_HOUR_CARD' && isMyTurn);
                    btn.addEventListener('click', () => {
                        sendJson({ type: 'PICK_HOUR_CARD', cardIndex: idx });
                    });
                    row.appendChild(btn);
                });
                actionsEl.appendChild(row);
            }

            if (pending.type === 'MINUTE_HAND_MOVE' && isMyTurn) {
                const row = document.createElement('div');
                row.className = 'online-btn-row';
                [['順時針 +1 格', 'cw'], ['逆時針 -1 格', 'ccw'], ['跳過', 'skip']].forEach(([label, dir]) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'selection-btn';
                    btn.textContent = label;
                    btn.addEventListener('click', () => {
                        sendJson({ type: 'USE_ABILITY', ability: 'MINUTE_HAND_MOVE', choice: dir });
                    });
                    row.appendChild(btn);
                });
                actionsEl.appendChild(row);
            } else if (pending.type === 'NEXT_ROUND') {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'primary';
                btn.textContent = '推進下一回合';
                btn.addEventListener('click', () => sendJson({ type: 'NEXT_ROUND' }));
                actionsEl.appendChild(btn);
            } else if (pending.type === 'GAME_OVER') {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'primary';
                btn.textContent = '再來一局';
                btn.addEventListener('click', () => {
                    sendJson({ type: 'START_GAME', mode: gs.gameMode || '5P', enableAbilities: Boolean(gs.enableAbilities) });
                });
                actionsEl.appendChild(btn);
            }
        }

        if (handEl) {
            handEl.innerHTML = '';
            const me = (gs.players || []).find((p) => p.seatId === mySeatId);
            const myHand = me && Array.isArray(me.hand) ? me.hand.slice().sort((a, b) => a.value - b.value) : [];
            const canPlayMinute = pending.type === 'PLAY_MINUTE_CARD' && isMyTurn;

            const title = document.createElement('div');
            title.className = 'online-sub-label';
            title.textContent = canPlayMinute
                ? '你的分鐘卡手牌（點擊出牌進行暗拍）：'
                : `你的分鐘卡手牌（共 ${myHand.length} 張，目前等待其他步驟）：`;
            handEl.appendChild(title);

            const cardsRow = document.createElement('div');
            cardsRow.className = 'online-hand-grid';
            myHand.forEach((c) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'online-minute-btn';
                btn.textContent = String(c.value);
                btn.disabled = !canPlayMinute;
                btn.addEventListener('click', () => {
                    sendJson({ type: 'PLAY_MINUTE_CARD', value: c.value });
                });
                cardsRow.appendChild(btn);
            });
            handEl.appendChild(cardsRow);
        }

        if (logEl) {
            logEl.textContent = state.recentLogs.join('  |  ');
        }
    }

    function bindOnlineLobbyUI() {
        const urlInput = $('online-server-url');
        const nameInput = $('online-player-name');
        const roomInput = $('online-room-id');
        const randomBtn = $('online-random-room-btn');
        const connectBtn = $('online-connect-btn');
        const disconnectBtn = $('online-disconnect-btn');

        if (!connectBtn) return;

        try {
            const savedUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
            const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
            const savedRoom = localStorage.getItem(STORAGE_KEYS.ROOM_ID);
            if (urlInput && savedUrl && savedUrl !== 'ws://127.0.0.1:8080') {
                urlInput.value = normalizeWsUrl(savedUrl);
            }
            if (nameInput && savedName) nameInput.value = savedName;
            if (roomInput && savedRoom) roomInput.value = savedRoom;
        } catch (_) {}

        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = '玩家_' + (Math.floor(Math.random() * 900) + 100);
        }

        if (randomBtn && roomInput) {
            randomBtn.addEventListener('click', () => {
                roomInput.value = randomRoomCode();
            });
        }

        connectBtn.addEventListener('click', connectAndJoin);
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', disconnect);
        }

        document.querySelectorAll('[data-online-start-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-online-start-mode') || '5P';
                const enableAbilities = !mode.startsWith('PURE');
                sendJson({ type: 'START_GAME', mode, enableAbilities });
            });
        });

        updateConnectionButtons();
    }

    window.OnlineLobbyClient = {
        connectAndJoin,
        disconnect,
        sendAction: sendJson,
        getState: () => state.latestState,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindOnlineLobbyUI);
    } else {
        bindOnlineLobbyUI();
    }
})();
