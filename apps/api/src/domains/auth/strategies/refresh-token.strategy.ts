import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport';

/**
 * Passport strategy name constant.
 * Used by `AuthGuard('refresh-token')` in the token refresh endpoint.
 */
export const REFRESH_TOKEN_STRATEGY_NAME = 'refresh-token';

/**
 * The HttpOnly cookie name used to transport the refresh token on web clients.
 * Must match the cookie name set by AuthService when issuing tokens.
 * Architecture ref: Phase 5 §5.2
 */
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

/**
 * The identity attached to `request.user` after this strategy authenticates
 * the refresh token. Contains only the raw token value for AuthService to process.
 */
export interface RefreshTokenUser {
  /** The raw opaque UUID refresh token extracted from cookie or request body. */
  refreshToken: string;
}

/**
 * RefreshTokenStrategy — Passport strategy that authenticates refresh token requests.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  REFRESH_TOKEN_STRATEGY_NAME,
) {
  /** Passport strategy callback properties (initialized for runtime reflection and mocking) */
  public success: (user: RefreshTokenUser) => void = () => {};
  public fail: (challenge: unknown, status?: number) => void = () => {};

  /**
   * `validate()` is required by the `PassportStrategy` mixin's abstract contract
   * but is never invoked for this strategy because `authenticate()` is fully
   * overridden and calls `this.success()` / `this.fail()` directly.
   */
  validate(_payload: unknown): never {
    throw new UnauthorizedException(
      'RefreshTokenStrategy.validate() should never be called directly',
    );
  }

  /**
   * Overrides the Passport `authenticate()` hook to perform extraction
   * and format validation of the opaque refresh token.
   */
  authenticate(req: Request): void {
    const rawToken = this.extractToken(req);

    if (rawToken === null) {
      this.fail(
        new UnauthorizedException('Refresh token is missing'),
        401,
      );
      return;
    }

    if (!this.isUuidV4(rawToken)) {
      this.fail(
        new UnauthorizedException('Refresh token format is invalid'),
        401,
      );
      return;
    }

    const user: RefreshTokenUser = { refreshToken: rawToken };
    this.success(user);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Extracts the raw refresh token from the request.
   */
  private extractToken(req: Request): string | null {
    // 1. HttpOnly secure cookie (web)
    const fromCookie: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (typeof fromCookie === 'string' && fromCookie.trim().length > 0) {
      return fromCookie.trim();
    }

    // 2. Request body (mobile — submitted via RefreshTokenDto)
    const fromBody: unknown = (req.body as Record<string, unknown>)?.['refreshToken'];
    if (typeof fromBody === 'string' && fromBody.trim().length > 0) {
      return fromBody.trim();
    }

    return null;
  }

  /**
   * Validates that a string is a canonical UUID v4.
   */
  private isUuidV4(value: string): boolean {
    const UUID_V4_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_V4_REGEX.test(value);
  }
}
