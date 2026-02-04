# Multiplayer Backend API Guide

Backend stack: Node.js + Express + Socket.IO. This guide covers REST endpoints (for orchestration/inspection) and Socket.IO events (for real-time gameplay/matchmaking).

## Base URLs
- REST base: `http://localhost:2000/api` (PORT from `.env`)
- Health: `http://localhost:2000/health`
- WebSocket endpoint: `ws://localhost:2000` (Socket.IO)

## REST Endpoints
- `GET /health`
  - Simple liveness check. Returns `200 ok` text.

- `GET /api/state`
  - Returns current in-memory game state.
  - Response: `{ players: { [socketId]: { id, username, position, score, room } }, isGameActive: boolean }`

- `GET /api/players`
  - Returns an array of connected players.
  - Response: `{ players: [ { id, username, position, score, room }, ... ] }`

- `GET /api/matches`
  - Lists active games produced by matchmaking.
  - Response: `{ games: [ { gameId, players: [socketId, socketId], room } ] }`

- `POST /api/queue/join`
  - Body: `{ "socketId": "<socket-id-from-io>" }`
  - Joins matchmaking queue for an already-connected socket and triggers matching.
  - Errors: `400` if missing socketId, `404` if socket not connected.

- `POST /api/queue/leave`
  - Body: `{ "socketId": "<socket-id-from-io>" }`
  - Removes the socket from matchmaking queue.

## Socket.IO Events
### Client → Server
- `player:join` — payload: `{ username?: string, position?: { x, y }, score?: number }`
  - Registers the player and broadcasts `player:joined` to others.
- `player:move` — payload: `{ x, y }`
  - Updates position; broadcasts `player:moved` to room or all.
- `queue:join` — no payload
  - Enqueues socket for matchmaking.
- `queue:leave` — no payload
  - Removes from queue.

### Server → Client
- `game:state` — payload: full game state snapshot (sent on join)
- `player:joined` — payload: player object for newly joined player
- `player:moved` — payload: `{ id, position }`
- `player:disconnected` — payload: `<socketId>`
- `match:found` — payload: `{ gameId, players: [socketId...], room }

## Example Flows
1) Connect via Socket.IO, emit `player:join` to register.
2) Emit `queue:join` (or call `POST /api/queue/join` with your socketId) to enter matchmaking.
3) On `match:found`, join the announced room on the client if needed; gameplay can proceed using `player:move` scoped to that room.

## Curl Samples
```sh
# Health
curl http://localhost:2000/health

# State snapshot
curl http://localhost:2000/api/state

# Players
curl http://localhost:2000/api/players

# Matches
curl http://localhost:2000/api/matches

# Join queue (replace with your Socket.IO socket id)
curl -X POST http://localhost:2000/api/queue/join \
  -H 'Content-Type: application/json' \
  -d '{"socketId":"YOUR_SOCKET_ID"}'
```

## Notes
- Game state and matchmaking are in-memory; use a single server instance or add a shared store (e.g., Redis) for scaling.
- Socket IDs come from the active Socket.IO connection; the REST queue endpoints validate the socket exists.
