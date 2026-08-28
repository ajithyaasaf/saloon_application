import { Readable } from 'stream';

// ─── Storage Input & Output Types ────────────────────────────────────────────

export interface StorageUploadInput {
  objectKey: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface StorageStreamUploadInput {
  objectKey: string;
  body: Readable;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface StorageUploadResult {
  objectKey: string;
  provider: string;
  bucket: string;
  etag?: string;
  sizeBytes: number;
  contentType: string;
  publicUrl?: string;
}

export interface StorageDownloadResult {
  objectKey: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface StorageStreamDownloadResult {
  objectKey: string;
  stream: Readable;
  contentType: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface StorageObjectMetadata {
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface SignedUploadUrlOptions {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
  maxSizeBytes?: number;
  metadata?: Record<string, string>;
}

export interface SignedUploadUrlResult {
  url: string;
  objectKey: string;
  expiresAt: Date;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface SignedDownloadUrlOptions {
  objectKey: string;
  expiresInSeconds?: number;
  filename?: string;
  contentType?: string;
}

export interface SignedDownloadUrlResult {
  url: string;
  objectKey: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

export interface StorageCopyInput {
  sourceKey: string;
  destinationKey: string;
  metadata?: Record<string, string>;
}

export interface StorageMoveInput {
  sourceKey: string;
  destinationKey: string;
}

// ─── Provider-Independent Storage Interface ─────────────────────────────────

/**
 * IStorageProvider — Provider-agnostic object storage interface.
 *
 * Implemented by:
 *  - CloudflareR2StorageProvider (Primary production)
 *  - S3StorageProvider (AWS S3 alternative)
 *  - LocalStorageProvider (Development / Testing)
 *
 * Domain and Application layers must interact with storage strictly
 * through this contract without referencing underlying provider SDKs.
 */
export interface IStorageProvider {
  /** The unique identifier of this provider instance (e.g., 'R2', 'S3', 'LOCAL') */
  readonly providerName: string;

  /**
   * Uploads an in-memory buffer or string to storage.
   */
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;

  /**
   * Uploads a readable stream to storage.
   */
  uploadStream(input: StorageStreamUploadInput): Promise<StorageUploadResult>;

  /**
   * Downloads an object as a Buffer into memory.
   */
  download(objectKey: string): Promise<StorageDownloadResult>;

  /**
   * Opens a readable download stream for an object.
   */
  getDownloadStream(objectKey: string): Promise<StorageStreamDownloadResult>;

  /**
   * Deletes a single object by its key.
   * Returns true if deleted or if object was already absent (idempotent).
   */
  delete(objectKey: string): Promise<boolean>;

  /**
   * Deletes multiple objects by their keys in batch.
   */
  deleteMany(objectKeys: string[]): Promise<boolean[]>;

  /**
   * Checks whether an object exists in storage.
   */
  exists(objectKey: string): Promise<boolean>;

  /**
   * Retrieves object metadata without downloading object payload.
   * Returns null if object does not exist.
   */
  getMetadata(objectKey: string): Promise<StorageObjectMetadata | null>;

  /**
   * Copies an object within the storage bucket.
   */
  copy(input: StorageCopyInput): Promise<StorageUploadResult>;

  /**
   * Moves/renames an object within storage (copy followed by source deletion).
   */
  move(input: StorageMoveInput): Promise<StorageUploadResult>;

  /**
   * Generates a pre-signed, time-limited URL for direct client upload (PUT).
   */
  generateSignedUploadUrl(options: SignedUploadUrlOptions): Promise<SignedUploadUrlResult>;

  /**
   * Generates a pre-signed, time-limited URL for client download (GET).
   */
  generateSignedDownloadUrl(options: SignedDownloadUrlOptions): Promise<SignedDownloadUrlResult>;
}
