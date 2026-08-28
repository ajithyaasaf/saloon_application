import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * ThrottlerStorageRedisService — Redis-backed storage for NestJS Throttler with
 * graceful in-memory degraded mode fallback.
 *
 * Architecture ref: Phase 26 §26.1 (Ingress Security & Rate Limiting Hardening)
 */
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);
  private readonly memoryStore = new Map<string, { totalHits: number; expiresAt: number }>();

  constructor(private readonly redisService: RedisService) {}

  /**
   * Atomically increments the hit count for a given rate-limiting key.
   * If Redis is unavailable or errors, falls back safely to in-memory tracking.
   *
   * @param key Generated rate limit key
   * @param ttl Time-to-live in milliseconds
   */
  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const redisKey = `ratelimit:${key}`;

    try {
      const client = this.redisService?.getClient();
      if (!client || client.status !== 'ready') {
        return this.handleFallback(key, ttl);
      }

      const pipeline = client.pipeline();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);
      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        throw new Error('Redis pipeline returned invalid results');
      }

      const [incrErr, hits] = results[0];
      const [pttlErr, pttl] = results[1];

      if (incrErr) throw incrErr;
      if (pttlErr) throw pttlErr;

      const totalHits = typeof hits === 'number' ? hits : Number(hits);
      let timeToExpireMs = typeof pttl === 'number' ? pttl : Number(pttl);

      // If key was just created (pttl === -1), set its TTL in milliseconds
      if (timeToExpireMs < 0) {
        await client.pexpire(redisKey, ttl);
        timeToExpireMs = ttl;
      }

      const timeToExpireSeconds = Math.max(1, Math.ceil(timeToExpireMs / 1000));

      return {
        totalHits,
        timeToExpire: timeToExpireSeconds,
      };
    } catch (err: any) {
      this.logger.warn(
        `Redis error during rate limiting for key "${key}": ${err?.message || err}. Degraded in-memory fallback active.`,
      );
      return this.handleFallback(key, ttl);
    }
  }

  /**
   * In-memory fallback tracking for degraded mode (e.g. during Redis outage/network partition).
   */
  private handleFallback(key: string, ttl: number): ThrottlerStorageRecord {
    const now = Date.now();
    const existing = this.memoryStore.get(key);

    if (existing && existing.expiresAt > now) {
      existing.totalHits += 1;
      const remainingMs = existing.expiresAt - now;
      return {
        totalHits: existing.totalHits,
        timeToExpire: Math.max(1, Math.ceil(remainingMs / 1000)),
      };
    }

    const expiresAt = now + ttl;
    this.memoryStore.set(key, { totalHits: 1, expiresAt });

    // Opportunistic cleanup of expired keys when map exceeds size limit
    if (this.memoryStore.size > 5000) {
      for (const [k, v] of this.memoryStore.entries()) {
        if (v.expiresAt <= now) {
          this.memoryStore.delete(k);
        }
      }
    }

    return {
      totalHits: 1,
      timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
    };
  }
}
