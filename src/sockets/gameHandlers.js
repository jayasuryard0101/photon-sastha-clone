const { MatchService } = require('../services/matchService');
const {
    upsertPlayer,
    updatePlayerPosition,
    removePlayer,
    createMatch,
    listMatches,
    listPlayers,
} = require('../db/repositories');

const matchService = new MatchService();

let gameState = {
    players: {},
    isGameActive: false,
};

const gameEventHandlers = (socket, io) => {
    socket.on('player:join', async (payload = {}) => {
        const player = handlePlayerJoin(socket, payload);
        await upsertPlayer(player);

        const state = await getGameState();
        socket.emit('game:state', state);
        socket.broadcast.emit('player:joined', player);
    });

    socket.on('player:move', async (movementData = { x: 0, y: 0 }) => {
        await handlePlayerMove(socket, movementData, io);
    });

    socket.on('queue:join', () => {
        matchService.joinQueue(socket.id);
        tryMatchPlayers(io).catch((err) => console.error('matchmaking failed', err));
    });

    socket.on('queue:leave', () => {
        matchService.leaveQueue(socket.id);
    });

    socket.on('disconnect', async () => {
        matchService.leaveQueue(socket.id);
        await handlePlayerDisconnect(socket, io);
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
    return safePlayer;
};

const handlePlayerMove = async (socket, movementData, io) => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.position = {
        x: player.position.x + (movementData.x || 0),
        y: player.position.y + (movementData.y || 0),
    };

    await updatePlayerPosition(socket.id, player.position);

    const targetRoom = player.room;
    if (targetRoom) {
        io.to(targetRoom).emit('player:moved', { id: socket.id, position: player.position });
    } else {
        socket.broadcast.emit('player:moved', { id: socket.id, position: player.position });
    }
};

const handlePlayerDisconnect = async (socket, io) => {
    const player = gameState.players[socket.id];
    delete gameState.players[socket.id];

    await removePlayer(socket.id);

    if (player && player.room) {
        io.to(player.room).emit('player:disconnected', socket.id);
    } else {
        socket.broadcast.emit('player:disconnected', socket.id);
    }
};

const tryMatchPlayers = async (io) => {
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

    await createMatch(payload);
    io.to(room).emit('match:found', payload);
};

const getGameState = async () => {
    const [players, matches] = await Promise.all([listPlayers(), listMatches()]);
    return {
        players: players.reduce((acc, p) => {
            acc[p.socketId] = {
                id: p.socketId,
                username: p.username,
                position: p.position,
                score: p.score,
                room: p.room,
            };
            return acc;
        }, {}),
        matches,
        isGameActive: matches.length > 0,
    };
};

module.exports = {
    gameEventHandlers,
    getGameState,
    queueJoin: (socketId, io) => {
        matchService.joinQueue(socketId);
        return tryMatchPlayers(io);
    },
    queueLeave: (socketId) => {
        matchService.leaveQueue(socketId);
    },
    getActiveGames: async () => listMatches(),
};
