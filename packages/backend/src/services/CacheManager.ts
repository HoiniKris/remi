import { RedisService } from './RedisService.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

/**
 * High-level cache manager with common caching patterns
 */
export class CacheManager {
  private redis: RedisService;
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'rummy:';

  constructor(redis: RedisService, options?: { defaultTTL?: number; keyPrefix?: string }) {
    this.redis = redis;
    if (options?.defaultTTL) this.defaultTTL = options.defaultTTL;
    if (options?.keyPrefix) this.keyPrefix = options.keyPrefix;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cacheKey = this.buildKey(key, options?.prefix);

    // Try to get from cache
    const cached = await this.redis.getJSON<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFunction();

    // Store in cache
    const ttl = options?.ttl || this.defaultTTL;
    await this.redis.setJSON(cacheKey, value, ttl);

    return value;
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId: string, profile: any, ttl?: number): Promise<void> {
    const key = this.buildKey(`user:${userId}:profile`);
    await this.redis.setJSON(key, profile, ttl || this.defaultTTL);
  }

  /**
   * Get cached user profile
   */
  async getUserProfile(userId: string): Promise<any | null> {
    const key = this.buildKey(`user:${userId}:profile`);
    return await this.redis.getJSON(key);
  }

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const key = this.buildKey(`user:${userId}:profile`);
    await this.redis.delete(key);
  }

  /**
   * Cache game state
   */
  async cacheGameState(gameId: string, state: any, ttl?: number): Promise<void> {
    const key = this.buildKey(`game:${gameId}:state`);
    await this.redis.setJSON(key, state, ttl || 7200); // 2 hours for active games
  }

  /**
   * Get cached game state
   */
  async getGameState(gameId: string): Promise<any | null> {
    const key = this.buildKey(`game:${gameId}:state`);
    return await this.redis.getJSON(key);
  }

  /**
   * Invalidate game state cache
   */
  async invalidateGameState(gameId: string): Promise<void> {
    const key = this.buildKey(`game:${gameId}:state`);
    await this.redis.delete(key);
  }

  /**
   * Cache player online status
   */
  async setPlayerOnline(userId: string, isOnline: boolean, ttl?: number): Promise<void> {
    const key = this.buildKey(`player:${userId}:online`);
    await this.redis.set(key, isOnline ? '1' : '0', ttl || 300); // 5 minutes
  }

  /**
   * Get player online status
   */
  async isPlayerOnline(userId: string): Promise<boolean> {
    const key = this.buildKey(`player:${userId}:online`);
    const value = await this.redis.get(key);
    return value === '1';
  }

  /**
   * Cache session data
   */
  async cacheSession(sessionId: string, data: any, ttl?: number): Promise<void> {
    const key = this.buildKey(`session:${sessionId}`);
    await this.redis.setJSON(key, data, ttl || 86400); // 24 hours
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = this.buildKey(`session:${sessionId}`);
    return await this.redis.getJSON(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.buildKey(`session:${sessionId}`);
    await this.redis.delete(key);
  }

  /**
   * Rate limiting - check if action is allowed
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.buildKey(`ratelimit:${identifier}`);

    const current = await this.redis.increment(key, 1);

    if (current === 1) {
      // First request in window
      await this.redis.expire(key, windowSeconds);
    }

    const ttl = await this.redis.ttl(key);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetAt,
    };
  }

  /**
   * Cache leaderboard
   */
  async cacheLeaderboard(leaderboardId: string, data: any[], ttl?: number): Promise<void> {
    const key = this.buildKey(`leaderboard:${leaderboardId}`);
    await this.redis.setJSON(key, data, ttl || 600); // 10 minutes
  }

  /**
   * Get cached leaderboard
   */
  async getLeaderboard(leaderboardId: string): Promise<any[] | null> {
    const key = this.buildKey(`leaderboard:${leaderboardId}`);
    return await this.redis.getJSON(key);
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    const pattern = this.buildKey(`user:${userId}:*`);
    await this.redis.deletePattern(pattern);
  }

  /**
   * Invalidate all game caches
   */
  async invalidateAllGameCaches(): Promise<void> {
    const pattern = this.buildKey('game:*');
    await this.redis.deletePattern(pattern);
  }

  /**
   * Cache tournament data
   */
  async cacheTournament(tournamentId: string, data: any, ttl?: number): Promise<void> {
    const key = this.buildKey(`tournament:${tournamentId}`);
    await this.redis.setJSON(key, data, ttl || 1800); // 30 minutes
  }

  /**
   * Get cached tournament
   */
  async getTournament(tournamentId: string): Promise<any | null> {
    const key = this.buildKey(`tournament:${tournamentId}`);
    return await this.redis.getJSON(key);
  }

  /**
   * Cache friend list
   */
  async cacheFriendList(userId: string, friends: any[], ttl?: number): Promise<void> {
    const key = this.buildKey(`user:${userId}:friends`);
    await this.redis.setJSON(key, friends, ttl || 1800); // 30 minutes
  }

  /**
   * Get cached friend list
   */
  async getFriendList(userId: string): Promise<any[] | null> {
    const key = this.buildKey(`user:${userId}:friends`);
    return await this.redis.getJSON(key);
  }

  /**
   * Invalidate friend list cache
   */
  async invalidateFriendList(userId: string): Promise<void> {
    const key = this.buildKey(`user:${userId}:friends`);
    await this.redis.delete(key);
  }

  /**
   * Cache statistics
   */
  async cacheStats(statsId: string, data: any, ttl?: number): Promise<void> {
    const key = this.buildKey(`stats:${statsId}`);
    await this.redis.setJSON(key, data, ttl || 300); // 5 minutes
  }

  /**
   * Get cached statistics
   */
  async getStats(statsId: string): Promise<any | null> {
    const key = this.buildKey(`stats:${statsId}`);
    return await this.redis.getJSON(key);
  }

  /**
   * Distributed lock - acquire
   */
  async acquireLock(
    lockKey: string,
    ttlSeconds: number = 10
  ): Promise<{ acquired: boolean; lockId: string }> {
    const key = this.buildKey(`lock:${lockKey}`);
    const lockId = `${Date.now()}-${Math.random()}`;

    try {
      // Try to set the lock with NX (only if not exists)
      await this.redis.set(key, lockId, ttlSeconds);
      return { acquired: true, lockId };
    } catch (error) {
      return { acquired: false, lockId: '' };
    }
  }

  /**
   * Distributed lock - release
   */
  async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    const key = this.buildKey(`lock:${lockKey}`);
    const currentLockId = await this.redis.get(key);

    if (currentLockId === lockId) {
      await this.redis.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Clear all caches (use with caution!)
   */
  async clearAll(): Promise<void> {
    const pattern = this.buildKey('*');
    await this.redis.deletePattern(pattern);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate: string;
  }> {
    const info = await this.redis.info();
    const keys = await this.redis.keys(this.buildKey('*'));

    // Parse info string for memory and stats
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    return {
      totalKeys: keys.length,
      memoryUsed: memoryMatch ? memoryMatch[1] : 'unknown',
      hitRate: `${hitRate}%`,
    };
  }
}
