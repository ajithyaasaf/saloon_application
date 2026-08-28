import { BadRequestException } from '@nestjs/common';
import { FileAsset, FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { ALLOWED_FILE_STATUS_TRANSITIONS } from '../dto/file-asset.dto';

export interface FileAssetActorContext {
  userId: string;
  salonId?: string | null;
  role?: string;
}

/**
 * FileAssetEntity — Rich Domain Entity encapsulating business invariants,
 * lifecycle state machine, access control rules, and metadata integrity.
 */
export class FileAssetEntity {
  id: string;
  salonId?: string | null;
  uploadedByUserId: string;
  originalFileName: string;
  storedFileName: string;
  objectKey: string;
  bucket: string;
  provider: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum?: string | null;
  status: FileStatus;
  visibility: FileVisibility;
  category: FileCategory;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: Record<string, any> | null;
  altText?: string | null;
  folder?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<FileAsset> | Partial<FileAssetEntity>) {
    Object.assign(this, partial);
    this.provider = partial.provider ?? 'R2';
    this.status = partial.status ?? FileStatus.UPLOADING;
    this.visibility = partial.visibility ?? FileVisibility.PRIVATE;
    this.category = partial.category ?? FileCategory.OTHER;
    this.createdAt = partial.createdAt ? new Date(partial.createdAt) : new Date();
    this.updatedAt = partial.updatedAt ? new Date(partial.updatedAt) : new Date();
    this.deletedAt = partial.deletedAt ? new Date(partial.deletedAt) : null;
  }

  // ─── Status & State Query Invariants ─────────────────────────────────────

  public isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  public isReady(): boolean {
    return this.status === FileStatus.READY && !this.isDeleted();
  }

  public isProcessing(): boolean {
    return this.status === FileStatus.PROCESSING && !this.isDeleted();
  }

  public isUploading(): boolean {
    return this.status === FileStatus.UPLOADING && !this.isDeleted();
  }

  public isFailed(): boolean {
    return this.status === FileStatus.FAILED;
  }

  public isPublic(): boolean {
    return this.visibility === FileVisibility.PUBLIC;
  }

  public isPrivate(): boolean {
    return this.visibility === FileVisibility.PRIVATE;
  }

  public isTenantScoped(): boolean {
    return this.visibility === FileVisibility.TENANT;
  }

  // ─── Lifecycle Mutations ──────────────────────────────────────────────────

  public markUploaded(): void {
    this.transitionTo(FileStatus.UPLOADED);
  }

  public startProcessing(): void {
    this.transitionTo(FileStatus.PROCESSING);
  }

  public markReady(metadata?: {
    sizeBytes?: number;
    checksum?: string | null;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    metadata?: Record<string, any> | null;
    altText?: string | null;
  }): void {
    this.transitionTo(FileStatus.READY);

    if (metadata) {
      if (metadata.sizeBytes !== undefined) this.sizeBytes = metadata.sizeBytes;
      if (metadata.checksum !== undefined) this.checksum = metadata.checksum;
      if (metadata.width !== undefined) this.width = metadata.width;
      if (metadata.height !== undefined) this.height = metadata.height;
      if (metadata.duration !== undefined) this.duration = metadata.duration;
      if (metadata.altText !== undefined) this.altText = metadata.altText;
      if (metadata.metadata !== undefined) {
        this.metadata = {
          ...((this.metadata as Record<string, any>) ?? {}),
          ...(metadata.metadata ?? {}),
        };
      }
    }
  }

  public markFailed(reason: string): void {
    this.transitionTo(FileStatus.FAILED);
    const existing = (this.metadata as Record<string, any>) ?? {};
    this.metadata = {
      ...existing,
      failureReason: reason,
      failedAt: new Date().toISOString(),
    };
  }

  public softDelete(date = new Date()): void {
    this.transitionTo(FileStatus.DELETED);
    this.deletedAt = date;
  }

  public restore(): void {
    if (!this.isDeleted()) {
      return;
    }
    this.deletedAt = null;
    this.status = FileStatus.READY;
  }

  public updateMetadata(data: {
    originalFileName?: string;
    altText?: string | null;
    folder?: string | null;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    metadata?: Record<string, any> | null;
  }): void {
    if (this.isDeleted()) {
      throw new BadRequestException('Cannot update metadata of a deleted file asset.');
    }

    if (data.originalFileName !== undefined) this.originalFileName = data.originalFileName;
    if (data.altText !== undefined) this.altText = data.altText;
    if (data.folder !== undefined) this.folder = data.folder;
    if (data.width !== undefined) this.width = data.width;
    if (data.height !== undefined) this.height = data.height;
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.metadata !== undefined) {
      this.metadata = {
        ...((this.metadata as Record<string, any>) ?? {}),
        ...(data.metadata ?? {}),
      };
    }
  }

  public changeVisibility(newVisibility: FileVisibility): void {
    if (this.isDeleted()) {
      throw new BadRequestException('Cannot change visibility of a deleted file asset.');
    }
    this.visibility = newVisibility;
  }

  public changeCategory(newCategory: FileCategory): void {
    if (this.isDeleted()) {
      throw new BadRequestException('Cannot change category of a deleted file asset.');
    }
    this.category = newCategory;
  }

  // ─── Access Control Rules ─────────────────────────────────────────────────

  public canAccess(actor: FileAssetActorContext): boolean {
    if (this.isDeleted()) {
      return this.isAdmin(actor);
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    if (this.isPublic() && this.isReady()) {
      return true;
    }

    if (this.visibility === FileVisibility.AUTHENTICATED && actor.userId && this.isReady()) {
      return true;
    }

    if (
      this.isTenantScoped() &&
      this.salonId &&
      actor.salonId === this.salonId &&
      this.isReady()
    ) {
      return true;
    }

    if (this.uploadedByUserId === actor.userId) {
      return true;
    }

    if (
      this.salonId &&
      actor.salonId === this.salonId &&
      (actor.role === 'OWNER' || actor.role === 'MANAGER' || actor.role === 'STAFF')
    ) {
      return true;
    }

    return false;
  }

  public canModify(actor: FileAssetActorContext): boolean {
    if (this.isDeleted()) {
      return false;
    }

    if (this.isAdmin(actor)) {
      return true;
    }

    if (this.uploadedByUserId === actor.userId) {
      return true;
    }

    if (
      this.salonId &&
      actor.salonId === this.salonId &&
      (actor.role === 'OWNER' || actor.role === 'MANAGER')
    ) {
      return true;
    }

    return false;
  }

  public canDelete(actor: FileAssetActorContext): boolean {
    return this.canModify(actor);
  }

  public canRestore(actor: FileAssetActorContext): boolean {
    if (this.isAdmin(actor)) {
      return true;
    }

    if (this.uploadedByUserId === actor.userId) {
      return true;
    }

    if (
      this.salonId &&
      actor.salonId === this.salonId &&
      (actor.role === 'OWNER' || actor.role === 'MANAGER')
    ) {
      return true;
    }

    return false;
  }

  private isAdmin(actor: FileAssetActorContext): boolean {
    return actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN';
  }

  private transitionTo(next: FileStatus): void {
    if (this.status === next) {
      return;
    }

    const allowed = ALLOWED_FILE_STATUS_TRANSITIONS[this.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid FileAsset status transition: cannot change from "${this.status}" to "${next}".`,
      );
    }

    this.status = next;
  }
}
