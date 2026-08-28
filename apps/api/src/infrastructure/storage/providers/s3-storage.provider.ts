import { Inject, Injectable, Optional } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { STORAGE_CONFIG_TOKEN } from '../constants/storage.constants';
import { StorageConfigurationError } from '../errors/storage.errors';
import {
  S3StorageConfig,
  StorageInfrastructureConfig,
} from '../interfaces/storage-config.interface';
import { BaseS3CompatibleStorageProvider } from './base-s3.provider';

/**
 * S3StorageProvider — AWS S3 / MinIO storage provider.
 *
 * Implements IStorageProvider using standard AWS S3 configurations.
 */
@Injectable()
export class S3StorageProvider extends BaseS3CompatibleStorageProvider {
  public readonly providerName = 'S3';

  constructor(
    @Optional()
    @Inject(STORAGE_CONFIG_TOKEN)
    storageConfig?: StorageInfrastructureConfig,
  ) {
    const s3Config: S3StorageConfig = storageConfig?.s3 ?? {
      region: process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_S3_BUCKET ?? 'saloon-assets',
      endpoint: process.env.AWS_S3_ENDPOINT,
      publicUrl: process.env.AWS_S3_PUBLIC_URL,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    };

    super(s3Config.bucket, s3Config.publicUrl);

    this.initializeS3Client(s3Config);
  }

  /**
   * Initializes the AWS S3 client with standard AWS credentials and region.
   */
  private initializeS3Client(config: S3StorageConfig): void {
    const hasCredentials = Boolean(config.accessKeyId && config.secretAccessKey);

    if (hasCredentials) {
      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId!,
          secretAccessKey: config.secretAccessKey!,
        },
        forcePathStyle: config.forcePathStyle ?? false,
      });
    } else if (process.env.NODE_ENV === 'test') {
      // In test mode, initialize mock client
      this.client = new S3Client({
        region: config.region ?? 'us-east-1',
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: 'mock-s3-key',
          secretAccessKey: 'mock-s3-secret',
        },
      });
    }
  }

  /**
   * Validates that S3 client and configuration are properly initialized.
   */
  public override assertConfigured(): void {
    if (!this.client) {
      throw new StorageConfigurationError(
        'AWS S3 is not configured. Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY.',
      );
    }
    super.assertConfigured();
  }
}
