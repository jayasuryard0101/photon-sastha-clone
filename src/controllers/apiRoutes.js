const express = require('express');
const { getGameState, queueJoin, queueLeave, getActiveGames } = require('../sockets/gameHandlers');
const { getMatch, endMatch } = require('../db/repositories');

// Factory so we can inject io
const createApiRouter = ({ io }) => {
  const router = express.Router();

  // Health check
  router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Current persisted game state snapshot
  router.get('/state', async (_req, res) => {
    const state = await getGameState();
    res.json(state);
  });

  // List active games (from matchmaking service)
  router.get('/matches', async (_req, res) => {
    const games = await getActiveGames();
    res.json({ games });
  });

  router.get('/matches/:gameId', async (req, res) => {
    const match = await getMatch(req.params.gameId);
    if (!match) return res.status(404).json({ error: 'not found' });
    res.json(match);
  });

  router.delete('/matches/:gameId', async (req, res) => {
    const match = await endMatch(req.params.gameId);
    if (!match) return res.status(404).json({ error: 'not found' });
    res.json(match);
  });

  // Join matchmaking queue by socket id
  router.post('/queue/join', async (req, res) => {
    const { socketId } = req.body || {};
    if (!socketId) {
      return res.status(400).json({ error: 'socketId is required' });
    }

    const socketExists = io.sockets?.sockets?.has(socketId);
    if (!socketExists) {
      return res.status(404).json({ error: 'socket not connected' });
    }

    await queueJoin(socketId, io);
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
  router.get('/players', async (_req, res) => {
    const state = await getGameState();
    res.json({ players: Object.values(state.players) });
  });

  return router;
};

module.exports = { createApiRouter };
