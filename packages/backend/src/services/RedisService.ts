import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryStrategy?: (times: number) => number;
}

/**
 * Redis service for caching and pub/sub functionality
 */
export class RedisService {
  private client: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private isConnected: boolean = false;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = {
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      ...config,
    };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Main client for general operations
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          reconnectStrategy: this.config.retryStrategy,
        },
        password: this.config.password,
        database: this.config.db,
      });

      // Pub client for publishing messages
      this.pubClient = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          reconnectStrategy: this.config.retryStrategy,
        },
        password: this.config.password,
        database: this.config.db,
      });

      // Sub client for subscribing to channels
      this.subClient = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          reconnectStrategy: this.config.retryStrategy,
        },
        password: this.config.password,
        database: this.config.db,
      });

      // Set up error handlers
      this.client.on('error', (err) => console.error('Redis Client Error:', err));
      this.pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
      this.subClient.on('error', (err) => console.error('Redis Sub Error:', err));

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.isConnected = true;
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await Promise.all([this.client?.quit(), this.pubClient?.quit(), this.subClient?.quit()]);

      this.isConnected = false;
      console.log('Redis disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | null> {
    this.ensureConnected();
    return await this.client!.get(key);
  }

  /**
   * Get a JSON value from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing JSON from Redis:', error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.ensureConnected();
    if (ttlSeconds) {
      await this.client!.setEx(key, ttlSeconds, value);
    } else {
      await this.client!.set(key, value);
    }
  }

  /**
   * Set a JSON value in cache
   */
  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString, ttlSeconds);
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    this.ensureConnected();
    await this.client!.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    this.ensureConnected();
    const keys = await this.client!.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.client!.del(keys);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    this.ensureConnected();
    const result = await this.client!.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    this.ensureConnected();
    await this.client!.expire(key, ttlSeconds);
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    this.ensureConnected();
    return await this.client!.ttl(key);
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    return await this.client!.incrBy(key, amount);
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    return await this.client!.decrBy(key, amount);
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient!.publish(channel, message);
  }

  /**
   * Publish a JSON message to a channel
   */
  async publishJSON(channel: string, message: any): Promise<number> {
    const jsonString = JSON.stringify(message);
    return await this.publish(channel, jsonString);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    this.ensureConnected();
    await this.subClient!.subscribe(channel, callback);
  }

  /**
   * Subscribe to a channel with JSON parsing
   */
  async subscribeJSON<T>(channel: string, callback: (message: T) => void): Promise<void> {
    await this.subscribe(channel, (message: string) => {
      try {
        const parsed = JSON.parse(message) as T;
        callback(parsed);
      } catch (error) {
        console.error('Error parsing JSON message:', error);
      }
    });
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    this.ensureConnected();
    await this.subClient!.unsubscribe(channel);
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    this.ensureConnected();
    return await this.client!.keys(pattern);
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<void> {
    this.ensureConnected();
    await this.client!.flushAll();
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    this.ensureConnected();
    return await this.client!.info();
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    this.ensureConnected();
    return await this.client!.ping();
  }

  /**
   * Ensure Redis is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis is not connected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let redisInstance: RedisService | null = null;

/**
 * Get Redis service instance
 */
export function getRedisService(config?: RedisConfig): RedisService {
  if (!redisInstance && config) {
    redisInstance = new RedisService(config);
  }
  if (!redisInstance) {
    throw new Error('Redis service not initialized. Provide config on first call.');
  }
  return redisInstance;
}

/**
 * Initialize Redis service
 */
export async function initializeRedis(config: RedisConfig): Promise<RedisService> {
  const redis = getRedisService(config);
  await redis.connect();
  return redis;
}
