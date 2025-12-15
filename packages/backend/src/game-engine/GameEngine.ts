import { Tile, Combination, WinPattern } from '../models/GameState.js';
import { generateTileSet, shuffleTiles } from './TileUtils.js';
import { validateCombination } from './CombinationValidator.js';
import {
  validateWinCondition,
  calculateRemainingTilesScore,
  WinValidation,
} from './WinConditionChecker.js';

export interface Player {
  id: string;
  name: string;
  tiles: Tile[];
  hasCompletedFirstMeld: boolean;
  score: number;
  isOnline: boolean;
}

export interface GameRoom {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  stockPile: Tile[];
  discardPile: Tile[];
  tableCombinations: Combination[];
  gamePhase: 'WAITING' | 'PLAYING' | 'FINISHED';
  roundNumber: number;
  turnTimer: number; // seconds remaining
  settings: GameSettings;
  createdAt: Date;
  lastActivity: Date;
}

export interface GameSettings {
  maxPlayers: number;
  turnTimeLimit: number; // seconds
  firstMeldMinimum: number; // points
  allowWrapAroundRuns: boolean; // 13-1-2 allowed
  jokerPenalty: number; // points for Joker in hand at end
}

export interface GameMove {
  type:
    | 'DRAW_STOCK'
    | 'DRAW_DISCARD'
    | 'PLAY_TILES'
    | 'DISCARD'
    | 'REARRANGE'
    | 'REPLACE_JOKER'
    | 'END_TURN'
    | 'END_GAME';
  playerId: string;
  tiles?: Tile[];
  tile?: Tile; // For single tile operations (discard, replace joker)
  combinations?: Combination[];
  targetCombinationIndex?: number; // Index of combination in tableCombinations (for joker replacement)
  jokerIndex?: number; // Index of joker within the combination (for joker replacement)
}

export interface GameResult {
  success: boolean;
  error?: string;
  gameState?: GameRoom;
  winPattern?: WinPattern;
  winScore?: number;
  validMoves?: GameMove[];
}

/**
 * Main game engine for Rummy
 */
export class GameEngine {
  private rooms: Map<string, GameRoom> = new Map();
  private persistenceCallback?: (gameState: GameRoom) => Promise<void>;

  /**
   * Set persistence callback for automatic state saving
   */
  setPersistenceCallback(callback: (gameState: GameRoom) => Promise<void>): void {
    this.persistenceCallback = callback;
  }

  /**
   * Persist game state if callback is set
   */
  private async persistState(room: GameRoom): Promise<void> {
    if (this.persistenceCallback) {
      try {
        await this.persistenceCallback(room);
      } catch (error) {
        console.error('Failed to persist game state:', error);
      }
    }
  }

  /**
   * Create a new game room
   */
  createRoom(hostId: string, hostName: string, settings?: Partial<GameSettings>): GameResult {
    const defaultSettings: GameSettings = {
      maxPlayers: 4,
      turnTimeLimit: 60,
      firstMeldMinimum: 30,
      allowWrapAroundRuns: true,
      jokerPenalty: 25,
    };

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: GameRoom = {
      id: roomId,
      players: [
        {
          id: hostId,
          name: hostName,
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
      turnTimer: 0,
      settings: { ...defaultSettings, ...settings },
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(roomId, room);
    this.persistState(room); // Async, non-blocking
    return { success: true, gameState: room };
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId: string, playerId: string, playerName: string): GameResult {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.gamePhase !== 'WAITING') {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.players.some((p) => p.id === playerId)) {
      return { success: false, error: 'Player already in room' };
    }

    room.players.push({
      id: playerId,
      name: playerName,
      tiles: [],
      hasCompletedFirstMeld: false,
      score: 0,
      isOnline: true,
    });

    room.lastActivity = new Date();
    this.persistState(room); // Async, non-blocking
    return { success: true, gameState: room };
  }

  /**
   * Start the game (distribute tiles, set first player)
   */
  startGame(roomId: string, hostId: string, extraJokers: number = 0): GameResult {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players[0].id !== hostId) {
      return { success: false, error: 'Only host can start the game' };
    }

    if (room.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    if (room.gamePhase !== 'WAITING') {
      return { success: false, error: 'Game already started' };
    }

    // Generate and shuffle tiles (with optional extra jokers)
    const allTiles = generateTileSet(extraJokers);
    const shuffledTiles = shuffleTiles(allTiles);

    // Distribute tiles to players
    let tileIndex = 0;
    room.players.forEach((player, index) => {
      // First player gets 15 tiles, others get 14
      const tileCount = index === 0 ? 15 : 14;
      player.tiles = shuffledTiles.slice(tileIndex, tileIndex + tileCount);
      tileIndex += tileCount;
    });

    // Remaining tiles go to stock pile
    room.stockPile = shuffledTiles.slice(tileIndex);
    room.discardPile = [];
    room.tableCombinations = [];

    // Set game state
    room.gamePhase = 'PLAYING';
    room.currentPlayerIndex = 0;
    room.turnTimer = room.settings.turnTimeLimit;
    room.lastActivity = new Date();

    this.persistState(room); // Async, non-blocking
    return { success: true, gameState: room };
  }

  /**
   * Execute a game move
   */
  executeMove(roomId: string, move: GameMove): GameResult {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.gamePhase !== 'PLAYING') {
      return { success: false, error: 'Game not in progress' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    if (currentPlayer.id !== move.playerId) {
      return { success: false, error: 'Not your turn' };
    }

    room.lastActivity = new Date();

    let result: GameResult;
    switch (move.type) {
      case 'DRAW_STOCK':
        result = this.handleDrawStock(room);
        break;
      case 'DRAW_DISCARD':
        result = this.handleDrawDiscard(room);
        break;
      case 'PLAY_TILES':
        result = this.handlePlayTiles(room, move);
        break;
      case 'DISCARD':
        result = this.handleDiscard(room, move);
        break;
      case 'REARRANGE':
        result = this.handleRearrange(room, move);
        break;
      case 'REPLACE_JOKER':
        result = this.handleReplaceJoker(room, move);
        break;
      case 'END_TURN':
        result = this.handleEndTurn(room);
        break;
      case 'END_GAME':
        result = this.handleEndGame(room);
        break;
      default:
        return { success: false, error: 'Invalid move type' };
    }

    // Persist state after successful move
    if (result.success) {
      this.persistState(room);
    }

    return result;
  }

  /**
   * Handle drawing from stock pile
   */
  private handleDrawStock(room: GameRoom): GameResult {
    if (room.stockPile.length === 0) {
      return { success: false, error: 'Stock pile is empty' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const drawnTile = room.stockPile.pop()!;
    currentPlayer.tiles.push(drawnTile);

    return { success: true, gameState: room };
  }

  /**
   * Handle drawing from discard pile
   */
  private handleDrawDiscard(room: GameRoom): GameResult {
    if (room.discardPile.length === 0) {
      return { success: false, error: 'Discard pile is empty' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const drawnTile = room.discardPile.pop()!;
    currentPlayer.tiles.push(drawnTile);

    return { success: true, gameState: room };
  }

  /**
   * Handle discarding a tile
   */
  private handleDiscard(room: GameRoom, move: GameMove): GameResult {
    if (!move.tile) {
      return { success: false, error: 'No tile specified for discard' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    // Find the tile in player's hand
    const tileIndex = currentPlayer.tiles.findIndex((t) => t.id === move.tile!.id);
    if (tileIndex === -1) {
      return { success: false, error: "Player doesn't have this tile" };
    }

    // Remove tile from player's hand and add to discard pile
    const discardedTile = currentPlayer.tiles.splice(tileIndex, 1)[0];
    room.discardPile.push(discardedTile);

    return { success: true, gameState: room };
  }

  /**
   * Handle replacing a Joker in a combination with the actual tile
   */
  private handleReplaceJoker(room: GameRoom, move: GameMove): GameResult {
    if (!move.tile) {
      return { success: false, error: 'No replacement tile specified' };
    }

    if (move.targetCombinationIndex === undefined) {
      return { success: false, error: 'No target combination specified' };
    }

    if (move.jokerIndex === undefined) {
      return { success: false, error: 'No joker position specified' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    // Player must have completed first meld to manipulate table
    if (!currentPlayer.hasCompletedFirstMeld) {
      return { success: false, error: 'Must complete first meld before replacing jokers' };
    }

    // Verify combination exists
    if (move.targetCombinationIndex >= room.tableCombinations.length) {
      return { success: false, error: 'Invalid combination index' };
    }

    const combination = room.tableCombinations[move.targetCombinationIndex];

    // Verify joker exists at specified position
    if (move.jokerIndex >= combination.tiles.length) {
      return { success: false, error: 'Invalid joker position' };
    }

    const joker = combination.tiles[move.jokerIndex];
    if (!joker.isJoker) {
      return { success: false, error: 'Specified tile is not a joker' };
    }

    // Verify player has the replacement tile
    const playerTileIndex = currentPlayer.tiles.findIndex((t) => t.id === move.tile!.id);
    if (playerTileIndex === -1) {
      return { success: false, error: "Player doesn't have the replacement tile" };
    }

    const replacementTile = currentPlayer.tiles[playerTileIndex];

    // Verify the replacement tile matches what the joker represents
    // For a run: the tile must fit the sequence
    // For a set: the tile must have the same number but different color
    if (combination.type === 'RUN') {
      // Determine what number the joker represents based on position
      const prevTile = move.jokerIndex > 0 ? combination.tiles[move.jokerIndex - 1] : null;
      const nextTile =
        move.jokerIndex < combination.tiles.length - 1
          ? combination.tiles[move.jokerIndex + 1]
          : null;

      let expectedNumber: number;
      let expectedColor: string;

      if (prevTile && !prevTile.isJoker) {
        expectedNumber = prevTile.number + 1;
        expectedColor = prevTile.color;
      } else if (nextTile && !nextTile.isJoker) {
        expectedNumber = nextTile.number - 1;
        expectedColor = nextTile.color;
      } else {
        return { success: false, error: 'Cannot determine joker value in this position' };
      }

      if (replacementTile.number !== expectedNumber || replacementTile.color !== expectedColor) {
        return {
          success: false,
          error: `Replacement tile must be ${expectedColor} ${expectedNumber}`,
        };
      }
    } else if (combination.type === 'SET') {
      // For sets, find the number from non-joker tiles
      const nonJokerTile = combination.tiles.find((t) => !t.isJoker);
      if (!nonJokerTile) {
        return { success: false, error: 'Cannot determine set value' };
      }

      if (replacementTile.number !== nonJokerTile.number) {
        return {
          success: false,
          error: `Replacement tile must have number ${nonJokerTile.number}`,
        };
      }

      // Check that color is not already in the set
      const existingColors = combination.tiles.filter((t) => !t.isJoker).map((t) => t.color);
      if (existingColors.includes(replacementTile.color)) {
        return { success: false, error: 'This color is already in the set' };
      }
    }

    // Perform the replacement
    combination.tiles[move.jokerIndex] = replacementTile;
    currentPlayer.tiles.splice(playerTileIndex, 1);
    currentPlayer.tiles.push(joker);

    // Validate the combination is still valid
    if (!validateCombination(combination)) {
      // Rollback
      combination.tiles[move.jokerIndex] = joker;
      currentPlayer.tiles.push(replacementTile);
      currentPlayer.tiles.splice(currentPlayer.tiles.length - 1, 1);
      return { success: false, error: 'Replacement would create invalid combination' };
    }

    return { success: true, gameState: room };
  }

  /**
   * Handle playing tiles to the table
   */
  private handlePlayTiles(room: GameRoom, move: GameMove): GameResult {
    if (!move.combinations || move.combinations.length === 0) {
      return { success: false, error: 'No combinations provided' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    // Validate all combinations
    for (const combination of move.combinations) {
      if (!validateCombination(combination)) {
        return {
          success: false,
          error: `Invalid combination: ${combination.tiles.map((t) => `${t.color}${t.number}`).join(', ')}`,
        };
      }
    }

    // Check first meld requirement
    if (!currentPlayer.hasCompletedFirstMeld) {
      const totalPoints = this.calculateCombinationPoints(move.combinations);
      if (totalPoints < room.settings.firstMeldMinimum) {
        return {
          success: false,
          error: `First meld must be at least ${room.settings.firstMeldMinimum} points (you have ${totalPoints})`,
        };
      }
    }

    // Verify player has all the tiles
    const requiredTiles = move.combinations.flatMap((c) => c.tiles);
    for (const tile of requiredTiles) {
      const playerTileIndex = currentPlayer.tiles.findIndex((t) => t.id === tile.id);
      if (playerTileIndex === -1) {
        return {
          success: false,
          error: `Player doesn't have tile: ${tile.color}${tile.number}`,
        };
      }
    }

    // Remove tiles from player's hand
    for (const tile of requiredTiles) {
      const playerTileIndex = currentPlayer.tiles.findIndex((t) => t.id === tile.id);
      currentPlayer.tiles.splice(playerTileIndex, 1);
    }

    // Add combinations to table
    room.tableCombinations.push(...move.combinations);

    // Mark first meld as completed
    if (!currentPlayer.hasCompletedFirstMeld) {
      currentPlayer.hasCompletedFirstMeld = true;
    }

    // Check if player won (no tiles left)
    if (currentPlayer.tiles.length === 0) {
      return this.handleGameEnd(room, currentPlayer.id);
    }

    return { success: true, gameState: room };
  }

  /**
   * Handle table rearrangement
   */
  private handleRearrange(room: GameRoom, move: GameMove): GameResult {
    const currentPlayer = room.players[room.currentPlayerIndex];

    if (!currentPlayer.hasCompletedFirstMeld) {
      return { success: false, error: 'Must complete first meld before rearranging' };
    }

    if (!move.combinations) {
      return { success: false, error: 'No new table state provided' };
    }

    // Validate all new combinations
    for (const combination of move.combinations) {
      if (!validateCombination(combination)) {
        return { success: false, error: `Invalid combination after rearrangement` };
      }
    }

    // Update table combinations
    room.tableCombinations = move.combinations;

    return { success: true, gameState: room };
  }

  /**
   * Handle end turn
   */
  private handleEndTurn(room: GameRoom): GameResult {
    // Move to next player
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    room.turnTimer = room.settings.turnTimeLimit;

    return { success: true, gameState: room };
  }

  /**
   * Handle end game (player declares win)
   */
  private handleEndGame(room: GameRoom): GameResult {
    const currentPlayer = room.players[room.currentPlayerIndex];

    // Validate win condition
    const winValidation = validateWinCondition(currentPlayer.tiles, room.tableCombinations);

    if (!winValidation.canWin) {
      return {
        success: false,
        error: winValidation.reason || 'Cannot win with current state',
      };
    }

    // Check if player has free joker in hand
    const hasFreeJoker = currentPlayer.tiles.length === 1 && currentPlayer.tiles[0].isJoker;
    const finalPattern: WinPattern = hasFreeJoker ? 'FREE_JOKER' : winValidation.pattern!;

    return this.handleGameEnd(room, currentPlayer.id, finalPattern, winValidation);
  }

  /**
   * Handle game end (someone won or stock pile empty)
   */
  private handleGameEnd(
    room: GameRoom,
    winnerId?: string,
    winPattern?: WinPattern,
    winValidation?: WinValidation
  ): GameResult {
    room.gamePhase = 'FINISHED';

    // Calculate final scores
    const winnerScore = winValidation ? winValidation.totalScore : 250;

    room.players.forEach((player) => {
      if (player.id === winnerId) {
        // Winner collects points from other players
        const pointsFromOthers = room.players
          .filter((p) => p.id !== winnerId)
          .reduce((sum, p) => {
            const lostPoints = calculateRemainingTilesScore(p.tiles, room.settings.jokerPenalty);
            return sum + lostPoints;
          }, 0);

        player.score = pointsFromOthers + winnerScore;
      } else {
        // Losers get negative points for remaining tiles
        player.score = -calculateRemainingTilesScore(player.tiles, room.settings.jokerPenalty);
      }
    });

    return {
      success: true,
      gameState: room,
      winPattern,
      winScore: winnerScore,
    };
  }

  /**
   * Calculate points for combinations (for first meld requirement)
   */
  private calculateCombinationPoints(combinations: Combination[]): number {
    return combinations.reduce((total, combination) => {
      return (
        total +
        combination.tiles.reduce((sum, tile) => {
          return sum + (tile.isJoker ? 0 : tile.number); // Jokers count as their represented value
        }, 0)
      );
    }, 0);
  }

  /**
   * Get room state
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all rooms (for admin/debugging)
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Remove inactive rooms
   */
  cleanupInactiveRooms(maxInactiveMinutes: number = 30): number {
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    let removedCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.lastActivity < cutoffTime) {
        this.rooms.delete(roomId);
        removedCount++;
      }
    }

    return removedCount;
  }
}
