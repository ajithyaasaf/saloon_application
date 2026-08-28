import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * CacheModule — global module that provides RedisService to every module.
 *
 * This is a thin wrapper around RedisService. It does NOT use @nestjs/cache-manager.
 * We use raw ioredis via RedisService for full control over key namespacing,
 * TTL management, setNX, and pattern scanning.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
