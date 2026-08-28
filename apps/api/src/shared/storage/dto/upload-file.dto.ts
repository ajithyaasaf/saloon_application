/**
 * StorageTransformOptions — Generic image transformation & optimization options.
 *
 * Architecture ref: Phase 9.2 §4.5
 */
export interface StorageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fit' | 'fill' | 'crop' | 'thumb';
  format?: 'jpg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

/**
 * StorageUploadResult — Generic result object returned by storage provider uploads.
 */
export interface StorageUploadResult {
  fileId: string;
  url: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: number;
  provider: string; // e.g. 'cloudinary', 's3', 'local'
}

/**
 * StorageFile — Generic metadata representation of stored files.
 */
export interface StorageFile {
  fileId: string;
  provider: string;
  folder: string;
  filename: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  createdAt: string;
  lastModified: string;
  publicUrl: string;
  secureUrl: string;
}
