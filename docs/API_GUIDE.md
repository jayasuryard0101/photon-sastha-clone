# Multiplayer Backend API Guide

Backend: Node.js + Express + Socket.IO + MongoDB (see DB_CONNECTION_STRING in .env). Players and matches are persisted so data survives restarts.

## Base URLs
- REST base: https://photon-sastha-clone.onrender.com/api
- Health: https://photon-sastha-clone.onrender.com/health
- WebSocket endpoint: ws://photon-sastha-clone.onrender.com (Socket.IO)

## REST Endpoints
- GET /health — liveness check.
- GET /api/state — { players: { [socketId]: {...} }, matches: [ { gameId, players, room, status } ], isGameActive } from MongoDB.
- GET /api/players — { players: [...] } from MongoDB.
- GET /api/matches — { games: [ { gameId, players, room, status } ] }.
- GET /api/matches/:gameId — single match document.
- DELETE /api/matches/:gameId — marks a match as ended.
- POST /api/queue/join — body { socketId }; enqueues a connected socket.
- POST /api/queue/leave — body { socketId }; removes from queue.

## Socket.IO Events
Client → Server
- player:join — { username?, position?, score?, room? } → player persisted.
- player:move — { x, y } → position persisted.
- queue:join / queue:leave — matchmaking queue.

Server → Client
- game:state — current persisted state snapshot.
- player:joined — new player payload.
- player:moved — { id, position }.
- player:disconnected — <socketId>.
- match:found — { gameId, players, room }, also persisted.

## Curl Samples
```
curl http://localhost:2000/api/state
curl http://localhost:2000/api/matches
curl http://localhost:2000/api/matches/yourGameId
curl -X DELETE http://localhost:2000/api/matches/yourGameId
```

## Notes
- All players and matches are stored in MongoDB for persistence; server restarts keep historical data.
- Ensure MongoDB is running locally or update DB_CONNECTION_STRING accordingly.
