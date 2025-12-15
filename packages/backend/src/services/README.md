# Services

This directory contains service layer implementations for the Rummy Game Platform.

## RedisService

Provides Redis connectivity with support for:

- Basic key-value operations
- JSON serialization/deserialization
- Pub/Sub messaging
- Connection pooling with separate clients for pub/sub

### Usage

```typescript
import { initializeRedis } from './services/RedisService';

// Initialize Redis
const redis = await initializeRedis({
  host: 'localhost',
  port: 6379,
  password: 'optional-password',
  db: 0,
});

// Basic operations
await redis.set('key', 'value', 60); // with TTL
const value = await redis.get('key');

// JSON operations
await redis.setJSON('user:123', { name: 'Alice', score: 100 });
const user = await redis.getJSON('user:123');

// Pub/Sub
await redis.subscribe('game:events', (message) => {
  console.log('Received:', message);
});

await redis.publish('game:events', 'Game started!');
```

## CacheManager

High-level caching abstraction with common patterns:

- Get-or-set (cache-aside pattern)
- User profile caching
- Game state caching
- Session management
- Rate limiting
- Distributed locking

### Usage

```typescript
import { CacheManager } from './services/CacheManager';
import { getRedisService } from './services/RedisService';

const redis = getRedisService();
const cache = new CacheManager(redis);

// Get or set pattern
const profile = await cache.getOrSet(
  'user:123:profile',
  async () => {
    // Fetch from database
    return await db.getUserProfile('123');
  },
  { ttl: 3600 }
);

// Rate limiting
const { allowed, remaining } = await cache.checkRateLimit(
  'user:123:api',
  100, // max requests
  60 // window in seconds
);

if (!allowed) {
  throw new Error('Rate limit exceeded');
}

// Distributed locking
const { acquired, lockId } = await cache.acquireLock('resource:123', 10);
if (acquired) {
  try {
    // Do work with exclusive access
  } finally {
    await cache.releaseLock('resource:123', lockId);
  }
}
```

## Testing

Redis tests require a running Redis instance. Start Redis with Docker:

```bash
docker-compose up -d redis
```

Then run tests:

```bash
npm test -- RedisService
npm test -- CacheManager
```

To skip Redis tests (when Redis is not available):

```bash
npm test -- --testPathIgnorePatterns=RedisService,CacheManager
```

## Configuration

Redis configuration can be provided via environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
REDIS_DB=0
```

## Features

### RedisService Features

- ✅ Connection management with auto-reconnect
- ✅ Separate clients for pub/sub operations
- ✅ JSON serialization helpers
- ✅ Pattern-based key operations
- ✅ Counter operations (increment/decrement)
- ✅ TTL management
- ✅ Pub/Sub messaging
- ✅ Error handling and logging

### CacheManager Features

- ✅ Cache-aside pattern (get-or-set)
- ✅ User profile caching
- ✅ Game state caching
- ✅ Player online status
- ✅ Session management
- ✅ Rate limiting
- ✅ Leaderboard caching
- ✅ Tournament caching
- ✅ Friend list caching
- ✅ Statistics caching
- ✅ Distributed locking
- ✅ Cache invalidation patterns
- ✅ Cache statistics

## Performance Considerations

- Use appropriate TTLs to balance freshness and performance
- Use pattern-based invalidation sparingly (can be slow with many keys)
- Consider using Redis Cluster for high-traffic scenarios
- Monitor cache hit rates using `getCacheStats()`
- Use distributed locks for critical sections only

## Best Practices

1. **Always set TTLs** - Prevent memory leaks by setting expiration on cached data
2. **Use prefixes** - Organize keys with consistent prefixing (e.g., `user:123:profile`)
3. **Handle failures gracefully** - Cache should enhance performance, not break functionality
4. **Monitor cache metrics** - Track hit rates, memory usage, and eviction rates
5. **Use appropriate data structures** - JSON for complex objects, strings for simple values
6. **Implement cache warming** - Pre-populate frequently accessed data
7. **Version your cache keys** - Include version in key names for easy invalidation during updates
