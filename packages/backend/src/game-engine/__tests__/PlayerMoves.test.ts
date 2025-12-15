import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameEngine, GameMove } from '../GameEngine';
import { Tile } from '../../models/GameState';

describe('Player Moves - Discard and Joker Replacement', () => {
  let gameEngine: GameEngine;
  let roomId: string;

  beforeEach(() => {
    gameEngine = new GameEngine();
    const createResult = gameEngine.createRoom('player1', 'Alice');
    roomId = createResult.gameState!.id;
    gameEngine.joinRoom(roomId, 'player2', 'Bob');
    gameEngine.startGame(roomId, 'player1');
  });

  describe('Discard Tile', () => {
    it('should allow player to discard a tile from their hand', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];
      const tileToDiscard = currentPlayer.tiles[0];
      const initialHandSize = currentPlayer.tiles.length;
      const initialDiscardSize = room.discardPile.length;

      const move: GameMove = {
        type: 'DISCARD',
        playerId: currentPlayer.id,
        tile: tileToDiscard,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.players[room.currentPlayerIndex].tiles).toHaveLength(
        initialHandSize - 1
      );
      expect(result.gameState!.discardPile).toHaveLength(initialDiscardSize + 1);
      expect(result.gameState!.discardPile[result.gameState!.discardPile.length - 1].id).toBe(
        tileToDiscard.id
      );
    });

    it('should reject discarding a tile not in hand', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const fakeTile: Tile = {
        id: 'fake-tile',
        number: 10,
        color: 'RED',
        isJoker: false,
      };

      const move: GameMove = {
        type: 'DISCARD',
        playerId: currentPlayer.id,
        tile: fakeTile,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't have this tile");
    });

    it('should reject discard without specifying a tile', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const move: GameMove = {
        type: 'DISCARD',
        playerId: currentPlayer.id,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tile specified');
    });
  });

  describe('Replace Joker', () => {
    it('should allow replacing a joker in a run with the correct tile', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      // Set up a run with a joker on the table
      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      const runTiles: Tile[] = [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        joker, // Represents RED 5
        { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
      ];

      room.tableCombinations.push({
        type: 'RUN',
        tiles: runTiles,
        isValid: true,
      });

      // Give player the replacement tile (use unique ID to avoid conflicts)
      const replacementTile: Tile = {
        id: 'test-replacement-tile-unique',
        number: 5,
        color: 'RED',
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

      if (!result.success) {
        console.log('Error:', result.error);
        console.log('Combination:', room.tableCombinations[0]);
        console.log('Replacement tile:', replacementTile);
        console.log('Player tiles:', currentPlayer.tiles);
      }
      expect(result.success).toBe(true);
      expect(result.gameState!.tableCombinations[0].tiles[1].id).toBe(replacementTile.id);
      expect(result.gameState!.tableCombinations[0].tiles[1].isJoker).toBe(false);
      expect(
        result.gameState!.players[room.currentPlayerIndex].tiles.some((t) => t.id === joker.id)
      ).toBe(true);
    });

    it('should allow replacing a joker in a set with the correct tile', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      // Set up a set with a joker
      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      const setTiles: Tile[] = [
        { id: 'tile-1', number: 7, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
        joker, // Represents 7 in a different color
      ];

      room.tableCombinations.push({
        type: 'SET',
        tiles: setTiles,
        isValid: true,
      });

      // Give player the replacement tile (7 YELLOW)
      const replacementTile: Tile = { id: 'tile-3', number: 7, color: 'YELLOW', isJoker: false };
      currentPlayer.tiles.push(replacementTile);
      currentPlayer.hasCompletedFirstMeld = true;

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: replacementTile,
        targetCombinationIndex: 0,
        jokerIndex: 2,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(true);
      expect(result.gameState!.tableCombinations[0].tiles[2].id).toBe(replacementTile.id);
      expect(
        result.gameState!.players[room.currentPlayerIndex].tiles.some((t) => t.id === joker.id)
      ).toBe(true);
    });

    it('should reject joker replacement before first meld', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      room.tableCombinations.push({
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          joker,
          { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      });

      const replacementTile: Tile = { id: 'tile-3', number: 5, color: 'RED', isJoker: false };
      currentPlayer.tiles.push(replacementTile);
      currentPlayer.hasCompletedFirstMeld = false; // Not completed first meld

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: replacementTile,
        targetCombinationIndex: 0,
        jokerIndex: 1,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Must complete first meld');
    });

    it('should reject replacement with wrong tile number in run', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      room.tableCombinations.push({
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          joker, // Should be RED 5
          { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      });

      // Wrong number (7 instead of 5)
      const wrongTile: Tile = { id: 'tile-3', number: 7, color: 'RED', isJoker: false };
      currentPlayer.tiles.push(wrongTile);
      currentPlayer.hasCompletedFirstMeld = true;

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: wrongTile,
        targetCombinationIndex: 0,
        jokerIndex: 1,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Replacement tile must be');
    });

    it('should reject replacement with wrong color in run', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      room.tableCombinations.push({
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          joker, // Should be RED 5
          { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      });

      // Wrong color (BLUE instead of RED)
      const wrongTile: Tile = { id: 'tile-3', number: 5, color: 'BLUE', isJoker: false };
      currentPlayer.tiles.push(wrongTile);
      currentPlayer.hasCompletedFirstMeld = true;

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: wrongTile,
        targetCombinationIndex: 0,
        jokerIndex: 1,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Replacement tile must be');
    });

    it('should reject replacement with duplicate color in set', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      room.tableCombinations.push({
        type: 'SET',
        tiles: [
          { id: 'tile-1', number: 7, color: 'RED', isJoker: false },
          { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
          joker,
        ],
        isValid: true,
      });

      // Duplicate color (RED already exists)
      const duplicateTile: Tile = {
        id: 'test-duplicate-tile-unique',
        number: 7,
        color: 'RED',
        isJoker: false,
      };
      currentPlayer.tiles.push(duplicateTile);
      currentPlayer.hasCompletedFirstMeld = true;

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: duplicateTile,
        targetCombinationIndex: 0,
        jokerIndex: 2,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already in the set');
    });

    it('should reject replacement when player does not have the tile', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      const joker: Tile = { id: 'joker-1', number: 0, color: 'RED', isJoker: true };
      room.tableCombinations.push({
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          joker,
          { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      });

      currentPlayer.hasCompletedFirstMeld = true;

      // Tile not in player's hand
      const notOwnedTile: Tile = { id: 'tile-999', number: 5, color: 'RED', isJoker: false };

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: notOwnedTile,
        targetCombinationIndex: 0,
        jokerIndex: 1,
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't have the replacement tile");
    });

    it('should reject replacement when target is not a joker', () => {
      const room = gameEngine.getRoom(roomId)!;
      const currentPlayer = room.players[room.currentPlayerIndex];

      room.tableCombinations.push({
        type: 'RUN',
        tiles: [
          { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
          { id: 'tile-2', number: 5, color: 'RED', isJoker: false }, // Not a joker
          { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      });

      const replacementTile: Tile = { id: 'tile-4', number: 5, color: 'RED', isJoker: false };
      currentPlayer.tiles.push(replacementTile);
      currentPlayer.hasCompletedFirstMeld = true;

      const move: GameMove = {
        type: 'REPLACE_JOKER',
        playerId: currentPlayer.id,
        tile: replacementTile,
        targetCombinationIndex: 0,
        jokerIndex: 1, // Points to a regular tile, not a joker
      };

      const result = gameEngine.executeMove(roomId, move);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a joker');
    });
  });
});
