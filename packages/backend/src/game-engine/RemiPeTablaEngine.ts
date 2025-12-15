import { Tile, Combination } from '../models/GameState.js';
import { generateTileSet, shuffleTiles } from './TileUtils.js';
import { validateCombination } from './CombinationValidator.js';
import { RemiPatternDetector, PatternDetectionResult } from './RemiPatternDetector.js';

/**
 * Player in Remi pe Tablă game
 * Each player keeps their combinations private on their own board/rack
 */
export interface RemiPeTablaPlayer {
  id: string;
  name: string;
  tiles: Tile[]; // Tiles in hand (not yet arranged)
  boardCombinations: Combination[]; // Private combinations on player's board
  score: number;
  isOnline: boolean;
}

/**
 * Game room for Remi pe Tablă variant
 */
export interface RemiPeTablaRoom {
  id: string;
  gameType: 'REMI_PE_TABLA';
  players: RemiPeTablaPlayer[];
  currentPlayerIndex: number;
  stockPile: Tile[];
  discardPile: Tile[]; // Sequence of discarded tiles (last one can be picked up)
  launchedJokers: Tile[]; // Jokers that were "launched" (discarded) - cannot be picked up
  trumpTile?: Tile; // Optional trump tile for scoring variations
  gamePhase: 'WAITING' | 'PLAYING' | 'FINISHED';
  roundNumber: number;
  turnTimer: number; // seconds remaining
  settings: RemiPeTablaSettings;
  multiplier: number; // Table multiplier (x1, x2, x3, etc.)
  createdAt: Date;
  lastActivity: Date;
  winnerId?: string;
  winPattern?: PatternDetectionResult;
}

/**
 * Settings specific to Remi pe Tablă
 */
export interface RemiPeTablaSettings {
  maxPlayers: number;
  turnTimeLimit: number; // seconds
  jokerPenalty: number; // points for Joker in hand at end (typically 50)
  allowWrapAroundRuns: boolean; // 1 can be at start or end of run
  counterClockwise: boolean; // Turn order direction
  tableMultiplier: number; // Score multiplier for this table (x1, x2, x3, etc.)
}

/**
 * Move types for Remi pe Tablă
 */
export interface RemiPeTablaMove {
  type:
    | 'DRAW_STOCK' // Draw from stock pile
    | 'DRAW_DISCARD' // Draw last discarded tile
    | 'ARRANGE_BOARD' // Arrange tiles on private board
    | 'DISCARD' // Discard a tile
    | 'CLOSE_GAME'; // Declare win
  playerId: string;
  tile?: Tile; // For discard
  boardCombinations?: Combination[]; // For arranging board
}

/**
 * Result of a game operation
 */
export interface RemiPeTablaResult {
  success: boolean;
  error?: string;
  gameState?: RemiPeTablaRoom;
  winPattern?: PatternDetectionResult;
  winScore?: number;
  finalScoreWithMultiplier?: number;
}

/**
 * Game engine for Remi pe Tablă (Rummy on the Board)
 *
 * Key rules:
 * - Players keep combinations private on their own board/rack
 * - No first meld requirement or minimum points
 * - Can only pick up the last discarded tile
 * - Win by arranging all tiles except one into valid combinations
 * - Counter-clockwise turn order
 */
export class RemiPeTablaEngine {
  private rooms: Map<string, RemiPeTablaRoom> = new Map();
  private persistenceCallback?: (gameState: RemiPeTablaRoom) => Promise<void>;
  private autoSaveCallback?: (
    gameId: string,
    getGameState: () => RemiPeTablaRoom | undefined
  ) => void;

  /**
   * Set persistence callback for automatic state saving
   */
  setPersistenceCallback(callback: (gameState: RemiPeTablaRoom) => Promise<void>): void {
    this.persistenceCallback = callback;
  }

  /**
   * Set auto-save callback for periodic state saving
   */
  setAutoSaveCallback(
    callback: (gameId: string, getGameState: () => RemiPeTablaRoom | undefined) => void
  ): void {
    this.autoSaveCallback = callback;
  }

  /**
   * Persist game state if callback is set
   */
  private async persistState(room: RemiPeTablaRoom): Promise<void> {
    if (this.persistenceCallback) {
      try {
        await this.persistenceCallback(room);
      } catch (error) {
        console.error('Failed to persist game state:', error);
      }
    }
  }

  /**
   * Start auto-save for a room
   */
  private startAutoSave(roomId: string): void {
    if (this.autoSaveCallback) {
      this.autoSaveCallback(roomId, () => this.rooms.get(roomId));
    }
  }

  /**
   * Create a new Remi pe Tablă game room
   */
  createRoom(
    hostId: string,
    hostName: string,
    settings?: Partial<RemiPeTablaSettings>
  ): RemiPeTablaResult {
    const defaultSettings: RemiPeTablaSettings = {
      maxPlayers: 4,
      turnTimeLimit: 60,
      jokerPenalty: 50, // High penalty for keeping Joker
      allowWrapAroundRuns: true, // 1 can be at start (1-2-3) or end (12-13-1)
      counterClockwise: true, // Traditional counter-clockwise play
      tableMultiplier: settings?.tableMultiplier || 1, // Default x1 multiplier
    };

    const roomId = `remi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: RemiPeTablaRoom = {
      id: roomId,
      gameType: 'REMI_PE_TABLA',
      players: [
        {
          id: hostId,
          name: hostName,
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
      turnTimer: 0,
      settings: { ...defaultSettings, ...settings },
      multiplier: settings?.tableMultiplier || 1,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(roomId, room);
    this.persistState(room);
    return { success: true, gameState: room };
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId: string, playerId: string, playerName: string): RemiPeTablaResult {
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
      boardCombinations: [],
      score: 0,
      isOnline: true,
    });

    room.lastActivity = new Date();
    this.persistState(room);
    return { success: true, gameState: room };
  }

  /**
   * Start the game
   * - First player gets 15 tiles, others get 14
   * - One tile is turned face up as trump (optional)
   * - First player must discard one tile to start
   */
  startGame(roomId: string, hostId: string, extraJokers: number = 0): RemiPeTablaResult {
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

    // Generate and shuffle tiles
    const allTiles = generateTileSet(extraJokers);
    const shuffledTiles = shuffleTiles(allTiles);

    // Distribute tiles to players
    let tileIndex = 0;
    room.players.forEach((player, index) => {
      // First player gets 15 tiles, others get 14
      const tileCount = index === 0 ? 15 : 14;
      player.tiles = shuffledTiles.slice(tileIndex, tileIndex + tileCount);
      player.boardCombinations = [];
      tileIndex += tileCount;
    });

    // Optional: Set trump tile (next tile after distribution)
    if (tileIndex < shuffledTiles.length) {
      room.trumpTile = shuffledTiles[tileIndex];
      tileIndex++;
    }

    // Remaining tiles go to stock pile
    room.stockPile = shuffledTiles.slice(tileIndex);
    room.discardPile = [];
    room.launchedJokers = [];

    // Set game state
    room.gamePhase = 'PLAYING';
    room.currentPlayerIndex = 0;
    room.turnTimer = room.settings.turnTimeLimit;
    room.lastActivity = new Date();

    this.persistState(room);

    // Start auto-save for this room
    this.startAutoSave(roomId);

    return { success: true, gameState: room };
  }

  /**
   * Execute a game move
   */
  executeMove(roomId: string, move: RemiPeTablaMove): RemiPeTablaResult {
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

    let result: RemiPeTablaResult;
    switch (move.type) {
      case 'DRAW_STOCK':
        result = this.handleDrawStock(room);
        break;
      case 'DRAW_DISCARD':
        result = this.handleDrawDiscard(room);
        break;
      case 'ARRANGE_BOARD':
        result = this.handleArrangeBoard(room, move);
        break;
      case 'DISCARD':
        result = this.handleDiscard(room, move);
        break;
      case 'CLOSE_GAME':
        result = this.handleCloseGame(room);
        break;
      default:
        return { success: false, error: 'Invalid move type' };
    }

    if (result.success) {
      this.persistState(room);
    }

    return result;
  }

  /**
   * Draw from stock pile
   */
  private handleDrawStock(room: RemiPeTablaRoom): RemiPeTablaResult {
    if (room.stockPile.length === 0) {
      return { success: false, error: 'Stock pile is empty' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const drawnTile = room.stockPile.pop()!;
    currentPlayer.tiles.push(drawnTile);

    return { success: true, gameState: room };
  }

  /**
   * Draw the last discarded tile
   * Note: Jokers cannot be picked up (they are "launched")
   */
  private handleDrawDiscard(room: RemiPeTablaRoom): RemiPeTablaResult {
    if (room.discardPile.length === 0) {
      return { success: false, error: 'Discard pile is empty' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const drawnTile = room.discardPile.pop()!;

    // Safety check: Jokers should never be in discard pile (they go to launchedJokers)
    if (drawnTile.isJoker) {
      return { success: false, error: 'Cannot pick up a launched Joker' };
    }

    currentPlayer.tiles.push(drawnTile);

    return { success: true, gameState: room };
  }

  /**
   * Arrange tiles on player's private board
   * This updates the player's board combinations without revealing them to others
   */
  private handleArrangeBoard(room: RemiPeTablaRoom, move: RemiPeTablaMove): RemiPeTablaResult {
    if (!move.boardCombinations) {
      return { success: false, error: 'No board arrangement provided' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    // Validate all combinations
    for (const combination of move.boardCombinations) {
      if (!validateCombination(combination)) {
        return {
          success: false,
          error: `Invalid combination: ${combination.tiles.map((t) => `${t.color}${t.number}`).join(', ')}`,
        };
      }
    }

    // Verify player has all the tiles in the combinations
    const tilesInCombinations = move.boardCombinations.flatMap((c) => c.tiles);
    for (const tile of tilesInCombinations) {
      const hasInHand = currentPlayer.tiles.some((t) => t.id === tile.id);
      const hasOnBoard = currentPlayer.boardCombinations
        .flatMap((c) => c.tiles)
        .some((t) => t.id === tile.id);

      if (!hasInHand && !hasOnBoard) {
        return {
          success: false,
          error: `Player doesn't have tile: ${tile.color}${tile.number}`,
        };
      }
    }

    // Update player's board
    currentPlayer.boardCombinations = move.boardCombinations;

    return { success: true, gameState: room };
  }

  /**
   * Discard a tile and end turn
   * If discarding a Joker, it's "launched" and cannot be picked up
   */
  private handleDiscard(room: RemiPeTablaRoom, move: RemiPeTablaMove): RemiPeTablaResult {
    if (!move.tile) {
      return { success: false, error: 'No tile specified for discard' };
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    // Find the tile in player's hand
    const tileIndex = currentPlayer.tiles.findIndex((t) => t.id === move.tile!.id);
    if (tileIndex === -1) {
      return { success: false, error: "Player doesn't have this tile" };
    }

    // Remove tile from player's hand
    const discardedTile = currentPlayer.tiles.splice(tileIndex, 1)[0];

    // If it's a Joker, it's "launched" - add to launched Jokers (cannot be picked up)
    if (discardedTile.isJoker) {
      room.launchedJokers.push(discardedTile);
    } else {
      // Regular tiles go to discard pile (can be picked up by next player)
      room.discardPile.push(discardedTile);
    }

    // Move to next player (counter-clockwise if enabled)
    this.advanceTurn(room);

    return { success: true, gameState: room };
  }

  /**
   * Advance to next player's turn
   */
  private advanceTurn(room: RemiPeTablaRoom): void {
    if (room.settings.counterClockwise) {
      // Counter-clockwise: decrease index
      room.currentPlayerIndex =
        room.currentPlayerIndex === 0 ? room.players.length - 1 : room.currentPlayerIndex - 1;
    } else {
      // Clockwise: increase index
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    }
    room.turnTimer = room.settings.turnTimeLimit;
  }

  /**
   * Close the game (declare win)
   * Player must have all tiles arranged in valid combinations except one to discard
   */
  private handleCloseGame(room: RemiPeTablaRoom): RemiPeTablaResult {
    const currentPlayer = room.players[room.currentPlayerIndex];

    // Get all tiles in combinations
    const tilesInCombinations = currentPlayer.boardCombinations.flatMap((c) => c.tiles);

    // Player must have exactly 1 tile left (to discard)
    const tilesNotInCombinations = currentPlayer.tiles.filter(
      (tile) => !tilesInCombinations.some((t) => t.id === tile.id)
    );

    if (tilesNotInCombinations.length !== 1) {
      return {
        success: false,
        error: `Must have exactly 1 tile to discard. You have ${tilesNotInCombinations.length} tiles not in combinations`,
      };
    }

    // Validate all combinations are valid
    for (const combination of currentPlayer.boardCombinations) {
      if (!validateCombination(combination)) {
        return {
          success: false,
          error: 'One or more combinations on your board are invalid',
        };
      }
    }

    // Player wins!
    return this.handleGameEnd(room, currentPlayer.id);
  }

  /**
   * Handle game end with pattern detection and scoring
   */
  private handleGameEnd(room: RemiPeTablaRoom, winnerId: string): RemiPeTablaResult {
    room.gamePhase = 'FINISHED';
    room.winnerId = winnerId;

    const winner = room.players.find((p) => p.id === winnerId)!;

    // Get the final tile (the one being discarded to close)
    const tilesInCombinations = winner.boardCombinations.flatMap((c) => c.tiles);
    const finalTile =
      winner.tiles.find((tile) => !tilesInCombinations.some((t) => t.id === tile.id)) || null;

    const closedWithJoker = finalTile?.isJoker || false;

    // Detect winning pattern
    const patternResult = RemiPatternDetector.detectPattern(
      winner.boardCombinations,
      finalTile,
      room.launchedJokers,
      closedWithJoker
    );

    room.winPattern = patternResult;

    // Base score from pattern
    const baseScore = patternResult.baseScore;

    // Apply table multiplier
    const finalScore = baseScore * room.multiplier;

    // Calculate points from other players
    room.players.forEach((player) => {
      if (player.id === winnerId) {
        // Winner collects multiplied score from each loser
        const pointsFromOthers = room.players
          .filter((p) => p.id !== winnerId)
          .reduce((sum) => {
            return sum + finalScore; // Winner gets finalScore from EACH player
          }, 0);

        player.score = pointsFromOthers;
      } else {
        // Losers lose the final score
        player.score = -finalScore;
      }
    });

    return {
      success: true,
      gameState: room,
      winPattern: patternResult,
      winScore: baseScore,
      finalScoreWithMultiplier: finalScore,
    };
  }

  /**
   * Get room state
   */
  getRoom(roomId: string): RemiPeTablaRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all rooms
   */
  getAllRooms(): RemiPeTablaRoom[] {
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

  /**
   * Restore a room from saved state
   * Used for reconnection and game resumption
   */
  restoreRoom(savedRoom: RemiPeTablaRoom): void {
    // Ensure dates are Date objects (they might be strings from JSON)
    if (typeof savedRoom.createdAt === 'string') {
      savedRoom.createdAt = new Date(savedRoom.createdAt);
    }
    if (typeof savedRoom.lastActivity === 'string') {
      savedRoom.lastActivity = new Date(savedRoom.lastActivity);
    }

    // Add room to active rooms
    this.rooms.set(savedRoom.id, savedRoom);

    // Restart auto-save if game is still playing
    if (savedRoom.gamePhase === 'PLAYING') {
      this.startAutoSave(savedRoom.id);
    }

    console.log(`[Engine] Restored room ${savedRoom.id} with ${savedRoom.players.length} players`);
  }
}
