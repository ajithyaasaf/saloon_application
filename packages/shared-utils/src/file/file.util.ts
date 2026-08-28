/**
 * File size formatting, extension detection, and MIME type helpers.
 */

const MIME_TO_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
};

const EXT_TO_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

/**
 * Format bytes into human readable format (e.g. 1024 -> 1 KB, 2097152 -> 2 MB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (isNaN(bytes) || bytes <= 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * Get file extension from MIME type.
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (!mimeType || typeof mimeType !== 'string') return '';
  const clean = mimeType.trim().toLowerCase();
  return MIME_TO_EXT_MAP[clean] || '';
}

/**
 * Get standard MIME type from file extension.
 */
export function getMimeTypeFromExtension(extension: string): string {
  if (!extension || typeof extension !== 'string') return 'application/octet-stream';
  const clean = extension.trim().toLowerCase().replace(/^\./, '');
  return EXT_TO_MIME_MAP[clean] || 'application/octet-stream';
}

/**
 * Check if a MIME type represents an image.
 */
export function isImageMimeType(mimeType: string): boolean {
  if (!mimeType || typeof mimeType !== 'string') return false;
  return mimeType.trim().toLowerCase().startsWith('image/');
}

/**
 * Sanitizes a filename removing path traversal, control chars, and illegal characters.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'unnamed_file';
  return fileName
    .trim()
    .replace(/^.*[\\/]/, '') // Strip path traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}
