import { Module, Global } from '@nestjs/common';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';

/**
 * ThrottlerStorageModule — Global module providing Redis rate limit storage.
 */
@Global()
@Module({
  providers: [ThrottlerStorageRedisService],
  exports: [ThrottlerStorageRedisService],
})
export class ThrottlerStorageModule {}
