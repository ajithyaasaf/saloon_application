import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { JwtPayload } from '../../domains/auth/dto/token-payload.dto';
import { RolesGuard } from './roles.guard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_USER: JwtPayload = {
  sub: 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a',
  role: UserRole.CUSTOMER,
  sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  version: 1,
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 840,
};

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildContext(user?: unknown): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => { }),
    getClass: jest.fn().mockReturnValue(class { }),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Missing metadata (@Roles not set) ──────────────────────────────────────

  describe('routes without @Roles() decorator', () => {
    it('should return true when no @Roles() decorator is present on the route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.CUSTOMER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when @Roles() metadata is an empty array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.CUSTOMER });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ─── Matching Roles ─────────────────────────────────────────────────────────

  describe('routes with matching user roles', () => {
    it('should allow access when user has the exact single required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.CUSTOMER]);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.CUSTOMER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow access when user role matches one of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SALON_OWNER, UserRole.SUPER_ADMIN]);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.SUPER_ADMIN });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should support all 5 UserRole enum values when configured', () => {
      const allRoles: UserRole[] = [
        UserRole.CUSTOMER,
        UserRole.SALON_OWNER,
        UserRole.SALON_STAFF,
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
      ];

      allRoles.forEach((role) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        const ctx = buildContext({ ...BASE_USER, role });
        expect(guard.canActivate(ctx)).toBe(true);
      });
    });
  });

  // ─── Non-matching Roles (403 Forbidden) ─────────────────────────────────────

  describe('routes with non-matching user roles', () => {
    it('should throw ForbiddenException when user role is not in the required roles list', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.CUSTOMER });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when a STAFF user attempts an OWNER-only route', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SALON_OWNER]);

      const ctx = buildContext({ ...BASE_USER, role: UserRole.SALON_STAFF });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ─── Missing or Malformed User ──────────────────────────────────────────────

  describe('missing or invalid authenticated user', () => {
    it('should throw ForbiddenException when request.user is missing on a role-restricted route', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.CUSTOMER]);

      const ctx = buildContext(undefined);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when request.user is null', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.CUSTOMER]);

      const ctx = buildContext(null);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when request.user has no role property', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.CUSTOMER]);

      const ctx = buildContext({ sub: BASE_USER.sub });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
