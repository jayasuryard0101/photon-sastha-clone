const { MatchService } = require('../services/matchService');

const matchService = new MatchService();

let gameState = {
    players: {},
    isGameActive: false,
};

const gameEventHandlers = (socket, io) => {
    socket.on('player:join', (payload = {}) => {
        handlePlayerJoin(socket, payload);
        socket.emit('game:state', gameState);
        socket.broadcast.emit('player:joined', gameState.players[socket.id]);
    });

    socket.on('player:move', (movementData = { x: 0, y: 0 }) => {
        handlePlayerMove(socket, movementData, io);
    });

    socket.on('queue:join', () => {
        matchService.joinQueue(socket.id);
        tryMatchPlayers(io);
    });

    socket.on('queue:leave', () => {
        matchService.leaveQueue(socket.id);
    });

    socket.on('disconnect', () => {
        matchService.leaveQueue(socket.id);
        handlePlayerDisconnect(socket, io);
    });
};

const handlePlayerJoin = (socket, player = {}) => {
    const safePlayer = {
        id: socket.id,
        username: player.username || `player-${socket.id.slice(0, 5)}`,
        position: player.position || { x: 0, y: 0 },
        score: player.score ?? 0,
        room: player.room,
    };
    gameState.players[socket.id] = safePlayer;
};

const handlePlayerMove = (socket, movementData, io) => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.position = {
        x: player.position.x + (movementData.x || 0),
        y: player.position.y + (movementData.y || 0),
    };

    const targetRoom = player.room;
    if (targetRoom) {
        io.to(targetRoom).emit('player:moved', { id: socket.id, position: player.position });
    } else {
        socket.broadcast.emit('player:moved', { id: socket.id, position: player.position });
    }
};

const handlePlayerDisconnect = (socket, io) => {
    const player = gameState.players[socket.id];
    delete gameState.players[socket.id];

    if (player && player.room) {
        io.to(player.room).emit('player:disconnected', socket.id);
    } else {
        socket.broadcast.emit('player:disconnected', socket.id);
    }
};

const tryMatchPlayers = (io) => {
    const result = matchService.matchPlayers();
    if (!result) return;

    const [gameId, player1, player2] = result;
    const room = `room:${gameId}`;

    const sockets = [player1, player2]
        .map((id) => io.sockets.sockets.get(id))
        .filter(Boolean);

    sockets.forEach((s) => {
        s.join(room);
        const player = gameState.players[s.id];
        if (player) player.room = room;
    });

    const payload = {
        gameId,
        players: sockets.map((s) => s.id),
        room,
    };

    io.to(room).emit('match:found', payload);
};

const getGameState = () => gameState;

module.exports = {
    gameEventHandlers,
    getGameState,
    queueJoin: (socketId, io) => {
        matchService.joinQueue(socketId);
        tryMatchPlayers(io);
    },
    queueLeave: (socketId) => {
        matchService.leaveQueue(socketId);
    },
    getActiveGames: () => matchService.getActiveGames(),
};
