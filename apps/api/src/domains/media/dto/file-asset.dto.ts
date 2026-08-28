import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';

export interface CreateFileAssetData {
  id?: string;
  salonId?: string | null;
  uploadedByUserId: string;
  originalFileName: string;
  storedFileName: string;
  objectKey: string;
  bucket: string;
  provider?: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum?: string | null;
  status?: FileStatus;
  visibility?: FileVisibility;
  category?: FileCategory;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: Record<string, any> | null;
  altText?: string | null;
  folder?: string | null;
}

export interface UpdateFileAssetData {
  originalFileName?: string;
  altText?: string | null;
  visibility?: FileVisibility;
  category?: FileCategory;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: Record<string, any> | null;
  folder?: string | null;
}

export interface UpdateFileAssetMetadataData {
  sizeBytes?: number;
  checksum?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: Record<string, any> | null;
  altText?: string | null;
}

export interface SearchFileAssetsQueryDto {
  salonId?: string | null;
  uploadedByUserId?: string;
  status?: FileStatus;
  visibility?: FileVisibility;
  category?: FileCategory;
  storageProvider?: string;
  mimeType?: string;
  objectKey?: string;
  originalFileName?: string;
  folder?: string;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'sizeBytes' | 'originalFileName';
  sortOrder?: 'asc' | 'desc';
}

export interface InitiatePresignedUploadDto {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  category?: FileCategory;
  visibility?: FileVisibility;
  folder?: string | null;
  altText?: string | null;
  checksum?: string | null;
  expiresInSeconds?: number;
  salonId?: string | null;
  uploadedByUserId?: string;
  metadata?: Record<string, any> | null;
}

export interface DirectUploadInput {
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  category?: FileCategory;
  visibility?: FileVisibility;
  folder?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  checksum?: string | null;
  salonId?: string | null;
  uploadedByUserId?: string;
  metadata?: Record<string, any> | null;
}

export * from './signed-url.dto';
export * from './media-request.dto';

export interface PresignedUploadResult {
  fileAsset: any;
  uploadUrl: string;
  expiresInSeconds: number;
  expiresAt?: Date;
  objectKey: string;
  action?: 'UPLOAD';
  headers?: Record<string, string>;
}

export interface DownloadUrlResult {
  fileAssetId?: string;
  url: string;
  isPublic: boolean;
  expiresInSeconds?: number | null;
  expiresAt?: Date | null;
  action?: 'DOWNLOAD';
}

/**
 * Valid lifecycle transitions mapping for FileAsset.
 */
export const ALLOWED_FILE_STATUS_TRANSITIONS: Record<FileStatus, FileStatus[]> = {
  [FileStatus.UPLOADING]: [FileStatus.UPLOADED, FileStatus.FAILED, FileStatus.DELETED],
  [FileStatus.UPLOADED]: [FileStatus.PROCESSING, FileStatus.READY, FileStatus.FAILED, FileStatus.DELETED],
  [FileStatus.PROCESSING]: [FileStatus.READY, FileStatus.FAILED, FileStatus.DELETED],
  [FileStatus.READY]: [FileStatus.PROCESSING, FileStatus.DELETED],
  [FileStatus.FAILED]: [FileStatus.UPLOADING, FileStatus.DELETED],
  [FileStatus.DELETED]: [FileStatus.READY, FileStatus.UPLOADED], // On restoration
};
