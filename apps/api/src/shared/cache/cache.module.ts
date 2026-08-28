import { Module } from '@nestjs/common';
import { CacheModule as InfraCacheModule } from '../../infrastructure/cache/cache.module';
import { CacheService } from './cache.service';

/**
 * SharedCacheModule — Exports CacheService for cache-aside operations across domain modules.
 */
@Module({
  imports: [InfraCacheModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class SharedCacheModule {}
