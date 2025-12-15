import { describe, it, expect, beforeEach } from '@jest/globals';
import { RemiPeTablaEngine } from '../RemiPeTablaEngine';
import { Combination } from '../../models/GameState';

describe('RemiPeTablaEngine', () => {
  let engine: RemiPeTablaEngine;

  beforeEach(() => {
    engine = new RemiPeTablaEngine();
  });

  describe('Room Management', () => {
    it('should create a new Remi pe Tablă room', () => {
      const result = engine.createRoom('player1', 'Player 1');

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.gameState!.gameType).toBe('REMI_PE_TABLA');
      expect(result.gameState!.players).toHaveLength(1);
      expect(result.gameState!.players[0].id).toBe('player1');
      expect(result.gameState!.settings.counterClockwise).toBe(true);
    });

    it('should allow players to join room', () => {
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;

      const joinResult = engine.joinRoom(roomId, 'player2', 'Player 2');

      expect(joinResult.success).toBe(true);
      expect(joinResult.gameState!.players).toHaveLength(2);
    });

    it('should reject joining non-existent room', () => {
      const result = engine.joinRoom('fake-room', 'player1', 'Player 1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject joining full room', () => {
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;

      // Fill the room (max 4 players)
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.joinRoom(roomId, 'player3', 'Player 3');
      engine.joinRoom(roomId, 'player4', 'Player 4');

      const result = engine.joinRoom(roomId, 'player5', 'Player 5');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });
  });

  describe('Game Start', () => {
    it('should start game with proper tile distribution', () => {
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');

      const startResult = engine.startGame(roomId, 'player1');

      expect(startResult.success).toBe(true);
      const room = startResult.gameState!;

      // First player gets 15 tiles
      expect(room.players[0].tiles.length).toBe(15);
      // Second player gets 14 tiles
      expect(room.players[1].tiles.length).toBe(14);
      // Game is playing
      expect(room.gamePhase).toBe('PLAYING');
      // Stock pile has remaining tiles
      expect(room.stockPile.length).toBeGreaterThan(0);
    });

    it('should set trump tile', () => {
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');

      const startResult = engine.startGame(roomId, 'player1');
      const room = startResult.gameState!;

      expect(room.trumpTile).toBeDefined();
    });

    it('should reject start with insufficient players', () => {
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;

      const result = engine.startGame(roomId, 'player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Need at least 2 players to start');
    });
  });

  describe('Game Moves', () => {
    let roomId: string;

    beforeEach(() => {
      const createResult = engine.createRoom('player1', 'Player 1');
      roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');
    });

    it('should allow drawing from stock pile', () => {
      const room = engine.getRoom(roomId)!;
      const initialTileCount = room.players[0].tiles.length;
      const initialStockCount = room.stockPile.length;

      const result = engine.executeMove(roomId, {
        type: 'DRAW_STOCK',
        playerId: 'player1',
      });

      expect(result.success).toBe(true);
      expect(result.gameState!.players[0].tiles.length).toBe(initialTileCount + 1);
      expect(result.gameState!.stockPile.length).toBe(initialStockCount - 1);
    });

    it('should allow drawing from discard pile', () => {
      const room = engine.getRoom(roomId)!;

      // First, discard a tile
      const tileToDiscard = room.players[0].tiles[0];
      engine.executeMove(roomId, {
        type: 'DISCARD',
        playerId: 'player1',
        tile: tileToDiscard,
      });

      // Now player 2 can draw from discard
      const initialTileCount = room.players[1].tiles.length;
      const result = engine.executeMove(roomId, {
        type: 'DRAW_DISCARD',
        playerId: 'player2',
      });

      expect(result.success).toBe(true);
      expect(result.gameState!.players[1].tiles.length).toBe(initialTileCount + 1);
      expect(result.gameState!.discardPile.length).toBe(0);
    });

    it('should allow arranging tiles on private board', () => {
      const room = engine.getRoom(roomId)!;
      const player = room.players[0];

      // Create a valid run combination
      const combination: Combination = {
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
          { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      };

      // Add these tiles to player's hand
      player.tiles.push(...combination.tiles);

      const result = engine.executeMove(roomId, {
        type: 'ARRANGE_BOARD',
        playerId: 'player1',
        boardCombinations: [combination],
      });

      expect(result.success).toBe(true);
      expect(result.gameState!.players[0].boardCombinations).toHaveLength(1);
    });

    it('should advance turn counter-clockwise after discard', () => {
      const room = engine.getRoom(roomId)!;
      expect(room.currentPlayerIndex).toBe(0);

      const tileToDiscard = room.players[0].tiles[0];
      engine.executeMove(roomId, {
        type: 'DISCARD',
        playerId: 'player1',
        tile: tileToDiscard,
      });

      const updatedRoom = engine.getRoom(roomId)!;
      // Counter-clockwise: from player 0 to player 1 (last player)
      expect(updatedRoom.currentPlayerIndex).toBe(1);
    });

    it('should reject move by wrong player', () => {
      const result = engine.executeMove(roomId, {
        type: 'DRAW_STOCK',
        playerId: 'player2', // Not their turn
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });
  });

  describe('Win Condition', () => {
    let roomId: string;

    beforeEach(() => {
      const createResult = engine.createRoom('player1', 'Player 1');
      roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');
    });

    it('should allow closing game with valid board', () => {
      const room = engine.getRoom(roomId)!;
      const player = room.players[0];

      // Set up a winning board: all tiles in combinations except one
      player.tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 7, color: 'RED', isJoker: false },
        { id: 'tile-5', number: 8, color: 'RED', isJoker: false },
        { id: 'tile-6', number: 9, color: 'RED', isJoker: false },
        { id: 'tile-7', number: 10, color: 'RED', isJoker: false }, // This one to discard
      ];

      player.boardCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
            { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-4', number: 7, color: 'RED', isJoker: false },
            { id: 'tile-5', number: 8, color: 'RED', isJoker: false },
            { id: 'tile-6', number: 9, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      expect(result.success).toBe(true);
      expect(result.gameState!.gamePhase).toBe('FINISHED');
      expect(result.gameState!.winnerId).toBe('player1');
    });

    it('should reject closing with invalid combinations', () => {
      const room = engine.getRoom(roomId)!;
      const player = room.players[0];

      player.tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 7, color: 'RED', isJoker: false }, // Invalid: not consecutive
        { id: 'tile-4', number: 10, color: 'RED', isJoker: false },
      ];

      player.boardCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
            { id: 'tile-3', number: 7, color: 'RED', isJoker: false }, // Gap!
          ],
          isValid: false,
        },
      ];

      const result = engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject closing with more than one tile left', () => {
      const room = engine.getRoom(roomId)!;
      const player = room.players[0];

      player.tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 10, color: 'RED', isJoker: false },
        { id: 'tile-5', number: 11, color: 'RED', isJoker: false }, // Two tiles not in combinations
      ];

      player.boardCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
            { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exactly 1 tile to discard');
    });

    it('should detect Monocolor pattern (all same color)', () => {
      const room = engine.getRoom(roomId)!;
      const player = room.players[0];

      // Set up winning board - all RED (Monocolor = 1000 points)
      player.tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 10, color: 'RED', isJoker: false },
      ];

      player.boardCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
            { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      expect(result.success).toBe(true);
      expect(result.winScore).toBe(1000); // Monocolor pattern
      expect(result.winPattern?.pattern).toBe('MONOCOLOR');
    });
  });

  describe('Scoring', () => {
    it('should calculate scores with pattern detection', () => {
      const createResult = engine.createRoom('player1', 'Player 1', {
        jokerPenalty: 50,
        tableMultiplier: 1,
      });
      const roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      const room = engine.getRoom(roomId)!;

      // Player 1 wins with Monocolor (1000 points)
      room.players[0].tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 10, color: 'RED', isJoker: false },
      ];

      room.players[0].boardCombinations = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
            { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
      ];

      engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      const finalRoom = engine.getRoom(roomId)!;

      // Player 1 wins with Monocolor (1000 points from player 2)
      expect(finalRoom.players[0].score).toBe(1000);
      // Player 2 loses 1000 points
      expect(finalRoom.players[1].score).toBe(-1000);
    });

    it('should apply table multiplier', () => {
      const createResult = engine.createRoom('player1', 'Player 1', {
        tableMultiplier: 2, // x2 multiplier
      });
      const roomId = createResult.gameState!.id;
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      const room = engine.getRoom(roomId)!;

      // Player 1 wins with mixed colors (Simple game = 250 points base)
      room.players[0].tiles = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 6, color: 'YELLOW', isJoker: false },
        { id: 'tile-4', number: 10, color: 'BLACK', isJoker: false },
      ];

      room.players[0].boardCombinations = [
        {
          type: 'SET',
          tiles: [
            { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 4, color: 'BLUE', isJoker: false },
            { id: 'tile-3', number: 4, color: 'YELLOW', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = engine.executeMove(roomId, {
        type: 'CLOSE_GAME',
        playerId: 'player1',
      });

      expect(result.success).toBe(true);
      expect(result.finalScoreWithMultiplier).toBe(result.winScore! * 2);
    });
  });
});
