import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from '../transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;
  let mockRequest: Record<string, unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockRequest = {
      headers: { 'x-request-id': 'test-request-id-456' },
    };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  });

  it('should wrap standard response in API envelope', (done) => {
    mockHandler = {
      handle: () => of({ userId: 'usr_123' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (res: any) => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual({ userId: 'usr_123' });
        expect(res.meta.requestId).toBe('test-request-id-456');
        expect(res.meta.timestamp).toBeDefined();
        done();
      },
      error: (err) => done(err),
    });
  });

  it('should promote pagination object into meta for paginated responses', (done) => {
    mockHandler = {
      handle: () =>
        of({
          data: [{ id: 1 }, { id: 2 }],
          pagination: { page: 1, limit: 10, total: 2 },
        }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (res: any) => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([{ id: 1 }, { id: 2 }]);
        expect(res.meta.pagination).toEqual({ page: 1, limit: 10, total: 2 });
        done();
      },
      error: (err) => done(err),
    });
  });
});
