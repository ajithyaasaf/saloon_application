import { maskBankAccount, maskCardNumber, maskEmail, maskPhone } from '../masking/masking.util.js';

describe('PII Masking Utilities', () => {
  describe('maskPhone', () => {
    it('should mask 10-digit Indian phone numbers', () => {
      expect(maskPhone('9876543210')).toBe('******3210');
      expect(maskPhone('+919876543210')).toBe('+91 ******3210');
    });

    it('should handle short or empty inputs', () => {
      expect(maskPhone('1234')).toBe('****');
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null)).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask email username preserving first 2 chars and domain', () => {
      expect(maskEmail('priya.sharma@example.com')).toBe('pr***@example.com');
      expect(maskEmail('an@domain.com')).toBe('a***@domain.com');
    });

    it('should handle short or invalid email inputs', () => {
      expect(maskEmail('')).toBe('');
      expect(maskEmail('invalid')).toBe('***@***.***');
    });
  });

  describe('maskCardNumber', () => {
    it('should mask card number preserving last 4 digits', () => {
      expect(maskCardNumber('4111222233334444')).toBe('**** **** **** 4444');
      expect(maskCardNumber('4111 2222 3333 4444')).toBe('**** **** **** 4444');
    });

    it('should handle short or invalid card numbers', () => {
      expect(maskCardNumber('123')).toBe('****');
      expect(maskCardNumber('')).toBe('');
    });
  });

  describe('maskBankAccount', () => {
    it('should mask bank account number preserving last 4 digits', () => {
      expect(maskBankAccount('123456789012')).toBe('********9012');
    });
  });
});
