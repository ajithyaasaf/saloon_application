import { ImageValidationUtil } from '../image-validation.util';

describe('ImageValidationUtil', () => {
  describe('isValidImageMimeType()', () => {
    it('should return true for JPEG, PNG, and WebP images', () => {
      expect(ImageValidationUtil.isValidImageMimeType('image/jpeg')).toBe(true);
      expect(ImageValidationUtil.isValidImageMimeType('image/png')).toBe(true);
      expect(ImageValidationUtil.isValidImageMimeType('image/webp')).toBe(true);
    });

    it('should return false for unsupported formats like GIF or PDF', () => {
      expect(ImageValidationUtil.isValidImageMimeType('image/gif')).toBe(false);
      expect(ImageValidationUtil.isValidImageMimeType('application/pdf')).toBe(false);
    });
  });

  describe('isValidAvatarSize()', () => {
    it('should validate avatar size <= 2 MB', () => {
      expect(ImageValidationUtil.isValidAvatarSize(1024 * 1024)).toBe(true);
      expect(ImageValidationUtil.isValidAvatarSize(3 * 1024 * 1024)).toBe(false);
    });
  });

  describe('isValidGalleryPhotoSize()', () => {
    it('should validate gallery photo size <= 10 MB', () => {
      expect(ImageValidationUtil.isValidGalleryPhotoSize(8 * 1024 * 1024)).toBe(true);
      expect(ImageValidationUtil.isValidGalleryPhotoSize(12 * 1024 * 1024)).toBe(false);
    });
  });

  describe('isValidAspectRatio()', () => {
    it('should validate 1:1 square ratio for avatar within tolerance', () => {
      expect(ImageValidationUtil.isValidAspectRatio(500, 500, 1.0)).toBe(true);
      expect(ImageValidationUtil.isValidAspectRatio(510, 500, 1.0, 0.05)).toBe(true);
      expect(ImageValidationUtil.isValidAspectRatio(800, 400, 1.0)).toBe(false);
    });

    it('should return false for invalid dimensions', () => {
      expect(ImageValidationUtil.isValidAspectRatio(0, 500, 1.0)).toBe(false);
      expect(ImageValidationUtil.isValidAspectRatio(-100, 500, 1.0)).toBe(false);
    });
  });
});
