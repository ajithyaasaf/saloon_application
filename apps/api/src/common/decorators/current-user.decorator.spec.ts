import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { JwtPayload } from '../../domains/auth/dto/token-payload.dto';
import { CurrentUser, currentUserFactory } from './current-user.decorator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContext(user: unknown): ExecutionContext {
  const mockRequest = { user } as Partial<Request>;

  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => mockRequest as unknown as T,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_JWT_USER: JwtPayload = {
  sub: 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a',
  role: UserRole.CUSTOMER,
  sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  version: 1,
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 840,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('@CurrentUser() decorator', () => {
  it('should export CurrentUser as a function', () => {
    expect(typeof CurrentUser).toBe('function');
  });

  it('should return the full normalized JwtPayload from request.user', () => {
    const ctx = buildContext(VALID_JWT_USER);
    const result = currentUserFactory(undefined, ctx) as any;
    expect(result).toEqual(
      expect.objectContaining({
        ...VALID_JWT_USER,
        id: VALID_JWT_USER.sub,
        userId: VALID_JWT_USER.sub,
        sub: VALID_JWT_USER.sub,
      }),
    );
  });

  it('should return undefined when request.user is not set', () => {
    const ctx = buildContext(undefined);
    const result = currentUserFactory(undefined, ctx);
    expect(result).toBeUndefined();
  });

  it('should return null when request.user is explicitly null', () => {
    const ctx = buildContext(null);
    const result = currentUserFactory(undefined, ctx);
    expect(result).toBeNull();
  });

  it('should return the SALON_OWNER user from request.user', () => {
    const owner: JwtPayload = { ...VALID_JWT_USER, role: UserRole.SALON_OWNER };
    const ctx = buildContext(owner);
    const result = currentUserFactory(undefined, ctx);
    expect((result as JwtPayload).role).toBe(UserRole.SALON_OWNER);
  });

  it('should return the SUPER_ADMIN user from request.user', () => {
    const admin: JwtPayload = { ...VALID_JWT_USER, role: UserRole.SUPER_ADMIN };
    const ctx = buildContext(admin);
    const result = currentUserFactory(undefined, ctx);
    expect((result as JwtPayload).role).toBe(UserRole.SUPER_ADMIN);
  });

  it('should extract userId, id, or sub when specified in data argument', () => {
    const ctx = buildContext(VALID_JWT_USER);
    expect(currentUserFactory('userId', ctx)).toBe(VALID_JWT_USER.sub);
    expect(currentUserFactory('id', ctx)).toBe(VALID_JWT_USER.sub);
    expect(currentUserFactory('sub', ctx)).toBe(VALID_JWT_USER.sub);
  });

  it('should extract custom property when specified in data argument', () => {
    const ctx = buildContext(VALID_JWT_USER);
    expect(currentUserFactory('role', ctx)).toBe(UserRole.CUSTOMER);
    expect(currentUserFactory('sessionId', ctx)).toBe(VALID_JWT_USER.sessionId);
  });
});
