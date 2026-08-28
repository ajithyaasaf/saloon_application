import { RequestIdMiddleware } from '../request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('should preserve existing x-request-id header if present', () => {
    const req: any = { headers: { 'x-request-id': 'existing-uuid-123' } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBe('existing-uuid-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-uuid-123');
    expect(next).toHaveBeenCalled();
  });

  it('should generate new UUID v4 for x-request-id if missing', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(req.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.headers['x-request-id']);
    expect(next).toHaveBeenCalled();
  });
});
