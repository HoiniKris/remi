import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameEngine, GameMove } from '../GameEngine';
import { Tile } from '../../models/GameState';

describe('GameEngine', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
  });

  describe('Room Management', () => {
    it('should create a new room', () => {
      const result = gameEngine.createRoom('player1', 'Alice');

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.gameState!.players).toHaveLength(1);
      expect(result.gameState!.players[0].name).toBe('Alice');
      expect(result.gameState!.gamePhase).toBe('WAITING');
    });

    it('should allow players to join room', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;

      const joinResult = gameEngine.joinRoom(roomId, 'player2', 'Bob');

      expect(joinResult.success).toBe(true);
      expect(joinResult.gameState!.players).toHaveLength(2);
      expect(joinResult.gameState!.players[1].name).toBe('Bob');
    });

    it('should reject joining non-existent room', () => {
      const result = gameEngine.joinRoom('invalid-room', 'player1', 'Alice');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject joining full room', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice', { maxPlayers: 2 });
      const roomId = createResult.gameState!.id;

      gameEngine.joinRoom(roomId, 'player2', 'Bob');
      const result = gameEngine.joinRoom(roomId, 'player3', 'Charlie');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    it('should reject duplicate player joining', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;

      const result = gameEngine.joinRoom(roomId, 'player1', 'Alice Again');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in room');
    });
  });

  describe('Game Start', () => {
    it('should start game with proper tile distribution', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');

      const startResult = gameEngine.startGame(roomId, 'player1');

      expect(startResult.success).toBe(true);
      expect(startResult.gameState!.gamePhase).toBe('PLAYING');
      expect(startResult.gameState!.players[0].tiles).toHaveLength(15); // First player
      expect(startResult.gameState!.players[1].tiles).toHaveLength(14); // Second player
      expect(startResult.gameState!.stockPile.length).toBeGreaterThan(0);
    });

    it('should reject start with insufficient players', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;

      const result = gameEngine.startGame(roomId, 'player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Need at least 2 players to start');
    });

    it('should reject start by non-host', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');

      const result = gameEngine.startGame(roomId, 'player2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only host can start the game');
    });
  });

  describe('Game Moves', () => {
    let roomId: string;

    beforeEach(() => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');
      gameEngine.startGame(roomId, 'player1');
    });

    it('should allow drawing from stock pile', () => {
      const room = gameEngine.getRoom(roomId)!;
      const initialTileCount = room.players[0].tiles.length;
      const initialStockCount = room.stockPile.length;

      const move: GameMove = {
        type: 'DRAW_STOCK',
        playerId: 'player1',
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.players[0].tiles).toHaveLength(initialTileCount + 1);
      expect(result.gameState!.stockPile).toHaveLength(initialStockCount - 1);
    });

    it('should reject move by wrong player', () => {
      const move: GameMove = {
        type: 'DRAW_STOCK',
        playerId: 'player2', // Not current player
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should validate first meld minimum points', () => {
      const room = gameEngine.getRoom(roomId)!;

      // Create a low-value combination (less than 30 points)
      const lowValueTiles: Tile[] = [
        { id: 'tile1', number: 2, color: 'RED', isJoker: false },
        { id: 'tile2', number: 2, color: 'BLUE', isJoker: false },
        { id: 'tile3', number: 2, color: 'YELLOW', isJoker: false },
      ];

      // Add these tiles to player's hand
      room.players[0].tiles.push(...lowValueTiles);

      const move: GameMove = {
        type: 'PLAY_TILES',
        playerId: 'player1',
        combinations: [
          {
            type: 'SET',
            tiles: lowValueTiles,
            isValid: true,
          },
        ],
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('First meld must be at least 30 points');
    });

    it('should allow valid first meld', () => {
      const room = gameEngine.getRoom(roomId)!;

      // Create a high-value combination (30+ points)
      const highValueTiles: Tile[] = [
        { id: 'tile1', number: 10, color: 'RED', isJoker: false },
        { id: 'tile2', number: 10, color: 'BLUE', isJoker: false },
        { id: 'tile3', number: 10, color: 'YELLOW', isJoker: false },
      ];

      // Add these tiles to player's hand
      room.players[0].tiles.push(...highValueTiles);

      const move: GameMove = {
        type: 'PLAY_TILES',
        playerId: 'player1',
        combinations: [
          {
            type: 'SET',
            tiles: highValueTiles,
            isValid: true,
          },
        ],
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.players[0].hasCompletedFirstMeld).toBe(true);
      expect(result.gameState!.tableCombinations).toHaveLength(1);
    });

    it('should end turn correctly', () => {
      const move: GameMove = {
        type: 'END_TURN',
        playerId: 'player1',
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.currentPlayerIndex).toBe(1); // Next player
    });
  });

  describe('Game End Conditions', () => {
    let roomId: string;

    beforeEach(() => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');
      gameEngine.startGame(roomId, 'player1');
    });

    it('should end game when player has valid win condition', () => {
      const room = gameEngine.getRoom(roomId)!;

      // Set up winning condition: 1 tile left and valid combinations on table
      room.players[0].tiles = [{ id: 'last-tile', number: 5, color: 'RED', isJoker: false }];
      room.players[0].hasCompletedFirstMeld = true;

      // Add valid combinations to table
      room.tableCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile1', number: 1, color: 'BLUE', isJoker: false },
            { id: 'tile2', number: 2, color: 'BLUE', isJoker: false },
            { id: 'tile3', number: 3, color: 'BLUE', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const move: GameMove = {
        type: 'END_GAME',
        playerId: 'player1',
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.gamePhase).toBe('FINISHED');
      expect(result.gameState!.players[0].score).toBeGreaterThan(0); // Winner gets points
    });

    it('should calculate scores correctly at game end', () => {
      const room = gameEngine.getRoom(roomId)!;

      // Set up tiles for scoring
      room.players[1].tiles = [
        { id: 'tile1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile2', number: 7, color: 'BLUE', isJoker: false },
        { id: 'joker1', number: 0, color: 'RED', isJoker: true },
      ];

      room.players[0].tiles = [{ id: 'last-tile', number: 3, color: 'YELLOW', isJoker: false }];
      room.players[0].hasCompletedFirstMeld = true;

      // Add valid combinations to table
      room.tableCombinations = [
        {
          type: 'SET',
          tiles: [
            { id: 'tile-a', number: 10, color: 'RED', isJoker: false },
            { id: 'tile-b', number: 10, color: 'BLUE', isJoker: false },
            { id: 'tile-c', number: 10, color: 'YELLOW', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const move: GameMove = {
        type: 'END_GAME',
        playerId: 'player1',
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      // Winner gets points from losers plus win bonus
      expect(result.gameState!.players[0].score).toBeGreaterThan(0);
      // Loser gets negative points for remaining tiles
      expect(result.gameState!.players[1].score).toBe(-(5 + 7 + 25)); // -(5 + 7 + joker penalty)
    });
  });

  describe('Room Cleanup', () => {
    it('should remove inactive rooms', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const room = createResult.gameState!;

      // Set last activity to 2 hours ago
      room.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const removedCount = gameEngine.cleanupInactiveRooms(30); // 30 minutes threshold

      expect(removedCount).toBe(1);
      expect(gameEngine.getRoom(room.id)).toBeUndefined();
    });

    it('should keep active rooms', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const room = createResult.gameState!;

      // Set last activity to 10 minutes ago
      room.lastActivity = new Date(Date.now() - 10 * 60 * 1000);

      const removedCount = gameEngine.cleanupInactiveRooms(30); // 30 minutes threshold

      expect(removedCount).toBe(0);
      expect(gameEngine.getRoom(room.id)).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stock pile', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');
      gameEngine.startGame(roomId, 'player1');

      const room = gameEngine.getRoom(roomId)!;
      room.stockPile = []; // Empty stock pile

      const move: GameMove = {
        type: 'DRAW_STOCK',
        playerId: 'player1',
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stock pile is empty');
    });

    it('should handle invalid tile play', () => {
      const createResult = gameEngine.createRoom('player1', 'Alice');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Bob');
      gameEngine.startGame(roomId, 'player1');

      const move: GameMove = {
        type: 'PLAY_TILES',
        playerId: 'player1',
        combinations: [
          {
            type: 'SET',
            tiles: [
              { id: 'fake1', number: 10, color: 'RED', isJoker: false },
              { id: 'fake2', number: 10, color: 'BLUE', isJoker: false },
              { id: 'fake3', number: 10, color: 'YELLOW', isJoker: false },
            ],
            isValid: true,
          },
        ],
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Player doesn't have tile");
    });
  });
});
