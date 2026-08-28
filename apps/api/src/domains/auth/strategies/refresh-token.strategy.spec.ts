import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_STRATEGY_NAME,
  RefreshTokenStrategy,
  RefreshTokenUser,
} from './refresh-token.strategy';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UUID_V4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const VALID_UUID_V4_UPPERCASE = 'F47AC10B-58CC-4372-A567-0E02B2C3D479';

// Tokens that fail UUID v4 format
const UUID_V1 = 'a0eebc99-9c0b-11ed-a8fc-0242ac120002'; // version 1
const UUID_V3 = 'a3bb189e-8bf9-3888-9912-ace4e6543002'; // version 3
const UUID_V5 = 'a6e4a1f9-b10b-5a17-a9f1-2b9d6c2e7c3d'; // version 5
const MALFORMED_UUID = 'not-a-uuid-at-all';
const EMPTY_STRING = '';
const PARTIAL_UUID = 'f47ac10b-58cc';

// ─── Request Builder ──────────────────────────────────────────────────────────

/**
 * Builds a minimal mock Express Request with optional cookie and body fields.
 */
function buildRequest(options: {
  cookie?: string;
  bodyRefreshToken?: string;
}): Request {
  return {
    cookies: options.cookie !== undefined
      ? { [REFRESH_TOKEN_COOKIE_NAME]: options.cookie }
      : {},
    body: options.bodyRefreshToken !== undefined
      ? { refreshToken: options.bodyRefreshToken }
      : {},
  } as unknown as Request;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;

  // Captured success/fail calls
  let capturedSuccess: RefreshTokenUser | null;
  let capturedFail: unknown;

  beforeEach(async () => {
    capturedSuccess = null;
    capturedFail = null;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenStrategy],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);

    // Spy on passport's success/fail methods
    jest.spyOn(strategy, 'success').mockImplementation((user: RefreshTokenUser) => {
      capturedSuccess = user;
    });
    jest.spyOn(strategy, 'fail').mockImplementation((error: unknown) => {
      capturedFail = error;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Strategy Registration ─────────────────────────────────────────────────

  describe('strategy registration', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should register under the correct strategy name', () => {
      expect(REFRESH_TOKEN_STRATEGY_NAME).toBe('refresh-token');
    });

    it('should use the correct cookie name', () => {
      expect(REFRESH_TOKEN_COOKIE_NAME).toBe('refresh_token');
    });
  });

  // ─── authenticate() — cookie extraction (priority 1) ──────────────────────

  describe('authenticate() — HttpOnly cookie (web, priority 1)', () => {
    it('should call success with valid UUID v4 from cookie', () => {
      strategy.authenticate(buildRequest({ cookie: VALID_UUID_V4 }));

      expect(strategy.success).toHaveBeenCalledWith({ refreshToken: VALID_UUID_V4 });
      expect(strategy.fail).not.toHaveBeenCalled();
      expect(capturedSuccess).toEqual({ refreshToken: VALID_UUID_V4 });
    });

    it('should accept a valid UUID v4 in uppercase from cookie', () => {
      strategy.authenticate(buildRequest({ cookie: VALID_UUID_V4_UPPERCASE }));

      expect(strategy.success).toHaveBeenCalledWith({ refreshToken: VALID_UUID_V4_UPPERCASE });
    });

    it('should prefer cookie over body when both are present', () => {
      const req = buildRequest({
        cookie: VALID_UUID_V4,
        bodyRefreshToken: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      });
      strategy.authenticate(req);

      expect(strategy.success).toHaveBeenCalledWith({ refreshToken: VALID_UUID_V4 });
    });
  });

  // ─── authenticate() — body extraction (priority 2) ────────────────────────

  describe('authenticate() — request body (mobile, priority 2)', () => {
    it('should call success with valid UUID v4 from request body', () => {
      strategy.authenticate(buildRequest({ bodyRefreshToken: VALID_UUID_V4 }));

      expect(strategy.success).toHaveBeenCalledWith({ refreshToken: VALID_UUID_V4 });
      expect(strategy.fail).not.toHaveBeenCalled();
    });

    it('should fall back to body when cookie is absent', () => {
      strategy.authenticate(buildRequest({ bodyRefreshToken: VALID_UUID_V4 }));

      expect(capturedSuccess).toEqual({ refreshToken: VALID_UUID_V4 });
    });
  });

  // ─── authenticate() — missing token ───────────────────────────────────────

  describe('authenticate() — missing token', () => {
    it('should call fail when neither cookie nor body contains a token', () => {
      strategy.authenticate(buildRequest({}));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
      expect(strategy.success).not.toHaveBeenCalled();
    });

    it('should call fail when cookie is present but empty', () => {
      strategy.authenticate(buildRequest({ cookie: EMPTY_STRING }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail when body refreshToken is present but empty', () => {
      strategy.authenticate(buildRequest({ bodyRefreshToken: EMPTY_STRING }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail when both cookie and body are whitespace-only strings', () => {
      strategy.authenticate(buildRequest({ cookie: '   ', bodyRefreshToken: '   ' }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });
  });

  // ─── authenticate() — invalid UUID format ─────────────────────────────────

  describe('authenticate() — invalid token format', () => {
    it('should call fail for a non-UUID string in cookie', () => {
      strategy.authenticate(buildRequest({ cookie: MALFORMED_UUID }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
      expect(strategy.success).not.toHaveBeenCalled();
    });

    it('should call fail for a partial UUID', () => {
      strategy.authenticate(buildRequest({ cookie: PARTIAL_UUID }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail for a UUID v1 (version mismatch)', () => {
      strategy.authenticate(buildRequest({ cookie: UUID_V1 }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail for a UUID v3 (version mismatch)', () => {
      strategy.authenticate(buildRequest({ cookie: UUID_V3 }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail for a UUID v5 (version mismatch)', () => {
      strategy.authenticate(buildRequest({ cookie: UUID_V5 }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail for a UUID without hyphens', () => {
      strategy.authenticate(
        buildRequest({ cookie: 'f47ac10b58cc4372a5670e02b2c3d479' }),
      );

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });

    it('should call fail for a non-UUID string in body', () => {
      strategy.authenticate(buildRequest({ bodyRefreshToken: MALFORMED_UUID }));

      expect(strategy.fail).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        401,
      );
    });
  });

  // ─── validate() — unreachable guard ───────────────────────────────────────

  describe('validate()', () => {
    it('should throw UnauthorizedException if called directly (unreachable in practice)', () => {
      expect(() => strategy.validate(null)).toThrow(UnauthorizedException);
    });
  });
});
