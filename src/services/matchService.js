class MatchService {
  constructor() {
    this.playerQueue = [];
    this.activeGames = new Map();
    this.lobbies = new Map(); // gameId -> { gameId, room, hostId, players: [] }
  }

  joinQueue(playerId) {
    if (!this.playerQueue.includes(playerId)) {
      this.playerQueue.push(playerId);
    }
  }

  leaveQueue(playerId) {
    this.playerQueue = this.playerQueue.filter((id) => id !== playerId);
  }

  matchPlayers() {
    if (this.playerQueue.length < 2) {
      return null;
    }

    const player1 = this.playerQueue.shift();
    const player2 = this.playerQueue.shift();

    if (!player1 || !player2) {
      return null;
    }

    const gameId = this.createGameSession(player1, player2);
    return [gameId, player1, player2];
  }

  createGameSession(player1, player2) {
    const gameId = this.generateGameId();
    this.activeGames.set(gameId, [player1, player2]);
    return gameId;
  }

  createLobby(hostId) {
    const gameId = this.generateGameId();
    const room = `room:${gameId}`;
    const lobby = { gameId, room, hostId, players: [hostId], status: 'open' };
    this.lobbies.set(gameId, lobby);
    return lobby;
  }

  listLobbies() {
    return Array.from(this.lobbies.values());
  }

  getLobby(gameId) {
    return this.lobbies.get(gameId);
  }

  addPlayerToLobby(gameId, playerId) {
    const lobby = this.lobbies.get(gameId);
    if (!lobby) return null;
    if (!lobby.players.includes(playerId)) {
      lobby.players.push(playerId);
    }
    return lobby;
  }

  removePlayerFromLobbies(playerId) {
    for (const [id, lobby] of this.lobbies.entries()) {
      const idx = lobby.players.indexOf(playerId);
      if (idx >= 0) {
        lobby.players.splice(idx, 1);
        let newHostId = null;
        if (lobby.hostId === playerId) {
          newHostId = lobby.players[0] || null;
          lobby.hostId = newHostId;
        }
        if (!lobby.players.length) {
          this.lobbies.delete(id);
          return { lobby: null, removed: true, deleted: true, newHostId: null };
        }
        this.lobbies.set(id, lobby);
        return { lobby, removed: true, deleted: false, newHostId };
      }
    }
    return { lobby: null, removed: false, deleted: false, newHostId: null };
  }

  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getActiveGames() {
    return this.activeGames;
  }
}

module.exports = { MatchService };
