import * as crypto from 'crypto';

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  FileCategory,
  FileStatus,
  FileVisibility,
  Gender,
  Media,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

import {
  CACHE_KEYS,
  CACHE_TTL,
} from '../../common/constants/cache-keys.constant';
import {
  QUEUE_NOTIFICATION_EMAIL,
  QUEUE_NOTIFICATION_SMS,
} from '../../common/constants/queues.constant';
import { FileSecurityUtil } from '../../common/utils/file-security.util';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { STORAGE_PROVIDER_TOKEN } from '../../infrastructure/storage/constants/storage.constants';
import { IStorageProvider } from '../../infrastructure/storage/interfaces/storage-provider.interface';
import { ObjectKeyStrategy } from '../../infrastructure/storage/strategies/object-key.strategy';
import { SessionRepository } from '../auth/repositories/session.repository';
import { FileAccessService } from '../media/services/file-access.service';
import { FileAssetRepository } from '../media/repositories/file-asset.repository';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { AvatarDto, UserProfileDto } from './dto/user-profile.dto';
import { PaginatedUsersDto, UserSummaryDto } from './dto/user-summary.dto';
import { UserRepository } from './repositories/user.repository';

// ─── Internal Constants ────────────────────────────────────────────────────────

/** bcrypt salt rounds — standardized to 12 across the application (Phase 5 §5.1). */
const BCRYPT_SALT_ROUNDS = 12;
/** Email change verification token byte length → 3 bytes = 6 hex chars. */
const EMAIL_TOKEN_BYTES = 3;
/** OTP digit count for phone change. */
const OTP_DIGITS = 6;
/** Upper bound for crypto.randomInt for OTP (999999 + 1). */
const OTP_UPPER_BOUND = 1_000_000;
/** Max OTP verification attempts before phone-change OTP is invalidated. */
const PHONE_OTP_MAX_ATTEMPTS = 3;
/** Max avatar size in bytes (5 MB). */
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
/** Allowed avatar MIME types (validated via magic bytes in production; MIME checked here). */
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** Minimum user age requirement (years). */
const MIN_AGE_YEARS = 13;
/** Maximum plausible user age (years). */
const MAX_AGE_YEARS = 120;
/** Max email change requests per rate limit window. */
const EMAIL_CHANGE_MAX_REQUESTS = 3;
/** Max phone OTP requests per rate limit window. */
const PHONE_OTP_MAX_REQUESTS = 3;

// ─── Internal Types ────────────────────────────────────────────────────────────

interface PhoneOtpRedisEntry {
  newPhone: string;
  hash: string;
  attempts: number;
}

interface EmailChangeRedisEntry {
  newEmail: string;
  tokenHash: string;
}

interface EmailJobPayload {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

interface SmsOtpJobPayload {
  phone: string;
  otp: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * UserService — Profile management, avatar handling, contact change, and
 * account lifecycle for the User Management module.
 *
 * Architecture ref: Phase 8.0 §4 / Phase 21 Integration
 *
 * Principles:
 *  - Zero HTTP context. All methods accept primitives only.
 *  - PII (email, phone, DOB) is never logged in plain text.
 *  - All mutations are audit-logged.
 *  - Session revocation is delegated to SessionRepository.
 *  - Storage operations use Phase 20 IStorageProvider abstraction.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
    @Optional()
    private readonly fileAssetRepo?: FileAssetRepository,
    @Optional()
    private readonly fileAccessService?: FileAccessService,
  ) {}

  // ─── Self-Service: Profile ─────────────────────────────────────────────────

  /**
   * Returns the authenticated user's full profile DTO.
   */
  async getMyProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);
    return this.buildUserProfileDto(user);
  }

  /**
   * Patches mutable profile fields. Validates age constraint on dateOfBirth.
   * Only fields present in the DTO are written to the database.
   */
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    // Age constraint: user must be >= MIN_AGE_YEARS and <= MAX_AGE_YEARS
    if (dto.dateOfBirth !== undefined && dto.dateOfBirth !== null) {
      this.assertValidAge(dto.dateOfBirth);
    }

    // Build delta (only provided fields)
    const delta: Partial<typeof dto> = {};
    if (dto.firstName !== undefined) delta.firstName = dto.firstName;
    if (dto.lastName !== undefined) delta.lastName = dto.lastName;
    if (dto.displayName !== undefined) delta.displayName = dto.displayName;
    if (dto.gender !== undefined) delta.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) delta.dateOfBirth = dto.dateOfBirth;

    if (Object.keys(delta).length === 0) {
      return this.buildUserProfileDto(user);
    }

    const oldSnapshot = this.buildAuditSnapshot(user, Object.keys(delta));
    const updated = await this.userRepo.updateProfile(userId, delta);

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      oldValue: oldSnapshot,
      newValue: this.buildAuditSnapshot(updated, Object.keys(delta)),
      ipAddress,
    });

    return this.buildUserProfileDto(updated);
  }

  /**
   * Patches locale and consent preference fields.
   */
  async updateMyPreferences(
    userId: string,
    dto: UpdatePreferencesDto,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    const delta: Partial<typeof dto> = {};
    if (dto.preferredLanguage !== undefined) delta.preferredLanguage = dto.preferredLanguage;
    if (dto.timezone !== undefined) delta.timezone = dto.timezone;
    if (dto.marketingOptIn !== undefined) delta.marketingOptIn = dto.marketingOptIn;

    if (Object.keys(delta).length === 0) {
      return this.buildUserProfileDto(user);
    }

    const oldSnapshot = this.buildAuditSnapshot(user, Object.keys(delta));
    const updated = await this.userRepo.updatePreferences(userId, delta);

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      oldValue: oldSnapshot,
      newValue: this.buildAuditSnapshot(updated, Object.keys(delta)),
      ipAddress,
    });

    return this.buildUserProfileDto(updated);
  }

  // ─── Self-Service: Avatar ──────────────────────────────────────────────────

  /**
   * Uploads a new avatar image through the Phase 20 storage abstraction,
   * creates an authoritative FileAsset and backward-compatible Media row,
   * updates the user's avatarMediaId, and deletes any previous avatar.
   *
   * Idempotency: A 30-second Redis lock prevents concurrent uploads from the
   * same user creating duplicate records.
   */
  async requestAvatarUpload(
    userId: string,
    file: Express.Multer.File,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    // Validate file constraints & executable/dangerous extension prevention
    this.assertValidAvatarFile(file);

    // Acquire idempotency lock (30 sec)
    const lockKey = CACHE_KEYS.USER_AVATAR_LOCK(userId);
    const locked = await this.redis.setNX(lockKey, '1', CACHE_TTL.AVATAR_LOCK);
    if (!locked) {
      throw new HttpException(
        'An avatar upload is already in progress. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const extension = this.resolveSafeImageExtension(file.mimetype, file.originalname);
    const objectKey = ObjectKeyStrategy.generate({
      userId,
      category: FileCategory.PROFILE,
      folder: 'avatars',
      extension,
    });

    let uploadResult: { objectKey: string; publicUrl?: string; bucket: string; sizeBytes: number };
    try {
      uploadResult = await this.storageProvider.upload({
        objectKey,
        body: file.buffer,
        contentType: file.mimetype,
        contentLength: file.size || file.buffer.length,
      });
    } catch (err) {
      await this.redis.del(lockKey);
      this.logger.error(`Storage provider upload failed for user ${userId}: ${String(err)}`);
      throw new HttpException(
        'Avatar upload failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const avatarUrl =
      uploadResult.publicUrl ||
      (typeof (this.storageProvider as any).getPublicUrl === 'function'
        ? (this.storageProvider as any).getPublicUrl(objectKey)
        : `https://storage.saloon.platform/${objectKey}`);

    const safeOriginalName = file.originalname
      ? FileSecurityUtil.sanitizeFileName(file.originalname)
      : `avatar.${extension}`;
    const storedFileName = objectKey.split('/').pop() || `avatar.${extension}`;

    // Persist FileAsset + Media row + update User.avatarMediaId in a transaction
    const previousAvatarMediaId = user.avatarMediaId;

    const newMedia = await this.prisma.$transaction(async (tx) => {
      // 1. Create authoritative Phase 20 FileAsset
      const fileAsset = await tx.fileAsset.create({
        data: {
          uploadedByUserId: userId,
          originalFileName: safeOriginalName,
          storedFileName,
          objectKey,
          bucket: uploadResult.bucket || 'saloon-assets',
          provider: this.storageProvider.providerName || 'STORAGE',
          mimeType: file.mimetype,
          extension: extension.toLowerCase(),
          sizeBytes: file.size || file.buffer.length,
          status: FileStatus.READY,
          visibility: FileVisibility.PUBLIC,
          category: FileCategory.PROFILE,
          folder: 'avatars',
        },
      });

      // 2. Create backward-compatible Media row
      const media = await this.userRepo.createMedia(
        {
          uploadedById: userId,
          mediaType: 'IMAGE',
          url: avatarUrl,
          thumbnailUrl: null,
          publicId: fileAsset.id,
          mimeType: file.mimetype,
          fileSize: file.size || file.buffer.length,
        },
        tx,
      );

      // 3. Link user avatar
      await this.userRepo.updateAvatar(userId, media.id, tx);
      return media;
    });

    // Release lock
    await this.redis.del(lockKey);

    // Delete previous avatar (best-effort; failure is logged, not thrown)
    if (previousAvatarMediaId) {
      await this.deleteOldAvatar(previousAvatarMediaId);
    }

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      newValue: { event: 'AVATAR_UPDATED', mediaId: newMedia.id },
      ipAddress,
    });

    const updated = await this.userRepo.findById(userId);
    return this.buildUserProfileDto(updated!, newMedia);
  }

  /**
   * Removes the user's profile picture.
   * Clears User.avatarMediaId and deletes the underlying storage asset.
   */
  async removeAvatar(userId: string, ipAddress: string): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    if (!user.avatarMediaId) {
      return this.buildUserProfileDto(user);
    }

    const previousMediaId = user.avatarMediaId;

    await this.prisma.$transaction(async (tx) => {
      await this.userRepo.clearAvatar(userId, tx);
    });

    await this.deleteOldAvatar(previousMediaId);

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      newValue: { event: 'AVATAR_REMOVED' },
      ipAddress,
    });

    const updated = await this.userRepo.findById(userId);
    return this.buildUserProfileDto(updated!);
  }

  // ─── Self-Service: Email Change ────────────────────────────────────────────

  /**
   * Initiates an email change: rate-limits, dispatches a 6-char hex token
   * to the new email address. Response is always generic (anti-enumeration).
   */
  async requestEmailChange(
    userId: string,
    dto: ChangeEmailDto,
    ipAddress: string,
  ): Promise<{ message: string }> {
    await this.requireActiveUser(userId);
    await this.enforceEmailChangeRateLimit(userId);

    // Token is a 6-char hex string derived from 3 random bytes
    const rawToken = crypto.randomBytes(EMAIL_TOKEN_BYTES).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);

    const entry: EmailChangeRedisEntry = {
      newEmail: dto.newEmail,
      tokenHash,
    };
    await this.redis.set(
      CACHE_KEYS.USER_EMAIL_CHANGE(userId),
      entry,
      CACHE_TTL.EMAIL_CHANGE,
    );

    // Dispatch verification email
    const payload: EmailJobPayload = {
      to: dto.newEmail,
      subject: 'Verify your new email address',
      template: 'email-change-verify',
      variables: {
        token: rawToken,
        expiresInMinutes: String(CACHE_TTL.EMAIL_CHANGE / 60),
      },
    };
    await this.queue.dispatch<EmailJobPayload>(
      QUEUE_NOTIFICATION_EMAIL,
      'email.verify-change',
      payload,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    this.logger.log(`Email change requested for user ${userId}`);
    return {
      message:
        'If the address is valid, a verification link has been sent. Please check your inbox.',
    };
  }

  /**
   * Confirms an email change: validates the token, checks uniqueness,
   * updates User.email + emailVerified = true.
   */
  async verifyEmailChange(
    userId: string,
    dto: VerifyEmailDto,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    const entry = await this.redis.get<EmailChangeRedisEntry>(
      CACHE_KEYS.USER_EMAIL_CHANGE(userId),
    );
    if (!entry) {
      throw new UnauthorizedException(
        'No pending email change found or the verification token has expired.',
      );
    }

    const isValid = await bcrypt.compare(dto.token, entry.tokenHash);
    if (!isValid) {
      throw new UnauthorizedException('The verification token is invalid.');
    }

    // Check uniqueness at confirmation time (anti-enumeration on request step)
    const existing = await this.userRepo.findByEmail(entry.newEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'This email address is already associated with another account.',
      );
    }

    const updated = await this.userRepo.updateEmail(userId, entry.newEmail);

    // Invalidate the token (single-use)
    await this.redis.del(CACHE_KEYS.USER_EMAIL_CHANGE(userId));

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      oldValue: { field: 'email', old: this.maskEmail(user.email) },
      newValue: { field: 'email', new: this.maskEmail(entry.newEmail) },
      ipAddress,
    });

    return this.buildUserProfileDto(updated);
  }

  // ─── Self-Service: Phone Change ────────────────────────────────────────────

  /**
   * Initiates a phone number change: rate-limits, dispatches a 6-digit OTP
   * to the new phone number. Response is always generic (anti-enumeration).
   */
  async requestPhoneChange(
    userId: string,
    dto: ChangePhoneDto,
    ipAddress: string,
  ): Promise<{ message: string }> {
    await this.requireActiveUser(userId);
    const newPhone = this.normalizePhone(dto.newPhone);
    await this.enforcePhoneChangeRateLimit(userId);

    const rawOtp = this.generateOtp();
    const otpHash = await bcrypt.hash(rawOtp, BCRYPT_SALT_ROUNDS);

    const entry: PhoneOtpRedisEntry = { newPhone, hash: otpHash, attempts: 0 };
    await this.redis.set(
      CACHE_KEYS.USER_PHONE_CHANGE(userId),
      entry,
      CACHE_TTL.PHONE_CHANGE,
    );

    const payload: SmsOtpJobPayload = { phone: newPhone, otp: rawOtp };
    await this.queue.dispatch<SmsOtpJobPayload>(
      QUEUE_NOTIFICATION_SMS,
      'sms.phone-change-otp',
      payload,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return {
      message:
        'If the number is eligible, an OTP has been sent. Please check your messages.',
    };
  }

  /**
   * Confirms a phone number change: validates OTP, checks uniqueness,
   * updates User.phone + phoneVerified = true.
   */
  async verifyPhoneChange(
    userId: string,
    dto: VerifyPhoneDto,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);

    const cacheKey = CACHE_KEYS.USER_PHONE_CHANGE(userId);
    const entry = await this.redis.get<PhoneOtpRedisEntry>(cacheKey);
    if (!entry) {
      throw new UnauthorizedException(
        'No pending phone change found or the OTP has expired.',
      );
    }

    // Increment attempt count before validation to prevent brute force
    entry.attempts += 1;
    if (entry.attempts > PHONE_OTP_MAX_ATTEMPTS) {
      await this.redis.del(cacheKey);
      throw new UnauthorizedException(
        'Maximum OTP attempts exceeded. Please request a new OTP.',
      );
    }
    await this.redis.set(cacheKey, entry, CACHE_TTL.PHONE_CHANGE);

    const isValid = await bcrypt.compare(dto.otp, entry.hash);
    if (!isValid) {
      if (entry.attempts >= PHONE_OTP_MAX_ATTEMPTS) {
        await this.redis.del(cacheKey);
      }
      throw new UnauthorizedException('The OTP is invalid.');
    }

    // Check uniqueness at confirmation time
    const existing = await this.userRepo.findByPhone(entry.newPhone);
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'This phone number is already associated with another account.',
      );
    }

    const updated = await this.userRepo.updatePhone(userId, entry.newPhone);

    // Invalidate OTP (single-use)
    await this.redis.del(cacheKey);

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.UPDATE,
      entityId: userId,
      oldValue: { field: 'phone', old: this.maskPhone(user.phone) },
      newValue: { field: 'phone', new: this.maskPhone(entry.newPhone) },
      ipAddress,
    });

    return this.buildUserProfileDto(updated);
  }

  // ─── Self-Service: Account Deletion ───────────────────────────────────────

  /**
   * Initiates self-deletion: dispatches a single-use confirmation token
   * to the user's email or phone. Does NOT delete the account immediately.
   */
  async requestSelfDeletion(
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const user = await this.requireActiveUser(userId);

    const rawToken = crypto.randomBytes(EMAIL_TOKEN_BYTES).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);

    await this.redis.set(
      CACHE_KEYS.USER_DELETE_CONFIRM(userId),
      tokenHash,
      CACHE_TTL.USER_DELETE_CONFIRM,
    );

    // Notify via email if available, otherwise log for SMS fallback
    if (user.email) {
      const payload: EmailJobPayload = {
        to: user.email,
        subject: 'Confirm account deletion',
        template: 'account-delete-confirm',
        variables: {
          firstName: user.firstName,
          token: rawToken,
          expiresInMinutes: String(CACHE_TTL.USER_DELETE_CONFIRM / 60),
        },
      };
      await this.queue.dispatch<EmailJobPayload>(
        QUEUE_NOTIFICATION_EMAIL,
        'email.delete-confirm',
        payload,
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    }

    this.logger.log(`Account deletion requested for user ${userId}`);
    return {
      message:
        'A confirmation token has been sent. ' +
        'Submit it within 30 minutes to complete account deletion.',
    };
  }

  /**
   * Confirms self-deletion: validates the token, soft-deletes the account,
   * and revokes all active sessions.
   */
  async confirmSelfDeletion(
    userId: string,
    token: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const user = await this.requireActiveUser(userId);

    const cacheKey = CACHE_KEYS.USER_DELETE_CONFIRM(userId);
    const storedHash = await this.redis.get<string>(cacheKey);
    if (!storedHash) {
      throw new UnauthorizedException(
        'No pending deletion found or the confirmation token has expired.',
      );
    }

    const isValid = await bcrypt.compare(token, storedHash);
    if (!isValid) {
      throw new UnauthorizedException('The confirmation token is invalid.');
    }

    // Single-use: delete token immediately before any side effects
    await this.redis.del(cacheKey);

    await this.prisma.$transaction(async (tx) => {
      await this.userRepo.softDelete(userId, tx);
      await this.sessionRepo.revokeAllUserSessions(userId, tx);
    });

    await this.writeAuditLog({
      actorId: userId,
      role: user.role,
      action: AuditAction.DELETE,
      entityId: userId,
      newValue: { reason: 'SELF_DELETION' },
      ipAddress,
    });

    this.logger.warn(`Account self-deleted: userId=${userId}`);
    return { message: 'Your account has been deleted successfully.' };
  }

  // ─── Admin: User Listing & Views ──────────────────────────────────────────

  /**
   * Returns a single user's profile for admin/support viewing.
   * Includes soft-deleted users (admin can view for audit purposes).
   */
  async getUserById(
    requesterId: string,
    targetUserId: string,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found.`);
    }
    return this.buildUserProfileDto(user);
  }

  /**
   * Returns a paginated, filtered user list for the admin panel.
   */
  async listUsers(
    _requesterId: string,
    dto: AdminListUsersDto,
  ): Promise<PaginatedUsersDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const { users, total } = await this.userRepo.listUsers(
      {
        role: dto.role,
        isActive: dto.isActive,
        search: dto.search,
      },
      {
        page,
        limit,
        sortBy: dto.sortBy ?? 'createdAt',
        sortDir: dto.sortDir ?? 'desc',
      },
    );

    const data = users.map((u) =>
      plainToInstance(UserSummaryDto, u, { excludeExtraneousValues: true }),
    );

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin patches a user's role, isActive, or name fields.
   * Prevents an admin from demoting their own SUPER_ADMIN role.
   */
  async adminUpdateUser(
    requesterId: string,
    targetUserId: string,
    dto: AdminUpdateUserDto,
    ipAddress: string,
  ): Promise<UserProfileDto> {
    const requester = await this.requireActiveUser(requesterId);
    const target = await this.requireExistingUser(targetUserId);

    // Self-demotion guard
    if (
      requesterId === targetUserId &&
      dto.role !== undefined &&
      dto.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Administrators cannot demote their own account.');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;

    const isRoleChanged = dto.role !== undefined && dto.role !== target.role;
    const isSuspended = dto.isActive !== undefined && dto.isActive === false && target.isActive === true;

    const oldSnapshot = this.buildAuditSnapshot(target, Object.keys(data));
    const updated = await this.userRepo.adminUpdateUser(targetUserId, data);

    // If role changed or user was suspended, revoke all active sessions immediately
    if (isRoleChanged || isSuspended) {
      await this.sessionRepo.revokeAllUserSessions(targetUserId);
      this.logger.log(
        `Security event: User ${targetUserId} ${isRoleChanged ? `role changed to ${dto.role}` : 'suspended'} by admin ${requesterId}. Active sessions revoked.`,
      );
    }

    await this.writeAuditLog({
      actorId: requesterId,
      role: requester.role,
      action: AuditAction.UPDATE,
      entityId: targetUserId,
      oldValue: oldSnapshot,
      newValue: this.buildAuditSnapshot(updated, Object.keys(data)),
      ipAddress,
    });

    return this.buildUserProfileDto(updated);
  }

  /**
   * Suspends a user account (isActive = false) and revokes all active sessions.
   */
  async suspendUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const admin = await this.requireActiveUser(adminId);
    const target = await this.requireExistingUser(targetUserId);

    if (!target.isActive) {
      throw new ConflictException('User is already suspended.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.userRepo.setActive(targetUserId, false, tx);
      await this.sessionRepo.revokeAllUserSessions(targetUserId, tx);
    });

    await this.writeAuditLog({
      actorId: adminId,
      role: admin.role,
      action: AuditAction.UPDATE,
      entityId: targetUserId,
      newValue: { event: 'ACCOUNT_SUSPENDED', adminId },
      ipAddress,
    });

    return { message: 'User account has been suspended and all sessions revoked.' };
  }

  /**
   * Restores a suspended user account (isActive = true).
   */
  async restoreUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const admin = await this.requireActiveUser(adminId);
    const target = await this.requireExistingUser(targetUserId);

    if (target.isActive && !target.deletedAt) {
      throw new ConflictException('User account is already active.');
    }

    await this.userRepo.restore(targetUserId);

    await this.writeAuditLog({
      actorId: adminId,
      role: admin.role,
      action: AuditAction.UPDATE,
      entityId: targetUserId,
      newValue: { event: 'ACCOUNT_RESTORED', adminId },
      ipAddress,
    });

    return { message: 'User account has been restored.' };
  }

  /**
   * Soft-deletes a user account and revokes all sessions.
   */
  async softDeleteUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const admin = await this.requireActiveUser(adminId);

    if (adminId === targetUserId) {
      throw new ForbiddenException('Administrators cannot delete their own account.');
    }

    const target = await this.requireExistingUser(targetUserId);

    await this.prisma.$transaction(async (tx) => {
      await this.userRepo.softDelete(targetUserId, tx);
      await this.sessionRepo.revokeAllUserSessions(targetUserId, tx);
    });

    await this.writeAuditLog({
      actorId: adminId,
      role: admin.role,
      action: AuditAction.DELETE,
      entityId: targetUserId,
      newValue: { reason: 'ADMIN_ACTION', adminId },
      ipAddress,
    });

    this.logger.warn(
      `User soft-deleted: targetUserId=${targetUserId} by adminId=${adminId}`,
    );
    return { message: 'User account has been deleted.' };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Fetches an active (not deleted) user by ID or throws 404.
   */
  private async requireActiveUser(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or account is inactive.');
    }
    return user;
  }

  /**
   * Fetches any existing user (including soft-deleted) for admin operations.
   */
  private async requireExistingUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
    return user;
  }

  /**
   * Builds a UserProfileDto from a User row, optionally with a resolved Media record.
   */
  private async buildUserProfileDto(
    user: User,
    resolvedMedia?: Media | null,
  ): Promise<UserProfileDto> {
    let avatar: AvatarDto | null = null;

    const mediaId = user.avatarMediaId;
    if (mediaId) {
      const media = resolvedMedia ?? (await this.userRepo.findMedia(mediaId));
      if (media) {
        avatar = { url: media.url, thumbnailUrl: media.thumbnailUrl };
      }
    }

    const raw = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: (user as any).displayName ?? null,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      role: user.role,
      isActive: user.isActive,
      gender: (user as any).gender ?? null,
      dateOfBirth: (user as any).dateOfBirth ?? null,
      avatar,
      preferredLanguage: (user as any).preferredLanguage ?? null,
      timezone: (user as any).timezone ?? null,
      marketingOptIn: (user as any).marketingOptIn ?? false,
      createdAt: user.createdAt,
    };

    return plainToInstance(UserProfileDto, raw, { excludeExtraneousValues: true });
  }

  /**
   * Builds an audit snapshot containing only the specified field names.
   * Never includes PII — caller masks sensitive fields before writing to audit.
   */
  private buildAuditSnapshot(user: User, fields: string[]): Record<string, unknown> {
    const snap: Record<string, unknown> = {};
    const u = user as Record<string, unknown>;
    for (const field of fields) {
      if (field in u) {
        snap[field] = u[field];
      }
    }
    return snap;
  }

  /**
   * Writes an audit log row via Prisma. Failure is non-fatal (logged but not re-thrown).
   */
  private async writeAuditLog(params: {
    actorId: string;
    role: UserRole;
    action: AuditAction;
    entityId: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          whoId: params.actorId,
          role: params.role,
          action: params.action,
          entityType: 'User',
          entityId: params.entityId,
          oldValueJson: params.oldValue
            ? (params.oldValue as Prisma.InputJsonValue)
            : undefined,
          newValueJson: params.newValue
            ? (params.newValue as Prisma.InputJsonValue)
            : undefined,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Audit log write failed: ${String(err)}`);
    }
  }

  /**
   * Deletes an old avatar's Media row and underlying storage asset (best-effort).
   */
  private async deleteOldAvatar(mediaId: string): Promise<void> {
    try {
      const media = await this.userRepo.findMedia(mediaId);
      if (!media) return;

      if (media.publicId) {
        try {
          const fileAsset = await this.prisma.fileAsset.findUnique({
            where: { id: media.publicId },
          });
          if (fileAsset) {
            await this.prisma.fileAsset.update({
              where: { id: fileAsset.id },
              data: { deletedAt: new Date(), status: FileStatus.DELETED },
            });
            await this.storageProvider.delete(fileAsset.objectKey);
          }
        } catch {
          // Best-effort cleanup for FileAsset / storage object
        }
      }

      await this.userRepo.deleteMedia(mediaId);
    } catch (err) {
      this.logger.error(`Failed to delete old avatar media ${mediaId}: ${String(err)}`);
    }
  }

  /**
   * Validates avatar file size, MIME type, and extension security.
   */
  private assertValidAvatarFile(file: Express.Multer.File): void {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new HttpException('No file provided.', HttpStatus.BAD_REQUEST);
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new HttpException(
        `File size exceeds maximum allowed limit of ${MAX_AVATAR_SIZE_BYTES / (1024 * 1024)} MB.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Allowed types: JPEG, PNG, WebP.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.originalname && FileSecurityUtil.findDangerousExtension(file.originalname)) {
      throw new HttpException(
        'Invalid file format: dangerous or executable extension detected.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Resolves a sanitized, safe image extension based on MIME type and original filename.
   */
  private resolveSafeImageExtension(mimeType: string, originalName?: string): string {
    if (originalName) {
      const ext = originalName.split('.').pop()?.trim().toLowerCase();
      if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
  }

  /**
   * Validates date of birth: user must be between MIN_AGE_YEARS and MAX_AGE_YEARS.
   */
  private assertValidAge(dateOfBirth: Date): void {
    const now = new Date();
    const minDob = new Date(
      now.getFullYear() - MAX_AGE_YEARS,
      now.getMonth(),
      now.getDate(),
    );
    const maxDob = new Date(
      now.getFullYear() - MIN_AGE_YEARS,
      now.getMonth(),
      now.getDate(),
    );

    if (dateOfBirth > maxDob) {
      throw new HttpException(
        `You must be at least ${MIN_AGE_YEARS} years old to register.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dateOfBirth < minDob) {
      throw new HttpException(
        `Date of birth is not valid.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  /** Normalizes Indian phone numbers to 10-digit format. */
  private normalizePhone(phone: string): string {
    return phone.startsWith('+91') ? phone.slice(3) : phone;
  }

  /** Generates a 6-digit numeric OTP using crypto.randomInt (not Math.random). */
  private generateOtp(): string {
    return crypto.randomInt(0, OTP_UPPER_BOUND).toString().padStart(OTP_DIGITS, '0');
  }

  /** Masks an email for audit log: abc***@example.com */
  private maskEmail(email: string | null): string {
    if (!email) return '***';
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /** Masks a phone number for audit log: shows only last 4 digits. */
  private maskPhone(phone: string): string {
    return `***${phone.slice(-4)}`;
  }

  /** Enforces email change rate limit: max EMAIL_CHANGE_MAX_REQUESTS per hour. */
  private async enforceEmailChangeRateLimit(userId: string): Promise<void> {
    const key = CACHE_KEYS.USER_EMAIL_CHANGE_RATE(userId);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, CACHE_TTL.EMAIL_CHANGE_RATE_WINDOW);
    }
    if (count > EMAIL_CHANGE_MAX_REQUESTS) {
      throw new HttpException(
        'Too many email change requests. Please try again in 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Enforces phone OTP rate limit: max PHONE_OTP_MAX_REQUESTS per 15 minutes. */
  private async enforcePhoneChangeRateLimit(userId: string): Promise<void> {
    const key = CACHE_KEYS.USER_PHONE_CHANGE_RATE(userId);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, CACHE_TTL.PHONE_CHANGE_RATE_WINDOW);
    }
    if (count > PHONE_OTP_MAX_REQUESTS) {
      throw new HttpException(
        'Too many OTP requests. Please try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
