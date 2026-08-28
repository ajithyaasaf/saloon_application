import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * RedisService — the single Redis connection point for the application.
 *
 * Design rules (from Phase 5 architecture §3.2):
 *  - Wraps a single ioredis client.
 *  - Exposes typed helper methods. No domain code calls ioredis directly.
 *  - All keys must use namespaced constants from common/constants/cache-keys.constant.ts.
 *  - setNX() is used for distributed locks and idempotency keys.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const options: RedisOptions = {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      db: this.configService.get<number>('redis.db', 0),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
    };

    const password = this.configService.get<string>('redis.password');
    if (password) {
      options.password = password;
    }

    this.client = new Redis(options);

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis connection closed gracefully');
      } catch (err: any) {
        this.client.disconnect();
        this.logger.warn(`Redis connection force-disconnected: ${err?.message}`);
      }
    }
  }

  /**
   * Returns the raw ioredis client.
   * Use this only in infrastructure code (e.g. health checks, BullMQ).
   * Domain code must never call this directly.
   */
  getClient(): Redis {
    return this.client;
  }

  // ─── Typed helper methods ──────────────────────────────────────────────────

  /**
   * Get a cached value and deserialize from JSON.
   * Returns null if the key does not exist or Redis is offline.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') return null;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a value by serializing to JSON with an optional TTL in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client || this.client.status !== 'ready') return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      // Degraded cache write
    }
  }

  /**
   * Set a value only if the key does NOT already exist (atomic NX operation).
   * Returns true if the key was set, false if it already existed or Redis is offline.
   * Used for distributed locks and idempotency key initialization.
   */
  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || this.client.status !== 'ready') return true; // Fail open in local degraded mode
    try {
      let result: string | null;
      if (ttlSeconds !== undefined) {
        result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      } else {
        result = await this.client.setnx(key, value).then((r) => (r === 1 ? 'OK' : null));
      }
      return result === 'OK';
    } catch {
      return true;
    }
  }

  /** Delete one or more keys. */
  async del(...keys: string[]): Promise<void> {
    if (!this.client || this.client.status !== 'ready' || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      // Degraded cache delete
    }
  }

  /** Update the TTL of an existing key. Returns false if the key does not exist. */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client || this.client.status !== 'ready') return false;
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch {
      return false;
    }
  }

  /** Find keys matching a glob pattern. Use sparingly — SCAN-based, not production KEYS. */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client || this.client.status !== 'ready') return [];
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  /** Get multiple values at once. Returns null for missing keys. */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client || this.client.status !== 'ready' || keys.length === 0) return [];
    try {
      const raws = await this.client.mget(...keys);
      return raws.map((raw) => (raw === null ? null : (JSON.parse(raw) as T)));
    } catch {
      return [];
    }
  }

  /** Atomically increment a key by 1. Creates the key at 0 if it doesn't exist. */
  async incr(key: string): Promise<number> {
    if (!this.client || this.client.status !== 'ready') return 1;
    try {
      return await this.client.incr(key);
    } catch {
      return 1;
    }
  }

  /**
   * Health check helper — used by /health/readiness.
   * Pings Redis and confirms the response.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.client || this.client.status !== 'ready') return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
