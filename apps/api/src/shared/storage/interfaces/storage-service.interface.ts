import { Readable } from 'stream';
import { StorageFile, StorageTransformOptions, StorageUploadResult } from '../dto/upload-file.dto';

/**
 * IStorageService — Provider-agnostic public interface for cloud media and binary storage.
 *
 * Architecture ref: Phase 9.2 §4.5
 */
export interface IStorageService {
  uploadFile(
    fileBuffer: Buffer,
    folder: string,
    filename?: string,
    options?: StorageTransformOptions,
  ): Promise<StorageUploadResult>;

  uploadStream(
    stream: Readable,
    folder: string,
    filename?: string,
    options?: StorageTransformOptions,
  ): Promise<StorageUploadResult>;

  deleteFile(fileId: string): Promise<boolean>;

  deleteFiles(fileIds: string[]): Promise<boolean[]>;

  getSignedUrl(fileId: string, expiresMs?: number): Promise<string>;

  exists(fileId: string): Promise<boolean>;

  copyFile(sourceFileId: string, targetFolder: string): Promise<StorageUploadResult>;

  moveFile(sourceFileId: string, targetFolder: string): Promise<StorageUploadResult>;

  getFileMetadata(fileId: string): Promise<StorageFile>;

  getPresignedUploadUrl(
    folder: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; fileId: string }>;
}
