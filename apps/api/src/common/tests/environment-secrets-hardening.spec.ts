import { configValidationSchema } from '../../config/config.validation';
import { SecurityUtil } from '../utils/security.util';

describe('Phase 26.7 — Secrets, Environment Configuration & Supply-Chain Hardening', () => {
  describe('1. Startup Environment Configuration Validation', () => {
    const baseValidEnv = {
      NODE_ENV: 'production',
      APP_PORT: 3000,
      APP_PREFIX: 'api',
      APP_CORS_ORIGINS: 'https://admin.saloon.app,https://salon.saloon.app',
      DATABASE_URL: 'postgresql://prod_user:prod_pass@db.saloon.internal:5432/saloon_db',
      REDIS_HOST: 'redis.saloon.internal',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: 'secure_redis_password_123',
      REDIS_DB: 0,
      QUEUE_REDIS_HOST: 'redis.saloon.internal',
      QUEUE_REDIS_PORT: 6379,
      QUEUE_REDIS_PASSWORD: 'secure_redis_password_123',
      JWT_ACCESS_SECRET: 'super-secret-access-token-key-must-be-32-chars-long!',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'super-secret-refresh-token-key-must-be-32-chars-long!',
      JWT_REFRESH_EXPIRES_IN: '30d',
      RAZORPAY_KEY_ID: 'rzp_live_testKeyId123',
      RAZORPAY_KEY_SECRET: 'rzp_live_testKeySecret123',
      FIREBASE_PROJECT_ID: 'saloon-prod-project',
      FIREBASE_CLIENT_EMAIL: 'firebase-admin@saloon-prod-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n',
      TWILIO_ACCOUNT_SID: 'mock_twilio_account_sid_prod',
      TWILIO_AUTH_TOKEN: '1234567890abcdef1234567890abcdef',
      TWILIO_FROM_NUMBER: '+919988776655',
      DEFAULT_COMMISSION_PERCENTAGE: 10,
      STORAGE_PROVIDER: 'R2',
      R2_BUCKET: 'saloon-assets-prod',
    };

    it('passes validation when all required production secrets are correctly configured', () => {
      const { error, value } = configValidationSchema.validate(baseValidEnv);
      expect(error).toBeUndefined();
      expect(value.NODE_ENV).toBe('production');
      expect(value.JWT_ACCESS_SECRET).toBe(baseValidEnv.JWT_ACCESS_SECRET);
    });

    it('fails fast when JWT_ACCESS_SECRET is missing or shorter than 32 characters', () => {
      const invalidEnv = { ...baseValidEnv, JWT_ACCESS_SECRET: 'too-short-secret' };
      const { error } = configValidationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_ACCESS_SECRET');
    });

    it('fails fast when JWT_REFRESH_SECRET is missing or shorter than 32 characters', () => {
      const invalidEnv = { ...baseValidEnv, JWT_REFRESH_SECRET: 'short-refresh' };
      const { error } = configValidationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_REFRESH_SECRET');
    });

    it('fails fast when DATABASE_URL is missing or invalid scheme', () => {
      const invalidEnv = { ...baseValidEnv, DATABASE_URL: 'mysql://invalid_db:3306/db' };
      const { error } = configValidationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
      expect(error?.message).toContain('DATABASE_URL');
    });

    it('fails fast when RAZORPAY credentials are missing', () => {
      const invalidEnv = { ...baseValidEnv };
      delete (invalidEnv as any).RAZORPAY_KEY_ID;
      const { error } = configValidationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
      expect(error?.message).toContain('RAZORPAY_KEY_ID');
    });

    it('fails fast when Firebase credentials are missing', () => {
      const invalidEnv = { ...baseValidEnv };
      delete (invalidEnv as any).FIREBASE_PRIVATE_KEY;
      const { error } = configValidationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
      expect(error?.message).toContain('FIREBASE_PRIVATE_KEY');
    });
  });

  describe('2. Cryptographic Randomness & Token Generation Hygiene', () => {
    it('generates secure random hex tokens with sufficient entropy', () => {
      const token1 = SecurityUtil.generateRandomToken(32);
      const token2 = SecurityUtil.generateRandomToken(32);

      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toEqual(token2);
    });

    it('generates secure random passwords with mixed character classes', () => {
      const password = SecurityUtil.generateSecurePassword(16);
      expect(password.length).toBeGreaterThanOrEqual(16);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=]/.test(password)).toBe(true);
    });

    it('generates numeric OTPs within proper numeric range', () => {
      for (let i = 0; i < 20; i++) {
        const otp = SecurityUtil.generateNumericOtp(6);
        expect(otp).toHaveLength(6);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('performs constant-time string comparisons', () => {
      expect(SecurityUtil.timingSafeEqual('hash_value_123', 'hash_value_123')).toBe(true);
      expect(SecurityUtil.timingSafeEqual('hash_value_123', 'hash_value_456')).toBe(false);
      expect(SecurityUtil.timingSafeEqual('short', 'longer_string')).toBe(false);
    });
  });
});
