import { FileCategory, FileVisibility } from '@prisma/client';

export type SignedUrlAction = 'UPLOAD' | 'DOWNLOAD';

export const MIN_SIGNED_URL_TTL_SECONDS = 60; // 1 minute
export const MAX_SIGNED_URL_TTL_SECONDS = 86400; // 24 hours
export const DEFAULT_UPLOAD_TTL_SECONDS = 900; // 15 minutes
export const DEFAULT_DOWNLOAD_TTL_SECONDS = 3600; // 1 hour

/**
 * DTO for requesting a pre-signed upload URL.
 */
export interface GenerateSignedUploadUrlDto {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  category?: FileCategory;
  visibility?: FileVisibility;
  folder?: string | null;
  altText?: string | null;
  checksum?: string | null;
  expiresInSeconds?: number;
}

/**
 * DTO for requesting a signed download URL.
 */
export interface GenerateSignedDownloadUrlDto {
  expiresInSeconds?: number;
  filename?: string;
  contentType?: string;
}

/**
 * Response payload for a generated signed upload URL.
 */
export interface SignedUploadUrlResponseDto {
  fileAsset: any;
  uploadUrl: string;
  expiresInSeconds: number;
  expiresAt: Date;
  objectKey: string;
  action: 'UPLOAD';
  headers?: Record<string, string>;
}

/**
 * Response payload for a generated signed download URL.
 */
export interface SignedDownloadUrlResponseDto {
  fileAssetId: string;
  url: string;
  isPublic: boolean;
  expiresInSeconds: number | null;
  expiresAt: Date | null;
  action: 'DOWNLOAD';
}
