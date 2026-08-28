import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, unknown>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockRequest = {
      method: 'GET',
      url: '/api/v1/salons',
      headers: { 'x-request-id': 'test-request-id-123' },
    };
    mockResponse = {
      statusCode: 200,
    };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  });

  it('should intercept request and log completion', (done) => {
    mockHandler = {
      handle: () => of({ items: [] }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ items: [] });
        done();
      },
      error: (err) => done(err),
    });
  });

  it('should handle request failure gracefully and log error', (done) => {
    mockHandler = {
      handle: () => throwError(() => new Error('Route failure')),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => done(new Error('Expected error')),
      error: () => {
        done();
      },
    });
  });
});
