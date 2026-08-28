import { FileValidationUtil } from '../file-validation.util';

describe('FileValidationUtil', () => {
  const allowedMime = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExt = ['jpg', 'jpeg', 'png', 'pdf'];

  describe('isValidMimeType()', () => {
    it('should return true for allowed MIME types', () => {
      expect(FileValidationUtil.isValidMimeType('image/jpeg', allowedMime)).toBe(true);
      expect(FileValidationUtil.isValidMimeType('IMAGE/PNG', allowedMime)).toBe(true);
    });

    it('should return false for unallowed MIME types', () => {
      expect(FileValidationUtil.isValidMimeType('application/x-msdownload', allowedMime)).toBe(false);
      expect(FileValidationUtil.isValidMimeType('', allowedMime)).toBe(false);
    });
  });

  describe('isValidFileSize()', () => {
    it('should return true for valid file sizes <= maxSizeBytes', () => {
      const max5Mb = 5 * 1024 * 1024;
      expect(FileValidationUtil.isValidFileSize(1024, max5Mb)).toBe(true);
      expect(FileValidationUtil.isValidFileSize(max5Mb, max5Mb)).toBe(true);
    });

    it('should return false for sizes exceeding maxSizeBytes or non-positive sizes', () => {
      const max5Mb = 5 * 1024 * 1024;
      expect(FileValidationUtil.isValidFileSize(max5Mb + 1, max5Mb)).toBe(false);
      expect(FileValidationUtil.isValidFileSize(0, max5Mb)).toBe(false);
      expect(FileValidationUtil.isValidFileSize(-100, max5Mb)).toBe(false);
    });
  });

  describe('getFileExtension()', () => {
    it('should extract lowercase extension from filename', () => {
      expect(FileValidationUtil.getFileExtension('avatar.PNG')).toBe('png');
      expect(FileValidationUtil.getFileExtension('document.v1.pdf')).toBe('pdf');
      expect(FileValidationUtil.getFileExtension('noextension')).toBe('');
    });
  });

  describe('isAllowedExtension()', () => {
    it('should validate extension against allowlist', () => {
      expect(FileValidationUtil.isAllowedExtension('photo.jpg', allowedExt)).toBe(true);
      expect(FileValidationUtil.isAllowedExtension('script.exe', allowedExt)).toBe(false);
    });
  });
});
