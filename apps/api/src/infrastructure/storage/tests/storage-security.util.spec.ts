import { StorageInvalidKeyError } from '../errors/storage.errors';
import { StorageSecurityUtil } from '../utils/storage-security.util';

describe('StorageSecurityUtil', () => {
  describe('isSafeObjectKey', () => {
    it('should return true for valid object keys', () => {
      expect(StorageSecurityUtil.isSafeObjectKey('salons/123/avatar.jpg')).toBe(true);
      expect(StorageSecurityUtil.isSafeObjectKey('documents/2026/08/contract-v1.pdf')).toBe(true);
      expect(StorageSecurityUtil.isSafeObjectKey('images/products/photo_123.webp')).toBe(true);
      expect(StorageSecurityUtil.isSafeObjectKey('simple-filename.png')).toBe(true);
    });

    it('should return false for empty or whitespace-only keys', () => {
      expect(StorageSecurityUtil.isSafeObjectKey('')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('   ')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey(null as any)).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey(undefined as any)).toBe(false);
    });

    it('should return false for directory traversal attempts', () => {
      expect(StorageSecurityUtil.isSafeObjectKey('../etc/passwd')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('..\\windows\\system32')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('salons/../../secret.txt')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('salons/./current.txt')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('/../root')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('folder/..')).toBe(false);
    });

    it('should return false for null byte injections', () => {
      expect(StorageSecurityUtil.isSafeObjectKey('avatar.jpg\0.exe')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('document.pdf%00.exe')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('document.pdf%00')).toBe(false);
    });

    it('should return false for control characters', () => {
      expect(StorageSecurityUtil.isSafeObjectKey('avatar\x01.png')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('file\x1F.txt')).toBe(false);
      expect(StorageSecurityUtil.isSafeObjectKey('file\x7F.txt')).toBe(false);
    });

    it('should return false for excessively long keys', () => {
      const longKey = 'a'.repeat(StorageSecurityUtil.MAX_KEY_LENGTH + 1);
      expect(StorageSecurityUtil.isSafeObjectKey(longKey)).toBe(false);
    });
  });

  describe('sanitizeObjectKey', () => {
    it('should normalize slashes and redundant separators', () => {
      expect(StorageSecurityUtil.sanitizeObjectKey('salons/123/avatar.jpg')).toBe(
        'salons/123/avatar.jpg',
      );
      expect(StorageSecurityUtil.sanitizeObjectKey('salons//123///avatar.jpg')).toBe(
        'salons/123/avatar.jpg',
      );
      expect(StorageSecurityUtil.sanitizeObjectKey('salons\\123\\avatar.jpg')).toBe(
        'salons/123/avatar.jpg',
      );
    });

    it('should throw StorageInvalidKeyError on unsafe keys', () => {
      expect(() => StorageSecurityUtil.sanitizeObjectKey('../unsafe.txt')).toThrow(
        StorageInvalidKeyError,
      );
      expect(() => StorageSecurityUtil.sanitizeObjectKey('file\0.png')).toThrow(
        StorageInvalidKeyError,
      );
    });
  });

  describe('assertSafeObjectKey', () => {
    it('should return sanitized key when safe', () => {
      const result = StorageSecurityUtil.assertSafeObjectKey('  salons/456/logo.png  ');
      expect(result).toBe('salons/456/logo.png');
    });

    it('should throw StorageInvalidKeyError when key is unsafe', () => {
      expect(() => StorageSecurityUtil.assertSafeObjectKey('foo/../bar')).toThrow(
        StorageInvalidKeyError,
      );
    });
  });
});
