import { Inject, Injectable, Optional } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { STORAGE_CONFIG_TOKEN } from '../constants/storage.constants';
import { StorageConfigurationError } from '../errors/storage.errors';
import {
  R2StorageConfig,
  StorageInfrastructureConfig,
} from '../interfaces/storage-config.interface';
import { BaseS3CompatibleStorageProvider } from './base-s3.provider';

/**
 * CloudflareR2StorageProvider — Production-grade Cloudflare R2 object storage provider.
 *
 * Implements S3-compatible protocol using Cloudflare R2's global edge network.
 * Zero-egress bandwidth fees, S3 compatibility, and time-limited pre-signed URLs.
 */
@Injectable()
export class CloudflareR2StorageProvider extends BaseS3CompatibleStorageProvider {
  public readonly providerName = 'R2';

  constructor(
    @Optional()
    @Inject(STORAGE_CONFIG_TOKEN)
    storageConfig?: StorageInfrastructureConfig,
  ) {
    const r2Config: R2StorageConfig = storageConfig?.r2 ?? {
      bucket: process.env.R2_BUCKET ?? 'saloon-assets',
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      endpoint: process.env.R2_ENDPOINT,
      publicUrl: process.env.R2_PUBLIC_URL,
    };

    super(r2Config.bucket, r2Config.publicUrl);

    this.initializeR2Client(r2Config);
  }

  /**
   * Initializes the AWS S3 client specifically tailored for Cloudflare R2 endpoints.
   */
  private initializeR2Client(config: R2StorageConfig): void {
    const endpoint =
      config.endpoint ??
      (config.accountId
        ? `https://${config.accountId}.r2.cloudflarestorage.com`
        : undefined);

    const hasCredentials = Boolean(config.accessKeyId && config.secretAccessKey);

    if (hasCredentials && endpoint) {
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: config.accessKeyId!,
          secretAccessKey: config.secretAccessKey!,
        },
        forcePathStyle: false,
      });
    } else if (process.env.NODE_ENV === 'test') {
      // In test mode, allow client to be initialized with test endpoint
      this.client = new S3Client({
        region: 'auto',
        endpoint: endpoint ?? 'https://mock-account.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'mock-key',
          secretAccessKey: 'mock-secret',
        },
      });
    }
  }

  /**
   * Validates that real credentials and endpoint are present when executing in production.
   */
  public override assertConfigured(): void {
    if (!this.client) {
      throw new StorageConfigurationError(
        'Cloudflare R2 is not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.',
      );
    }
    super.assertConfigured();
  }
}