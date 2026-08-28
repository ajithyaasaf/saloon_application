import {
  formatBytes,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  isImageMimeType,
  sanitizeFileName,
} from '../file/file.util.js';

describe('File & Media Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes to human-readable strings', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });
  });

  describe('getExtensionFromMimeType & getMimeTypeFromExtension', () => {
    it('should convert MIME types to extensions and back', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
      expect(getExtensionFromMimeType('image/png')).toBe('png');
      expect(getExtensionFromMimeType('image/webp')).toBe('webp');
      expect(getExtensionFromMimeType('application/pdf')).toBe('pdf');

      expect(getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('webp')).toBe('image/webp');
      expect(getMimeTypeFromExtension('pdf')).toBe('application/pdf');
    });
  });

  describe('isImageMimeType', () => {
    it('should detect image MIME types', () => {
      expect(isImageMimeType('image/jpeg')).toBe(true);
      expect(isImageMimeType('image/png')).toBe(true);
      expect(isImageMimeType('image/webp')).toBe(true);
      expect(isImageMimeType('application/pdf')).toBe(false);
      expect(isImageMimeType('')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should strip path traversal and special characters', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFileName('my avatar (2).png')).toBe('my_avatar__2_.png');
      expect(sanitizeFileName('normal_file.webp')).toBe('normal_file.webp');
    });
  });
});
