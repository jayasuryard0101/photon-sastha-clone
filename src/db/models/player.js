const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    socketId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    position: { type: PositionSchema, default: () => ({}) },
    score: { type: Number, default: 0 },
    room: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', PlayerSchema);
