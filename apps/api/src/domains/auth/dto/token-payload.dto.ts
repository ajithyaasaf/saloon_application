import { UserRole } from '@prisma/client';

/**
 * JwtPayload — strongly typed interface for the decoded JWT access token payload.
 *
 * Architecture ref: Phase 5 §5.5, Phase 7 §1.6
 *
 * Payload claims:
 *  - `sub`       : User UUID (the subject of the token).
 *  - `role`      : User's current role — used by RolesGuard for RBAC.
 *  - `sessionId` : UUID of the UserSession row this token belongs to.
 *  - `version`   : User.version at the time of issuance. Enables global
 *                  JWT invalidation by incrementing User.version server-side
 *                  without maintaining a token blocklist (Phase 7 §1.6).
 *  - `iat`       : Issued-at (Unix epoch seconds) — set by JwtModule.
 *  - `exp`       : Expiry (Unix epoch seconds) — set by JwtModule (15m).
 */
export interface JwtPayload {
  /** User UUID — `users.id` */
  sub: string;

  /** Prisma enum role — used for RBAC checks in RolesGuard */
  role: UserRole;

  /** UUID of the associated `user_sessions` row */
  sessionId: string;

  /**
   * `users.version` at the time of token issuance.
   * If User.version has been incremented (e.g. account disabled, security event),
   * the token is considered invalid even if the JWT signature is still valid.
   */
  version: number;

  /** Issued-at timestamp (Unix epoch seconds) — injected by JwtModule */
  iat: number;

  /** Expiry timestamp (Unix epoch seconds) — injected by JwtModule */
  exp: number;
}
