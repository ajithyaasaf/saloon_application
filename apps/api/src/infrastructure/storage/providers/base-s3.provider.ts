import { Logger } from '@nestjs/common';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
  DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
  MAX_SIGNED_URL_EXPIRY_SECONDS,
  MIN_SIGNED_URL_EXPIRY_SECONDS,
} from '../constants/storage.constants';
import {
  StorageConfigurationError,
  StorageDeleteError,
  StorageDownloadError,
  StorageObjectNotFoundError,
  StorageProviderError,
  StorageUploadError,
} from '../errors/storage.errors';
import {
  IStorageProvider,
  SignedDownloadUrlOptions,
  SignedDownloadUrlResult,
  SignedUploadUrlOptions,
  SignedUploadUrlResult,
  StorageCopyInput,
  StorageDownloadResult,
  StorageMoveInput,
  StorageObjectMetadata,
  StorageStreamDownloadResult,
  StorageStreamUploadInput,
  StorageUploadInput,
  StorageUploadResult,
} from '../interfaces/storage-provider.interface';
import { StorageSecurityUtil } from '../utils/storage-security.util';

/**
 * BaseS3CompatibleStorageProvider — S3-compatible abstract storage provider.
 *
 * Implements S3-compliant protocol operations utilized by Cloudflare R2,
 * AWS S3, MinIO, and other S3-compatible object storage backends.
 */
export abstract class BaseS3CompatibleStorageProvider implements IStorageProvider {
  protected readonly logger: Logger;
  protected client: S3Client;
  protected bucket: string;
  protected publicUrl?: string;

  abstract readonly providerName: string;

  constructor(bucket: string, publicUrl?: string) {
    this.logger = new Logger(this.constructor.name);
    this.bucket = bucket;
    this.publicUrl = publicUrl?.replace(/\/+$/, '');
  }

  /**
   * Initializes or replaces the S3Client instance.
   */
  public setClient(client: S3Client): void {
    this.client = client;
  }

  /**
   * Asserts that S3Client and Bucket are initialized.
   */
  protected assertConfigured(): void {
    if (!this.client) {
      throw new StorageConfigurationError(
        `Storage provider "${this.providerName}" S3Client is not initialized. Check storage configuration.`,
      );
    }
    if (!this.bucket || this.bucket.trim().length === 0) {
      throw new StorageConfigurationError(
        `Storage provider "${this.providerName}" bucket is not configured.`,
      );
    }
  }

  public async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    this.assertConfigured();
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(input.objectKey);
    const startTime = Date.now();

    try {
      const bodyBuffer = Buffer.isBuffer(input.body)
        ? input.body
        : typeof input.body === 'string'
          ? Buffer.from(input.body, 'utf-8')
          : Buffer.from(input.body);

      const contentLength = input.contentLength ?? bodyBuffer.length;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: bodyBuffer,
        ContentType: input.contentType,
        ContentLength: contentLength,
        Metadata: input.metadata,
        CacheControl: input.cacheControl,
      });

      const response = await this.client.send(command);
      const durationMs = Date.now() - startTime;

      this.logger.log({
        message: 'Object uploaded successfully',
        provider: this.providerName,
        bucket: this.bucket,
        objectKey,
        sizeBytes: contentLength,
        contentType: input.contentType,
        durationMs,
      });

      return {
        objectKey,
        provider: this.providerName,
        bucket: this.bucket,
        etag: response.ETag?.replace(/"/g, ''),
        sizeBytes: contentLength,
        contentType: input.contentType,
        publicUrl: this.buildPublicUrl(objectKey),
      };
    } catch (error: unknown) {
      this.handleError('upload', objectKey, error);
    }
  }

  public async uploadStream(input: StorageStreamUploadInput): Promise<StorageUploadResult> {
    this.assertConfigured();
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(input.objectKey);
    const startTime = Date.now();

    try {
      const chunks: Buffer[] = [];
      let totalLength = 0;

      for await (const chunk of input.body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        totalLength += buf.length;
      }

      const bodyBuffer = Buffer.concat(chunks, totalLength);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: bodyBuffer,
        ContentType: input.contentType,
        ContentLength: input.contentLength ?? bodyBuffer.length,
        Metadata: input.metadata,
        CacheControl: input.cacheControl,
      });

      const response = await this.client.send(command);
      const durationMs = Date.now() - startTime;

      this.logger.log({
        message: 'Stream uploaded successfully',
        provider: this.providerName,
        bucket: this.bucket,
        objectKey,
        sizeBytes: bodyBuffer.length,
        contentType: input.contentType,
        durationMs,
      });

      return {
        objectKey,
        provider: this.providerName,
        bucket: this.bucket,
        etag: response.ETag?.replace(/"/g, ''),
        sizeBytes: bodyBuffer.length,
        contentType: input.contentType,
        publicUrl: this.buildPublicUrl(objectKey),
      };
    } catch (error: unknown) {
      this.handleError('uploadStream', objectKey, error);
    }
  }

  public async download(objectKey: string): Promise<StorageDownloadResult> {
    this.assertConfigured();
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new StorageDownloadError(`Empty body received for object "${safeKey}"`);
      }

      const bodyBuffer = await this.streamToBuffer(response.Body as Readable);

      return {
        objectKey: safeKey,
        body: bodyBuffer,
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength ?? bodyBuffer.length,
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      this.handleError('download', safeKey, error);
    }
  }

  public async getDownloadStream(objectKey: string): Promise<StorageStreamDownloadResult> {
    this.assertConfigured();
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new StorageDownloadError(`Empty stream received for object "${safeKey}"`);
      }

      return {
        objectKey: safeKey,
        stream: response.Body as Readable,
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength,
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      this.handleError('getDownloadStream', safeKey, error);
    }
  }

  public async delete(objectKey: string): Promise<boolean> {
    this.assertConfigured();
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });

      await this.client.send(command);

      this.logger.log({
        message: 'Object deleted',
        provider: this.providerName,
        bucket: this.bucket,
        objectKey: safeKey,
      });

      return true;
    } catch (error: unknown) {
      this.handleError('delete', safeKey, error);
    }
  }

  public async deleteMany(objectKeys: string[]): Promise<boolean[]> {
    this.assertConfigured();
    if (!Array.isArray(objectKeys) || objectKeys.length === 0) {
      return [];
    }

    const safeKeys = objectKeys.map((key) => StorageSecurityUtil.assertSafeObjectKey(key));

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: safeKeys.map((Key) => ({ Key })),
          Quiet: false,
        },
      });

      const response = await this.client.send(command);
      const errors = response.Errors ?? [];
      const errorKeySet = new Set(errors.map((e) => e.Key));

      return safeKeys.map((key) => !errorKeySet.has(key));
    } catch (error: unknown) {
      this.handleError('deleteMany', safeKeys.join(', '), error);
    }
  }

  public async exists(objectKey: string): Promise<boolean> {
    this.assertConfigured();
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      this.handleError('exists', safeKey, error);
    }
  }

  public async getMetadata(objectKey: string): Promise<StorageObjectMetadata | null> {
    this.assertConfigured();
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });

      const response = await this.client.send(command);

      return {
        objectKey: safeKey,
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleError('getMetadata', safeKey, error);
    }
  }

  public async copy(input: StorageCopyInput): Promise<StorageUploadResult> {
    this.assertConfigured();
    const sourceKey = StorageSecurityUtil.assertSafeObjectKey(input.sourceKey);
    const destinationKey = StorageSecurityUtil.assertSafeObjectKey(input.destinationKey);

    try {
      const copySource = `${this.bucket}/${encodeURIComponent(sourceKey)}`;

      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: copySource,
        Key: destinationKey,
        Metadata: input.metadata,
        MetadataDirective: input.metadata ? 'REPLACE' : 'COPY',
      });

      const response = await this.client.send(command);
      const meta = await this.getMetadata(destinationKey);

      return {
        objectKey: destinationKey,
        provider: this.providerName,
        bucket: this.bucket,
        etag: response.CopyObjectResult?.ETag?.replace(/"/g, ''),
        sizeBytes: meta?.sizeBytes ?? 0,
        contentType: meta?.contentType ?? 'application/octet-stream',
        publicUrl: this.buildPublicUrl(destinationKey),
      };
    } catch (error: unknown) {
      this.handleError('copy', `${sourceKey} -> ${destinationKey}`, error);
    }
  }

  public async move(input: StorageMoveInput): Promise<StorageUploadResult> {
    const copyResult = await this.copy({
      sourceKey: input.sourceKey,
      destinationKey: input.destinationKey,
    });

    await this.delete(input.sourceKey);
    return copyResult;
  }

  public async generateSignedUploadUrl(
    options: SignedUploadUrlOptions,
  ): Promise<SignedUploadUrlResult> {
    this.assertConfigured();
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(options.objectKey);
    const expiresIn = this.clampExpiry(
      options.expiresInSeconds ?? DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
    );

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log({
        message: 'Signed upload URL generated',
        provider: this.providerName,
        bucket: this.bucket,
        objectKey,
        expiresInSeconds: expiresIn,
      });

      return {
        url,
        objectKey,
        expiresAt,
        expiresInSeconds: expiresIn,
      };
    } catch (error: unknown) {
      this.handleError('generateSignedUploadUrl', objectKey, error);
    }
  }

  public async generateSignedDownloadUrl(
    options: SignedDownloadUrlOptions,
  ): Promise<SignedDownloadUrlResult> {
    this.assertConfigured();
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(options.objectKey);
    const expiresIn = this.clampExpiry(
      options.expiresInSeconds ?? DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
    );

    try {
      const contentDisposition = options.filename
        ? `attachment; filename="${encodeURIComponent(options.filename)}"`
        : undefined;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentDisposition: contentDisposition,
        ResponseContentType: options.contentType,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log({
        message: 'Signed download URL generated',
        provider: this.providerName,
        bucket: this.bucket,
        objectKey,
        expiresInSeconds: expiresIn,
      });

      return {
        url,
        objectKey,
        expiresAt,
        expiresInSeconds: expiresIn,
      };
    } catch (error: unknown) {
      this.handleError('generateSignedDownloadUrl', objectKey, error);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  protected buildPublicUrl(objectKey: string): string | undefined {
    if (!this.publicUrl) {
      return undefined;
    }
    return `${this.publicUrl}/${objectKey.replace(/^\/+/, '')}`;
  }

  protected clampExpiry(seconds: number): number {
    return Math.max(
      MIN_SIGNED_URL_EXPIRY_SECONDS,
      Math.min(seconds, MAX_SIGNED_URL_EXPIRY_SECONDS),
    );
  }

  protected async streamToBuffer(stream: Readable): Promise<Buffer> {
    if (typeof (stream as any).transformToByteArray === 'function') {
      const byteArray = await (stream as any).transformToByteArray();
      return Buffer.from(byteArray);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  protected isNotFoundError(error: any): boolean {
    if (!error) return false;
    const name = error.name || error.Code || '';
    const status = error.$metadata?.httpStatusCode || error.statusCode || 0;
    return (
      name === 'NoSuchKey' ||
      name === 'NotFound' ||
      name === 'NoSuchBucket' ||
      status === 404
    );
  }

  protected handleError(operation: string, key: string, error: unknown): never {
    if (error instanceof StorageProviderError) {
      throw error;
    }

    if (this.isNotFoundError(error)) {
      throw new StorageObjectNotFoundError(key);
    }

    const err = error as any;
    const errorMessage = err?.message ?? 'Unknown storage error';
    const statusCode = err?.$metadata?.httpStatusCode;

    this.logger.error({
      message: `Storage ${operation} error`,
      provider: this.providerName,
      bucket: this.bucket,
      key,
      statusCode,
      error: errorMessage,
    });

    if (operation.includes('upload') || operation.includes('Upload')) {
      throw new StorageUploadError(`Failed to upload "${key}" to ${this.providerName}: ${errorMessage}`);
    }
    if (operation.includes('download') || operation.includes('Download')) {
      throw new StorageDownloadError(`Failed to download "${key}" from ${this.providerName}: ${errorMessage}`);
    }
    if (operation.includes('delete') || operation.includes('Delete')) {
      throw new StorageDeleteError(`Failed to delete "${key}" from ${this.providerName}: ${errorMessage}`);
    }

    throw new StorageProviderError(
      `Storage operation "${operation}" failed on ${this.providerName}: ${errorMessage}`,
    );
  }
}