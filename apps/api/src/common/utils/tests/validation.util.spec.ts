import { ValidationUtil } from '../validation.util';

describe('ValidationUtil', () => {
  describe('isValidEmail()', () => {
    it('should return true for valid emails', () => {
      expect(ValidationUtil.isValidEmail('user@example.com')).toBe(true);
      expect(ValidationUtil.isValidEmail('priya.sharma@saloon.in')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(ValidationUtil.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationUtil.isValidEmail('user@.com')).toBe(false);
      expect(ValidationUtil.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidIndianPhone()', () => {
    it('should return true for valid Indian phone formats (+91, 91, 10-digit)', () => {
      expect(ValidationUtil.isValidIndianPhone('+919876543210')).toBe(true);
      expect(ValidationUtil.isValidIndianPhone('919876543210')).toBe(true);
      expect(ValidationUtil.isValidIndianPhone('9876543210')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(ValidationUtil.isValidIndianPhone('12345')).toBe(false);
      expect(ValidationUtil.isValidIndianPhone('5876543210')).toBe(false); // starts with 5
      expect(ValidationUtil.isValidIndianPhone('')).toBe(false);
    });
  });

  describe('isValidUuid()', () => {
    it('should validate UUID v4 strings', () => {
      expect(ValidationUtil.isValidUuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a')).toBe(true);
      expect(ValidationUtil.isValidUuid('invalid-uuid')).toBe(false);
    });
  });

  describe('isValidGstin()', () => {
    it('should validate Indian GSTIN format', () => {
      expect(ValidationUtil.isValidGstin('27AAAAA0000A1Z5')).toBe(true);
      expect(ValidationUtil.isValidGstin('27AAAAA0000A1Z')).toBe(false); // 14 chars
    });
  });

  describe('isValidIndianPincode()', () => {
    it('should validate 6-digit Indian PIN codes', () => {
      expect(ValidationUtil.isValidIndianPincode('400001')).toBe(true);
      expect(ValidationUtil.isValidIndianPincode(110001)).toBe(true);
      expect(ValidationUtil.isValidIndianPincode('012345')).toBe(false); // leading 0
    });
  });

  describe('isValidUrl()', () => {
    it('should validate HTTP and HTTPS URLs', () => {
      expect(ValidationUtil.isValidUrl('https://salon.com/services')).toBe(true);
      expect(ValidationUtil.isValidUrl('http://localhost:3000')).toBe(true);
      expect(ValidationUtil.isValidUrl('ftp://invalid.com')).toBe(false);
      expect(ValidationUtil.isValidUrl('not-a-url')).toBe(false);
    });
  });
});
