import { configValidationSchema } from '../../../config/config.validation';
import { StorageConfigurationError } from '../errors/storage.errors';
import { CloudflareR2StorageProvider } from '../providers/cloudflare-r2.provider';
import { S3StorageProvider } from '../providers/s3-storage.provider';

describe('Storage Configuration & Validation', () => {
  describe('Joi Config Validation', () => {
    const validBaseConfig = {
      NODE_ENV: 'development',
      APP_PORT: 3000,
      APP_PREFIX: 'api',
      APP_CORS_ORIGINS: 'http://localhost:3001',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/saloon_db',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      QUEUE_REDIS_HOST: 'localhost',
      QUEUE_REDIS_PORT: 6379,
      JWT_ACCESS_SECRET: 'supersecretjwtaccesskeymustbe32charslong',
      JWT_REFRESH_SECRET: 'supersecretjwtrefreshkeymustbe32charslong',
      CLOUDINARY_CLOUD_NAME: 'saloon',
      CLOUDINARY_API_KEY: '1234567890',
      CLOUDINARY_API_SECRET: 'secret',
      RAZORPAY_KEY_ID: 'rzp_test_123',
      RAZORPAY_KEY_SECRET: 'rzp_secret_123',
      FIREBASE_PROJECT_ID: 'saloon-app',
      FIREBASE_CLIENT_EMAIL: 'admin@saloon.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\n-----END PRIVATE KEY-----',
      TWILIO_ACCOUNT_SID: 'AC1234567890',
      TWILIO_AUTH_TOKEN: 'token123',
      TWILIO_FROM_NUMBER: '+1234567890',
      DEFAULT_COMMISSION_PERCENTAGE: 10,
    };

    it('should validate valid storage environment configuration', () => {
      const config = {
        ...validBaseConfig,
        STORAGE_PROVIDER: 'R2',
        R2_ACCOUNT_ID: 'acc_123',
        R2_ACCESS_KEY_ID: 'r2_key',
        R2_SECRET_ACCESS_KEY: 'r2_secret',
        R2_BUCKET: 'production-assets',
        R2_ENDPOINT: 'https://acc_123.r2.cloudflarestorage.com',
        R2_PUBLIC_URL: 'https://cdn.saloon.platform',
      };

      const { error, value } = configValidationSchema.validate(config);
      expect(error).toBeUndefined();
      expect(value.STORAGE_PROVIDER).toBe('R2');
      expect(value.R2_BUCKET).toBe('production-assets');
    });

    it('should fail on invalid STORAGE_PROVIDER value', () => {
      const config = {
        ...validBaseConfig,
        STORAGE_PROVIDER: 'INVALID_PROVIDER',
      };

      const { error } = configValidationSchema.validate(config);
      expect(error).toBeDefined();
      expect(error?.message).toContain('STORAGE_PROVIDER');
    });

    it('should use default values for storage configuration when optional', () => {
      const { error, value } = configValidationSchema.validate(validBaseConfig);
      expect(error).toBeUndefined();
      expect(value.STORAGE_PROVIDER).toBe('R2');
      expect(value.R2_BUCKET).toBe('saloon-assets');
      expect(value.AWS_REGION).toBe('us-east-1');
      expect(value.LOCAL_STORAGE_DIR).toBe('./uploads');
    });
  });

  describe('Provider assertConfigured() validation', () => {
    it('should throw StorageConfigurationError when R2 client is missing', () => {
      const provider = new CloudflareR2StorageProvider({
        provider: 'R2',
        r2: { bucket: '' },
        s3: { region: 'us-east-1', bucket: 's3' },
        local: { baseDir: './uploads' },
      });

      (provider as any).client = null;
      expect(() => provider.assertConfigured()).toThrow(StorageConfigurationError);
    });

    it('should throw StorageConfigurationError when S3 client is missing', () => {
      const provider = new S3StorageProvider({
        provider: 'S3',
        r2: { bucket: 'r2' },
        s3: { region: 'us-east-1', bucket: '' },
        local: { baseDir: './uploads' },
      });

      (provider as any).client = null;
      expect(() => provider.assertConfigured()).toThrow(StorageConfigurationError);
    });
  });
});
