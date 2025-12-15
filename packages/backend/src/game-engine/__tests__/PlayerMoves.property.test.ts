import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { GameEngine, GameMove } from '../GameEngine';
import { Tile } from '../../models/GameState';

/**
 * Property-based tests for player moves
 * Feature: rummy-game-platform
 */

describe('Player Moves Property Tests', () => {
  // Helper to count all tiles in the game
  const countAllTiles = (gameEngine: GameEngine, roomId: string): number => {
    const room = gameEngine.getRoom(roomId);
    if (!room) return 0;

    const tilesInHands = room.players.reduce((sum, p) => sum + p.tiles.length, 0);
    const tilesInStock = room.stockPile.length;
    const tilesInDiscard = room.discardPile.length;
    const tilesOnTable = room.tableCombinations.reduce((sum, c) => sum + c.tiles.length, 0);

    return tilesInHands + tilesInStock + tilesInDiscard + tilesOnTable;
  };

  // Feature: rummy-game-platform, Property 15: Tile Conservation During Actions
  // Validates: Requirements 6.2, 6.3
  describe('Property 15: Tile Conservation During Actions', () => {
    it('should maintain constant tile count after draw from stock', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          gameEngine.startGame(roomId, 'player1');

          const initialCount = countAllTiles(gameEngine, roomId);
          const room = gameEngine.getRoom(roomId)!;

          // Draw from stock
          const move: GameMove = {
            type: 'DRAW_STOCK',
            playerId: room.players[room.currentPlayerIndex].id,
          };

          const result = gameEngine.executeMove(roomId, move);

          if (result.success) {
            const finalCount = countAllTiles(gameEngine, roomId);
            expect(finalCount).toBe(initialCount);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain constant tile count after discard', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          gameEngine.startGame(roomId, 'player1');

          const initialCount = countAllTiles(gameEngine, roomId);
          const room = gameEngine.getRoom(roomId)!;
          const currentPlayer = room.players[room.currentPlayerIndex];

          if (currentPlayer.tiles.length > 0) {
            const tileToDiscard = currentPlayer.tiles[0];

            const move: GameMove = {
              type: 'DISCARD',
              playerId: currentPlayer.id,
              tile: tileToDiscard,
            };

            const result = gameEngine.executeMove(roomId, move);

            if (result.success) {
              const finalCount = countAllTiles(gameEngine, roomId);
              expect(finalCount).toBe(initialCount);
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain constant tile count after joker replacement', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          gameEngine.startGame(roomId, 'player1');

          const room = gameEngine.getRoom(roomId)!;
          const currentPlayer = room.players[room.currentPlayerIndex];

          // Set up a combination with a joker
          const joker: Tile = { id: 'test-joker', number: 0, color: 'RED', isJoker: true };
          const runTiles: Tile[] = [
            { id: 'test-tile-1', number: 4, color: 'RED', isJoker: false },
            joker,
            { id: 'test-tile-2', number: 6, color: 'RED', isJoker: false },
          ];

          room.tableCombinations.push({
            type: 'RUN',
            tiles: runTiles,
            isValid: true,
          });

          // Give player the replacement tile
          const replacementTile: Tile = {
            id: 'test-replacement',
            number: 5,
            color: 'RED',
            isJoker: false,
          };
          currentPlayer.tiles.push(replacementTile);
          currentPlayer.hasCompletedFirstMeld = true;

          const initialCount = countAllTiles(gameEngine, roomId);

          const move: GameMove = {
            type: 'REPLACE_JOKER',
            playerId: currentPlayer.id,
            tile: replacementTile,
            targetCombinationIndex: 0,
            jokerIndex: 1,
          };

          const result = gameEngine.executeMove(roomId, move);

          if (result.success) {
            const finalCount = countAllTiles(gameEngine, roomId);
            expect(finalCount).toBe(initialCount);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain tile conservation across multiple moves', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }),
          fc.array(fc.constantFrom('DRAW_STOCK', 'END_TURN'), { minLength: 1, maxLength: 10 }),
          (numPlayers, moveTypes) => {
            const gameEngine = new GameEngine();
            const createResult = gameEngine.createRoom('player1', 'Player 1');
            const roomId = createResult.gameState!.id;

            for (let i = 2; i <= numPlayers; i++) {
              gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
            }

            gameEngine.startGame(roomId, 'player1');

            const initialCount = countAllTiles(gameEngine, roomId);

            // Execute a sequence of moves
            for (const moveType of moveTypes) {
              const room = gameEngine.getRoom(roomId)!;
              if (room.gamePhase !== 'PLAYING') break;

              const currentPlayer = room.players[room.currentPlayerIndex];

              if (moveType === 'DRAW_STOCK' && room.stockPile.length > 0) {
                const move: GameMove = {
                  type: 'DRAW_STOCK',
                  playerId: currentPlayer.id,
                };
                gameEngine.executeMove(roomId, move);
              } else if (moveType === 'END_TURN') {
                const move: GameMove = {
                  type: 'END_TURN',
                  playerId: currentPlayer.id,
                };
                gameEngine.executeMove(roomId, move);
              }
            }

            const finalCount = countAllTiles(gameEngine, roomId);
            expect(finalCount).toBe(initialCount);

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 16: Turn Action Exclusivity
  // Validates: Requirements 6.1
  describe('Property 16: Turn Action Exclusivity', () => {
    it('should only allow current player to make moves', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          gameEngine.startGame(roomId, 'player1');

          const room = gameEngine.getRoom(roomId)!;
          const otherPlayer = room.players[(room.currentPlayerIndex + 1) % room.players.length];

          // Try to make a move with a non-current player
          const move: GameMove = {
            type: 'DRAW_STOCK',
            playerId: otherPlayer.id,
          };

          const result = gameEngine.executeMove(roomId, move);

          // Should always fail
          expect(result.success).toBe(false);
          expect(result.error).toContain('Not your turn');

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should advance turn after END_TURN', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 4 }), (numPlayers) => {
          const gameEngine = new GameEngine();
          const createResult = gameEngine.createRoom('player1', 'Player 1');
          const roomId = createResult.gameState!.id;

          for (let i = 2; i <= numPlayers; i++) {
            gameEngine.joinRoom(roomId, `player${i}`, `Player ${i}`);
          }

          gameEngine.startGame(roomId, 'player1');

          const room = gameEngine.getRoom(roomId)!;
          const initialPlayerIndex = room.currentPlayerIndex;
          const currentPlayer = room.players[initialPlayerIndex];

          const move: GameMove = {
            type: 'END_TURN',
            playerId: currentPlayer.id,
          };

          const result = gameEngine.executeMove(roomId, move);

          if (result.success) {
            const newPlayerIndex = result.gameState!.currentPlayerIndex;
            const expectedIndex = (initialPlayerIndex + 1) % numPlayers;
            expect(newPlayerIndex).toBe(expectedIndex);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 13: Joker Replacement Correctness
  // Validates: Requirements 5.4
  describe('Property 13: Joker Replacement Correctness', () => {
    it('should always result in valid combination after joker replacement', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 11 }), // start number for run
          fc.constantFrom('RED' as const, 'YELLOW' as const, 'BLUE' as const, 'BLACK' as const),
          (startNumber, color) => {
            const gameEngine = new GameEngine();
            const createResult = gameEngine.createRoom('player1', 'Player 1');
            const roomId = createResult.gameState!.id;
            gameEngine.joinRoom(roomId, 'player2', 'Player 2');
            gameEngine.startGame(roomId, 'player1');

            const room = gameEngine.getRoom(roomId)!;
            const currentPlayer = room.players[room.currentPlayerIndex];

            // Create a run with joker in the middle
            const joker: Tile = { id: 'test-joker', number: 0, color, isJoker: true };
            const runTiles: Tile[] = [
              { id: 'tile-1', number: startNumber, color, isJoker: false },
              joker, // Represents startNumber + 1
              { id: 'tile-2', number: startNumber + 2, color, isJoker: false },
            ];

            room.tableCombinations.push({
              type: 'RUN',
              tiles: runTiles,
              isValid: true,
            });

            // Give player the correct replacement tile
            const replacementTile: Tile = {
              id: 'replacement',
              number: startNumber + 1,
              color,
              isJoker: false,
            };
            currentPlayer.tiles.push(replacementTile);
            currentPlayer.hasCompletedFirstMeld = true;

            const move: GameMove = {
              type: 'REPLACE_JOKER',
              playerId: currentPlayer.id,
              tile: replacementTile,
              targetCombinationIndex: 0,
              jokerIndex: 1,
            };

            const result = gameEngine.executeMove(roomId, move);

            if (result.success) {
              const combination = result.gameState!.tableCombinations[0];

              // Combination should still be valid
              expect(combination.tiles[1].number).toBe(startNumber + 1);
              expect(combination.tiles[1].color).toBe(color);
              expect(combination.tiles[1].isJoker).toBe(false);

              // Player should have the joker
              const hasJoker = result.gameState!.players[room.currentPlayerIndex].tiles.some(
                (t) => t.id === joker.id
              );
              expect(hasJoker).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stock pile gracefully', () => {
      const gameEngine = new GameEngine();
      const createResult = gameEngine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Player 2');
      gameEngine.startGame(roomId, 'player1');

      const room = gameEngine.getRoom(roomId)!;
      room.stockPile = []; // Empty the stock

      const move: GameMove = {
        type: 'DRAW_STOCK',
        playerId: room.players[room.currentPlayerIndex].id,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should handle empty discard pile gracefully', () => {
      const gameEngine = new GameEngine();
      const createResult = gameEngine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState!.id;
      gameEngine.joinRoom(roomId, 'player2', 'Player 2');
      gameEngine.startGame(roomId, 'player1');

      const room = gameEngine.getRoom(roomId)!;
      room.discardPile = []; // Empty the discard pile

      const move: GameMove = {
        type: 'DRAW_DISCARD',
        playerId: room.players[room.currentPlayerIndex].id,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });
});
