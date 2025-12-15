import { Server } from 'socket.io';
import { RemiPeTablaEngine } from '../game-engine/RemiPeTablaEngine.js';
import { Tile, Combination } from '../models/GameState.js';
import { validateCombination } from '../game-engine/CombinationValidator.js';

/**
 * Disconnection tracking for a player
 */
export interface DisconnectionRecord {
  playerId: string;
  gameId: string;
  disconnectedAt: Date;
  reconnectionDeadline: Date;
  disconnectionCount: number;
  wasCurrentPlayer: boolean;
}

/**
 * Penalty configuration
 */
export interface DisconnectionPenalty {
  pointsDeducted: number;
  reason: string;
  timestamp: Date;
}

/**
 * Service to handle player disconnections and reconnections
 * Implements Task 13.2: Disconnection Handling
 */
export class DisconnectionHandler {
  private io: Server;
  private engine: RemiPeTablaEngine;
  private disconnectedPlayers: Map<string, DisconnectionRecord> = new Map();
  private playerDisconnectionCounts: Map<string, number> = new Map();
  private readonly RECONNECTION_TIMEOUT_MS = 120000; // 2 minutes
  private readonly MAX_DISCONNECTIONS_BEFORE_PENALTY = 2;
  private readonly DISCONNECTION_PENALTY_POINTS = 50;
  private readonly REPEATED_DISCONNECTION_PENALTY_POINTS = 100;

  constructor(io: Server, engine: RemiPeTablaEngine) {
    this.io = io;
    this.engine = engine;
  }

  /**
   * Handle player disconnection
   * - Detect disconnection
   * - Auto-arrange tiles if it's their turn
   * - Apply penalties for repeated disconnections
   * - Notify other players
   */
  async handleDisconnection(_socket: unknown, userId: string, gameId: string): Promise<void> {
    console.log(`[Disconnection] Player ${userId} disconnected from game ${gameId}`);

    const gameState = this.engine.getRoom(gameId);
    if (!gameState || gameState.gamePhase !== 'PLAYING') {
      return;
    }

    const player = gameState.players.find((p) => p.id === userId);
    if (!player) {
      return;
    }

    // Mark player as offline
    player.isOnline = false;

    // Track disconnection
    const disconnectionCount = (this.playerDisconnectionCounts.get(userId) || 0) + 1;
    this.playerDisconnectionCounts.set(userId, disconnectionCount);

    const wasCurrentPlayer = gameState.players[gameState.currentPlayerIndex].id === userId;

    // Create disconnection record
    const disconnectionRecord: DisconnectionRecord = {
      playerId: userId,
      gameId,
      disconnectedAt: new Date(),
      reconnectionDeadline: new Date(Date.now() + this.RECONNECTION_TIMEOUT_MS),
      disconnectionCount,
      wasCurrentPlayer,
    };

    this.disconnectedPlayers.set(userId, disconnectionRecord);

    // Auto-arrange tiles if it's their turn
    if (wasCurrentPlayer) {
      await this.autoArrangeTiles(gameId, userId);
    }

    // Apply penalty for repeated disconnections
    const penalty = this.calculatePenalty(disconnectionCount);
    if (penalty) {
      player.score -= penalty.pointsDeducted;
      console.log(
        `[Disconnection] Applied penalty of ${penalty.pointsDeducted} points to player ${userId}`
      );
    }

    // Notify other players
    this.io.to(gameId).emit('player:disconnected', {
      playerId: userId,
      playerName: player.name,
      reconnectionDeadline: disconnectionRecord.reconnectionDeadline,
      penalty,
      wasCurrentPlayer,
    });

    // Set timeout for automatic forfeit if not reconnected
    setTimeout(() => {
      this.checkReconnectionTimeout(userId, gameId);
    }, this.RECONNECTION_TIMEOUT_MS);
  }

  /**
   * Auto-arrange disconnected player's tiles
   * Attempts to create valid combinations from their hand
   */
  private async autoArrangeTiles(gameId: string, playerId: string): Promise<void> {
    const gameState = this.engine.getRoom(gameId);
    if (!gameState) return;

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return;

    console.log(`[Disconnection] Auto-arranging tiles for player ${playerId}`);

    // Try to find valid combinations from tiles in hand
    const combinations = this.findBestCombinations(player.tiles);

    if (combinations.length > 0) {
      // Add combinations to player's board
      player.boardCombinations.push(...combinations);

      // Remove tiles from hand that are now in combinations
      const tilesInCombinations = new Set(
        combinations.flatMap((c) => c.tiles.map((t) => `${t.number}-${t.color}-${t.isJoker}`))
      );

      player.tiles = player.tiles.filter(
        (t) => !tilesInCombinations.has(`${t.number}-${t.color}-${t.isJoker}`)
      );

      console.log(
        `[Disconnection] Auto-arranged ${combinations.length} combinations for player ${playerId}`
      );
    }

    // Auto-discard a tile if they have any left
    if (player.tiles.length > 0) {
      const tileToDiscard = this.selectTileToDiscard(player.tiles);

      // Manually discard the tile
      player.tiles = player.tiles.filter((t) => t.id !== tileToDiscard.id);
      gameState.discardPile.push(tileToDiscard);

      // Move to next player
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

      console.log(`[Disconnection] Auto-discarded tile for player ${playerId}`);
    }
  }

  /**
   * Find best combinations from a set of tiles
   * Uses greedy algorithm to maximize tiles in valid combinations
   */
  private findBestCombinations(tiles: Tile[]): Combination[] {
    const combinations: Combination[] = [];
    const remainingTiles = [...tiles];

    // Try to find runs first (usually more valuable)
    const runs = this.findRuns(remainingTiles);
    for (const run of runs) {
      if (validateCombination(run)) {
        combinations.push(run);
        // Remove tiles from remaining
        for (const tile of run.tiles) {
          const index = remainingTiles.findIndex(
            (t) => t.number === tile.number && t.color === tile.color && t.isJoker === tile.isJoker
          );
          if (index !== -1) {
            remainingTiles.splice(index, 1);
          }
        }
      }
    }

    // Then try to find sets
    const sets = this.findSets(remainingTiles);
    for (const set of sets) {
      if (validateCombination(set)) {
        combinations.push(set);
        // Remove tiles from remaining
        for (const tile of set.tiles) {
          const index = remainingTiles.findIndex(
            (t) => t.number === tile.number && t.color === tile.color && t.isJoker === tile.isJoker
          );
          if (index !== -1) {
            remainingTiles.splice(index, 1);
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Find potential runs in tiles
   */
  private findRuns(tiles: Tile[]): Combination[] {
    const runs: Combination[] = [];
    const colors = ['RED', 'BLUE', 'BLACK', 'YELLOW'];

    for (const color of colors) {
      const colorTiles = tiles
        .filter((t) => t.color === color || t.isJoker)
        .sort((a, b) => (a.number || 0) - (b.number || 0));

      // Try to build runs of 3+ consecutive tiles
      for (let i = 0; i < colorTiles.length - 2; i++) {
        const run: Tile[] = [colorTiles[i]];
        let expectedNext = (colorTiles[i].number || 0) + 1;

        for (let j = i + 1; j < colorTiles.length; j++) {
          if (colorTiles[j].isJoker || colorTiles[j].number === expectedNext) {
            run.push(colorTiles[j]);
            expectedNext++;
          } else if (colorTiles[j].number! > expectedNext) {
            break;
          }
        }

        if (run.length >= 3) {
          runs.push({ type: 'RUN', tiles: run, isValid: true });
        }
      }
    }

    return runs;
  }

  /**
   * Find potential sets in tiles
   */
  private findSets(tiles: Tile[]): Combination[] {
    const sets: Combination[] = [];
    const numberGroups = new Map<number, Tile[]>();

    // Group tiles by number
    for (const tile of tiles) {
      if (tile.isJoker) continue; // Handle jokers separately
      const number = tile.number!;
      if (!numberGroups.has(number)) {
        numberGroups.set(number, []);
      }
      numberGroups.get(number)!.push(tile);
    }

    // Find sets of 3+ tiles with same number but different colors
    for (const tilesWithNumber of numberGroups.values()) {
      if (tilesWithNumber.length >= 3) {
        // Check for different colors
        const colors = new Set(tilesWithNumber.map((t) => t.color));
        if (colors.size >= 3) {
          sets.push({ type: 'SET', tiles: tilesWithNumber.slice(0, 4), isValid: true }); // Max 4 colors
        }
      }
    }

    return sets;
  }

  /**
   * Select a tile to discard (prefer high-value tiles that don't fit combinations)
   */
  private selectTileToDiscard(tiles: Tile[]): Tile {
    // Prefer non-jokers
    const nonJokers = tiles.filter((t) => !t.isJoker);
    if (nonJokers.length > 0) {
      // Discard highest number tile
      return nonJokers.reduce((highest, tile) =>
        (tile.number || 0) > (highest.number || 0) ? tile : highest
      );
    }

    // If only jokers left, discard one
    return tiles[0];
  }

  /**
   * Calculate penalty for disconnection
   */
  private calculatePenalty(disconnectionCount: number): DisconnectionPenalty | null {
    if (disconnectionCount <= this.MAX_DISCONNECTIONS_BEFORE_PENALTY) {
      return null;
    }

    const isRepeatedOffender = disconnectionCount > this.MAX_DISCONNECTIONS_BEFORE_PENALTY + 1;
    const pointsDeducted = isRepeatedOffender
      ? this.REPEATED_DISCONNECTION_PENALTY_POINTS
      : this.DISCONNECTION_PENALTY_POINTS;

    return {
      pointsDeducted,
      reason: isRepeatedOffender
        ? `Repeated disconnection (${disconnectionCount} times)`
        : `Disconnection penalty (${disconnectionCount} times)`,
      timestamp: new Date(),
    };
  }

  /**
   * Check if player reconnected within timeout
   * If not, forfeit the game
   */
  private checkReconnectionTimeout(userId: string, gameId: string): void {
    const record = this.disconnectedPlayers.get(userId);
    if (!record) return;

    const gameState = this.engine.getRoom(gameId);
    if (!gameState) {
      this.disconnectedPlayers.delete(userId);
      return;
    }

    const player = gameState.players.find((p) => p.id === userId);
    if (!player) {
      this.disconnectedPlayers.delete(userId);
      return;
    }

    // Check if player is still offline
    if (!player.isOnline) {
      console.log(`[Disconnection] Player ${userId} did not reconnect in time. Forfeiting game.`);

      // Remove player from game or mark as forfeited
      player.score = -1000; // Heavy penalty for forfeit

      // Notify other players
      this.io.to(gameId).emit('player:forfeited', {
        playerId: userId,
        playerName: player.name,
        reason: 'Failed to reconnect within time limit',
      });

      // If only one player left, end the game
      const activePlayers = gameState.players.filter((p) => p.isOnline);
      if (activePlayers.length === 1) {
        gameState.gamePhase = 'FINISHED';
        gameState.winnerId = activePlayers[0].id;

        this.io.to(gameId).emit('game:ended', {
          winnerId: activePlayers[0].id,
          reason: 'Other players forfeited',
        });
      }

      this.disconnectedPlayers.delete(userId);
    }
  }

  /**
   * Handle player reconnection
   */
  handleReconnection(userId: string, gameId: string): boolean {
    const record = this.disconnectedPlayers.get(userId);
    if (!record || record.gameId !== gameId) {
      return false;
    }

    const gameState = this.engine.getRoom(gameId);
    if (!gameState) {
      this.disconnectedPlayers.delete(userId);
      return false;
    }

    const player = gameState.players.find((p) => p.id === userId);
    if (!player) {
      this.disconnectedPlayers.delete(userId);
      return false;
    }

    // Check if reconnection is within deadline
    if (new Date() > record.reconnectionDeadline) {
      console.log(`[Disconnection] Player ${userId} reconnection too late`);
      return false;
    }

    // Mark player as online
    player.isOnline = true;

    // Remove disconnection record
    this.disconnectedPlayers.delete(userId);

    console.log(`[Disconnection] Player ${userId} successfully reconnected to game ${gameId}`);

    // Notify other players
    this.io.to(gameId).emit('player:reconnected', {
      playerId: userId,
      playerName: player.name,
    });

    return true;
  }

  /**
   * Get disconnection record for a player
   */
  getDisconnectionRecord(userId: string): DisconnectionRecord | undefined {
    return this.disconnectedPlayers.get(userId);
  }

  /**
   * Get disconnection count for a player
   */
  getDisconnectionCount(userId: string): number {
    return this.playerDisconnectionCounts.get(userId) || 0;
  }

  /**
   * Reset disconnection count for a player (e.g., after successful game completion)
   */
  resetDisconnectionCount(userId: string): void {
    this.playerDisconnectionCounts.delete(userId);
  }

  /**
   * Clean up disconnection records for finished games
   */
  cleanup(gameId: string): void {
    const toDelete: string[] = [];
    for (const [userId, record] of this.disconnectedPlayers) {
      if (record.gameId === gameId) {
        toDelete.push(userId);
      }
    }
    for (const userId of toDelete) {
      this.disconnectedPlayers.delete(userId);
    }
  }
}
