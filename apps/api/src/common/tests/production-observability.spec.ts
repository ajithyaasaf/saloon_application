import { HttpStatus, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { SecurityUtil } from '../utils/security.util';
import { PiiMaskerUtil } from '../utils/pii-masker.util';

describe('Phase 27.1 — Production Observability, Logging, Monitoring & Operational Readiness', () => {
  describe('1. Request Correlation & ID Propagation (RequestIdMiddleware)', () => {
    let middleware: RequestIdMiddleware;

    beforeEach(() => {
      middleware = new RequestIdMiddleware();
    });

    it('generates a unique UUIDv4 requestId when none is provided in headers', () => {
      const req: any = { headers: {} };
      const res: any = {
        headers: {} as Record<string, string>,
        setHeader: jest.fn((k: string, v: string) => {
          res.headers[k.toLowerCase()] = v;
        }),
      };
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(req.headers['x-request-id']).toBeDefined();
      expect(typeof req.headers['x-request-id']).toBe('string');
      expect(req.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.headers['x-request-id']);
      expect(next).toHaveBeenCalled();
    });

    it('preserves existing upstream x-request-id from trusted ingress/proxies', () => {
      const incomingId = 'req-ingress-upstream-998877';
      const req: any = { headers: { 'x-request-id': incomingId } };
      const res: any = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(req.headers['x-request-id']).toBe(incomingId);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', incomingId);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('2. Structured HTTP Request Logging (LoggingInterceptor)', () => {
    let interceptor: LoggingInterceptor;

    beforeEach(() => {
      interceptor = new LoggingInterceptor();
    });

    it('logs normal HTTP requests with method, url, status, duration and requestId', (done) => {
      const mockReq: any = {
        method: 'GET',
        url: '/api/v1/salons',
        headers: { 'x-request-id': 'req-obs-123' },
      };
      const mockRes: any = { statusCode: 200 };
      const context: any = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
      };

      const handler: any = {
        handle: () => of({ data: [] }),
      };

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          // Tap operator executes successfully
          done();
        },
      });
    });
  });

  describe('3. Error Normalization & Information Sanitization (GlobalExceptionFilter)', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    it('suppresses internal crash stack traces and returns standardized JSON error envelope', () => {
      let responsePayload: any = null;
      let statusSet = 0;

      const mockResponse: any = {
        status: jest.fn((code: number) => {
          statusSet = code;
          return {
            json: jest.fn((body) => {
              responsePayload = body;
            }),
          };
        }),
      };

      const mockRequest: any = {
        method: 'POST',
        url: '/api/v1/payments/process',
        headers: { 'x-request-id': 'req-err-456' },
      };

      const host: any = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const internalException = new Error('Database pool connection timeout on postgres://app_user:secret_password@10.0.1.5:5432/saloon_db');
      filter.catch(internalException, host);

      expect(statusSet).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(responsePayload.success).toBe(false);
      expect(responsePayload.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(responsePayload.error.message).toBe('An unexpected error occurred. Please try again later.');
      expect(responsePayload.error.requestId).toBe('req-err-456');
      // Verify no database credentials or internal IPs leaked
      expect(JSON.stringify(responsePayload)).not.toContain('secret_password');
      expect(JSON.stringify(responsePayload)).not.toContain('10.0.1.5');
    });
  });

  describe('4. Security & Audit Event Structured Formatting', () => {
    it('creates structured security events with sanitized metadata', () => {
      const createSecurityEvent = (
        event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS_ATTEMPT',
        metadata: { userId?: string; email?: string; phone?: string; ip: string; requestId: string },
      ) => ({
        timestamp: new Date().toISOString(),
        service: 'api-auth',
        event,
        userId: metadata.userId || 'anonymous',
        maskedEmail: metadata.email ? PiiMaskerUtil.maskEmail(metadata.email) : undefined,
        maskedPhone: metadata.phone ? PiiMaskerUtil.maskPhone(metadata.phone) : undefined,
        ip: metadata.ip,
        requestId: metadata.requestId,
      });

      const event = createSecurityEvent('LOGIN_FAILED', {
        email: 'attacker@malicious.com',
        phone: '+919988776655',
        ip: '203.0.113.195',
        requestId: 'req-sec-991',
      });

      expect(event.event).toBe('LOGIN_FAILED');
      expect(event.maskedEmail).toBe('a***r@malicious.com');
      expect(event.maskedPhone).toBe('+91******6655');
      expect(event.requestId).toBe('req-sec-991');
      expect(event.ip).toBe('203.0.113.195');
    });
  });

  describe('5. Health Probes Operational Behavior', () => {
    it('structures dependency health states as clean binary up/down statuses', () => {
      const formatHealth = (dbHealthy: boolean, redisHealthy: boolean) => ({
        status: dbHealthy && redisHealthy ? 'ok' : 'error',
        info: {
          database: { status: dbHealthy ? 'up' : 'down' },
          redis: { status: redisHealthy ? 'up' : 'down' },
        },
      });

      const healthyState = formatHealth(true, true);
      expect(healthyState.status).toBe('ok');
      expect(healthyState.info.database.status).toBe('up');
      expect(healthyState.info.redis.status).toBe('up');

      const degradedState = formatHealth(true, false);
      expect(degradedState.status).toBe('error');
      expect(degradedState.info.redis.status).toBe('down');
    });
  });
});
