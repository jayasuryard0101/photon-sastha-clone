class MatchService {
  constructor() {
    this.playerQueue = [];
    this.activeGames = new Map();
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

  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getActiveGames() {
    return this.activeGames;
  }
}

module.exports = { MatchService };
