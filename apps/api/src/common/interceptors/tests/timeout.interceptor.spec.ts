import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TimeoutInterceptor } from '../timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TimeoutInterceptor(50); // 50ms fast timeout for testing
    mockContext = {} as ExecutionContext;
  });

  it('should pass through successful responses within timeout limit', (done) => {
    mockHandler = {
      handle: () => of('response_data').pipe(delay(10)),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toBe('response_data');
        done();
      },
      error: (err) => done(err),
    });
  });

  it('should throw RequestTimeoutException when request duration exceeds timeout limit', (done) => {
    mockHandler = {
      handle: () => of('delayed_data').pipe(delay(100)), // 100ms > 50ms timeout
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => done(new Error('Expected RequestTimeoutException but request succeeded')),
      error: (err) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        expect((err as RequestTimeoutException).message).toContain('timed out');
        done();
      },
    });
  });

  it('should pass through original non-timeout errors unchanged', (done) => {
    const originalError = new Error('Custom handler error');
    mockHandler = {
      handle: () => throwError(() => originalError),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => done(new Error('Expected error')),
      error: (err) => {
        expect(err).toBe(originalError);
        done();
      },
    });
  });
});
