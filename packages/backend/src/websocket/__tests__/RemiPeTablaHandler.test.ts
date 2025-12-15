import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { RemiPeTablaEngine } from '../../game-engine/RemiPeTablaEngine.js';
import { RemiPeTablaHandler } from '../RemiPeTablaHandler.js';
import { generateToken } from '../../utils/jwt.js';

describe('RemiPeTablaHandler', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let engine: RemiPeTablaEngine;
  let handler: RemiPeTablaHandler;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let token1: string;
  let token2: string;

  const PORT = 3001;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = new HTTPServer();

    // Create Socket.io server
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    // Create game engine and handler
    engine = new RemiPeTablaEngine();
    handler = new RemiPeTablaHandler(ioServer, engine);

    // Set up authentication middleware
    ioServer.use(async (socket: any, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      // Simple mock authentication
      if (token === token1) {
        socket.userId = 'player1';
        socket.username = 'Player 1';
      } else if (token === token2) {
        socket.userId = 'player2';
        socket.username = 'Player 2';
      }
      next();
    });

    // Register handlers
    ioServer.on('connection', (socket: any) => {
      handler.registerHandlers(socket);
    });

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, resolve);
    });

    // Generate tokens
    token1 = await generateToken({ userId: 'player1', username: 'Player 1' });
    token2 = await generateToken({ userId: 'player2', username: 'Player 2' });
  });

  afterAll(async () => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
    ioServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Clean up engine state
    engine = new RemiPeTablaEngine();
    handler = new RemiPeTablaHandler(ioServer, engine);
  });

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  describe('Room Management', () => {
    it('should create a room', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(
          'remi:createRoom',
          { settings: { maxPlayers: 4, tableMultiplier: 2 } },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.room).toBeDefined();
            expect(response.room.multiplier).toBe(2);
            expect(response.room.players).toHaveLength(1);
            done();
          }
        );
      });
    });

    it('should allow player to join room', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        // Create room
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          // Connect second player
          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            // Join room
            clientSocket2.emit('remi:joinRoom', { roomId }, (joinResponse: any) => {
              expect(joinResponse.success).toBe(true);
              expect(joinResponse.room.players).toHaveLength(2);
              done();
            });
          });
        });
      });
    });

    it('should broadcast when player joins', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          // Listen for player joined event
          clientSocket1.on('remi:playerJoined', (data: any) => {
            expect(data.playerId).toBe('player2');
            expect(data.playerName).toBe('Player 2');
            done();
          });

          // Connect second player
          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {});
          });
        });
      });
    });
  });

  describe('Game Flow', () => {
    it('should start game and deal tiles', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {
              // Start game
              clientSocket1.emit('remi:startGame', { roomId }, (startResponse: any) => {
                expect(startResponse.success).toBe(true);
              });

              // Listen for game started event
              clientSocket1.on('remi:gameStarted', (data: any) => {
                expect(data.room.gamePhase).toBe('PLAYING');
                expect(data.room.players[0].tiles).toHaveLength(15); // First player gets 15
                done();
              });
            });
          });
        });
      });
    });

    it('should handle draw from stock', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {
              clientSocket1.emit('remi:startGame', { roomId }, () => {});

              clientSocket1.on('remi:gameStarted', () => {
                // Draw from stock
                clientSocket1.emit('remi:drawStock', { roomId }, (drawResponse: any) => {
                  expect(drawResponse.success).toBe(true);
                  expect(drawResponse.room.players[0].tiles).toHaveLength(16); // 15 + 1
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should handle discard and advance turn', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {
              clientSocket1.emit('remi:startGame', { roomId }, () => {});

              clientSocket1.on('remi:gameStarted', (data: any) => {
                const tile = data.room.players[0].tiles[0];

                // Discard a tile
                clientSocket1.emit('remi:discard', { roomId, tile }, (discardResponse: any) => {
                  expect(discardResponse.success).toBe(true);
                  // Turn should advance (counter-clockwise by default)
                  expect(discardResponse.room.currentPlayerIndex).not.toBe(0);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('Private Board', () => {
    it('should keep board combinations private', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {
              clientSocket1.emit('remi:startGame', { roomId }, () => {});

              clientSocket1.on('remi:gameStarted', () => {
                // Just test that board arrangement is private without validating combinations
                // (validation is tested in game engine tests)
                const boardCombinations: any[] = [];

                // Arrange board (empty is valid for testing privacy)
                clientSocket1.emit(
                  'remi:arrangeBoard',
                  { roomId, boardCombinations },
                  (arrangeResponse: any) => {
                    expect(arrangeResponse.success).toBe(true);

                    // Get room state from player 2's perspective
                    clientSocket2.emit('remi:getRoomState', { roomId }, (stateResponse: any) => {
                      const player1Data = stateResponse.room.players.find(
                        (p: any) => p.id === 'player1'
                      );
                      // Player 2 should not see player 1's tiles or board combinations
                      expect(player1Data.tiles).toBeUndefined();
                      expect(player1Data.boardCombinations).toBeUndefined();
                      expect(player1Data.tileCount).toBeDefined();
                      done();
                    });
                  }
                );
              });
            });
          });
        });
      });
    });
  });

  describe('Joker Launching', () => {
    it('should launch Joker when discarded', (done) => {
      clientSocket1 = ioClient(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('remi:createRoom', {}, (response: any) => {
          const roomId = response.room.id;

          clientSocket2 = ioClient(`http://localhost:${PORT}`, {
            auth: { token: token2 },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('remi:joinRoom', { roomId }, () => {
              clientSocket1.emit('remi:startGame', { roomId }, () => {});

              clientSocket1.on('remi:gameStarted', (data: any) => {
                // Find a Joker in player's hand
                const joker = data.room.players[0].tiles.find((t: any) => t.isJoker);

                if (joker) {
                  // Discard the Joker
                  clientSocket1.emit(
                    'remi:discard',
                    { roomId, tile: joker },
                    (discardResponse: any) => {
                      expect(discardResponse.success).toBe(true);
                      // Joker should be in launchedJokers, not discardPile
                      expect(discardResponse.room.launchedJokers).toHaveLength(1);
                      expect(discardResponse.room.discardPile).toHaveLength(0);
                      done();
                    }
                  );
                } else {
                  // Skip test if no Joker in hand
                  done();
                }
              });
            });
          });
        });
      });
    });
  });
});
