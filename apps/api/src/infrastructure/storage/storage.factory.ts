import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageInfrastructureConfig,
  StorageProviderType,
} from './interfaces/storage-config.interface';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { CloudflareR2StorageProvider } from './providers/cloudflare-r2.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

/**
 * StorageProviderFactory — Instantiates the configured IStorageProvider implementation.
 *
 * Defaults to Cloudflare R2 for production workloads.
 * Supports S3 and Local storage for specific environments.
 */
@Injectable()
export class StorageProviderFactory {
  private static readonly logger = new Logger(StorageProviderFactory.name);

  /**
   * Factory function for NestJS provider registration.
   */
  public static create(
    configService: ConfigService,
    injectedConfig?: StorageInfrastructureConfig,
  ): IStorageProvider {
    const config: StorageInfrastructureConfig = injectedConfig ?? {
      provider:
        (configService.get<string>('storage.provider') as StorageProviderType) ??
        (process.env.STORAGE_PROVIDER as StorageProviderType) ??
        'R2',
      r2: {
        bucket:
          configService.get<string>('storage.r2.bucket') ??
          process.env.R2_BUCKET ??
          'saloon-assets',
        accountId:
          configService.get<string>('storage.r2.accountId') ??
          process.env.R2_ACCOUNT_ID,
        accessKeyId:
          configService.get<string>('storage.r2.accessKeyId') ??
          process.env.R2_ACCESS_KEY_ID,
        secretAccessKey:
          configService.get<string>('storage.r2.secretAccessKey') ??
          process.env.R2_SECRET_ACCESS_KEY,
        endpoint:
          configService.get<string>('storage.r2.endpoint') ??
          process.env.R2_ENDPOINT,
        publicUrl:
          configService.get<string>('storage.r2.publicUrl') ??
          process.env.R2_PUBLIC_URL,
      },
      s3: {
        region:
          configService.get<string>('storage.s3.region') ??
          process.env.AWS_REGION ??
          'us-east-1',
        accessKeyId:
          configService.get<string>('storage.s3.accessKeyId') ??
          process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:
          configService.get<string>('storage.s3.secretAccessKey') ??
          process.env.AWS_SECRET_ACCESS_KEY,
        bucket:
          configService.get<string>('storage.s3.bucket') ??
          process.env.AWS_S3_BUCKET ??
          'saloon-assets',
        endpoint:
          configService.get<string>('storage.s3.endpoint') ??
          process.env.AWS_S3_ENDPOINT,
        publicUrl:
          configService.get<string>('storage.s3.publicUrl') ??
          process.env.AWS_S3_PUBLIC_URL,
        forcePathStyle:
          configService.get<boolean>('storage.s3.forcePathStyle') ??
          process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      },
      local: {
        baseDir:
          configService.get<string>('storage.local.baseDir') ??
          process.env.LOCAL_STORAGE_DIR ??
          './uploads',
        publicUrl:
          configService.get<string>('storage.local.publicUrl') ??
          process.env.LOCAL_STORAGE_PUBLIC_URL ??
          'http://localhost:3000/uploads',
      },
    };

    const providerType = config.provider.toUpperCase();

    this.logger.log(`Initializing storage provider: ${providerType}`);

    switch (providerType) {
      case 'S3':
        return new S3StorageProvider(config);
      case 'LOCAL':
        return new LocalStorageProvider(config);
      case 'R2':
      default:
        return new CloudflareR2StorageProvider(config);
    }
  }
}
