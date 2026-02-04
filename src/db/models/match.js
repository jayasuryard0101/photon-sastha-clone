const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    players: { type: [String], required: true },
    room: { type: String, required: true },
    status: { type: String, default: 'active', enum: ['active', 'ended'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', MatchSchema);
