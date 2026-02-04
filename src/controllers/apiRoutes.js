const express = require('express');
const { getGameState, queueJoin, queueLeave, getActiveGames } = require('../sockets/gameHandlers');

// Factory so we can inject io
const createApiRouter = ({ io }) => {
  const router = express.Router();

  // Health check
  router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Current in-memory game state snapshot
  router.get('/state', (_req, res) => {
    res.json(getGameState());
  });

  // List active games (from matchmaking service)
  router.get('/matches', (_req, res) => {
    const games = Array.from(getActiveGames().entries()).map(([gameId, players]) => ({
      gameId,
      players,
      room: `room:${gameId}`,
    }));
    res.json({ games });
  });

  // Join matchmaking queue by socket id
  router.post('/queue/join', (req, res) => {
    const { socketId } = req.body || {};
    if (!socketId) {
      return res.status(400).json({ error: 'socketId is required' });
    }

    const socketExists = io.sockets?.sockets?.has(socketId);
    if (!socketExists) {
      return res.status(404).json({ error: 'socket not connected' });
    }

    queueJoin(socketId, io);
    return res.status(200).json({ ok: true });
  });

  // Leave matchmaking queue by socket id
  router.post('/queue/leave', (req, res) => {
    const { socketId } = req.body || {};
    if (!socketId) {
      return res.status(400).json({ error: 'socketId is required' });
    }
    queueLeave(socketId);
    return res.status(200).json({ ok: true });
  });

  // List connected players
  router.get('/players', (_req, res) => {
    const state = getGameState();
    res.json({ players: Object.values(state.players) });
  });

  return router;
};

module.exports = { createApiRouter };
