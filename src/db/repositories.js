const { connectDb } = require('./connection');
const Player = require('./models/player');
const Match = require('./models/match');

const ensureConnection = async () => connectDb();

const upsertPlayer = async (player) => {
  await ensureConnection();
  return Player.findOneAndUpdate(
    { socketId: player.id },
    {
      socketId: player.id,
      username: player.username,
      position: player.position,
      score: player.score ?? 0,
      room: player.room || null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

const updatePlayerPosition = async (socketId, position) => {
  await ensureConnection();
  return Player.findOneAndUpdate({ socketId }, { position }, { new: true }).lean();
};

const removePlayer = async (socketId) => {
  await ensureConnection();
  await Player.deleteOne({ socketId });
};

const listPlayers = async () => {
  await ensureConnection();
  return Player.find({}).lean();
};

const createMatch = async ({ gameId, players, room }) => {
  await ensureConnection();
  return Match.findOneAndUpdate(
    { gameId },
    { gameId, players, room, status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

const endMatch = async (gameId) => {
  await ensureConnection();
  return Match.findOneAndUpdate({ gameId }, { status: 'ended' }, { new: true }).lean();
};

const listMatches = async () => {
  await ensureConnection();
  return Match.find({}).lean();
};

const getMatch = async (gameId) => {
  await ensureConnection();
  return Match.findOne({ gameId }).lean();
};

module.exports = {
  upsertPlayer,
  updatePlayerPosition,
  removePlayer,
  listPlayers,
  createMatch,
  endMatch,
  listMatches,
  getMatch,
};
