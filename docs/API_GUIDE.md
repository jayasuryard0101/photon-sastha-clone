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

			socket.Connect();
			StartCoroutine(FetchState());
		}

		public void Move(float x, float y)
		{
			socket.Emit("player:move", new { x, y });
		}

		private IEnumerator FetchState()
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
