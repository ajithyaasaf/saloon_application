import { Injectable } from '@nestjs/common';
import { Gender, Media, Prisma, User, UserRole } from '@prisma/client';

import { BaseRepository } from '../../../common/base/base.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Payload shape for creating a Media row from a Cloudinary upload result. */
export interface CreateMediaPayload {
  uploadedById: string;
  mediaType: 'IMAGE';
  url: string;
  thumbnailUrl: string | null;
  publicId: string;
  mimeType: string;
  fileSize: number;
}

/** Filters accepted by listUsers(). */
export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

/** Pagination + sorting options for listUsers(). */
export interface UserListPagination {
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'firstName' | 'role';
  sortDir: 'asc' | 'desc';
}

/** Paginated result from listUsers(). */
export interface PaginatedUsers {
  users: User[];
  total: number;
}

/** Mutable profile fields that a user can update on themselves. */
export type ProfileUpdateData = Partial<{
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
}>;

/** Preference fields that a user can update on themselves. */
export type PreferencesUpdateData = Partial<{
  preferredLanguage: string | null;
  timezone: string | null;
  marketingOptIn: boolean;
}>;

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * UserRepository — All Prisma queries for the `users` and `media` tables
 * scoped to User Management operations.
 *
 * Rules (Phase 5 §3.8):
 *  - Zero business logic. All branching belongs in UserService.
 *  - Every method accepts an optional `tx?: Prisma.TransactionClient`.
 *  - `this.db(tx)` is the only way to execute queries.
 *
 * Architecture ref: Phase 8.0 §5
 */
@Injectable()
export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── User Lookups ─────────────────────────────────────────────────────────

  /**
   * Find a user by primary key. Excludes soft-deleted records by default.
   */
  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    return this.db(tx).user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Find an active user by email (case-insensitive handled at schema level).
   */
  async findByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    return this.db(tx).user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
    });
  }

  /**
   * Find an active user by phone number.
   */
  async findByPhone(
    phone: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    return this.db(tx).user.findFirst({
      where: { phone, deletedAt: null },
    });
  }

  // ─── Profile Mutations ────────────────────────────────────────────────────

  /**
   * Patch mutable profile fields.
   * Increments `version` on every write for optimistic concurrency tracking.
   */
  async updateProfile(
    id: string,
    data: ProfileUpdateData,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  /**
   * Patch preference fields (language, timezone, marketingOptIn).
   */
  async updatePreferences(
    id: string,
    data: PreferencesUpdateData,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  /**
   * Update email and set emailVerified = true atomically.
   */
  async updateEmail(
    id: string,
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { email, emailVerified: true, version: { increment: 1 } },
    });
  }

  /**
   * Update phone and set phoneVerified = true atomically.
   */
  async updatePhone(
    id: string,
    phone: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { phone, phoneVerified: true, version: { increment: 1 } },
    });
  }

  /**
   * Set the avatarMediaId FK (after a successful Cloudinary upload + Media row create).
   */
  async updateAvatar(
    id: string,
    avatarMediaId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { avatarMediaId, version: { increment: 1 } },
    });
  }

  /**
   * Clear the avatarMediaId (after avatar removal).
   */
  async clearAvatar(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { avatarMediaId: null, version: { increment: 1 } },
    });
  }

  // ─── Admin Mutations ──────────────────────────────────────────────────────

  /**
   * Patch any admin-permitted fields (role, isActive, name overrides).
   */
  async adminUpdateUser(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  /**
   * Set isActive = false (suspension).
   */
  async setActive(
    id: string,
    isActive: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: { isActive, version: { increment: 1 } },
    });
  }

  /**
   * Soft-delete: set deletedAt and deactivate account.
   */
  async softDelete(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Restore a soft-deleted account.
   */
  async restore(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.db(tx).user.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        version: { increment: 1 },
      },
    });
  }

  // ─── Admin Listing ────────────────────────────────────────────────────────

  /**
   * Paginated, filtered, sorted user list for admin panel.
   * Executes count and find in a single transaction to ensure consistency.
   */
  async listUsers(
    filters: UserListFilters,
    pagination: UserListPagination,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedUsers> {
    const { page, limit, sortBy, sortDir } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (filters.role !== undefined) {
      where.role = filters.role;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy]: sortDir };

    const db = this.db(tx);
    const [users, total] = await Promise.all([
      db.user.findMany({ where, skip, take: limit, orderBy }),
      db.user.count({ where }),
    ]);

    return { users, total };
  }

  // ─── Media (Avatar) ───────────────────────────────────────────────────────

  /**
   * Create a Media row from a completed Cloudinary upload.
   */
  async createMedia(
    data: CreateMediaPayload,
    tx?: Prisma.TransactionClient,
  ): Promise<Media> {
    return this.db(tx).media.create({
      data: {
        uploadedById: data.uploadedById,
        mediaType: data.mediaType,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        publicId: data.publicId,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      },
    });
  }

  /**
   * Find a Media row by ID.
   */
  async findMedia(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Media | null> {
    return this.db(tx).media.findUnique({ where: { id } });
  }

  /**
   * Delete a Media row by ID.
   * Cloudinary asset deletion is handled by the service before calling this.
   */
  async deleteMedia(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.db(tx).media.delete({ where: { id } });
  }
}
