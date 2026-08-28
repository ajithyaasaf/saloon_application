import {
  generateSlug,
  isValidEmail,
  isValidGSTIN,
  isValidIFSC,
  isValidIndianPhone,
  isValidIndianPinCode,
  isValidPAN,
  normalizeIndianPhone,
} from '../validation/validation.util.js';

describe('Validation & Pattern Utilities', () => {
  describe('isValidIndianPhone & normalizeIndianPhone', () => {
    it('should validate Indian phone numbers', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('+919876543210')).toBe(true);
      expect(isValidIndianPhone('919876543210')).toBe(true);
      expect(isValidIndianPhone('8876543210')).toBe(true);
      expect(isValidIndianPhone('7876543210')).toBe(true);
      expect(isValidIndianPhone('6876543210')).toBe(true);

      // Invalid: starts with 1-5, or wrong length
      expect(isValidIndianPhone('5876543210')).toBe(false);
      expect(isValidIndianPhone('12345')).toBe(false);
      expect(isValidIndianPhone('')).toBe(false);
    });

    it('should normalize Indian phone numbers to E.164 (+91XXXXXXXXXX)', () => {
      expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
      expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
      expect(normalizeIndianPhone('+919876543210')).toBe('+919876543210');
    });
  });

  describe('isValidGSTIN', () => {
    it('should validate valid and invalid GSTINs', () => {
      expect(isValidGSTIN('29ABCDE1234F1Z5')).toBe(true);
      expect(isValidGSTIN('27AAPFU0939F1ZV')).toBe(true);

      expect(isValidGSTIN('INVALID_GSTIN')).toBe(false);
      expect(isValidGSTIN('12345')).toBe(false);
    });
  });

  describe('isValidPAN', () => {
    it('should validate standard PAN numbers', () => {
      expect(isValidPAN('ABCDE1234F')).toBe(true);
      expect(isValidPAN('BKRPK7654M')).toBe(true);

      expect(isValidPAN('1234567890')).toBe(false);
      expect(isValidPAN('ABCDE12345')).toBe(false);
    });
  });

  describe('isValidIndianPinCode', () => {
    it('should validate 6-digit PIN codes', () => {
      expect(isValidIndianPinCode('560001')).toBe(true);
      expect(isValidIndianPinCode('110001')).toBe(true);

      expect(isValidIndianPinCode('012345')).toBe(false);
      expect(isValidIndianPinCode('5600')).toBe(false);
    });
  });

  describe('isValidIFSC', () => {
    it('should validate 11-digit IFSC codes', () => {
      expect(isValidIFSC('HDFC0001234')).toBe(true);
      expect(isValidIFSC('SBIN0000456')).toBe(true);

      expect(isValidIFSC('HDFC1234567')).toBe(false); // 5th char must be 0
      expect(isValidIFSC('INVALID')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate standard email addresses', () => {
      expect(isValidEmail('priya@example.com')).toBe(true);
      expect(isValidEmail('admin.user+tag@domain.co.in')).toBe(true);

      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('generateSlug', () => {
    it('should generate clean URL-friendly slugs', () => {
      expect(generateSlug('Glamour & Glow Unisex Salon')).toBe('glamour-glow-unisex-salon');
      expect(generateSlug('  Toni & Guy - Indiranagar Branch  ')).toBe('toni-guy-indiranagar-branch');
      expect(generateSlug('Luxe Spa @ 100ft Road!')).toBe('luxe-spa-100ft-road');
    });
  });
});
