import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Pool } from 'pg';
import { GameStateRepository } from '../GameStateRepository';
import { GameRoom } from '../../game-engine/GameEngine';

describe('GameStateRepository', () => {
  let pool: Pool;
  let repository: GameStateRepository;

  beforeEach(async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rummy_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    repository = new GameStateRepository(pool);

    // Clean up test data
    await pool.query('DELETE FROM game_states');
  });

  afterEach(async () => {
    await pool.end();
  });

  const createMockGameState = (overrides?: Partial<GameRoom>): GameRoom => ({
    id: `test-game-${Date.now()}`,
    players: [
      {
        id: 'player1',
        name: 'Alice',
        tiles: [],
        hasCompletedFirstMeld: false,
        score: 0,
        isOnline: true,
      },
      {
        id: 'player2',
        name: 'Bob',
        tiles: [],
        hasCompletedFirstMeld: false,
        score: 0,
        isOnline: true,
      },
    ],
    currentPlayerIndex: 0,
    stockPile: [],
    discardPile: [],
    tableCombinations: [],
    gamePhase: 'WAITING',
    roundNumber: 1,
    turnTimer: 60,
    settings: {
      maxPlayers: 4,
      turnTimeLimit: 60,
      firstMeldMinimum: 30,
      allowWrapAroundRuns: true,
      jokerPenalty: 25,
    },
    createdAt: new Date(),
    lastActivity: new Date(),
    ...overrides,
  });

  describe('saveGameState', () => {
    it('should save a new game state', async () => {
      const gameState = createMockGameState();

      await repository.saveGameState(gameState);

      const loaded = await repository.loadGameState(gameState.id);
      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(gameState.id);
      expect(loaded!.players).toHaveLength(2);
    });

    it('should update existing game state', async () => {
      const gameState = createMockGameState();

      // Save initial state
      await repository.saveGameState(gameState);

      // Update state
      gameState.gamePhase = 'PLAYING';
      gameState.players[0].score = 100;

      // Save updated state
      await repository.saveGameState(gameState);

      // Load and verify
      const loaded = await repository.loadGameState(gameState.id);
      expect(loaded!.gamePhase).toBe('PLAYING');
      expect(loaded!.players[0].score).toBe(100);
    });
  });

  describe('loadGameState', () => {
    it('should load existing game state', async () => {
      const gameState = createMockGameState();
      await repository.saveGameState(gameState);

      const loaded = await repository.loadGameState(gameState.id);

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(gameState.id);
      expect(loaded!.gamePhase).toBe(gameState.gamePhase);
    });

    it('should return null for non-existent game', async () => {
      const loaded = await repository.loadGameState('non-existent-game');
      expect(loaded).toBeNull();
    });
  });

  describe('deleteGameState', () => {
    it('should delete game state', async () => {
      const gameState = createMockGameState();
      await repository.saveGameState(gameState);

      await repository.deleteGameState(gameState.id);

      const loaded = await repository.loadGameState(gameState.id);
      expect(loaded).toBeNull();
    });
  });

  describe('getActiveGames', () => {
    it('should return only active games', async () => {
      const waitingGame = createMockGameState({ gamePhase: 'WAITING' });
      const playingGame = createMockGameState({ gamePhase: 'PLAYING' });
      const finishedGame = createMockGameState({ gamePhase: 'FINISHED' });

      await repository.saveGameState(waitingGame);
      await repository.saveGameState(playingGame);
      await repository.saveGameState(finishedGame);

      const activeGames = await repository.getActiveGames();

      expect(activeGames).toHaveLength(2);
      expect(activeGames.some((g) => g.id === waitingGame.id)).toBe(true);
      expect(activeGames.some((g) => g.id === playingGame.id)).toBe(true);
      expect(activeGames.some((g) => g.id === finishedGame.id)).toBe(false);
    });
  });

  describe('getGamesByPlayer', () => {
    it('should return games for specific player', async () => {
      const game1 = createMockGameState({
        players: [
          {
            id: 'player1',
            name: 'Alice',
            tiles: [],
            hasCompletedFirstMeld: false,
            score: 0,
            isOnline: true,
          },
          {
            id: 'player2',
            name: 'Bob',
            tiles: [],
            hasCompletedFirstMeld: false,
            score: 0,
            isOnline: true,
          },
        ],
      });

      const game2 = createMockGameState({
        players: [
          {
            id: 'player3',
            name: 'Charlie',
            tiles: [],
            hasCompletedFirstMeld: false,
            score: 0,
            isOnline: true,
          },
          {
            id: 'player4',
            name: 'David',
            tiles: [],
            hasCompletedFirstMeld: false,
            score: 0,
            isOnline: true,
          },
        ],
      });

      await repository.saveGameState(game1);
      await repository.saveGameState(game2);

      const player1Games = await repository.getGamesByPlayer('player1');

      expect(player1Games).toHaveLength(1);
      expect(player1Games[0].id).toBe(game1.id);
    });
  });

  describe('cleanupOldGames', () => {
    it('should remove old finished games', async () => {
      const oldGame = createMockGameState({ gamePhase: 'FINISHED' });
      await repository.saveGameState(oldGame);

      // Manually update the timestamp to be old
      await pool.query(
        `UPDATE game_states SET updated_at = NOW() - INTERVAL '25 hours' WHERE game_id = $1`,
        [oldGame.id]
      );

      const removedCount = await repository.cleanupOldGames(24);

      expect(removedCount).toBe(1);

      const loaded = await repository.loadGameState(oldGame.id);
      expect(loaded).toBeNull();
    });

    it('should keep recent finished games', async () => {
      const recentGame = createMockGameState({ gamePhase: 'FINISHED' });
      await repository.saveGameState(recentGame);

      const removedCount = await repository.cleanupOldGames(24);

      expect(removedCount).toBe(0);

      const loaded = await repository.loadGameState(recentGame.id);
      expect(loaded).toBeDefined();
    });
  });

  describe('getGameStats', () => {
    it('should return correct game statistics', async () => {
      await repository.saveGameState(createMockGameState({ gamePhase: 'WAITING' }));
      await repository.saveGameState(createMockGameState({ gamePhase: 'PLAYING' }));
      await repository.saveGameState(createMockGameState({ gamePhase: 'PLAYING' }));
      await repository.saveGameState(createMockGameState({ gamePhase: 'FINISHED' }));

      const stats = await repository.getGameStats();

      expect(stats.total).toBe(4);
      expect(stats.waiting).toBe(1);
      expect(stats.playing).toBe(2);
      expect(stats.finished).toBe(1);
    });
  });

  describe('validateGameState', () => {
    it('should validate correct game state', () => {
      const gameState = createMockGameState();
      const result = repository.validateGameState(gameState);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing game ID', () => {
      const gameState = createMockGameState({ id: '' });
      const result = repository.validateGameState(gameState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing game ID');
    });

    it('should detect invalid player count', () => {
      const gameState = createMockGameState({ players: [] });
      const result = repository.validateGameState(gameState);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('player'))).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize game state', () => {
      const gameState = createMockGameState();
      const serialized = repository.serializeGameState(gameState);
      const deserialized = repository.deserializeGameState(serialized);

      expect(deserialized.id).toBe(gameState.id);
      expect(deserialized.players).toHaveLength(gameState.players.length);
      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect(deserialized.lastActivity).toBeInstanceOf(Date);
    });
  });
});
