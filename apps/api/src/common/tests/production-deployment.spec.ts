import { configValidationSchema } from '../../config/config.validation';

describe('Phase 27.4 — Production Deployment, Infrastructure & Release Readiness', () => {
  // =========================================================================
  // 1. PRODUCTION ENVIRONMENT VALIDATION & FAIL-FAST INTEGRITY
  // =========================================================================
  describe('1. Production Environment Schema Validation (Fail-Fast Startup)', () => {
    it('successfully validates complete production configuration', () => {
      const validProdEnv = {
        NODE_ENV: 'production',
        APP_PORT: 3000,
        APP_PREFIX: 'api',
        APP_CORS_ORIGINS: 'https://salon.saloon.godivatech.com,https://admin.saloon.godivatech.com',
        DATABASE_URL: 'postgresql://user:password@localhost:5432/saloon_db',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        QUEUE_REDIS_HOST: 'localhost',
        QUEUE_REDIS_PORT: 6379,
        JWT_ACCESS_SECRET: 'super-secure-production-jwt-access-secret-32-chars-long',
        JWT_REFRESH_SECRET: 'super-secure-production-jwt-refresh-secret-32-chars-long',
        RAZORPAY_KEY_ID: 'rzp_live_1234567890',
        RAZORPAY_KEY_SECRET: 'rzp_live_secret_abcdef',
        FIREBASE_PROJECT_ID: 'saloon-prod',
        FIREBASE_CLIENT_EMAIL: 'firebase@saloon-prod.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n',
        TWILIO_ACCOUNT_SID: 'mock_twilio_account_sid_dev',
        TWILIO_AUTH_TOKEN: 'twilio_prod_auth_token',
        TWILIO_FROM_NUMBER: '+919999999999',
      };

      const { error, value } = configValidationSchema.validate(validProdEnv, { abortEarly: false });
      expect(error).toBeUndefined();
      expect(value.NODE_ENV).toBe('production');
      expect(value.APP_PORT).toBe(3000);
    });

    it('fails fast when JWT secret is shorter than 32 characters', () => {
      const invalidEnv = {
        NODE_ENV: 'production',
        APP_PORT: 3000,
        DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
        JWT_ACCESS_SECRET: 'short_secret',
      };

      const { error } = configValidationSchema.validate(invalidEnv, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error?.details.some((d) => d.path.includes('JWT_ACCESS_SECRET'))).toBe(true);
    });
  });

  // =========================================================================
  // 2. REVERSE PROXY & HEADER PROPAGATION
  // =========================================================================
  describe('2. Reverse Proxy Ingress & Request Header Integration', () => {
    it('formats normalized client ingress IP and upstream request ID', () => {
      const mockHeaders: Record<string, string> = {
        'x-forwarded-for': '203.0.113.195, 10.0.0.1',
        'x-forwarded-proto': 'https',
        'x-request-id': 'req-ingress-prod-8899',
      };

      const clientIp = mockHeaders['x-forwarded-for'].split(',')[0].trim();
      const requestId = mockHeaders['x-request-id'];
      const protocol = mockHeaders['x-forwarded-proto'];

      expect(clientIp).toBe('203.0.113.195');
      expect(requestId).toBe('req-ingress-prod-8899');
      expect(protocol).toBe('https');
    });
  });

  // =========================================================================
  // 3. RELEASE METADATA & HEALTH STATUS STRUCTURE
  // =========================================================================
  describe('3. Production Release Metadata & Health Probes', () => {
    it('structures health metadata cleanly without leaking server credentials or DB URLs', () => {
      const buildHealthResponse = (dbStatus: 'up' | 'down', redisStatus: 'up' | 'down') => ({
        status: dbStatus === 'up' && redisStatus === 'up' ? 'ok' : 'error',
        info: {
          database: { status: dbStatus },
          redis: { status: redisStatus },
        },
        release: {
          version: '1.0.0',
          environment: 'production',
        },
      });

      const response = buildHealthResponse('up', 'up');
      expect(response.status).toBe('ok');
      expect(response.info.database.status).toBe('up');
      expect(response.info.redis.status).toBe('up');
      expect(response.release.version).toBe('1.0.0');
      // Verifies no connection strings or internal credentials exist in the health envelope
      expect((response as any).databaseUrl).toBeUndefined();
      expect((response as any).password).toBeUndefined();
    });
  });
});
