import { Pool } from 'pg';
import { RemiPeTablaRoom } from '../game-engine/RemiPeTablaEngine.js';

/**
 * Persistence service for Remi pe Tablă game state
 * Handles auto-save, restore, and cleanup operations
 */
export class RemiPeTablaPersistenceService {
  private pool: Pool;
  private autoSaveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Save game state to database
   */
  async saveGameState(gameState: RemiPeTablaRoom): Promise<void> {
    const query = `
      INSERT INTO remi_pe_tabla_games (
        game_id,
        game_data,
        game_phase,
        player_count,
        multiplier,
        created_at,
        last_activity,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (game_id) 
      DO UPDATE SET
        game_data = $2,
        game_phase = $3,
        last_activity = $7,
        updated_at = NOW()
    `;

    const values = [
      gameState.id,
      JSON.stringify(gameState),
      gameState.gamePhase,
      gameState.players.length,
      gameState.multiplier,
      gameState.createdAt,
      gameState.lastActivity,
    ];

    await this.pool.query(query, values);
  }

  /**
   * Load game state from database
   */
  async loadGameState(gameId: string): Promise<RemiPeTablaRoom | null> {
    const query = `
      SELECT game_data
      FROM remi_pe_tabla_games
      WHERE game_id = $1
    `;

    const result = await this.pool.query(query, [gameId]);

    if (result.rows.length === 0) {
      return null;
    }

    const gameState = result.rows[0].game_data as RemiPeTablaRoom;

    // Convert date strings back to Date objects
    gameState.createdAt = new Date(gameState.createdAt);
    gameState.lastActivity = new Date(gameState.lastActivity);

    return gameState;
  }

  /**
   * Delete game state from database
   */
  async deleteGameState(gameId: string): Promise<void> {
    const query = `
      DELETE FROM remi_pe_tabla_games
      WHERE game_id = $1
    `;

    await this.pool.query(query, [gameId]);
  }

  /**
   * Get all active games
   */
  async getActiveGames(): Promise<RemiPeTablaRoom[]> {
    const query = `
      SELECT game_data
      FROM remi_pe_tabla_games
      WHERE game_phase IN ('WAITING', 'PLAYING')
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map((row) => {
      const gameState = row.game_data as RemiPeTablaRoom;
      gameState.createdAt = new Date(gameState.createdAt);
      gameState.lastActivity = new Date(gameState.lastActivity);
      return gameState;
    });
  }

  /**
   * Get games by player ID
   */
  async getGamesByPlayer(playerId: string): Promise<RemiPeTablaRoom[]> {
    const query = `
      SELECT game_data
      FROM remi_pe_tabla_games
      WHERE game_data::jsonb -> 'players' @> jsonb_build_array(jsonb_build_object('id', $1))
      ORDER BY last_activity DESC
    `;

    const result = await this.pool.query(query, [playerId]);
    return result.rows.map((row) => {
      const gameState = row.game_data as RemiPeTablaRoom;
      gameState.createdAt = new Date(gameState.createdAt);
      gameState.lastActivity = new Date(gameState.lastActivity);
      return gameState;
    });
  }

  /**
   * Start auto-save for a game room
   * Saves game state every 30 seconds
   */
  startAutoSave(gameId: string, getGameState: () => RemiPeTablaRoom | undefined): void {
    // Clear existing interval if any
    this.stopAutoSave(gameId);

    const interval = setInterval(async () => {
      const gameState = getGameState();
      if (gameState) {
        try {
          await this.saveGameState(gameState);
          console.log(`[AutoSave] Saved game ${gameId} at ${new Date().toISOString()}`);
        } catch (error) {
          console.error(`[AutoSave] Failed to save game ${gameId}:`, error);
        }
      } else {
        // Game no longer exists, stop auto-save
        this.stopAutoSave(gameId);
      }
    }, this.AUTO_SAVE_INTERVAL_MS);

    this.autoSaveIntervals.set(gameId, interval);
    console.log(`[AutoSave] Started for game ${gameId}`);
  }

  /**
   * Stop auto-save for a game room
   */
  stopAutoSave(gameId: string): void {
    const interval = this.autoSaveIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(gameId);
      console.log(`[AutoSave] Stopped for game ${gameId}`);
    }
  }

  /**
   * Stop all auto-save intervals
   */
  stopAllAutoSaves(): void {
    for (const [gameId, interval] of this.autoSaveIntervals.entries()) {
      clearInterval(interval);
      console.log(`[AutoSave] Stopped for game ${gameId}`);
    }
    this.autoSaveIntervals.clear();
  }

  /**
   * Clean up old finished games
   */
  async cleanupOldGames(olderThanHours: number = 24): Promise<number> {
    const query = `
      DELETE FROM remi_pe_tabla_games
      WHERE game_phase = 'FINISHED'
        AND updated_at < NOW() - INTERVAL '${olderThanHours} hours'
    `;

    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Get game statistics
   */
  async getGameStats(): Promise<{
    total: number;
    waiting: number;
    playing: number;
    finished: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE game_phase = 'WAITING') as waiting,
        COUNT(*) FILTER (WHERE game_phase = 'PLAYING') as playing,
        COUNT(*) FILTER (WHERE game_phase = 'FINISHED') as finished
      FROM remi_pe_tabla_games
    `;

    const result = await this.pool.query(query);
    return {
      total: parseInt(result.rows[0].total),
      waiting: parseInt(result.rows[0].waiting),
      playing: parseInt(result.rows[0].playing),
      finished: parseInt(result.rows[0].finished),
    };
  }

  /**
   * Validate game state integrity
   */
  validateGameState(gameState: RemiPeTablaRoom): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!gameState.id) errors.push('Missing game ID');
    if (!gameState.players || gameState.players.length === 0) {
      errors.push('No players in game');
    }
    if (!gameState.gamePhase) errors.push('Missing game phase');

    // Check player count
    if (gameState.players.length < 2 || gameState.players.length > 4) {
      errors.push('Invalid player count (must be 2-4)');
    }

    // Check tile conservation (only for playing games)
    if (gameState.gamePhase === 'PLAYING') {
      const tilesInHands = gameState.players.reduce((sum, p) => sum + p.tiles.length, 0);
      const tilesOnBoards = gameState.players.reduce(
        (sum, p) => sum + p.boardCombinations.reduce((s, c) => s + c.tiles.length, 0),
        0
      );
      const totalTiles =
        tilesInHands +
        tilesOnBoards +
        gameState.stockPile.length +
        gameState.discardPile.length +
        gameState.launchedJokers.length;

      // Should be 106 + extra jokers (we'll accept 106-110)
      if (totalTiles < 106 || totalTiles > 110) {
        errors.push(`Invalid total tile count: ${totalTiles} (expected 106-110)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create database table if it doesn't exist
   */
  async initializeDatabase(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS remi_pe_tabla_games (
        game_id VARCHAR(255) PRIMARY KEY,
        game_data JSONB NOT NULL,
        game_phase VARCHAR(50) NOT NULL,
        player_count INTEGER NOT NULL,
        multiplier INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL,
        last_activity TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_remi_game_phase ON remi_pe_tabla_games(game_phase);
      CREATE INDEX IF NOT EXISTS idx_remi_last_activity ON remi_pe_tabla_games(last_activity);
      CREATE INDEX IF NOT EXISTS idx_remi_players ON remi_pe_tabla_games USING GIN ((game_data->'players'));
    `;

    await this.pool.query(query);
  }
}
