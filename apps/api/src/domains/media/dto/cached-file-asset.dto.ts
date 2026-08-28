import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';

/**
 * Plain, safely serializable data representation of a cached FileAsset.
 * Conforms to Phase 20.11 §15 (Cache Serialization Governance).
 */
export interface CachedFileAssetDto {
  id: string;
  salonId: string | null;
  uploadedByUserId: string;
  originalFileName: string;
  storedFileName: string;
  objectKey: string;
  bucket: string;
  provider: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum: string | null;
  status: FileStatus;
  visibility: FileVisibility;
  category: FileCategory;
  width: number | null;
  height: number | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  altText: string | null;
  folder: string | null;
  createdAt: string; // ISO-8601 string
  updatedAt: string; // ISO-8601 string
  deletedAt: string | null;
}
