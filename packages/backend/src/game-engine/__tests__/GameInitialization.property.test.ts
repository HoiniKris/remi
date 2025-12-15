import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { GameEngine } from '../GameEngine';
import { generateTileSet } from '../TileUtils';

/**
 * Property-based tests for game initialization
 * Feature: rummy-game-platform
 */

describe('Game Initialization Property Tests', () => {
  // Feature: rummy-game-platform, Property 9: Game Initialization Tile Count
  // Validates: Requirements 4.1, 4.4
  describe('Property 9: Game Initialization Tile Count', () => {
    it('should always initialize with exactly 106 tiles (or up to 110 with extra Jokers)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // extra jokers (0-4)
          (extraJokers) => {
            const tiles = generateTileSet(extraJokers);
            const expectedCount = 106 + extraJokers;

            // Total tile count should match
            expect(tiles.length).toBe(expectedCount);

            // Count jokers
            const jokerCount = tiles.filter((t) => t.isJoker).length;
            expect(jokerCount).toBe(2 + extraJokers);

            // Count numbered tiles
            const numberedTiles = tiles.filter((t) => !t.isJoker);
            expect(numberedTiles.length).toBe(104);

            // Each numbered tile (1-13 in each of 4 colors) should appear exactly twice
            const colors = ['RED', 'YELLOW', 'BLUE', 'BLACK'];
            for (const color of colors) {
              for (let number = 1; number <= 13; number++) {
                const count = numberedTiles.filter(
                  (t) => t.color === color && t.number === number
                ).length;
                expect(count).toBe(2);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique tile IDs for all tiles', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 4 }), (extraJokers) => {
          const tiles = generateTileSet(extraJokers);
          const ids = tiles.map((t) => t.id);
          const uniqueIds = new Set(ids);

          // All IDs should be unique
          expect(uniqueIds.size).toBe(tiles.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 10: Tile Distribution Correctness
  // Validates: Requirements 4.3
  describe('Property 10: Tile Distribution Correctness', () => {
    it('should distribute tiles correctly for any number of players (2-4)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }), // number of players
          fc.integer({ min: 0, max: 4 }), // extra jokers
          (numPlayers, extraJokers) => {
            const gameEngine = new GameEngine();

            // Create room and add players
            const createResult = gameEngine.createRoom('player1', 'Player 1');
            const roomId = createResult.gameState!.id;

            for (let i = 2; i <= numPlayers; i++) {
              gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
            }

            // Start game with extra jokers
            const startResult = gameEngine.startGame(roomId, 'player1', extraJokers);
            expect(startResult.success).toBe(true);

            const room = startResult.gameState!;

            // First player should have 15 tiles
            expect(room.players[0].tiles.length).toBe(15);

            // Other players should have 14 tiles
            for (let i = 1; i < numPlayers; i++) {
              expect(room.players[i].tiles.length).toBe(14);
            }

            // Calculate total tiles distributed
            const tilesInHands = room.players.reduce((sum, player) => sum + player.tiles.length, 0);
            const tilesInStock = room.stockPile.length;
            const tilesInDiscard = room.discardPile.length;
            const totalTiles = tilesInHands + tilesInStock + tilesInDiscard;

            // Total should equal initial tile count (106 + extra jokers)
            const expectedTotal = 106 + extraJokers;
            expect(totalTiles).toBe(expectedTotal);

            // All tile IDs should be unique across all locations
            const allTileIds = [
              ...room.players.flatMap((p) => p.tiles.map((t) => t.id)),
              ...room.stockPile.map((t) => t.id),
              ...room.discardPile.map((t) => t.id),
            ];
            const uniqueIds = new Set(allTileIds);
            expect(uniqueIds.size).toBe(totalTiles);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure no tile duplication across players and stock', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();

          // Create room and add players
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          // Start game
          const startResult = gameEngine.startGame(roomId, 'player1');
          const room = startResult.gameState!;

          // Collect all tiles
          const allTiles = [
            ...room.players.flatMap((p) => p.tiles),
            ...room.stockPile,
            ...room.discardPile,
          ];

          // Check for duplicate tile IDs
          const tileIds = allTiles.map((t) => t.id);
          const uniqueIds = new Set(tileIds);

          expect(uniqueIds.size).toBe(allTiles.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain tile conservation after multiple game initializations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 2, max: 4 }), { minLength: 1, maxLength: 10 }),
          (playerCounts) => {
            const gameEngine = new GameEngine();

            for (const numPlayers of playerCounts) {
              // Create and start a new game
              const createResult = gameEngine.createRoom(`host-${Date.now()}`, 'Host');
              const roomId = createResult.gameState!.id;

              for (let i = 2; i <= numPlayers; i++) {
                gameEngine.joinRoom(roomId, `player${i}-${Date.now()}`, `Player ${i}`);
              }

              const startResult = gameEngine.startGame(roomId, `host-${Date.now()}`);

              if (startResult.success) {
                const room = startResult.gameState!;

                // Verify tile conservation
                const totalTiles =
                  room.players.reduce((sum, p) => sum + p.tiles.length, 0) +
                  room.stockPile.length +
                  room.discardPile.length;

                expect(totalTiles).toBe(106); // Base tile count
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Tile Distribution Edge Cases', () => {
    it('should handle minimum players (2)', () => {
      const gameEngine = new GameEngine();
      const createResult = gameEngine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Player 2');

      const startResult = gameEngine.startGame(roomId, 'player1');
      const room = startResult.gameState!;

      expect(room.players[0].tiles.length).toBe(15);
      expect(room.players[1].tiles.length).toBe(14);
      expect(room.stockPile.length).toBe(106 - 15 - 14);
    });

    it('should handle maximum players (4)', () => {
      const gameEngine = new GameEngine();
      const createResult = gameEngine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;

      for (let i = 2; i <= 4; i++) {
        gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
      }

      const startResult = gameEngine.startGame(roomId, 'player1');
      const room = startResult.gameState!;

      expect(room.players[0].tiles.length).toBe(15);
      expect(room.players[1].tiles.length).toBe(14);
      expect(room.players[2].tiles.length).toBe(14);
      expect(room.players[3].tiles.length).toBe(14);
      expect(room.stockPile.length).toBe(106 - 15 - 14 - 14 - 14);
    });
  });

  describe('Tile Shuffling Properties', () => {
    it('should produce different tile orders on multiple initializations', () => {
      const gameEngine = new GameEngine();
      const tileOrders: string[][] = [];

      // Create multiple games and record tile orders
      for (let i = 0; i < 10; i++) {
        const createResult = gameEngine.createRoom(`host${i}`, 'Host');
        const roomId = createResult.gameState!.id;
        gameEngine.joinRoom(roomId, `player${i}`, 'Player');

        const startResult = gameEngine.startGame(roomId, `host${i}`);
        const room = startResult.gameState!;

        // Record the order of first player's tiles
        const order = room.players[0].tiles.map((t) => t.id);
        tileOrders.push(order);
      }

      // Check that not all orders are identical (shuffling is working)
      const firstOrder = JSON.stringify(tileOrders[0]);
      const allSame = tileOrders.every((order) => JSON.stringify(order) === firstOrder);

      expect(allSame).toBe(false);
    });
  });
});
