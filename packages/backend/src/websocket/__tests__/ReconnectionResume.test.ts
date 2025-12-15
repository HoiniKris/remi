import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Pool } from 'pg';
import { WebSocketServer } from '../WebSocketServer.js';
import { RemiPeTablaPersistenceService } from '../../services/RemiPeTablaPersistenceService.js';

describe('Reconnection and Resume', () => {
  let httpServer: any;
  let wsServer: WebSocketServer;
  let mockPool: jest.Mocked<Pool>;
  let persistenceService: RemiPeTablaPersistenceService;
  let clientSocket: ClientSocket;
  const port = 3001;

  beforeAll((done) => {
    // Create mock database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    // Create HTTP server
    httpServer = createServer();

    // Create WebSocket server with persistence
    wsServer = new WebSocketServer(httpServer, undefined, undefined, mockPool);
    persistenceService = wsServer.getPersistenceService()!;

    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.close();
    }
    wsServer.close().then(() => {
      httpServer.close(done);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUnfinishedGames', () => {
    it('should return empty array when no persistence service', async () => {
      const games = await wsServer.getUnfinishedGames('player1');
      expect(games).toEqual([]);
    });

    it('should return list of unfinished games for player', async () => {
      // Mock database response
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            game_data: {
              id: 'game1',
              gameType: 'REMI_PE_TABLA',
              gamePhase: 'PLAYING',
              players: [
                { id: 'player1', name: 'Player 1' },
                { id: 'player2', name: 'Player 2' },
              ],
              settings: { maxPlayers: 4 },
              multiplier: 1,
              createdAt: new Date(),
              lastActivity: new Date(),
            },
          },
        ],
        rowCount: 1,
      } as any);

      const games = await wsServer.getUnfinishedGames('player1');

      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        id: 'game1',
        gameType: 'REMI_PE_TABLA',
        gamePhase: 'PLAYING',
        canResume: true,
      });
    });

    it('should filter out finished games', async () => {
      // Mock database response with mixed game states
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            game_data: {
              id: 'game1',
              gamePhase: 'PLAYING',
              players: [{ id: 'player1' }],
              settings: { maxPlayers: 4 },
              createdAt: new Date(),
              lastActivity: new Date(),
            },
          },
          {
            game_data: {
              id: 'game2',
              gamePhase: 'FINISHED',
              players: [{ id: 'player1' }],
              settings: { maxPlayers: 4 },
              createdAt: new Date(),
              lastActivity: new Date(),
            },
          },
        ],
        rowCount: 2,
      } as any);

      const games = await wsServer.getUnfinishedGames('player1');

      expect(games).toHaveLength(1);
      expect(games[0].id).toBe('game1');
    });
  });

  describe('resumeGame', () => {
    it('should fail if persistence service not available', async () => {
      const wsServerNoPersistence = new WebSocketServer(httpServer);
      const result = await wsServerNoPersistence.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistence service not available');
    });

    it('should fail if game not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await wsServer.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should fail if player not in game', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            game_data: {
              id: 'game1',
              gamePhase: 'PLAYING',
              players: [{ id: 'player2', name: 'Player 2' }],
              settings: {},
              createdAt: new Date(),
              lastActivity: new Date(),
            },
          },
        ],
        rowCount: 1,
      } as any);

      const result = await wsServer.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not in this game');
    });

    it('should successfully resume game with valid state', async () => {
      const gameState = {
        id: 'game1',
        gameType: 'REMI_PE_TABLA',
        gamePhase: 'PLAYING',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
            tiles: [],
            boardCombinations: [],
            score: 0,
            isOnline: false,
          },
          {
            id: 'player2',
            name: 'Player 2',
            tiles: [],
            boardCombinations: [],
            score: 0,
            isOnline: true,
          },
        ],
        currentPlayerIndex: 0,
        stockPile: [],
        discardPile: [],
        launchedJokers: [],
        roundNumber: 1,
        turnTimer: 60,
        settings: {
          maxPlayers: 4,
          turnTimeLimit: 60,
          jokerPenalty: 50,
          allowWrapAroundRuns: true,
          counterClockwise: true,
          tableMultiplier: 1,
        },
        multiplier: 1,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ game_data: gameState }],
        rowCount: 1,
      } as any);

      const result = await wsServer.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.gameState.players[0].isOnline).toBe(true);
    });
  });

  describe('state validation on resume', () => {
    it('should fail if game state is corrupted', async () => {
      const corruptedState = {
        id: 'game1',
        gamePhase: 'PLAYING',
        players: [], // Invalid: no players
        settings: {},
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ game_data: corruptedState }],
        rowCount: 1,
      } as any);

      const result = await wsServer.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('corrupted');
    });

    it('should validate tile conservation', async () => {
      const invalidState = {
        id: 'game1',
        gamePhase: 'PLAYING',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
            tiles: Array(50).fill({ id: 'tile', number: 1, color: 'RED', isJoker: false }), // Too many tiles
            boardCombinations: [],
            score: 0,
            isOnline: false,
          },
          {
            id: 'player2',
            name: 'Player 2',
            tiles: [],
            boardCombinations: [],
            score: 0,
            isOnline: true,
          },
        ],
        currentPlayerIndex: 0,
        stockPile: [],
        discardPile: [],
        launchedJokers: [],
        settings: {
          maxPlayers: 4,
          turnTimeLimit: 60,
          jokerPenalty: 50,
          allowWrapAroundRuns: true,
          counterClockwise: true,
          tableMultiplier: 1,
        },
        multiplier: 1,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ game_data: invalidState }],
        rowCount: 1,
      } as any);

      const result = await wsServer.resumeGame('player1', 'game1', 'socket1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('corrupted');
    });
  });
});
