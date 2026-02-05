# Multiplayer Flow Overview

This doc shows how the backend, sockets, REST, and database work together. It has two parts: a simple story and a technical walkthrough.

## Plain-English Story (for everyone)
- You open the game; it plugs into the live server (WebSocket).
- You say “I’m here” with your name and position.
- You ask the host to find you a partner; you wait until the host seats you at a table.
- When seated, both players start sending their moves; the host repeats each move so both see the same thing.
- If your tab closes, the host tells the other player you left. If you come back, you say hello again and get re-seated.
- The host keeps a notebook (MongoDB) so even if the host restarts, the notebook has the players and matches.

## Technical Flow (developer view)
1) **Connect socket**: client opens Socket.IO to `ws://photon-sastha-clone.onrender.com`.
2) **Identify**: emit `player:join` with `{ username, position, score? }`; server persists player tied to `socket.id`.
3) **Queue for match**: POST `https://photon-sastha-clone.onrender.com/api/queue/join` with `{ socketId: <socket.id> }`.
4) **Matchmaking**: server pairs queued sockets; emits `match:found` with `{ gameId, players, room }`; persists match in MongoDB.
5) **Gameplay loop**:
   - Client emits `player:move` `{ x, y }` on movement.
   - Server validates/persists position, broadcasts `player:moved` to the room.
   - Server may emit `game:state` snapshots; clients can cold-start with `GET /api/state`.
6) **Disconnects**: server emits `player:disconnected` for that socket; clients should remove it locally. On reconnect, redo steps 1–3.
7) **Cleanup**: optional `DELETE /api/matches/:gameId` marks a match ended.

## Minimal Client Checklist
- Socket connected? If not, no real-time updates.
- Joined? Emit `player:join` right after connect.
- Queued? Call `/api/queue/join` with the current `socket.id`.
- Handling `match:found`? Set up room/game state when received.
- Sending moves? Emit `player:move` on player input.
- Listening? Handle `player:moved`, `game:state`, `player:disconnected`.
- Recovery? On reconnect, repeat join + queue.

## Example Sequence (condensed)
- Connect → `player:join` → POST `/queue/join` → wait for `match:found` → start rendering → emit `player:move` on input → process `player:moved`/`game:state` → on drop, handle `player:disconnected` → on reconnect, rejoin and requque.
