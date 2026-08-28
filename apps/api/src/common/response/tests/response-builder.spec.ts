import { ResponseBuilder } from '../response-builder';
import { PaginationMeta } from '../../types/pagination.type';

describe('ResponseBuilder', () => {
  const REQUEST_ID = 'req-12345-test';

  it('should build a success envelope and freeze it', () => {
    const data = { id: 'user-1', name: 'Priya' };
    const res = ResponseBuilder.success(data, REQUEST_ID);

    expect(res.success).toBe(true);
    expect(res.data).toEqual(data);
    expect(res.meta.requestId).toBe(REQUEST_ID);
    expect(typeof res.meta.timestamp).toBe('string');
    expect(Object.isFrozen(res)).toBe(true);
  });

  it('should return a new object instance on every success() invocation', () => {
    const data = { id: 'user-1' };
    const res1 = ResponseBuilder.success(data);
    const res2 = ResponseBuilder.success(data);

    expect(res1).not.toBe(res2);
  });

  it('should build a created (HTTP 201) envelope', () => {
    const data = { id: 'user-2', name: 'New Salon' };
    const res = ResponseBuilder.created(data, REQUEST_ID);

    expect(res.success).toBe(true);
    expect(res.data).toEqual(data);
    expect(res.meta.requestId).toBe(REQUEST_ID);
    expect(Object.isFrozen(res)).toBe(true);
  });

  it('should build a paginated envelope without mutating supplied PaginationMeta', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const pagination: PaginationMeta = Object.freeze({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    const cloneBefore = { ...pagination };

    const res = ResponseBuilder.paginated(items, pagination, REQUEST_ID);

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.meta.pagination).toEqual(pagination);
    expect(pagination).toEqual(cloneBefore);
    expect(Object.isFrozen(res)).toBe(true);
  });

  it('should return a new object instance on every message() invocation', () => {
    const msg = 'Updated successfully';
    const res1 = ResponseBuilder.message(msg);
    const res2 = ResponseBuilder.message(msg);

    expect(res1).not.toBe(res2);
    expect(res1.data).toEqual({ message: msg });
    expect(Object.isFrozen(res1)).toBe(true);
  });

  it('should build a 204 noContent envelope with null data', () => {
    const res = ResponseBuilder.noContent(REQUEST_ID);

    expect(res.success).toBe(true);
    expect(res.data).toBeNull();
    expect(res.meta.requestId).toBe(REQUEST_ID);
    expect(Object.isFrozen(res)).toBe(true);
  });

  it('should build an error envelope with optional traceId', () => {
    const details = [{ field: 'email', issue: 'Invalid email' }];
    const TRACE_ID = 'trace-9876-xyz';
    const res = ResponseBuilder.error('VALIDATION_001', 'Validation failed', details, REQUEST_ID, TRACE_ID);

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('VALIDATION_001');
    expect(res.error.message).toBe('Validation failed');
    expect(res.error.details).toEqual(details);
    expect(res.meta.requestId).toBe(REQUEST_ID);
    expect(res.meta.traceId).toBe(TRACE_ID);
    expect(Object.isFrozen(res)).toBe(true);
  });
});
