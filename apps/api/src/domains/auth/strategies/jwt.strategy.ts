import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../dto/token-payload.dto';

/**
 * Passport strategy name constant.
 * Used by AuthGuard('jwt') and any guard that wraps this strategy.
 * Architecture ref: Phase 5 §6.2, Phase 5 §5.5
 */
export const JWT_STRATEGY_NAME = 'jwt';

/**
 * Standard HTTP Authorization header scheme for JWT tokens.
 */
export const AUTHORIZATION_SCHEME = 'Bearer';

/**
 * JwtStrategy — Passport strategy that authenticates every protected request.
 *
 * Responsibilities (Phase 5 §6.2):
 *  1. Extracts the Bearer token from the `Authorization` header.
 *  2. Verifies the JWT signature against `JWT_ACCESS_SECRET`.
 *  3. Validates token expiry (ignoreExpiration: false).
 *  4. Validates that the decoded payload conforms to the expected `JwtPayload` shape.
 *  5. Attaches the validated payload to `request.user` for downstream use.
 *
 * This strategy performs NO database queries, NO business decisions,
 * and NO token generation. It is pure authentication only.
 *
 * When `validate()` returns a value, NestJS/Passport sets `request.user = returnValue`.
 * When `validate()` throws, Passport returns 401 Unauthorized.
 *
 * Algorithm: HS256 (Phase 5 §5.5 — HS256 for MVP; RS256 for future multi-service).
 *
 * Architecture ref: Phase 5 §5.5, Phase 5 §6.2, Phase 7 §3
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(configService: ConfigService) {
    super({
      /**
       * Extracts Bearer token from:
       * `Authorization: Bearer <access_token>`
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      /**
       * passport-jwt validates expiry natively using the `exp` claim.
       * Setting ignoreExpiration: false ensures expired tokens are rejected
       * before `validate()` is ever called.
       */
      ignoreExpiration: false,

      /**
       * Access token secret — read from ConfigService at runtime.
       * Never hardcoded. Phase 5 §4.1 config namespace: jwt.accessSecret.
       */
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),

      /**
       * Explicitly restrict to HS256.
       * Prevents algorithm-confusion attacks (e.g. RS256 → HS256 downgrade).
       * Phase 5 §5.5.
       */
      algorithms: ['HS256'],
    });
  }

  /**
   * Validates the decoded and signature-verified JWT payload.
   *
   * By the time this method is called, passport-jwt has already:
   *  - Verified the JWT signature against `JWT_ACCESS_SECRET`.
   *  - Confirmed the token has not expired.
   *
   * This method performs shape and domain validation on top:
   *  - Verifies all required claims are present and correctly typed.
   *  - Verifies `role` is a valid `UserRole` enum value.
   *  - Verifies `sub`, `sessionId` are non-empty strings.
   *  - Verifies `version` is a number (used for global token invalidation).
   *
   * Never trust the decoded payload blindly — malformed tokens with valid
   * signatures must still be rejected.
   *
   * @param payload  - Decoded JWT payload (post signature + expiry verification).
   * @returns The validated `JwtPayload` which becomes `request.user`.
   * @throws `UnauthorizedException` if the payload fails shape validation.
   */
  validate(payload: unknown): JwtPayload {
    if (!isValidJwtPayload(payload)) {
      throw new UnauthorizedException('Token payload is malformed or missing required claims');
    }
    return payload;
  }
}

// ─── Payload Validator ─────────────────────────────────────────────────────────

/**
 * Type guard that validates the full `JwtPayload` shape.
 *
 * Checks:
 *  - Payload is a non-null object.
 *  - `sub` is a non-empty string (user UUID).
 *  - `role` is a member of the `UserRole` enum.
 *  - `sessionId` is a non-empty string.
 *  - `version` is a finite number (integer, ≥ 1).
 *  - `iat` and `exp` are finite numbers (injected by JwtModule).
 */
function isValidJwtPayload(payload: unknown): payload is JwtPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;

  const hasValidSub =
    typeof p['sub'] === 'string' && p['sub'].trim().length > 0;

  const hasValidRole =
    typeof p['role'] === 'string' &&
    (Object.values(UserRole) as string[]).includes(p['role']);

  const hasValidSessionId =
    typeof p['sessionId'] === 'string' && p['sessionId'].trim().length > 0;

  const hasValidVersion =
    typeof p['version'] === 'number' &&
    Number.isFinite(p['version']) &&
    p['version'] >= 1;

  const hasValidIat =
    typeof p['iat'] === 'number' && Number.isFinite(p['iat']);

  const hasValidExp =
    typeof p['exp'] === 'number' && Number.isFinite(p['exp']);

  return (
    hasValidSub &&
    hasValidRole &&
    hasValidSessionId &&
    hasValidVersion &&
    hasValidIat &&
    hasValidExp
  );
}
