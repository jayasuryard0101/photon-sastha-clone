import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { setupSocket } from '../src/sockets';

describe('Socket.io Event Handlers', () => {
    let io: Server;
    let httpServer: ReturnType<typeof createServer>;
    let address: any;

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