import { Pool } from 'pg';
import { GameRoom } from '../game-engine/GameEngine.js';

/**
 * Repository for persisting and retrieving game state
 */
export class GameStateRepository {
  constructor(private pool: Pool) {}

  /**
   * Save game state to database
   */
  async saveGameState(gameState: GameRoom): Promise<void> {
    const query = `
      INSERT INTO game_states (
        game_id,
        game_data,
        game_phase,
        player_count,
        created_at,
        last_activity,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (game_id) 
      DO UPDATE SET
        game_data = $2,
        game_phase = $3,
        last_activity = $6,
        updated_at = NOW()
    `;

    const values = [
      gameState.id,
      JSON.stringify(gameState),
      gameState.gamePhase,
      gameState.players.length,
      gameState.createdAt,
      gameState.lastActivity,
    ];

    await this.pool.query(query, values);
  }

  /**
   * Load game state from database
   */
  async loadGameState(gameId: string): Promise<GameRoom | null> {
    const query = `
      SELECT game_data
      FROM game_states
      WHERE game_id = $1
    `;

    const result = await this.pool.query(query, [gameId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].game_data as GameRoom;
  }

  /**
   * Delete game state from database
   */
  async deleteGameState(gameId: string): Promise<void> {
    const query = `
      DELETE FROM game_states
      WHERE game_id = $1
    `;

    await this.pool.query(query, [gameId]);
  }

  /**
   * Get all active games
   */
  async getActiveGames(): Promise<GameRoom[]> {
    const query = `
      SELECT game_data
      FROM game_states
      WHERE game_phase IN ('WAITING', 'PLAYING')
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map((row) => row.game_data as GameRoom);
  }

  /**
   * Get games by player ID
   */
  async getGamesByPlayer(playerId: string): Promise<GameRoom[]> {
    const query = `
      SELECT game_data
      FROM game_states
      WHERE game_data::jsonb @> jsonb_build_object('players', jsonb_build_array(jsonb_build_object('id', $1)))
      ORDER BY last_activity DESC
    `;

    const result = await this.pool.query(query, [playerId]);
    return result.rows.map((row) => row.game_data as GameRoom);
  }

  /**
   * Clean up old finished games
   */
  async cleanupOldGames(olderThanHours: number = 24): Promise<number> {
    const query = `
      DELETE FROM game_states
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
      FROM game_states
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  /**
   * Validate game state integrity
   */
  validateGameState(gameState: GameRoom): { valid: boolean; errors: string[] } {
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
      const totalTiles =
        gameState.players.reduce((sum, p) => sum + p.tiles.length, 0) +
        gameState.stockPile.length +
        gameState.discardPile.length +
        gameState.tableCombinations.reduce((sum, c) => sum + c.tiles.length, 0);

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
   * Serialize game state for storage
   */
  serializeGameState(gameState: GameRoom): string {
    return JSON.stringify(gameState);
  }

  /**
   * Deserialize game state from storage
   */
  deserializeGameState(data: string): GameRoom {
    const gameState = JSON.parse(data) as GameRoom;

    // Convert date strings back to Date objects
    gameState.createdAt = new Date(gameState.createdAt);
    gameState.lastActivity = new Date(gameState.lastActivity);

    return gameState;
  }
}
