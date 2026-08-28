import { FileValidationUtil } from './file-validation.util';

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_GALLERY_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * ImageValidationUtil — Pure image metadata, size, and aspect ratio validation utility.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Deterministic.
 * Time Complexity: O(1) for all methods.
 * Space Complexity: O(1).
 * Dependencies: FileValidationUtil.
 *
 * Architecture ref: Phase 9.1 §2 (ImageValidationUtil)
 */
export class ImageValidationUtil {
  /**
   * Validates if a MIME type is a supported image format (JPEG, PNG, WebP).
   */
  public static isValidImageMimeType(mimeType: string): boolean {
    return FileValidationUtil.isValidMimeType(mimeType, [...ALLOWED_IMAGE_MIME_TYPES]);
  }

  /**
   * Validates if avatar image file size is <= 2 MB.
   */
  public static isValidAvatarSize(sizeInBytes: number): boolean {
    return FileValidationUtil.isValidFileSize(sizeInBytes, MAX_AVATAR_SIZE_BYTES);
  }

  /**
   * Validates if gallery photo file size is <= 10 MB.
   */
  public static isValidGalleryPhotoSize(sizeInBytes: number): boolean {
    return FileValidationUtil.isValidFileSize(sizeInBytes, MAX_GALLERY_PHOTO_SIZE_BYTES);
  }

  /**
   * Checks whether image dimensions conform to expected aspect ratio (e.g. 1.0 for square 1:1 avatar).
   * @param tolerance - Allowed ratio variance (defaults to 0.05).
   */
  public static isValidAspectRatio(
    width: number,
    height: number,
    expectedRatio: number,
    tolerance = 0.05,
  ): boolean {
    if (
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      width <= 0 ||
      height <= 0 ||
      typeof expectedRatio !== 'number' ||
      expectedRatio <= 0
    ) {
      return false;
    }

    const actualRatio = width / height;
    return Math.abs(actualRatio - expectedRatio) <= tolerance;
  }

  /**
   * Reserved helper validating image dimension bounds (width & height).
   */
  public static isImageDimensionsValid(
    width: number,
    height: number,
    minWidth = 100,
    minHeight = 100,
    maxWidth = 4096,
    maxHeight = 4096,
  ): boolean {
    if (typeof width !== 'number' || typeof height !== 'number') return false;
    return (
      width >= minWidth &&
      width <= maxWidth &&
      height >= minHeight &&
      height <= maxHeight
    );
  }
}
