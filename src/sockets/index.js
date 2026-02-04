const { gameEventHandlers } = require('./gameHandlers');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    gameEventHandlers(socket, io);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { setupSocket };
