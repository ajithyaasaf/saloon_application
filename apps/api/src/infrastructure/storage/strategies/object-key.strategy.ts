import { BadRequestException } from '@nestjs/common';
import { FileCategory } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { StorageSecurityUtil } from '../utils/storage-security.util';

/**
 * Input parameters for canonical object-key generation.
 */
export interface GenerateObjectKeyParams {
  /**
   * Authoritative salon identifier for tenant-scoped assets.
   */
  salonId?: string | null;

  /**
   * Authoritative user identifier for user-scoped or platform assets.
   */
  userId?: string | null;

  /**
   * Functional category of the asset (PROFILE, SALON, STAFF, SERVICE, PRODUCT, GALLERY, DOCUMENT, etc.).
   */
  category?: FileCategory | string;

  /**
   * Optional client-specified logical subfolder (e.g. "avatars", "treatments/hair").
   * Strictly sanitized and isolated within the category namespace.
   */
  folder?: string | null;

  /**
   * Server-validated file extension (e.g. "jpg", "png", "pdf", "mp4").
   */
  extension?: string | null;

  /**
   * Stable logical asset UUID. Generated if omitted.
   */
  assetId?: string | null;

  /**
   * Cryptographically secure random suffix. Generated if omitted.
   */
  randomId?: string | null;

  /**
   * Reference date for UTC year/month partitioning. Defaults to current server UTC time.
   */
  date?: Date;

  /**
   * Explicit flag indicating a platform-level asset (not bound to a salon tenant).
   */
  isPlatform?: boolean;
}

/**
 * Parsed representation of a canonical object key.
 */
export interface ParsedObjectKey {
  scope: 'tenants' | 'users' | 'platform';
  tenantId?: string;
  userId?: string;
  category: string;
  folder?: string;
  year: string;
  month: string;
  assetId: string;
  randomId: string;
  extension?: string;
  filename: string;
}

/**
 * ObjectKeyStrategy — Production-grade, collision-resistant, provider-independent
 * object-key generation and parsing strategy for Cloudflare R2, AWS S3, and Local Storage.
 *
 * Canonical Format:
 *  - Tenant Asset:   tenants/{salonId}/{category}/[folder/]{year}/{month}/{assetId}/{randomId}.{extension}
 *  - User Asset:     users/{userId}/{category}/[folder/]{year}/{month}/{assetId}/{randomId}.{extension}
 *  - Platform Asset: platform/{category}/[folder/]{year}/{month}/{assetId}/{randomId}.{extension}
 */
export class ObjectKeyStrategy {
  public static readonly MAX_FOLDER_LENGTH = 128;
  public static readonly MAX_KEY_LENGTH = 512;
  public static readonly DEFAULT_CATEGORY = 'other';

  /**
   * Generates a canonical, collision-resistant, URL-safe object key.
   */
  public static generate(params: GenerateObjectKeyParams): string {
    const date = params.date ?? new Date();
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    // 1. Normalize Category
    const categorySegment = this.normalizeCategory(params.category);

    // 2. Resolve Scope and Base Prefix
    let scopePrefix: string;
    if (params.salonId && params.salonId.trim().length > 0) {
      const sanitizedTenant = this.sanitizeIdentifier(params.salonId);
      scopePrefix = `tenants/${sanitizedTenant}`;
    } else if (params.isPlatform) {
      scopePrefix = 'platform';
    } else if (params.userId && params.userId.trim().length > 0) {
      const sanitizedUser = this.sanitizeIdentifier(params.userId);
      scopePrefix = `users/${sanitizedUser}`;
    } else {
      scopePrefix = 'platform';
    }

    // 3. Normalize & Sanitize Subfolder (if any)
    const folderSegment = params.folder ? this.sanitizeSubfolder(params.folder) : null;
    const folderPath = folderSegment ? `${folderSegment}/` : '';

    // 4. Stable Asset UUID & Cryptographic Random Suffix
    const assetId = (params.assetId && params.assetId.trim().length > 0)
      ? params.assetId.trim().toLowerCase()
      : randomUUID();

    const randomId = (params.randomId && params.randomId.trim().length > 0)
      ? params.randomId.trim().toLowerCase()
      : randomBytes(6).toString('hex'); // 12 hex chars

    // 5. Sanitize Extension
    const cleanExt = this.sanitizeExtension(params.extension);
    const extSuffix = cleanExt ? `.${cleanExt}` : '';

    const filename = `${randomId}${extSuffix}`;

    // 6. Assemble Full Canonical Path
    const rawKey = `${scopePrefix}/${categorySegment}/${folderPath}${year}/${month}/${assetId}/${filename}`;

    // 7. Security & Format Assertion
    if (rawKey.length > this.MAX_KEY_LENGTH) {
      throw new BadRequestException(
        `Generated object key length (${rawKey.length}) exceeds maximum limit of ${this.MAX_KEY_LENGTH} characters.`,
      );
    }

    return StorageSecurityUtil.assertSafeObjectKey(rawKey);
  }

  /**
   * Parses a canonical object key into its structural components.
   * Returns null if the key does not conform to the canonical partition structure.
   */
  public static parse(objectKey: string): ParsedObjectKey | null {
    if (!objectKey || typeof objectKey !== 'string') {
      return null;
    }

    const normalized = objectKey.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
    const segments = normalized.split('/');

    if (segments.length < 6) {
      return null; // At minimum: scope/tenant_or_category/category_or_year/year/month/assetId/filename
    }

    const scope = segments[0];
    if (scope !== 'tenants' && scope !== 'users' && scope !== 'platform') {
      return null;
    }

    try {
      if (scope === 'tenants') {
        const tenantId = segments[1];
        const category = segments[2];
        // Segments between category and year/month/assetId/filename are folder segments
        // The last 4 segments are: year, month, assetId, filename
        const filename = segments[segments.length - 1];
        const assetId = segments[segments.length - 2];
        const month = segments[segments.length - 3];
        const year = segments[segments.length - 4];

        const folderSegments = segments.slice(3, segments.length - 4);
        const folder = folderSegments.length > 0 ? folderSegments.join('/') : undefined;

        const extDot = filename.lastIndexOf('.');
        const extension = extDot > 0 ? filename.slice(extDot + 1) : undefined;
        const randomId = extDot > 0 ? filename.slice(0, extDot) : filename;

        return {
          scope: 'tenants',
          tenantId,
          category,
          folder,
          year,
          month,
          assetId,
          randomId,
          extension,
          filename,
        };
      }

      if (scope === 'users') {
        const userId = segments[1];
        const category = segments[2];
        const filename = segments[segments.length - 1];
        const assetId = segments[segments.length - 2];
        const month = segments[segments.length - 3];
        const year = segments[segments.length - 4];

        const folderSegments = segments.slice(3, segments.length - 4);
        const folder = folderSegments.length > 0 ? folderSegments.join('/') : undefined;

        const extDot = filename.lastIndexOf('.');
        const extension = extDot > 0 ? filename.slice(extDot + 1) : undefined;
        const randomId = extDot > 0 ? filename.slice(0, extDot) : filename;

        return {
          scope: 'users',
          userId,
          category,
          folder,
          year,
          month,
          assetId,
          randomId,
          extension,
          filename,
        };
      }

      if (scope === 'platform') {
        const category = segments[1];
        const filename = segments[segments.length - 1];
        const assetId = segments[segments.length - 2];
        const month = segments[segments.length - 3];
        const year = segments[segments.length - 4];

        const folderSegments = segments.slice(2, segments.length - 4);
        const folder = folderSegments.length > 0 ? folderSegments.join('/') : undefined;

        const extDot = filename.lastIndexOf('.');
        const extension = extDot > 0 ? filename.slice(extDot + 1) : undefined;
        const randomId = extDot > 0 ? filename.slice(0, extDot) : filename;

        return {
          scope: 'platform',
          category,
          folder,
          year,
          month,
          assetId,
          randomId,
          extension,
          filename,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Validates whether an object key adheres to the canonical partition format.
   */
  public static isCanonical(objectKey: string): boolean {
    return this.parse(objectKey) !== null;
  }

  /**
   * Returns the prefix used for tenant-level object listing in storage buckets.
   */
  public static getTenantPrefix(salonId: string, category?: FileCategory | string): string {
    const cleanTenant = this.sanitizeIdentifier(salonId);
    if (category) {
      const cleanCategory = this.normalizeCategory(category);
      return `tenants/${cleanTenant}/${cleanCategory}/`;
    }
    return `tenants/${cleanTenant}/`;
  }

  /**
   * Returns the prefix used for platform-level object listing.
   */
  public static getPlatformPrefix(category?: FileCategory | string): string {
    if (category) {
      const cleanCategory = this.normalizeCategory(category);
      return `platform/${cleanCategory}/`;
    }
    return 'platform/';
  }

  /**
   * Returns the prefix used for user-scoped object listing.
   */
  public static getUserPrefix(userId: string, category?: FileCategory | string): string {
    const cleanUser = this.sanitizeIdentifier(userId);
    if (category) {
      const cleanCategory = this.normalizeCategory(category);
      return `users/${cleanUser}/${cleanCategory}/`;
    }
    return `users/${cleanUser}/`;
  }

  /**
   * Sanitizes a client-provided subfolder:
   * - Enforces relative path only (no leading/trailing slashes).
   * - Rejects path traversal (`..`, `.`).
   * - Rejects absolute paths, Windows drive letters, null bytes, and control characters.
   * - Restricts characters to URL-safe alphanumeric, hyphen, underscore, and slash.
   */
  public static sanitizeSubfolder(folder: string): string {
    if (!folder || typeof folder !== 'string') {
      return '';
    }

    const trimmed = folder.trim();
    if (trimmed.length === 0) {
      return '';
    }

    if (trimmed.length > this.MAX_FOLDER_LENGTH) {
      throw new BadRequestException(
        `Folder path length exceeds maximum limit of ${this.MAX_FOLDER_LENGTH} characters.`,
      );
    }

    // Check for null bytes or control characters
    if (trimmed.includes('\0') || /%00/i.test(trimmed) || /[\x00-\x1F\x7F]/.test(trimmed)) {
      throw new BadRequestException('Folder path contains illegal null bytes or control characters.');
    }

    // Check for root escape or Windows drive letters
    if (trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[a-zA-Z]:/.test(trimmed)) {
      throw new BadRequestException('Folder path must be relative and cannot start with root slash or drive letter.');
    }

    // Convert whitespace to hyphens and normalize slashes
    const normalized = trimmed
      .replace(/\s+/g, '-')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();

    const parts = normalized.split('/');

    for (const part of parts) {
      if (part === '..' || part === '.') {
        throw new BadRequestException('Folder path contains directory traversal sequences ("..").');
      }

      // Restrict characters: alphanumeric, hyphen, underscore
      if (!/^[a-z0-9_-]+$/.test(part)) {
        throw new BadRequestException(
          `Folder segment "${part}" contains invalid characters. Only alphanumeric, hyphen, and underscore are allowed.`,
        );
      }
    }

    return normalized;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private static normalizeCategory(category?: FileCategory | string | null): string {
    if (!category) {
      return this.DEFAULT_CATEGORY;
    }

    const str = String(category).trim().toLowerCase();
    const validCategories = Object.values(FileCategory).map((c) => c.toLowerCase());

    if (validCategories.includes(str)) {
      return str;
    }

    return this.DEFAULT_CATEGORY;
  }

  private static sanitizeIdentifier(id: string): string {
    if (!id || typeof id !== 'string') {
      return 'anonymous';
    }

    const clean = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return clean.length > 0 ? clean : 'anonymous';
  }

  private static sanitizeExtension(ext?: string | null): string {
    if (!ext || typeof ext !== 'string') {
      return '';
    }

    const clean = ext.trim().toLowerCase().replace(/^\.+/, '').replace(/[^a-z0-9]/g, '');
    return clean.slice(0, 10); // Clamp extension length
  }
}
