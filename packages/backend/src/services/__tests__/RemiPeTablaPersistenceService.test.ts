import { Pool } from 'pg';
import { RemiPeTablaPersistenceService } from '../RemiPeTablaPersistenceService.js';
import { RemiPeTablaRoom } from '../../game-engine/RemiPeTablaEngine.js';

// Mock pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

describe('RemiPeTablaPersistenceService', () => {
  let service: RemiPeTablaPersistenceService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    service = new RemiPeTablaPersistenceService(mockPool);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any running intervals
    service.stopAllAutoSaves();
  });

  describe('saveGameState', () => {
    it('should save game state to database', async () => {
      const gameState: RemiPeTablaRoom = {
        id: 'test-room-1',
        gameType: 'REMI_PE_TABLA',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
            tiles: [],
            boardCombinations: [],
            score: 0,
            isOnline: true,
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
        gamePhase: 'PLAYING',
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

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await service.saveGameState(gameState);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO remi_pe_tabla_games'),
        expect.arrayContaining([
          gameState.id,
          expect.any(String), // JSON string
          gameState.gamePhase,
          gameState.players.length,
          gameState.multiplier,
          gameState.createdAt,
          gameState.lastActivity,
        ])
      );
    });
  });

  describe('loadGameState', () => {
    it('should load game state from database', async () => {
      const gameState: RemiPeTablaRoom = {
        id: 'test-room-1',
        gameType: 'REMI_PE_TABLA',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
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
        gamePhase: 'PLAYING',
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
        createdAt: new Date('2025-01-01'),
        lastActivity: new Date('2025-01-01'),
      };

      mockPool.query.mockResolvedValue({
        rows: [{ game_data: gameState }],
        rowCount: 1,
      } as any);

      const loaded = await service.loadGameState('test-room-1');

      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe('test-room-1');
      expect(loaded?.createdAt).toBeInstanceOf(Date);
      expect(loaded?.lastActivity).toBeInstanceOf(Date);
    });

    it('should return null if game not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const loaded = await service.loadGameState('non-existent');

      expect(loaded).toBeNull();
    });
  });

  describe('deleteGameState', () => {
    it('should delete game state from database', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await service.deleteGameState('test-room-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM remi_pe_tabla_games'),
        ['test-room-1']
      );
    });
  });

  describe('getActiveGames', () => {
    it('should return all active games', async () => {
      const games = [
        {
          game_data: {
            id: 'room1',
            gamePhase: 'PLAYING',
            createdAt: '2025-01-01',
            lastActivity: '2025-01-01',
          },
        },
        {
          game_data: {
            id: 'room2',
            gamePhase: 'WAITING',
            createdAt: '2025-01-01',
            lastActivity: '2025-01-01',
          },
        },
      ];

      mockPool.query.mockResolvedValue({ rows: games, rowCount: 2 } as any);

      const active = await service.getActiveGames();

      expect(active).toHaveLength(2);
      expect(active[0].id).toBe('room1');
      expect(active[1].id).toBe('room2');
    });
  });

  describe('Auto-save functionality', () => {
    it('should start auto-save interval', () => {
      jest.useFakeTimers();

      const gameState: RemiPeTablaRoom = {
        id: 'test-room-1',
        gameType: 'REMI_PE_TABLA',
        players: [],
        currentPlayerIndex: 0,
        stockPile: [],
        discardPile: [],
        launchedJokers: [],
        gamePhase: 'PLAYING',
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

      const getGameState = jest.fn(() => gameState);
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      service.startAutoSave('test-room-1', getGameState);

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Should have called saveGameState
      expect(mockPool.query).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should stop auto-save when game no longer exists', () => {
      jest.useFakeTimers();

      let gameExists = true;
      const getGameState = jest.fn(() => (gameExists ? ({} as RemiPeTablaRoom) : undefined));

      service.startAutoSave('test-room-1', getGameState);

      // Game exists, should save
      jest.advanceTimersByTime(30000);
      expect(getGameState).toHaveBeenCalled();

      // Game no longer exists
      gameExists = false;
      jest.advanceTimersByTime(30000);

      // Should have stopped auto-save
      const callCount = getGameState.mock.calls.length;
      jest.advanceTimersByTime(30000);
      expect(getGameState.mock.calls.length).toBe(callCount); // No new calls

      jest.useRealTimers();
    });

    it('should stop auto-save manually', () => {
      jest.useFakeTimers();

      const getGameState = jest.fn(() => ({}) as RemiPeTablaRoom);
      service.startAutoSave('test-room-1', getGameState);

      service.stopAutoSave('test-room-1');

      jest.advanceTimersByTime(30000);

      // Should not have called getGameState after stopping
      expect(getGameState).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('validateGameState', () => {
    it('should validate correct game state', () => {
      const gameState: RemiPeTablaRoom = {
        id: 'test-room-1',
        gameType: 'REMI_PE_TABLA',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
            tiles: [],
            boardCombinations: [],
            score: 0,
            isOnline: true,
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
        gamePhase: 'WAITING',
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

      const result = service.validateGameState(gameState);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing game ID', () => {
      const gameState = {
        id: '',
        players: [
          { tiles: [], boardCombinations: [] },
          { tiles: [], boardCombinations: [] },
        ],
        gamePhase: 'WAITING', // Use WAITING to avoid tile validation
      } as any;

      const result = service.validateGameState(gameState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing game ID');
    });

    it('should detect invalid player count', () => {
      const gameState = {
        id: 'test',
        players: [{ tiles: [], boardCombinations: [] }], // Only 1 player
        gamePhase: 'WAITING', // Use WAITING to avoid tile validation
      } as any;

      const result = service.validateGameState(gameState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid player count (must be 2-4)');
    });
  });

  describe('cleanupOldGames', () => {
    it('should delete old finished games', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 5 } as any);

      const deleted = await service.cleanupOldGames(24);

      expect(deleted).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("game_phase = 'FINISHED'")
      );
    });
  });

  describe('getGameStats', () => {
    it('should return game statistics', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            total: '10',
            waiting: '3',
            playing: '5',
            finished: '2',
          },
        ],
        rowCount: 1,
      } as any);

      const stats = await service.getGameStats();

      expect(stats).toEqual({
        total: 10,
        waiting: 3,
        playing: 5,
        finished: 2,
      });
    });
  });
});
