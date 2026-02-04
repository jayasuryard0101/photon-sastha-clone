const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { setupSocket } = require('../src/sockets');

describe('Socket.io Event Handlers', () => {
  let io;
  let httpServer;
  let address;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });
    setupSocket(io);

    httpServer.listen(() => {
      address = httpServer.address();
      done();
    });
  });

  afterAll((done) => {
    io.close();
    if (httpServer.listening) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  it('connects a client', (done) => {
    const clientSocket = Client(`http://localhost:${address.port}`);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.close();
      done();
    });
  });
});
