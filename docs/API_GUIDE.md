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
- POST /api/queue/join — body { socketId }; creates a lobby (room) with caller as host/master and returns { lobby }.
- POST /api/queue/leave — body { socketId }; removes from queue (legacy; with lobbies you mostly use lobby events).
- GET /api/lobbies — lists active lobbies { lobbies: [ { gameId, room, hostId, players, status } ] }.

## Socket.IO Events
Client → Server
- player:join — { username?, position?, score?, room? } → player persisted.
- player:move — { x, y } → position persisted.
- queue:join — create a lobby with yourself as host/master.
- lobby:join — { gameId } join an existing lobby.
- queue:leave — optional legacy queue removal.

Server → Client
- game:state — current persisted state snapshot.
- player:joined — player roster payload for room/lobby.
- player:moved — { id, position }.
- player:disconnected — <socketId>.
- match:found — { gameId, players, room, masterClientId }, persisted; broadcast to room.
- match:joined — { gameId, players, room, masterClientId }; sent directly to each socket.
- master:changed — { gameId, masterClientId } when host leaves and is reassigned.

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

## Frontend Integration
- Connecting to WebSocket: use Socket.IO client, e.g. `const socket = io('ws://photon-sastha-clone.onrender.com');`.
- Join flow: after connecting, emit `player:join` with `{ username, position: { x, y }, score }`. Listen for `player:joined` to confirm and `match:found` to know the room/gameId.
- Movement updates: emit `player:move` with `{ x, y }`; listen for `player:moved` to update other players and `game:state` for resyncs.
- Queue handling: call REST `POST /api/queue/join` or `queue:leave` with `{ socketId: socket.id }` after the socket is connected; also listen for `match:found` to auto-join a room.
- State hydration: on page load, fetch `GET /api/state` to pre-populate players/matches; then rely on socket events for live updates.
- Disconnections: handle `player:disconnected` to remove players locally; consider re-emitting `player:join` on reconnection to repersist state.
- Sample setup (browser):
```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
	const REST_BASE = 'https://photon-sastha-clone.onrender.com/api';
	const socket = io('ws://photon-sastha-clone.onrender.com');

	socket.on('connect', async () => {
		socket.emit('player:join', { username: 'Player1', position: { x: 0, y: 0 }, score: 0 });
		await fetch(`${REST_BASE}/queue/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ socketId: socket.id }) });
	});

	socket.on('match:found', ({ room }) => {
		// join room on client side UI, server already associates socket
		console.log('Match ready for room', room);
	});

	socket.on('player:moved', ({ id, position }) => {
		// update that player's position in your game state
	});

	async function move(x, y) {
		socket.emit('player:move', { x, y });
	}
	// optional initial state hydration
	fetch(`${REST_BASE}/state`).then(r => r.json()).then(data => console.log('initial state', data));
</script>
```

## Unity (C#) Integration
- Library: use a Socket.IO client for Unity (e.g. `socket.io-client-unity` / `SocketIOUnity`). Target the WS endpoint `ws://photon-sastha-clone.onrender.com`.
- Basic setup:
```csharp
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using SocketIOClient; // from socket.io-client-unity
public class MultiplayerClient : MonoBehaviour
{
	private SocketIOUnity socket;
	private const string RestBase = "https://photon-sastha-clone.onrender.com/api";
	private void Start()
	{
		var uri = new System.Uri("ws://photon-sastha-clone.onrender.com");
		socket = new SocketIOUnity(uri, new SocketIOOptions { Transport = SocketIOClient.Transport.TransportProtocol.WebSocket });
		socket.OnConnected += async (_, __) =>
		{
			socket.Emit("player:join", new { username = "UnityPlayer", position = new { x = 0, y = 0 }, score = 0 });
			yield return StartCoroutine(PostJson($"{RestBase}/queue/join", new { socketId = socket.Id }));
		};
		socket.On("match:found", response =>
		{
			var room = response.GetValue().GetProperty("room").GetString();
			Debug.Log($"Match found for room {room}");
		});
		socket.On("player:moved", response =>
		{
			var payload = response.GetValue();
			// update player positions in scene using payload["id"] and payload["position"]
		});
		- Connecting to WebSocket: use Socket.IO client, e.g. `const socket = io('ws://photon-sastha-clone.onrender.com');`.
		- Host flow (create lobby): after connecting, emit `player:join`, then call `POST /api/queue/join` with `{ socketId: socket.id }` or emit `queue:join`. You will receive `match:found`/`match:joined` with `{ gameId, room, masterClientId }`; you are the master.
		- Joiner flow (discover + join): fetch `GET /api/lobbies`, pick a lobby `gameId`, emit `lobby:join { gameId }`. Listen for `match:found`/`match:joined` and `player:joined` to render roster and set `isMaster = socket.id === masterClientId`.
		- Movement updates: emit `player:move` with `{ x, y }`; listen for `player:moved` to update other players and `game:state` for resyncs.
		- State hydration: on page load, fetch `GET /api/state` to pre-populate players/matches; then rely on socket events for live updates.
		- Disconnections: handle `player:disconnected` to remove players locally; on `master:changed`, update `isMaster`; on reconnect, re-run join + lobby join.
		- Sample setup (browser):
	{
		using var req = UnityWebRequest.Get($"{RestBase}/state");
		yield return req.SendWebRequest();
		if (req.result == UnityWebRequest.Result.Success)
			Debug.Log($"Initial state: {req.downloadHandler.text}");
	}
	private IEnumerator PostJson(string url, object body)
	{
		var json = JsonUtility.ToJson(body);
		using var req = new UnityWebRequest(url, "POST");
		byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
		req.uploadHandler = new UploadHandlerRaw(bodyRaw);
		req.downloadHandler = new DownloadHandlerBuffer();
		req.SetRequestHeader("Content-Type", "application/json");
		yield return req.SendWebRequest();
	}
}
```
- Reconnects: listen to `socket.OnReconnectAttempt` or similar and re-emit `player:join` plus re-queue.
- Threading: Socket.IO callbacks arrive on a background thread; marshal back to Unity main thread if mutating scene objects.

## End-to-End Flow (High Level)
- What happens overall: client opens a websocket, says “I’m here” (`player:join`), asks to be matched (REST `POST /api/queue/join`), waits for `match:found`, then sends moves (`player:move`) while listening for others; server stores everything in MongoDB so restarts keep state.
	- Sequence for humans:
    1) Connect to the websocket URL. Think of it as plugging in a headset to talk in real time. 
	2) Immediately introduce yourself with `player:join` so the server knows your name and position.
	3) Ask to find a partner by calling `POST /api/queue/join` with your `socket.id`. Wait for the server to reply with `match:found` which includes your room and gameId.
	4) When `match:found` arrives, treat it as “you’re seated at table X”. Start rendering that match locally.
	5) During play, send `player:move` whenever you move. The server echoes `player:moved` so everyone’s view stays in sync. Periodically the server can send `game:state` snapshots to resync.
	6) If you close the browser or disconnect, the server emits `player :disconnected` so others can remove you; on reconnect, just repeat steps 1–3.
	    - Sequence for developers (tech view):
	    - Transport: Socket.IO over WebSocket (`ws://...`), optional REST for queue/state fetch.
	    - State source of truth: MongoDB; players and matches are persisted and reloaded on restart.
	    - Entry calls: `player:join` persists a player document and binds it to the socketId; `POST /api/queue/join` enqueues that socket for matchmaking.
	    - Matchmaking: when two queued sockets are available, server emits `match:found` with `{ gameId, players, room }` and persists a match document.
	    - Gameplay loop: clients emit `player:move` → server validates and persists position → broadcasts `player:moved` to room. `game:state` can be emitted for full sync; REST `GET /api/state` is available for cold start.
	    - Teardown: `DELETE /api/matches/:gameId` marks a match ended; disconnects trigger `player:disconnected` broadcast.
