const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { config } = require('./config');
const { setupSocket } = require('./sockets');
const { createApiRouter } = require('./controllers/apiRoutes');
const { connectDb } = require('./db/connection');

const app = express();

// Basic JSON parsing; expand with auth/logging middleware as needed
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Basic health endpoint
app.get('/health', (_req, res) => res.status(200).send('ok'));

// REST API for matchmaking/state
app.use('/api', createApiRouter({ io }));

(async () => {
  await connectDb();
  setupSocket(io);

  server.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });
})().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
