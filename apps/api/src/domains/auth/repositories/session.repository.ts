import { Injectable } from '@nestjs/common';
import { Prisma, UserSession } from '@prisma/client';

import { BaseRepository } from '../../../common/base/base.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// ─── Input Types ───────────────────────────────────────────────────────────────

/**
 * Data required to persist a new UserSession row.
 * Architecture ref: Phase 3 §2 entity #2, Phase 4 (UserSession model), Phase 5 §5.2
 */
export interface CreateSessionData {
  /** FK → users.id */
  userId: string;
  /** bcrypt hash of the opaque UUID refresh token (never store raw token) */
  refreshTokenHash: string;
  /** Stable device fingerprint matching VerifyOtpDto / LoginDto device.deviceId */
  deviceId: string;
  /** User-Agent header value — recorded for session display */
  userAgent?: string;
  /** Client IP address — recorded for audit purposes */
  ipAddress?: string;
  /** Absolute expiry timestamp; computed as now + 30 days at service layer */
  expiresAt: Date;
}

/**
 * Data required to rotate a refresh token hash during token refresh.
 * Architecture ref: Phase 5 §5.3, Phase 7 §1.3
 */
export interface UpdateRefreshTokenData {
  /** New bcrypt hash of the newly issued opaque UUID refresh token */
  refreshTokenHash: string;
  /** New absolute expiry timestamp (now + 30 days) */
  expiresAt: Date;
}

// ─── Repository ────────────────────────────────────────────────────────────────

/**
 * SessionRepository — the ONLY layer that reads/writes the `user_sessions` table.
 *
 * Responsibilities (Phase 5 §3.8 repository pattern):
 *  - Owns all Prisma queries against `user_sessions`.
 *  - Maps input types to Prisma arguments and returns typed Prisma entities.
 *  - Supports optional Prisma transaction client injection on every method.
 *  - Contains zero business logic. All decisions live in AuthService.
 *
 * Architecture ref: Phase 5 §3.8, Phase 7 Implementation Plan §3
 */
@Injectable()
export class SessionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  /**
   * Persists a new UserSession row.
   *
   * Called after successful OTP verification or B2B login once a token pair
   * has been generated and the refresh token has been hashed.
   *
   * @param data  - Session creation payload.
   * @param tx    - Optional Prisma transaction client.
   * @returns The newly created `UserSession` record.
   */
  async createSession(
    data: CreateSessionData,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession> {
    return this.db(tx).userSession.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        deviceId: data.deviceId,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
      },
    });
  }

  // ─── Read ─────────────────────────────────────────────────────────────────────

  /**
   * Finds a single UserSession by its primary key UUID.
   *
   * @param id  - The `user_sessions.id` UUID.
   * @param tx  - Optional Prisma transaction client.
   * @returns The matching `UserSession`, or `null` if not found.
   */
  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession | null> {
    return this.db(tx).userSession.findUnique({
      where: { id },
    });
  }

  /**
   * Looks up a UserSession by the hashed refresh token value.
   *
   * Used during the token refresh flow to validate the incoming opaque token.
   * The service hashes the submitted raw token and passes the hash here.
   *
   * Architecture ref: Phase 5 §5.3 (Refresh Token Rotation), Phase 7 §1.3
   *
   * @param refreshTokenHash  - bcrypt hash of the submitted opaque refresh token.
   * @param tx                - Optional Prisma transaction client.
   * @returns The matching `UserSession`, or `null` if not found.
   */
  async findByRefreshTokenHash(
    refreshTokenHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession | null> {
    return this.db(tx).userSession.findFirst({
      where: { refreshTokenHash },
    });
  }

  /**
   * Finds a non-expired UserSession for a specific user on a specific device.
   *
   * Used to detect whether a re-login on the same device should reuse/replace
   * an existing session rather than create a duplicate.
   *
   * @param userId    - The `users.id` UUID.
   * @param deviceId  - Stable device fingerprint.
   * @param tx        - Optional Prisma transaction client.
   * @returns The most-recently-created active session, or `null` if none exists.
   */
  async findActiveSession(
    userId: string,
    deviceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession | null> {
    return this.db(tx).userSession.findFirst({
      where: {
        userId,
        deviceId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns all UserSession rows for a user, ordered newest-first.
   *
   * Used for the "active sessions" display and bulk revocation lookups.
   *
   * @param userId  - The `users.id` UUID.
   * @param tx      - Optional Prisma transaction client.
   * @returns Array of `UserSession` records. Empty array if none exist.
   */
  async findUserSessions(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession[]> {
    return this.db(tx).userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  /**
   * Atomically rotates the refresh token hash and extends the session expiry.
   *
   * Called within a Prisma transaction during token refresh to ensure the old
   * hash is replaced before the new token pair is returned to the client.
   *
   * Architecture ref: Phase 5 §5.3, Phase 7 §1.3
   *
   * @param id    - The `user_sessions.id` UUID to update.
   * @param data  - New hash and expiry values.
   * @param tx    - Optional Prisma transaction client.
   * @returns The updated `UserSession` record.
   * @throws Prisma P2025 (record not found) if the session id does not exist.
   */
  async updateRefreshToken(
    id: string,
    data: UpdateRefreshTokenData,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession> {
    return this.db(tx).userSession.update({
      where: { id },
      data: {
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Session liveness verification.
   *
   * Verifies that a specific session exists and has not expired.
   *
   * @param id  - The `user_sessions.id` UUID.
   * @param tx  - Optional Prisma transaction client.
   * @returns The session if it exists and has not expired, `null` otherwise.
   */
  async ensureSessionIsActive(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSession | null> {
    return this.db(tx).userSession.findFirst({
      where: {
        id,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  /**
   * Deletes a single UserSession by primary key.
   *
   * Used for "Logout Current Device" — removes only the session matching the
   * device that made the logout request.
   *
   * Architecture ref: Phase 5 §5.4, Phase 7 §1.5
   *
   * @param id  - The `user_sessions.id` UUID to delete.
   * @param tx  - Optional Prisma transaction client.
   * @throws Prisma P2025 if the session row does not exist (already logged out).
   */
  async revokeSession(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.db(tx).userSession.delete({ where: { id } });
  }

  /**
   * Deletes ALL UserSession rows for a given user.
   *
   * Used for:
   *  - "Logout All Devices" (Phase 7 §1.5).
   *  - Password reset / change (revokes all sessions post-credential change).
   *  - Refresh token reuse detection (emergency full revocation) (Phase 7 §1.3).
   *
   * Architecture ref: Phase 5 §5.4, Phase 7 §1.3, Phase 7 §1.5, BR-008
   *
   * @param userId  - The `users.id` UUID whose sessions are to be revoked.
   * @param tx      - Optional Prisma transaction client.
   * @returns Number of session rows deleted.
   */
  async revokeAllUserSessions(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await this.db(tx).userSession.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  /**
   * Bulk-deletes all expired UserSession rows across all users.
   *
   * Intended to be called by the scheduled cleanup BullMQ cron job:
   * `cleanup.expired-sessions` — runs every hour.
   *
   * Architecture ref: Phase 5 §10.5, Phase 7 Implementation Plan §1
   *
   * @param tx  - Optional Prisma transaction client.
   * @returns Number of expired session rows deleted.
   */
  async deleteExpiredSessions(tx?: Prisma.TransactionClient): Promise<number> {
    const result = await this.db(tx).userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
