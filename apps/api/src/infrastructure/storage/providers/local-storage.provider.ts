import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import {
  DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
  DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
  MAX_SIGNED_URL_EXPIRY_SECONDS,
  MIN_SIGNED_URL_EXPIRY_SECONDS,
  STORAGE_CONFIG_TOKEN,
} from '../constants/storage.constants';
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageInvalidKeyError,
  StorageObjectNotFoundError,
  StorageUploadError,
} from '../errors/storage.errors';
import {
  LocalStorageConfig,
  StorageInfrastructureConfig,
} from '../interfaces/storage-config.interface';
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
 * LocalStorageProvider — Filesystem storage provider for offline development & testing.
 *
 * Implements IStorageProvider with strict sandbox boundary checks preventing directory traversal.
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  public readonly providerName = 'LOCAL';
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;
  private readonly publicUrl: string;
  private readonly secretKey: string;

  constructor(
    @Optional()
    @Inject(STORAGE_CONFIG_TOKEN)
    storageConfig?: StorageInfrastructureConfig,
  ) {
    const localConfig: LocalStorageConfig = storageConfig?.local ?? {
      baseDir: process.env.LOCAL_STORAGE_DIR ?? path.resolve(process.cwd(), 'uploads'),
      publicUrl: process.env.LOCAL_STORAGE_PUBLIC_URL ?? 'http://localhost:3000/uploads',
    };

    this.baseDir = path.resolve(localConfig.baseDir);
    this.publicUrl = localConfig.publicUrl?.replace(/\/+$/, '') ?? 'http://localhost:3000/uploads';
    this.secretKey = process.env.JWT_ACCESS_SECRET ?? 'saloon_local_storage_secret_key_123';

    // Ensure base directory exists
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      // Handled lazily on first write
    }
  }

  public async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(input.objectKey);
    const filePath = this.resolvePath(objectKey);

    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      const buffer = Buffer.isBuffer(input.body)
        ? input.body
        : typeof input.body === 'string'
          ? Buffer.from(input.body, 'utf-8')
          : Buffer.from(input.body);

      await fs.promises.writeFile(filePath, buffer);

      const etag = crypto.createHash('md5').update(buffer).digest('hex');

      return {
        objectKey,
        provider: this.providerName,
        bucket: 'local-disk',
        etag,
        sizeBytes: buffer.length,
        contentType: input.contentType,
        publicUrl: `${this.publicUrl}/${objectKey}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new StorageUploadError(`Failed to write local file "${objectKey}": ${msg}`);
    }
  }

  public async uploadStream(input: StorageStreamUploadInput): Promise<StorageUploadResult> {
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(input.objectKey);
    const filePath = this.resolvePath(objectKey);

    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        input.body.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      const stat = await fs.promises.stat(filePath);

      return {
        objectKey,
        provider: this.providerName,
        bucket: 'local-disk',
        sizeBytes: stat.size,
        contentType: input.contentType,
        publicUrl: `${this.publicUrl}/${objectKey}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new StorageUploadError(`Failed to stream write local file "${objectKey}": ${msg}`);
    }
  }

  public async download(objectKey: string): Promise<StorageDownloadResult> {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const filePath = this.resolvePath(safeKey);

    try {
      const body = await fs.promises.readFile(filePath);
      const stat = await fs.promises.stat(filePath);
      const etag = crypto.createHash('md5').update(body).digest('hex');

      return {
        objectKey: safeKey,
        body,
        contentType: this.guessContentType(safeKey),
        contentLength: stat.size,
        etag,
        lastModified: stat.mtime,
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new StorageObjectNotFoundError(safeKey);
      }
      throw new StorageDownloadError(`Failed to read local file "${safeKey}": ${error.message}`);
    }
  }

  public async getDownloadStream(objectKey: string): Promise<StorageStreamDownloadResult> {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const filePath = this.resolvePath(safeKey);

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      const stat = await fs.promises.stat(filePath);
      const stream = fs.createReadStream(filePath);

      return {
        objectKey: safeKey,
        stream,
        contentType: this.guessContentType(safeKey),
        contentLength: stat.size,
        lastModified: stat.mtime,
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new StorageObjectNotFoundError(safeKey);
      }
      throw new StorageDownloadError(`Failed to open local stream for "${safeKey}": ${error.message}`);
    }
  }

  public async delete(objectKey: string): Promise<boolean> {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const filePath = this.resolvePath(safeKey);

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return true; // Idempotent delete
      }
      throw new StorageDeleteError(`Failed to delete local file "${safeKey}": ${error.message}`);
    }
  }

  public async deleteMany(objectKeys: string[]): Promise<boolean[]> {
    if (!Array.isArray(objectKeys) || objectKeys.length === 0) {
      return [];
    }
    return Promise.all(objectKeys.map((key) => this.delete(key)));
  }

  public async exists(objectKey: string): Promise<boolean> {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const filePath = this.resolvePath(safeKey);

    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(objectKey: string): Promise<StorageObjectMetadata | null> {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const filePath = this.resolvePath(safeKey);

    try {
      const stat = await fs.promises.stat(filePath);
      return {
        objectKey: safeKey,
        sizeBytes: stat.size,
        contentType: this.guessContentType(safeKey),
        lastModified: stat.mtime,
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw new StorageDownloadError(`Failed to inspect local file "${safeKey}": ${error.message}`);
    }
  }

  public async copy(input: StorageCopyInput): Promise<StorageUploadResult> {
    const sourceKey = StorageSecurityUtil.assertSafeObjectKey(input.sourceKey);
    const destKey = StorageSecurityUtil.assertSafeObjectKey(input.destinationKey);
    const srcPath = this.resolvePath(sourceKey);
    const destPath = this.resolvePath(destKey);

    try {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(srcPath, destPath);
      const stat = await fs.promises.stat(destPath);

      return {
        objectKey: destKey,
        provider: this.providerName,
        bucket: 'local-disk',
        sizeBytes: stat.size,
        contentType: this.guessContentType(destKey),
        publicUrl: `${this.publicUrl}/${destKey}`,
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new StorageObjectNotFoundError(sourceKey);
      }
      throw new StorageUploadError(`Failed to copy local file "${sourceKey}" -> "${destKey}": ${error.message}`);
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
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(options.objectKey);
    const expiresIn = this.clampExpiry(
      options.expiresInSeconds ?? DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const signature = this.signToken(objectKey, expiresAt.getTime(), 'upload');

    const url = `${this.publicUrl}/_signed/upload/${objectKey}?expires=${expiresAt.getTime()}&sig=${signature}`;

    return {
      url,
      objectKey,
      expiresAt,
      expiresInSeconds: expiresIn,
    };
  }

  public async generateSignedDownloadUrl(
    options: SignedDownloadUrlOptions,
  ): Promise<SignedDownloadUrlResult> {
    const objectKey = StorageSecurityUtil.assertSafeObjectKey(options.objectKey);
    const expiresIn = this.clampExpiry(
      options.expiresInSeconds ?? DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const signature = this.signToken(objectKey, expiresAt.getTime(), 'download');

    const url = `${this.publicUrl}/_signed/download/${objectKey}?expires=${expiresAt.getTime()}&sig=${signature}`;

    return {
      url,
      objectKey,
      expiresAt,
      expiresInSeconds: expiresIn,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resolvePath(objectKey: string): string {
    const safeKey = StorageSecurityUtil.assertSafeObjectKey(objectKey);
    const resolved = path.resolve(this.baseDir, safeKey);

    // Sandbox jail check — must never escape baseDir
    if (!resolved.startsWith(this.baseDir)) {
      throw new StorageInvalidKeyError(
        `Path traversal detected: "${objectKey}" escapes storage root.`,
      );
    }

    return resolved;
  }

  private signToken(key: string, expiryTimestamp: number, action: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(`${action}:${key}:${expiryTimestamp}`)
      .digest('hex');
  }

  private clampExpiry(seconds: number): number {
    return Math.max(
      MIN_SIGNED_URL_EXPIRY_SECONDS,
      Math.min(seconds, MAX_SIGNED_URL_EXPIRY_SECONDS),
    );
  }

  private guessContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.pdf':
        return 'application/pdf';
      case '.json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}
