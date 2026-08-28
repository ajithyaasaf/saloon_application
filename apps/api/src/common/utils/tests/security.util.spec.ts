import { SecurityUtil } from '../security.util';

describe('SecurityUtil', () => {
  describe('sha256()', () => {
    it('should compute deterministic SHA-256 hash', () => {
      const hash1 = SecurityUtil.sha256('password123');
      const hash2 = SecurityUtil.sha256('password123');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should return empty string for non-string inputs', () => {
      expect(SecurityUtil.sha256(null as unknown as string)).toBe('');
    });
  });

  describe('timingSafeEqual()', () => {
    it('should return true for identical strings and false for different strings or lengths', () => {
      const secret = 'secret_token_12345';
      expect(SecurityUtil.timingSafeEqual(secret, 'secret_token_12345')).toBe(true);
      expect(SecurityUtil.timingSafeEqual(secret, 'wrong_token_12345')).toBe(false);
      expect(SecurityUtil.timingSafeEqual(secret, 'short')).toBe(false);
    });
  });

  describe('generateRandomToken()', () => {
    it('should generate random hex token of requested length', () => {
      const token1 = SecurityUtil.generateRandomToken(32);
      const token2 = SecurityUtil.generateRandomToken(32);

      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateNumericOtp()', () => {
    it('should generate 6-digit numeric OTP', () => {
      const otp = SecurityUtil.generateNumericOtp(6);
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe('maskToken()', () => {
    it('should mask sensitive token string leaving visible prefix and suffix', () => {
      const masked = SecurityUtil.maskToken('sk_live_1234567890abcdef', 4, 4);
      expect(masked.startsWith('sk_l')).toBe(true);
      expect(masked.endsWith('cdef')).toBe(true);
      expect(masked).toContain('*');
    });

    it('should handle short strings safely', () => {
      expect(SecurityUtil.maskToken('123')).toBe('***');
    });
  });
});
