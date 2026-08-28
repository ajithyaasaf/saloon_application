import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileAsset, FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';

/**
 * FileAuthorizationService — Centralized single source of truth for all
 * authorization, IDOR protection, multi-tenant isolation, role-based access control,
 * and visibility rules across the File & Media Storage Engine.
 *
 * All business services and API layers must delegate access decisions to this service.
 */
@Injectable()
export class FileAuthorizationService {
  private readonly logger = new Logger(FileAuthorizationService.name);

  // ─── Core Decision Methods ──────────────────────────────────────────────────

  /**
   * Evaluates whether an actor can view/read the file metadata.
   */
  public canRead(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    const entity = this.toEntity(asset);

    // Deleted assets can only be viewed by administrators
    if (entity.isDeleted()) {
      return this.isAdmin(actor);
    }

    // Platform administrators have global access
    if (this.isAdmin(actor)) {
      return true;
    }

    // Public files in READY status can be accessed by anyone (including unauthenticated)
    if (entity.isPublic() && entity.isReady()) {
      return true;
    }

    // Authenticated files in READY status can be accessed by any authenticated user
    if (
      entity.visibility === FileVisibility.AUTHENTICATED &&
      actor?.userId &&
      entity.isReady()
    ) {
      return true;
    }

    // Tenant-scoped files in READY status can be accessed by users belonging to the same salon
    if (
      entity.isTenantScoped() &&
      entity.salonId &&
      actor?.salonId === entity.salonId &&
      entity.isReady()
    ) {
      return true;
    }

    // Uploader can always read their own assets in any non-deleted lifecycle state
    if (actor?.userId && entity.uploadedByUserId === actor.userId) {
      return true;
    }

    // Salon Owner / Manager / Staff can view salon assets in their salon
    if (
      entity.salonId &&
      actor?.salonId === entity.salonId &&
      this.isSalonStaffOrHigher(actor)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates whether an actor can download / access the binary content of the file.
   */
  public canDownload(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    const entity = this.toEntity(asset);

    // Regular users cannot download incomplete, failed, or deleted files
    if (!this.isAdmin(actor) && !entity.isReady()) {
      return false;
    }

    return this.canRead(entity, actor);
  }

  /**
   * Evaluates whether an actor can modify file metadata, visibility, or category.
   */
  public canModify(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    const entity = this.toEntity(asset);

    if (entity.isDeleted()) {
      return false; // Cannot modify deleted assets; must restore first
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    // Uploader can modify their own files
    if (actor?.userId && entity.uploadedByUserId === actor.userId) {
      return true;
    }

    // Salon Owner / Manager can modify any asset belonging to their salon
    if (
      entity.salonId &&
      actor?.salonId === entity.salonId &&
      this.isSalonOwnerOrManager(actor)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates whether an actor can soft-delete the file asset.
   */
  public canDelete(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    const entity = this.toEntity(asset);

    if (entity.isDeleted()) {
      return false; // Already deleted
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    // Uploader can delete their own uploaded files
    if (actor?.userId && entity.uploadedByUserId === actor.userId) {
      return true;
    }

    // Salon Owner / Manager can delete assets belonging to their salon
    if (
      entity.salonId &&
      actor?.salonId === entity.salonId &&
      this.isSalonOwnerOrManager(actor)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates whether an actor can restore a soft-deleted file asset.
   */
  public canRestore(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    const entity = this.toEntity(asset);

    if (!entity.isDeleted()) {
      return false; // Not deleted
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    // Uploader can restore their own deleted file
    if (actor?.userId && entity.uploadedByUserId === actor.userId) {
      return true;
    }

    // Salon Owner / Manager can restore salon assets
    if (
      entity.salonId &&
      actor?.salonId === entity.salonId &&
      this.isSalonOwnerOrManager(actor)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates whether an actor can change the visibility of an asset.
   */
  public canChangeVisibility(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
    newVisibility: FileVisibility,
  ): boolean {
    const entity = this.toEntity(asset);

    if (!this.canModify(entity, actor)) {
      return false;
    }

    // Making a file PUBLIC is security-sensitive:
    // Requires Admin, Salon Owner/Manager, or Uploader for personal non-tenant assets
    if (newVisibility === FileVisibility.PUBLIC) {
      if (this.isAdmin(actor)) return true;
      if (entity.salonId && actor?.salonId === entity.salonId && this.isSalonOwnerOrManager(actor)) {
        return true;
      }
      if (!entity.salonId && actor?.userId === entity.uploadedByUserId) {
        return true;
      }
      return false;
    }

    // Setting TENANT visibility requires the file to belong to a salon
    if (newVisibility === FileVisibility.TENANT) {
      return !!entity.salonId && actor?.salonId === entity.salonId;
    }

    return true;
  }

  /**
   * Evaluates whether an actor can change the category of an asset.
   */
  public canChangeCategory(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
    newCategory: FileCategory,
  ): boolean {
    return this.canModify(asset, actor);
  }

  /**
   * Evaluates whether an actor is permitted to initialize a signed upload URL.
   */
  public canGenerateSignedUploadUrl(
    actor: FileAssetActorContext,
    targetSalonId?: string | null,
  ): boolean {
    if (!actor?.userId) {
      return false;
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    // If target salon is specified, actor must belong to that salon
    if (targetSalonId) {
      return actor.salonId === targetSalonId;
    }

    return true;
  }

  /**
   * Evaluates whether an actor is permitted to generate a signed download URL.
   */
  public canGenerateSignedDownloadUrl(
    asset: FileAssetEntity | FileAsset,
    actor: FileAssetActorContext,
  ): boolean {
    return this.canDownload(asset, actor);
  }

  // ─── Assertion Helpers (Throws Clean Exceptions) ───────────────────────────

  /**
   * Asserts read permission. Throws NotFoundException on unauthorized access to prevent IDOR existence leaks.
   */
  public assertCanRead(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    resourceId?: string,
  ): FileAssetEntity {
    const id = resourceId ?? (asset as any)?.id ?? 'unknown';

    if (!asset) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    const entity = this.toEntity(asset);
    if (!this.canRead(entity, actor)) {
      // Do NOT leak existence to unauthorized callers
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    return entity;
  }

  /**
   * Asserts download permission. Throws NotFoundException for unauthorized access or BadRequestException if unready.
   */
  public assertCanDownload(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    resourceId?: string,
  ): FileAssetEntity {
    const entity = this.assertCanRead(asset, actor, resourceId);

    if (!this.isAdmin(actor) && !entity.isReady()) {
      throw new BadRequestException(
        `File asset "${entity.id}" is in status "${entity.status}" and not ready for download.`,
      );
    }

    return entity;
  }

  /**
   * Asserts modify permission. Throws NotFoundException if unreadable or ForbiddenException if unauthorized.
   */
  public assertCanModify(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    resourceId?: string,
  ): FileAssetEntity {
    const entity = this.assertCanRead(asset, actor, resourceId);

    if (!this.canModify(entity, actor)) {
      throw new ForbiddenException('Not authorized to modify this file asset.');
    }

    return entity;
  }

  /**
   * Asserts delete permission. Throws NotFoundException if unreadable or ForbiddenException if unauthorized.
   */
  public assertCanDelete(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    resourceId?: string,
  ): FileAssetEntity {
    const entity = this.assertCanRead(asset, actor, resourceId);

    if (!this.canDelete(entity, actor)) {
      throw new ForbiddenException('Not authorized to delete this file asset.');
    }

    return entity;
  }

  /**
   * Asserts restore permission. Throws NotFoundException if unreadable or ForbiddenException if unauthorized.
   */
  public assertCanRestore(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    resourceId?: string,
  ): FileAssetEntity {
    const id = resourceId ?? (asset as any)?.id ?? 'unknown';

    if (!asset) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    const entity = this.toEntity(asset);

    // For restore, the caller must have restore permissions
    if (!this.canRestore(entity, actor)) {
      // If actor doesn't have permissions, return NotFoundException to prevent IDOR leaks
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    return entity;
  }

  /**
   * Asserts visibility change permission.
   */
  public assertCanChangeVisibility(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    newVisibility: FileVisibility,
    resourceId?: string,
  ): FileAssetEntity {
    const entity = this.assertCanModify(asset, actor, resourceId);

    if (!this.canChangeVisibility(entity, actor, newVisibility)) {
      throw new ForbiddenException(
        `Not authorized to change visibility to "${newVisibility}" for this file asset.`,
      );
    }

    return entity;
  }

  /**
   * Asserts category change permission.
   */
  public assertCanChangeCategory(
    asset: FileAssetEntity | FileAsset | null | undefined,
    actor: FileAssetActorContext,
    newCategory: FileCategory,
    resourceId?: string,
  ): FileAssetEntity {
    const entity = this.assertCanModify(asset, actor, resourceId);

    if (!this.canChangeCategory(entity, actor, newCategory)) {
      throw new ForbiddenException(
        `Not authorized to change category to "${newCategory}" for this file asset.`,
      );
    }

    return entity;
  }

  // ─── Tenant & User Spoofing Prevention ─────────────────────────────────────

  /**
   * Resolves the authoritative salonId from authenticated context.
   * Prevents client-supplied tenant spoofing.
   */
  public resolveAuthoritativeSalonId(
    actor: FileAssetActorContext,
    requestedSalonId?: string | null,
  ): string | null {
    if (!actor?.userId) {
      throw new ForbiddenException('Authentication required.');
    }

    // Platform admin can specify any salon or global (null)
    if (this.isAdmin(actor)) {
      return requestedSalonId ?? actor.salonId ?? null;
    }

    // Salon staff / owner MUST use their authenticated salonId
    if (actor.salonId) {
      if (requestedSalonId && requestedSalonId !== actor.salonId) {
        throw new ForbiddenException(
          'Tenant mismatch: client-provided salonId does not match authenticated salon context.',
        );
      }
      return actor.salonId;
    }

    // Customer or user without salonId cannot target a salon directly
    if (requestedSalonId) {
      throw new ForbiddenException(
        'Customers and non-tenant users cannot directly assign salon tenant ownership.',
      );
    }

    return null;
  }

  /**
   * Resolves the authoritative uploadedByUserId from authenticated context.
   * Prevents client-supplied user ownership spoofing.
   */
  public resolveAuthoritativeUploaderId(
    actor: FileAssetActorContext,
    requestedUploaderId?: string | null,
  ): string {
    if (!actor?.userId) {
      throw new ForbiddenException('Authentication required.');
    }

    if (this.isAdmin(actor)) {
      return requestedUploaderId ?? actor.userId;
    }

    if (requestedUploaderId && requestedUploaderId !== actor.userId) {
      throw new ForbiddenException(
        'User spoofing detected: cannot create or upload assets on behalf of another user.',
      );
    }

    return actor.userId;
  }

  // ─── Response Data Sanitization ────────────────────────────────────────────

  /**
   * Strips internal storage infrastructure details from response payloads for non-admin callers.
   */
  public sanitizeResponseData<T extends Partial<FileAsset>>(
    asset: T,
    actor?: FileAssetActorContext,
  ): Partial<T> {
    if (actor && this.isAdmin(actor)) {
      return asset;
    }

    const {
      bucket,
      provider,
      ...safeData
    } = asset as any;

    return safeData as Partial<T>;
  }

  // ─── Helper Predicates ────────────────────────────────────────────────────

  public isAdmin(actor?: FileAssetActorContext): boolean {
    if (!actor?.role) return false;
    const role = actor.role.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  public isSalonOwnerOrManager(actor?: FileAssetActorContext): boolean {
    if (!actor?.role) return false;
    const role = actor.role.toUpperCase();
    return (
      role === 'SALON_OWNER' ||
      role === 'OWNER' ||
      role === 'SALON_MANAGER' ||
      role === 'MANAGER'
    );
  }

  public isSalonStaffOrHigher(actor?: FileAssetActorContext): boolean {
    if (!actor?.role) return false;
    const role = actor.role.toUpperCase();
    return (
      role === 'SALON_OWNER' ||
      role === 'OWNER' ||
      role === 'SALON_MANAGER' ||
      role === 'MANAGER' ||
      role === 'SALON_STAFF' ||
      role === 'STAFF'
    );
  }

  private toEntity(asset: FileAssetEntity | FileAsset): FileAssetEntity {
    return asset instanceof FileAssetEntity ? asset : new FileAssetEntity(asset);
  }
}
