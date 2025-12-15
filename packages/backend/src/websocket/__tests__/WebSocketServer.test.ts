import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketServer } from '../WebSocketServer';
import { generateToken } from '../../utils/jwt';

describe('WebSocketServer', () => {
  let httpServer: HTTPServer;
  let wsServer: WebSocketServer;
  let serverPort: number;
  let clientSockets: ClientSocket[] = [];

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();

    // Start server on random port
    httpServer.listen(0, () => {
      serverPort = (httpServer.address() as AddressInfo).port;

      // Create WebSocket server
      wsServer = new WebSocketServer(httpServer, {
        cors: { origin: '*' },
      });

      done();
    });
  });

  afterAll(async () => {
    // Disconnect all client sockets
    for (const socket of clientSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }

    // Close WebSocket server
    await wsServer.close();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Clear client sockets array
    clientSockets = [];
  });

  /**
   * Helper to create authenticated client
   */
  function createAuthenticatedClient(userId: string, username: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const token = generateToken({ userId, username });

      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        clientSockets.push(client);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  /**
   * Helper to create unauthenticated client
   */
  function createUnauthenticatedClient(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      client.on('connect', () => {
        clientSockets.push(client);
        resolve(client);
      });

      client.on('connect_error', () => {
        // Expected to fail
        resolve(client);
      });

      // Timeout after 2 seconds
      setTimeout(() => resolve(client), 2000);
    });
  }

  describe('Authentication', () => {
    it('should accept authenticated connections', async () => {
      const client = await createAuthenticatedClient('user1', 'Alice');
      expect(client.connected).toBe(true);
    });

    it('should reject unauthenticated connections', async () => {
      const client = await createUnauthenticatedClient();
      expect(client.connected).toBe(false);
    });

    it('should reject connections with invalid token', async () => {
      return new Promise<void>((resolve) => {
        const client = ioClient(`http://localhost:${serverPort}`, {
          auth: { token: 'invalid-token' },
          transports: ['websocket'],
        });

        client.on('connect_error', (error) => {
          expect(error.message).toMatch(/Authentication|Invalid token/);
          client.disconnect();
          resolve();
        });

        clientSockets.push(client);
      });
    });
  });

  describe('Connection Management', () => {
    it('should track connected users', async () => {
      await createAuthenticatedClient('user1', 'Alice');
      await createAuthenticatedClient('user2', 'Bob');

      expect(wsServer.getConnectedUsersCount()).toBe(2);
      expect(wsServer.isUserConnected('user1')).toBe(true);
      expect(wsServer.isUserConnected('user2')).toBe(true);
    });

    it('should remove users on disconnect', async () => {
      const client = await createAuthenticatedClient('user3', 'Charlie');
      expect(wsServer.isUserConnected('user3')).toBe(true);

      await new Promise<void>((resolve) => {
        client.on('disconnect', () => {
          // Give server time to process disconnect
          setTimeout(() => {
            expect(wsServer.isUserConnected('user3')).toBe(false);
            resolve();
          }, 50);
        });
        client.disconnect();
      });
    });

    it('should get socket ID for connected user', async () => {
      const client = await createAuthenticatedClient('user4', 'David');
      const socketId = wsServer.getSocketId('user4');

      expect(socketId).toBeDefined();
      expect(socketId).toBe(client.id);
    });

    it('should return undefined for disconnected user', () => {
      const socketId = wsServer.getSocketId('nonexistent-user');
      expect(socketId).toBeUndefined();
    });
  });

  describe('Room Management', () => {
    it('should allow users to join rooms', async () => {
      await createAuthenticatedClient('user5', 'Eve');
      const socketId = wsServer.getSocketId('user5')!;

      wsServer.joinRoom(socketId, 'game-room-1');

      const members = await wsServer.getRoomMembers('game-room-1');
      expect(members).toContain('user5');
    });

    it('should allow users to leave rooms', async () => {
      await createAuthenticatedClient('user6', 'Frank');
      const socketId = wsServer.getSocketId('user6')!;

      wsServer.joinRoom(socketId, 'game-room-2');
      let members = await wsServer.getRoomMembers('game-room-2');
      expect(members).toContain('user6');

      wsServer.leaveRoom(socketId, 'game-room-2');
      members = await wsServer.getRoomMembers('game-room-2');
      expect(members).not.toContain('user6');
    });

    it('should get all room members', async () => {
      await createAuthenticatedClient('user7', 'Grace');
      await createAuthenticatedClient('user8', 'Henry');

      const socketId1 = wsServer.getSocketId('user7')!;
      const socketId2 = wsServer.getSocketId('user8')!;

      wsServer.joinRoom(socketId1, 'game-room-3');
      wsServer.joinRoom(socketId2, 'game-room-3');

      const members = await wsServer.getRoomMembers('game-room-3');
      expect(members).toHaveLength(2);
      expect(members).toContain('user7');
      expect(members).toContain('user8');
    });
  });

  describe('Message Broadcasting', () => {
    it('should emit to specific room', async () => {
      const client1 = await createAuthenticatedClient('user9', 'Ivy');
      const client2 = await createAuthenticatedClient('user10', 'Jack');

      const socketId1 = wsServer.getSocketId('user9')!;
      const socketId2 = wsServer.getSocketId('user10')!;

      wsServer.joinRoom(socketId1, 'test-room');
      wsServer.joinRoom(socketId2, 'test-room');

      return new Promise<void>((resolve) => {
        let receivedCount = 0;

        const handler = (data: any) => {
          expect(data.message).toBe('Hello room!');
          receivedCount++;
          if (receivedCount === 2) {
            resolve();
          }
        };

        client1.on('test-event', handler);
        client2.on('test-event', handler);

        wsServer.emitToRoom('test-room', 'test-event', { message: 'Hello room!' });
      });
    });

    it('should emit to specific user', async () => {
      const client = await createAuthenticatedClient('user11', 'Kate');

      return new Promise<void>((resolve) => {
        client.on('private-message', (data) => {
          expect(data.text).toBe('Hello Kate!');
          resolve();
        });

        wsServer.emitToUser('user11', 'private-message', { text: 'Hello Kate!' });
      });
    });

    it('should broadcast to room except sender', async () => {
      const client1 = await createAuthenticatedClient('user12', 'Leo');
      const client2 = await createAuthenticatedClient('user13', 'Mia');

      const socketId1 = wsServer.getSocketId('user12')!;
      const socketId2 = wsServer.getSocketId('user13')!;

      wsServer.joinRoom(socketId1, 'broadcast-room');
      wsServer.joinRoom(socketId2, 'broadcast-room');

      return new Promise<void>((resolve) => {
        let client1Received = false;
        let client2Received = false;

        client1.on('broadcast', () => {
          client1Received = true;
        });

        client2.on('broadcast', (data) => {
          client2Received = true;
          expect(data.message).toBe('Broadcast from Leo');

          // Give time for client1 to potentially receive (it shouldn't)
          setTimeout(() => {
            expect(client1Received).toBe(false);
            expect(client2Received).toBe(true);
            resolve();
          }, 100);
        });

        wsServer.broadcastToRoom('broadcast-room', 'user12', 'broadcast', {
          message: 'Broadcast from Leo',
        });
      });
    });

    it('should emit to all connected clients', async () => {
      const client1 = await createAuthenticatedClient('user14', 'Nina');
      const client2 = await createAuthenticatedClient('user15', 'Oscar');

      return new Promise<void>((resolve) => {
        let receivedCount = 0;

        const handler = (data: any) => {
          expect(data.announcement).toBe('Server maintenance in 5 minutes');
          receivedCount++;
          if (receivedCount === 2) {
            resolve();
          }
        };

        client1.on('server-announcement', handler);
        client2.on('server-announcement', handler);

        wsServer.emitToAll('server-announcement', {
          announcement: 'Server maintenance in 5 minutes',
        });
      });
    });
  });

  describe('Heartbeat', () => {
    it('should send ping to connected clients', async () => {
      const client = await createAuthenticatedClient('user16', 'Paul');

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Ping not received within 30 seconds'));
        }, 30000);

        client.on('ping', () => {
          clearTimeout(timeout);
          // Respond with pong
          client.emit('pong');
          resolve();
        });
      });
    }, 35000); // Increase timeout for this test
  });

  describe('Statistics', () => {
    it('should provide server statistics', async () => {
      await createAuthenticatedClient('user17', 'Quinn');
      await createAuthenticatedClient('user18', 'Rachel');

      const stats = wsServer.getStats();

      expect(stats.connectedUsers).toBeGreaterThanOrEqual(2);
      expect(stats.totalSockets).toBeGreaterThanOrEqual(2);
    });

    it('should get connected user IDs', async () => {
      await createAuthenticatedClient('user19', 'Sam');
      await createAuthenticatedClient('user20', 'Tina');

      const userIds = wsServer.getConnectedUserIds();

      expect(userIds).toContain('user19');
      expect(userIds).toContain('user20');
    });
  });

  describe('Force Disconnect', () => {
    it('should forcefully disconnect a user', async () => {
      const client = await createAuthenticatedClient('user21', 'Uma');

      return new Promise<void>((resolve) => {
        client.on('disconnect', () => {
          expect(wsServer.isUserConnected('user21')).toBe(false);
          resolve();
        });

        wsServer.disconnectUser('user21', 'Test disconnect');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple connections from same user', async () => {
      await createAuthenticatedClient('user22', 'Victor');
      await createAuthenticatedClient('user22', 'Victor');

      // Second connection should replace the first
      expect(wsServer.isUserConnected('user22')).toBe(true);
      expect(wsServer.getConnectedUsersCount()).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty room operations', async () => {
      const members = await wsServer.getRoomMembers('nonexistent-room');
      expect(members).toEqual([]);
    });

    it('should handle operations on disconnected users', () => {
      wsServer.emitToUser('nonexistent-user', 'test', { data: 'test' });
      wsServer.disconnectUser('nonexistent-user');
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});
