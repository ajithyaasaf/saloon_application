import { FileCategory, FileStatus, FileVisibility } from '../../enums/index.js';

export interface FileAssetDto {
  id: string;
  salonId?: string | null;
  uploadedByUserId: string;
  originalFileName: string;
  storedFileName: string;
  objectKey: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: FileStatus;
  visibility: FileVisibility;
  category: FileCategory;
  folder?: string | null;
  publicUrl?: string | null;
  downloadUrl?: string | null;
  thumbnailUrl?: string | null;
  customMetadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePresignedUploadRequestDto {
  salonId?: string;
  category: FileCategory;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  folder?: string;
  visibility?: FileVisibility;
  customMetadata?: Record<string, any>;
}

export interface InitiatePresignedUploadResponseDto {
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
  httpMethod: 'PUT' | 'POST';
  requiredHeaders?: Record<string, string>;
  category: FileCategory;
  visibility: FileVisibility;
}

export interface FinalizeUploadRequestDto {
  actualSizeBytes?: number;
  checksum?: string;
}

export interface FinalizeUploadResponseDto {
  asset: FileAssetDto;
  status: FileStatus;
}

export interface UpdateFileMetadataRequestDto {
  originalFileName?: string;
  customMetadata?: Record<string, any>;
}

export interface UpdateFileVisibilityRequestDto {
  visibility: FileVisibility;
}

export interface UpdateFileCategoryRequestDto {
  category: FileCategory;
}

export interface SignedDownloadUrlResponseDto {
  assetId: string;
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
}

export type UploadPresignedRequestDto = InitiatePresignedUploadRequestDto;
export type UploadPresignedResponseDto = InitiatePresignedUploadResponseDto;
