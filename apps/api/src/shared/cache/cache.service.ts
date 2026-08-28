import { Injectable, Logger } from '@nestjs/common';
import { DatabaseException } from '../../common/exceptions/database.exception';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CACHE_TTL } from './constants/cache-keys.constant';
import { ICacheService } from './interfaces/cache-service.interface';

/**
 * CacheService — Multi-tier cache-aside abstraction wrapping RedisService.
 *
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable outputs.
 * Dependencies: RedisService.
 *
 * SERIALIZATION GOVERNANCE:
 * CacheService handles all JSON serialization/deserialization internally.
 * Domain services MUST NEVER manually `JSON.stringify()` or `JSON.parse()` cached values.
 *
 * TTL GOVERNANCE:
 * `ttlSeconds <= 0` is strictly forbidden and throws ValidationException.
 * Zero or negative TTL entries are never persisted.
 *
 * PERFORMANCE GOVERNANCE:
 * `deleteByPattern()` performs pattern matching scans (SCAN/KEYS).
 * Wildcard pattern scans MUST NOT be called in hot request paths.
 * Use namespaced keys directly whenever possible.
 *
 * FAIL-SAFE STRATEGY:
 * Read failures log errors internally and fall back to source of truth (factory / null).
 *
 * Architecture ref: Phase 9.2 §4.2 (CacheService)
 */
@Injectable()
export class CacheService implements ICacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Retrieves a cached value or returns null if not cached or on fail-safe read error.
   */
  public async get<T>(key: string): Promise<T | null> {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return null;
    }

    try {
      return await this.redisService.get<T>(key);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache get operation failed';
      this.logger.error(`Cache GET error for key ${key} (Fail-safe fallback to DB): ${message}`);
      return null; // Fail-safe fallback to source of truth
    }
  }

  /**
   * Writes a value to cache with specified TTL in seconds.
   * Throws ValidationException if `ttlSeconds <= 0`.
   */
  public async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.DEFAULT): Promise<void> {
    if (typeof key !== 'string' || key.trim().length === 0 || value === undefined) {
      return;
    }
    if (typeof ttlSeconds !== 'number' || ttlSeconds <= 0) {
      throw new ValidationException(`CacheService.set() requires positive ttlSeconds > 0. Received: ${ttlSeconds}`);
    }

    try {
      await this.redisService.set(key, value, ttlSeconds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache set operation failed';
      this.logger.error(`Cache SET error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Deletes a cached entry by exact key name.
   */
  public async delete(key: string): Promise<void> {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return;
    }

    try {
      await this.redisService.del(key);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache delete operation failed';
      this.logger.error(`Cache DEL error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Deletes cached entries matching a glob pattern (e.g. `salon:profile:*`).
   * WARNING: Do NOT call pattern scans on hot request paths.
   */
  public async deleteByPattern(pattern: string): Promise<void> {
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      return;
    }

    try {
      const keys = await this.redisService.keys(pattern);
      if (keys.length > 0) {
        await this.redisService.del(...keys);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache deleteByPattern operation failed';
      this.logger.error(`Cache deleteByPattern error for pattern ${pattern}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Implements Cache-Aside strategy:
   * 1. Reads from cache.
   * 2. If miss or read failure, calls factory function to fetch fresh data.
   * 3. Writes fresh data to cache.
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.DEFAULT,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await factory();
    if (freshData !== undefined && freshData !== null) {
      try {
        await this.set(key, freshData, ttlSeconds);
      } catch (err: unknown) {
        this.logger.warn(`Failed to cache fresh data for key ${key}: ${(err as Error).message}`);
      }
    }

    return freshData;
  }

  /**
   * Atomically increments a numeric key.
   * Throws ValidationException if increment value is non-integer.
   */
  public async increment(key: string, value = 1): Promise<number> {
    if (!Number.isInteger(value)) {
      throw new ValidationException(`CacheService.increment() value must be an integer. Received: ${value}`);
    }

    try {
      const client = this.redisService.getClient();
      if (value === 1) {
        return await this.redisService.incr(key);
      }
      return await client.incrby(key, value);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache increment operation failed';
      this.logger.error(`Cache INCR error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Atomically decrements a numeric key.
   * Throws ValidationException if decrement value is non-integer.
   */
  public async decrement(key: string, value = 1): Promise<number> {
    if (!Number.isInteger(value)) {
      throw new ValidationException(`CacheService.decrement() value must be an integer. Received: ${value}`);
    }

    try {
      const client = this.redisService.getClient();
      return await client.decrby(key, value);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache decrement operation failed';
      this.logger.error(`Cache DECR error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Checks whether a key exists in cache.
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      const count = await client.exists(key);
      return count === 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache exists operation failed';
      this.logger.error(`Cache EXISTS error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /**
   * Updates TTL of an existing key.
   */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (typeof ttlSeconds !== 'number' || ttlSeconds <= 0) {
      throw new ValidationException(`CacheService.expire() requires positive ttlSeconds > 0. Received: ${ttlSeconds}`);
    }

    try {
      return await this.redisService.expire(key, ttlSeconds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache expire operation failed';
      this.logger.error(`Cache EXPIRE error for key ${key}: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  /** Reserved signature for invalidating keys by tag */
  public async invalidateTag(tag: string): Promise<void> {
    if (typeof tag !== 'string' || tag.trim().length === 0) return;
    await this.deleteByPattern(`tag:${tag.trim()}:*`);
  }
}
