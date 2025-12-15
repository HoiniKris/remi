import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { RedisService } from '../RedisService';
import { CacheManager } from '../CacheManager';

describe('CacheManager', () => {
  let redis: RedisService;
  let cache: CacheManager;

  beforeAll(async () => {
    redis = new RedisService({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15,
    });
    await redis.connect();
    cache = new CacheManager(redis, { keyPrefix: 'test:' });
  });

  afterAll(async () => {
    await redis.flushAll();
    await redis.disconnect();
  });

  beforeEach(async () => {
    await redis.flushAll();
  });

  describe('Get or Set Pattern', () => {
    it('should fetch and cache value on first call', async () => {
      let fetchCount = 0;
      const fetchFunction = async () => {
        fetchCount++;
        return { data: 'test value' };
      };

      const result1 = await cache.getOrSet('test-key', fetchFunction);
      expect(result1).toEqual({ data: 'test value' });
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await cache.getOrSet('test-key', fetchFunction);
      expect(result2).toEqual({ data: 'test value' });
      expect(fetchCount).toBe(1); // Should not fetch again
    });

    it('should respect custom TTL', async () => {
      const fetchFunction = async () => ({ value: 'temp' });

      await cache.getOrSet('ttl-key', fetchFunction, { ttl: 1 });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      let fetchCount = 0;
      const newFetch = async () => {
        fetchCount++;
        return { value: 'new' };
      };

      await cache.getOrSet('ttl-key', newFetch);
      expect(fetchCount).toBe(1); // Should fetch again after expiration
    });
  });

  describe('User Profile Caching', () => {
    it('should cache and retrieve user profile', async () => {
      const profile = {
        userId: 'user123',
        username: 'Alice',
        level: 5,
        score: 1000,
      };

      await cache.cacheUserProfile('user123', profile);
      const retrieved = await cache.getUserProfile('user123');
      expect(retrieved).toEqual(profile);
    });

    it('should invalidate user profile', async () => {
      const profile = { userId: 'user456', username: 'Bob' };

      await cache.cacheUserProfile('user456', profile);
      await cache.invalidateUserProfile('user456');

      const retrieved = await cache.getUserProfile('user456');
      expect(retrieved).toBeNull();
    });
  });

  describe('Game State Caching', () => {
    it('should cache and retrieve game state', async () => {
      const gameState = {
        gameId: 'game123',
        players: ['player1', 'player2'],
        status: 'IN_PROGRESS',
      };

      await cache.cacheGameState('game123', gameState);
      const retrieved = await cache.getGameState('game123');
      expect(retrieved).toEqual(gameState);
    });

    it('should invalidate game state', async () => {
      const gameState = { gameId: 'game456', status: 'COMPLETED' };

      await cache.cacheGameState('game456', gameState);
      await cache.invalidateGameState('game456');

      const retrieved = await cache.getGameState('game456');
      expect(retrieved).toBeNull();
    });
  });

  describe('Player Online Status', () => {
    it('should set and check player online status', async () => {
      await cache.setPlayerOnline('player123', true);
      const isOnline = await cache.isPlayerOnline('player123');
      expect(isOnline).toBe(true);
    });

    it('should handle offline status', async () => {
      await cache.setPlayerOnline('player456', false);
      const isOnline = await cache.isPlayerOnline('player456');
      expect(isOnline).toBe(false);
    });

    it('should return false for non-existent player', async () => {
      const isOnline = await cache.isPlayerOnline('nonexistent');
      expect(isOnline).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should cache and retrieve session', async () => {
      const sessionData = {
        userId: 'user123',
        token: 'abc123',
        expiresAt: Date.now() + 3600000,
      };

      await cache.cacheSession('session123', sessionData);
      const retrieved = await cache.getSession('session123');
      expect(retrieved).toEqual(sessionData);
    });

    it('should delete session', async () => {
      const sessionData = { userId: 'user456' };

      await cache.cacheSession('session456', sessionData);
      await cache.deleteSession('session456');

      const retrieved = await cache.getSession('session456');
      expect(retrieved).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const result1 = await cache.checkRateLimit('user123', 5, 60);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = await cache.checkRateLimit('user123', 5, 60);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await cache.checkRateLimit('user456', 5, 60);
      }

      // 6th request should be blocked
      const result = await cache.checkRateLimit('user456', 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      await cache.checkRateLimit('user789', 2, 1);
      await cache.checkRateLimit('user789', 2, 1);

      // Should be at limit
      let result = await cache.checkRateLimit('user789', 2, 1);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      result = await cache.checkRateLimit('user789', 2, 1);
      expect(result.allowed).toBe(true);
    });

    it('should provide reset timestamp', async () => {
      const result = await cache.checkRateLimit('user999', 10, 60);
      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Leaderboard Caching', () => {
    it('should cache and retrieve leaderboard', async () => {
      const leaderboard = [
        { rank: 1, userId: 'user1', score: 1000 },
        { rank: 2, userId: 'user2', score: 900 },
        { rank: 3, userId: 'user3', score: 800 },
      ];

      await cache.cacheLeaderboard('global', leaderboard);
      const retrieved = await cache.getLeaderboard('global');
      expect(retrieved).toEqual(leaderboard);
    });
  });

  describe('Tournament Caching', () => {
    it('should cache and retrieve tournament', async () => {
      const tournament = {
        tournamentId: 'tournament123',
        name: 'Daily Championship',
        players: 32,
        status: 'IN_PROGRESS',
      };

      await cache.cacheTournament('tournament123', tournament);
      const retrieved = await cache.getTournament('tournament123');
      expect(retrieved).toEqual(tournament);
    });
  });

  describe('Friend List Caching', () => {
    it('should cache and retrieve friend list', async () => {
      const friends = [
        { userId: 'friend1', username: 'Alice', isOnline: true },
        { userId: 'friend2', username: 'Bob', isOnline: false },
      ];

      await cache.cacheFriendList('user123', friends);
      const retrieved = await cache.getFriendList('user123');
      expect(retrieved).toEqual(friends);
    });

    it('should invalidate friend list', async () => {
      const friends = [{ userId: 'friend1', username: 'Alice' }];

      await cache.cacheFriendList('user456', friends);
      await cache.invalidateFriendList('user456');

      const retrieved = await cache.getFriendList('user456');
      expect(retrieved).toBeNull();
    });
  });

  describe('Statistics Caching', () => {
    it('should cache and retrieve statistics', async () => {
      const stats = {
        totalGames: 100,
        wins: 60,
        losses: 40,
        winRate: 0.6,
      };

      await cache.cacheStats('user123:stats', stats);
      const retrieved = await cache.getStats('user123:stats');
      expect(retrieved).toEqual(stats);
    });
  });

  describe('Distributed Locking', () => {
    it('should acquire and release lock', async () => {
      const { acquired, lockId } = await cache.acquireLock('resource1');
      expect(acquired).toBe(true);
      expect(lockId).toBeTruthy();

      const released = await cache.releaseLock('resource1', lockId);
      expect(released).toBe(true);
    });

    it('should prevent concurrent lock acquisition', async () => {
      const lock1 = await cache.acquireLock('resource2');
      expect(lock1.acquired).toBe(true);

      // Try to acquire same lock
      const lock2 = await cache.acquireLock('resource2');
      expect(lock2.acquired).toBe(false);

      // Release first lock
      await cache.releaseLock('resource2', lock1.lockId);

      // Now should be able to acquire
      const lock3 = await cache.acquireLock('resource2');
      expect(lock3.acquired).toBe(true);
    });

    it('should not release lock with wrong lockId', async () => {
      const { lockId } = await cache.acquireLock('resource3');

      const released = await cache.releaseLock('resource3', 'wrong-id');
      expect(released).toBe(false);

      // Correct lockId should still work
      const correctRelease = await cache.releaseLock('resource3', lockId);
      expect(correctRelease).toBe(true);
    });

    it('should auto-expire locks', async () => {
      await cache.acquireLock('resource4', 1); // 1 second TTL

      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Lock should be expired, new acquisition should succeed
      const newLock = await cache.acquireLock('resource4');
      expect(newLock.acquired).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all user caches', async () => {
      await cache.cacheUserProfile('user123', { name: 'Alice' });
      await cache.cacheFriendList('user123', []);
      await cache.cacheStats('user123:stats', { wins: 10 });

      await cache.invalidateUserCaches('user123');

      expect(await cache.getUserProfile('user123')).toBeNull();
      expect(await cache.getFriendList('user123')).toBeNull();
      expect(await cache.getStats('user123:stats')).toBeNull();
    });

    it('should invalidate all game caches', async () => {
      await cache.cacheGameState('game1', { status: 'active' });
      await cache.cacheGameState('game2', { status: 'active' });

      await cache.invalidateAllGameCaches();

      expect(await cache.getGameState('game1')).toBeNull();
      expect(await cache.getGameState('game2')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should get cache statistics', async () => {
      await cache.cacheUserProfile('user1', { name: 'Alice' });
      await cache.cacheUserProfile('user2', { name: 'Bob' });
      await cache.cacheGameState('game1', { status: 'active' });

      const stats = await cache.getCacheStats();

      expect(stats.totalKeys).toBeGreaterThanOrEqual(3);
      expect(stats.memoryUsed).toBeTruthy();
      expect(stats.hitRate).toMatch(/\d+\.\d+%/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      await cache.cacheUserProfile('user-null', null as any);
      const retrieved = await cache.getUserProfile('user-null');
      expect(retrieved).toBeNull();
    });

    it('should handle undefined values', async () => {
      await cache.cacheUserProfile('user-undefined', undefined as any);
      const retrieved = await cache.getUserProfile('user-undefined');
      expect(retrieved).toBeNull();
    });

    it('should handle empty objects', async () => {
      await cache.cacheUserProfile('user-empty', {});
      const retrieved = await cache.getUserProfile('user-empty');
      expect(retrieved).toEqual({});
    });

    it('should handle empty arrays', async () => {
      await cache.cacheFriendList('user-no-friends', []);
      const retrieved = await cache.getFriendList('user-no-friends');
      expect(retrieved).toEqual([]);
    });
  });
});
