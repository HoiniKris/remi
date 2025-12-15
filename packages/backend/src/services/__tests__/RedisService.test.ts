import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { RedisService } from '../RedisService';

describe('RedisService', () => {
  let redis: RedisService;

  beforeAll(async () => {
    redis = new RedisService({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15, // Use separate DB for tests
    });
    await redis.connect();
  });

  afterAll(async () => {
    await redis.flushAll(); // Clean up test data
    await redis.disconnect();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await redis.flushAll();
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      expect(redis.getConnectionStatus()).toBe(true);
    });

    it('should ping successfully', async () => {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    });

    it('should get info', async () => {
      const info = await redis.info();
      expect(info).toContain('redis_version');
    });
  });

  describe('Basic Operations', () => {
    it('should set and get a string value', async () => {
      await redis.set('test:key', 'test value');
      const value = await redis.get('test:key');
      expect(value).toBe('test value');
    });

    it('should set value with TTL', async () => {
      await redis.set('test:ttl', 'value', 1);
      const value = await redis.get('test:ttl');
      expect(value).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expired = await redis.get('test:ttl');
      expect(expired).toBeNull();
    });

    it('should delete a key', async () => {
      await redis.set('test:delete', 'value');
      await redis.delete('test:delete');
      const value = await redis.get('test:delete');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await redis.set('test:exists', 'value');
      const exists = await redis.exists('test:exists');
      expect(exists).toBe(true);

      const notExists = await redis.exists('test:notexists');
      expect(notExists).toBe(false);
    });

    it('should get TTL for a key', async () => {
      await redis.set('test:ttl-check', 'value', 60);
      const ttl = await redis.ttl('test:ttl-check');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should set expiration on existing key', async () => {
      await redis.set('test:expire', 'value');
      await redis.expire('test:expire', 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const value = await redis.get('test:expire');
      expect(value).toBeNull();
    });
  });

  describe('JSON Operations', () => {
    it('should set and get JSON value', async () => {
      const data = { name: 'Alice', score: 100, active: true };
      await redis.setJSON('test:json', data);
      const retrieved = await redis.getJSON('test:json');
      expect(retrieved).toEqual(data);
    });

    it('should handle complex nested JSON', async () => {
      const data = {
        user: {
          id: '123',
          profile: {
            name: 'Bob',
            stats: [10, 20, 30],
          },
        },
        metadata: {
          created: new Date().toISOString(),
        },
      };

      await redis.setJSON('test:complex', data);
      const retrieved = await redis.getJSON('test:complex');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent JSON key', async () => {
      const value = await redis.getJSON('test:notexists');
      expect(value).toBeNull();
    });

    it('should handle JSON with TTL', async () => {
      const data = { temp: true };
      await redis.setJSON('test:json-ttl', data, 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const value = await redis.getJSON('test:json-ttl');
      expect(value).toBeNull();
    });
  });

  describe('Counter Operations', () => {
    it('should increment a counter', async () => {
      const value1 = await redis.increment('test:counter');
      expect(value1).toBe(1);

      const value2 = await redis.increment('test:counter');
      expect(value2).toBe(2);

      const value3 = await redis.increment('test:counter', 5);
      expect(value3).toBe(7);
    });

    it('should decrement a counter', async () => {
      await redis.set('test:counter2', '10');

      const value1 = await redis.decrement('test:counter2');
      expect(value1).toBe(9);

      const value2 = await redis.decrement('test:counter2', 3);
      expect(value2).toBe(6);
    });
  });

  describe('Pattern Operations', () => {
    it('should get keys matching pattern', async () => {
      await redis.set('user:1:name', 'Alice');
      await redis.set('user:2:name', 'Bob');
      await redis.set('user:3:name', 'Charlie');
      await redis.set('game:1:state', 'active');

      const userKeys = await redis.keys('user:*');
      expect(userKeys).toHaveLength(3);
      expect(userKeys).toContain('user:1:name');
      expect(userKeys).toContain('user:2:name');
      expect(userKeys).toContain('user:3:name');
    });

    it('should delete keys matching pattern', async () => {
      await redis.set('temp:1', 'value1');
      await redis.set('temp:2', 'value2');
      await redis.set('temp:3', 'value3');
      await redis.set('keep:1', 'value');

      const deleted = await redis.deletePattern('temp:*');
      expect(deleted).toBe(3);

      const remaining = await redis.keys('temp:*');
      expect(remaining).toHaveLength(0);

      const kept = await redis.get('keep:1');
      expect(kept).toBe('value');
    });
  });

  describe('Pub/Sub', () => {
    it('should publish and subscribe to messages', async () => {
      const messages: string[] = [];

      // Subscribe to channel
      await redis.subscribe('test:channel', (message) => {
        messages.push(message);
      });

      // Give subscription time to register
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish messages
      await redis.publish('test:channel', 'message1');
      await redis.publish('test:channel', 'message2');

      // Wait for messages to be received
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toContain('message1');
      expect(messages).toContain('message2');

      // Cleanup
      await redis.unsubscribe('test:channel');
    });

    it('should publish and subscribe to JSON messages', async () => {
      const messages: any[] = [];

      await redis.subscribeJSON('test:json-channel', (message) => {
        messages.push(message);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await redis.publishJSON('test:json-channel', { type: 'event', data: 'test' });
      await redis.publishJSON('test:json-channel', { type: 'update', value: 42 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ type: 'event', data: 'test' });
      expect(messages[1]).toEqual({ type: 'update', value: 42 });

      await redis.unsubscribe('test:json-channel');
    });

    it('should handle multiple subscribers', async () => {
      const messages1: string[] = [];
      const messages2: string[] = [];

      await redis.subscribe('test:multi', (msg) => messages1.push(msg));
      await redis.subscribe('test:multi', (msg) => messages2.push(msg));

      await new Promise((resolve) => setTimeout(resolve, 100));

      await redis.publish('test:multi', 'broadcast');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages1).toContain('broadcast');
      expect(messages2).toContain('broadcast');

      await redis.unsubscribe('test:multi');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not connected', async () => {
      const disconnectedRedis = new RedisService({
        host: 'localhost',
        port: 6379,
      });

      await expect(disconnectedRedis.get('key')).rejects.toThrow('Redis is not connected');
    });

    it('should handle invalid JSON gracefully', async () => {
      await redis.set('test:invalid-json', 'not valid json {');
      const value = await redis.getJSON('test:invalid-json');
      expect(value).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      await redis.set('test:empty', '');
      const value = await redis.get('test:empty');
      expect(value).toBe('');
    });

    it('should handle special characters in keys', async () => {
      await redis.set('test:special:key:with:colons', 'value');
      const value = await redis.get('test:special:key:with:colons');
      expect(value).toBe('value');
    });

    it('should handle large values', async () => {
      const largeValue = 'x'.repeat(10000);
      await redis.set('test:large', largeValue);
      const value = await redis.get('test:large');
      expect(value).toBe(largeValue);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(redis.set(`test:concurrent:${i}`, `value${i}`));
      }

      await Promise.all(promises);

      const values = await Promise.all(
        Array.from({ length: 10 }, (_, i) => redis.get(`test:concurrent:${i}`))
      );

      values.forEach((value, i) => {
        expect(value).toBe(`value${i}`);
      });
    });
  });
});
