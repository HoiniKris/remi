import { describe, it, expect } from '@jest/globals';
import { TileSchema, CombinationSchema, GameStateSchema } from '../GameState';

describe('GameState Model', () => {
  describe('Tile Schema', () => {
    it('should validate a valid tile', () => {
      const validTile = {
        id: 'tile-1',
        number: 5,
        color: 'RED' as const,
        isJoker: false,
      };

      const result = TileSchema.safeParse(validTile);
      expect(result.success).toBe(true);
    });

    it('should validate a Joker tile', () => {
      const jokerTile = {
        id: 'joker-1',
        number: 0,
        color: 'RED' as const,
        isJoker: true,
      };

      const result = TileSchema.safeParse(jokerTile);
      expect(result.success).toBe(true);
    });

    it('should reject tile with invalid number', () => {
      const invalidTile = {
        id: 'tile-1',
        number: 14, // Max is 13
        color: 'RED',
        isJoker: false,
      };

      const result = TileSchema.safeParse(invalidTile);
      expect(result.success).toBe(false);
    });

    it('should reject tile with invalid color', () => {
      const invalidTile = {
        id: 'tile-1',
        number: 5,
        color: 'GREEN', // Not a valid color
        isJoker: false,
      };

      const result = TileSchema.safeParse(invalidTile);
      expect(result.success).toBe(false);
    });
  });

  describe('Combination Schema', () => {
    it('should validate a valid RUN combination', () => {
      const validRun = {
        type: 'RUN' as const,
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED' as const, isJoker: false },
          { id: 'tile-2', number: 5, color: 'RED' as const, isJoker: false },
          { id: 'tile-3', number: 6, color: 'RED' as const, isJoker: false },
        ],
        isValid: true,
      };

      const result = CombinationSchema.safeParse(validRun);
      expect(result.success).toBe(true);
    });

    it('should validate a valid SET combination', () => {
      const validSet = {
        type: 'SET' as const,
        tiles: [
          { id: 'tile-1', number: 7, color: 'RED' as const, isJoker: false },
          { id: 'tile-2', number: 7, color: 'BLUE' as const, isJoker: false },
          { id: 'tile-3', number: 7, color: 'YELLOW' as const, isJoker: false },
        ],
        isValid: true,
      };

      const result = CombinationSchema.safeParse(validSet);
      expect(result.success).toBe(true);
    });

    it('should reject combination with invalid type', () => {
      const invalidCombination = {
        type: 'INVALID',
        tiles: [],
        isValid: false,
      };

      const result = CombinationSchema.safeParse(invalidCombination);
      expect(result.success).toBe(false);
    });
  });

  describe('GameState Schema', () => {
    it('should validate a valid game state', () => {
      const validGameState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'RUMMY_PRO' as const,
        players: [
          {
            userId: '123e4567-e89b-12d3-a456-426614174001',
            username: 'player1',
            hand: [],
            score: 0,
            isConnected: true,
          },
          {
            userId: '123e4567-e89b-12d3-a456-426614174002',
            username: 'player2',
            hand: [],
            score: 0,
            isConnected: true,
          },
        ],
        currentTurn: '123e4567-e89b-12d3-a456-426614174001',
        tiles: [],
        stock: [],
        discardPile: [],
        table: [],
        status: 'IN_PROGRESS' as const,
        startTime: new Date(),
        endTime: null,
      };

      const result = GameStateSchema.safeParse(validGameState);
      expect(result.success).toBe(true);
    });

    it('should reject game with less than 2 players', () => {
      const invalidGameState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'RUMMY_PRO',
        players: [
          {
            userId: '123e4567-e89b-12d3-a456-426614174001',
            username: 'player1',
            hand: [],
            score: 0,
            isConnected: true,
          },
        ],
        currentTurn: '123e4567-e89b-12d3-a456-426614174001',
        tiles: [],
        stock: [],
        discardPile: [],
        table: [],
        status: 'IN_PROGRESS',
        startTime: new Date(),
        endTime: null,
      };

      const result = GameStateSchema.safeParse(invalidGameState);
      expect(result.success).toBe(false);
    });

    it('should reject game with more than 4 players', () => {
      const players = Array.from({ length: 5 }, (_, i) => ({
        userId: `123e4567-e89b-12d3-a456-42661417400${i}`,
        username: `player${i + 1}`,
        hand: [],
        score: 0,
        isConnected: true,
      }));

      const invalidGameState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'RUMMY_PRO',
        players,
        currentTurn: players[0].userId,
        tiles: [],
        stock: [],
        discardPile: [],
        table: [],
        status: 'IN_PROGRESS',
        startTime: new Date(),
        endTime: null,
      };

      const result = GameStateSchema.safeParse(invalidGameState);
      expect(result.success).toBe(false);
    });
  });
});
