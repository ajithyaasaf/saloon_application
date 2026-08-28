import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { JwtPayload } from '../../domains/auth/dto/token-payload.dto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_USER: JwtPayload = {
  sub: 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a',
  role: UserRole.CUSTOMER,
  sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  version: 1,
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 840,
};

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildContext(options: {
  isPublic?: boolean;
  user?: JwtPayload | null;
}): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(class {}),
    switchToHttp: () => ({
      getRequest: () => ({ user: options.user ?? undefined }),
    }),
    __isPublicHandler: options.isPublic ?? false,
  } as unknown as ExecutionContext;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── @Public() route bypass ────────────────────────────────────────────────

  describe('@Public() routes', () => {
    it('should return true immediately for a @Public() route without invoking Passport', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true); // isPublic = true

      // Override the parent canActivate so we can confirm it is NOT called
      const parentSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const ctx = buildContext({ isPublic: true });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(parentSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Protected route ───────────────────────────────────────────────────────

  describe('protected routes', () => {
    it('should call super.canActivate() for non-public routes', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(false); // isPublic = false

      const parentSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const ctx = buildContext({ user: VALID_USER });
      await guard.canActivate(ctx);

      expect(parentSpy).toHaveBeenCalled();
    });
  });

  // ─── handleRequest() ───────────────────────────────────────────────────────

  describe('handleRequest()', () => {
    it('should return the user when no error and user is present', () => {
      const result = guard.handleRequest(null, VALID_USER);
      expect(result).toEqual(VALID_USER);
    });

    it('should throw UnauthorizedException when user is false (missing/invalid token)', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when err is an Error instance', () => {
      expect(() =>
        guard.handleRequest(new Error('invalid signature'), false),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for an expired token error', () => {
      const expiredError = new Error('jwt expired');
      expect(() => guard.handleRequest(expiredError, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for a malformed token error', () => {
      const malformedError = new Error('jwt malformed');
      expect(() => guard.handleRequest(malformedError, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('should not leak error details in the UnauthorizedException message', () => {
      try {
        guard.handleRequest(new Error('jwt secret not found'), false);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe(
          'Authentication required',
        );
        expect((e as UnauthorizedException).message).not.toContain('secret');
      }
    });

    it('should return user for all valid UserRole variants', () => {
      const roles: UserRole[] = [
        UserRole.CUSTOMER,
        UserRole.SALON_OWNER,
        UserRole.SALON_STAFF,
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
      ];

      roles.forEach((role) => {
        const user = { ...VALID_USER, role };
        expect(guard.handleRequest(null, user)).toEqual(user);
      });
    });
  });

  // ─── IS_PUBLIC_KEY constant ────────────────────────────────────────────────

  describe('constants', () => {
    it('should use IS_PUBLIC_KEY from the shared public.decorator', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });
});
