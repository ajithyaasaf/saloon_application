import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { TransformInterceptor } from '../interceptors/transform.interceptor';

describe('Phase 26.6 — HTTP Security, CORS, Headers & Abuse-Path Hardening', () => {
  describe('1. TransformInterceptor & Cache-Control Protection', () => {
    let interceptor: TransformInterceptor<any>;

    beforeEach(() => {
      interceptor = new TransformInterceptor();
    });

    it('sets Cache-Control no-store and Pragma no-cache on sensitive API responses', (done) => {
      const headers: Record<string, string> = {};
      const mockResponse = {
        getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
        setHeader: jest.fn((name: string, value: string) => {
          headers[name.toLowerCase()] = value;
        }),
      };

      const mockRequest = {
        headers: { 'x-request-id': 'req-sec-123' },
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as any;

      const mockCallHandler = {
        handle: () => of({ profileId: 'prof-1', balance: 5000 }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result: any) => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
          expect(result.success).toBe(true);
          expect(result.data).toEqual({ profileId: 'prof-1', balance: 5000 });
          expect(result.meta.requestId).toBe('req-sec-123');
          done();
        },
      });
    });

    it('does not overwrite explicitly configured Cache-Control header if already set', (done) => {
      const headers: Record<string, string> = {
        'cache-control': 'public, max-age=3600',
      };
      const mockResponse = {
        getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
        setHeader: jest.fn((name: string, value: string) => {
          headers[name.toLowerCase()] = value;
        }),
      };

      const mockRequest = {
        headers: {},
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as any;

      const mockCallHandler = {
        handle: () => of({ publicCatalog: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          );
          done();
        },
      });
    });
  });

  describe('2. GlobalExceptionFilter & Information Disclosure Sanitization', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    it('sanitizes unexpected internal database crashes without exposing stack traces or SQL', () => {
      let jsonPayload: any = null;
      let responseStatus = 0;

      const mockResponse = {
        status: jest.fn((s: number) => {
          responseStatus = s;
          return {
            json: jest.fn((body) => {
              jsonPayload = body;
            }),
          };
        }),
      };

      const mockRequest = {
        method: 'POST',
        url: '/api/v1/payments/process',
        headers: { 'x-request-id': 'req-crash-999' },
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      const internalError = new Error('FATAL: Database connection timeout to postgres://admin:secretPass@10.0.0.12:5432/saloon_db');
      internalError.stack = 'Error at Connection.query (/app/node_modules/pg/lib/connection.js:123)';

      filter.catch(internalError, mockHost);

      expect(responseStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonPayload).toBeDefined();
      expect(jsonPayload.success).toBe(false);
      expect(jsonPayload.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(jsonPayload.error.message).toBe('An unexpected error occurred. Please try again later.');
      expect(jsonPayload.error.requestId).toBe('req-crash-999');
      // Verify no sensitive connection string or stack trace leaked
      expect(JSON.stringify(jsonPayload)).not.toContain('secretPass');
      expect(JSON.stringify(jsonPayload)).not.toContain('postgres://');
      expect(JSON.stringify(jsonPayload)).not.toContain('10.0.0.12');
      expect(JSON.stringify(jsonPayload)).not.toContain('node_modules');
    });

    it('maps Prisma KnownRequestError to clean standardized codes without leaking query structure', () => {
      let jsonPayload: any = null;
      let responseStatus = 0;

      const mockResponse = {
        status: jest.fn((s: number) => {
          responseStatus = s;
          return {
            json: jest.fn((body) => {
              jsonPayload = body;
            }),
          };
        }),
      };

      const mockRequest = {
        method: 'POST',
        url: '/api/v1/users',
        headers: { 'x-request-id': 'req-p2002-1' },
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`phone`)',
        {
          code: 'P2002',
          clientVersion: '5.10.0',
        },
      );

      filter.catch(prismaError, mockHost);

      expect(responseStatus).toBe(HttpStatus.CONFLICT);
      expect(jsonPayload.success).toBe(false);
      expect(jsonPayload.error.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      expect(jsonPayload.error.message).toBe('A record with this value already exists.');
      expect(jsonPayload.error.requestId).toBe('req-p2002-1');
    });
  });

  describe('3. CORS Origin Validation Logic', () => {
    const prodCorsOrigins = ['https://admin.saloon.app', 'https://salon.saloon.app'];
    const devDefaultOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];

    const createOriginValidator = (isProduction: boolean, origins: string[]) => {
      const allowedOrigins = isProduction
        ? origins
        : Array.from(new Set([...origins, ...devDefaultOrigins]));

      return (
        requestOrigin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`Origin '${requestOrigin}' not allowed by CORS`));
      };
    };

    it('allows requests from allowlisted frontend dashboard origins in production', (done) => {
      const prodValidator = createOriginValidator(true, prodCorsOrigins);
      prodValidator('https://admin.saloon.app', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('strictly rejects unwhitelisted origins in production', (done) => {
      const prodValidator = createOriginValidator(true, prodCorsOrigins);
      prodValidator('http://localhost:3002', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toContain("Origin 'http://localhost:3002' not allowed by CORS");
        expect(allow).toBeUndefined();
        done();
      });
    });

    it('allows safe local development origins in development mode', (done) => {
      const devValidator = createOriginValidator(false, []);
      devValidator('http://127.0.0.1:3002', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('allows requests with no Origin header (mobile native apps and internal CLI)', (done) => {
      const prodValidator = createOriginValidator(true, prodCorsOrigins);
      prodValidator(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('rejects unauthorized third-party browser origins in development and production', (done) => {
      const devValidator = createOriginValidator(false, []);
      devValidator('https://malicious-attacker.com', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toContain("Origin 'https://malicious-attacker.com' not allowed by CORS");
        expect(allow).toBeUndefined();
        done();
      });
    });
  });
});

