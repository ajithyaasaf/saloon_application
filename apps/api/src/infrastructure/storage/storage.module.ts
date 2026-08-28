import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER_TOKEN } from './constants/storage.constants';
import { CloudflareR2StorageProvider } from './providers/cloudflare-r2.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { StorageProviderFactory } from './storage.factory';

/**
 * StorageModule — Global infrastructure module providing cloud object storage.
 *
 * Exposes IStorageProvider via STORAGE_PROVIDER_TOKEN.
 * Uses Cloudflare R2 as the production default provider.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CloudflareR2StorageProvider,
    S3StorageProvider,
    LocalStorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) =>
        StorageProviderFactory.create(configService),
      inject: [ConfigService],
    },
  ],
  exports: [
    STORAGE_PROVIDER_TOKEN,
    CloudflareR2StorageProvider,
    S3StorageProvider,
    LocalStorageProvider,
  ],
})
export class StorageModule {}
