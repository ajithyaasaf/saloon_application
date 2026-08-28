import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface FileAssetCreatedPayload {
  assetId: string;
  salonId?: string | null;
  uploadedByUserId: string;
  originalFileName: string;
  objectKey: string;
  bucket: string;
  provider: string;
  mimeType: string;
  sizeBytes: number;
  visibility: FileVisibility;
  category: FileCategory;
}

export interface FileAssetUploadedPayload {
  assetId: string;
  salonId?: string | null;
  uploadedByUserId: string;
  objectKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface FileAssetProcessingPayload {
  assetId: string;
  salonId?: string | null;
  objectKey: string;
}

export interface FileAssetReadyPayload {
  assetId: string;
  salonId?: string | null;
  uploadedByUserId: string;
  objectKey: string;
  sizeBytes: number;
  mimeType: string;
  checksum?: string | null;
  visibility: FileVisibility;
  category: FileCategory;
}

export interface FileAssetFailedPayload {
  assetId: string;
  salonId?: string | null;
  objectKey: string;
  reason: string;
}

export interface FileAssetDeletedPayload {
  assetId: string;
  salonId?: string | null;
  deletedByUserId?: string;
  objectKey: string;
  deletedAt: Date;
}

export interface FileAssetRestoredPayload {
  assetId: string;
  salonId?: string | null;
  restoredByUserId?: string;
  objectKey: string;
}

export interface FileAssetMetadataUpdatedPayload {
  assetId: string;
  salonId?: string | null;
  updatedByUserId?: string;
  updatedFields: Record<string, any>;
}

export interface FileAssetVisibilityChangedPayload {
  assetId: string;
  salonId?: string | null;
  previousVisibility: FileVisibility;
  newVisibility: FileVisibility;
  changedByUserId?: string;
}

export interface FileAssetCategoryChangedPayload {
  assetId: string;
  salonId?: string | null;
  previousCategory: FileCategory;
  newCategory: FileCategory;
  changedByUserId?: string;
}

export interface FileAssetDownloadUrlGeneratedPayload {
  assetId: string;
  salonId?: string | null;
  requestedByUserId?: string;
  objectKey: string;
  expiresInSeconds: number;
  isAttachment: boolean;
}

export interface FileAssetSecurityValidationFailedPayload {
  assetId?: string;
  salonId?: string | null;
  attemptedByUserId?: string;
  reason: string;
  validationType: string;
}

// ─── Domain Event Classes ───────────────────────────────────────────────────

export class FileAssetCreatedEvent extends BaseDomainEvent<FileAssetCreatedPayload> {
  static readonly EVENT_NAME = 'file.asset.created.v1';
  constructor(payload: FileAssetCreatedPayload, actorId?: string) {
    super(FileAssetCreatedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetUploadedEvent extends BaseDomainEvent<FileAssetUploadedPayload> {
  static readonly EVENT_NAME = 'file.asset.uploaded.v1';
  constructor(payload: FileAssetUploadedPayload, actorId?: string) {
    super(FileAssetUploadedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetProcessingEvent extends BaseDomainEvent<FileAssetProcessingPayload> {
  static readonly EVENT_NAME = 'file.asset.processing.v1';
  constructor(payload: FileAssetProcessingPayload, actorId?: string) {
    super(FileAssetProcessingEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetReadyEvent extends BaseDomainEvent<FileAssetReadyPayload> {
  static readonly EVENT_NAME = 'file.asset.ready.v1';
  constructor(payload: FileAssetReadyPayload, actorId?: string) {
    super(FileAssetReadyEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetFailedEvent extends BaseDomainEvent<FileAssetFailedPayload> {
  static readonly EVENT_NAME = 'file.asset.failed.v1';
  constructor(payload: FileAssetFailedPayload, actorId?: string) {
    super(FileAssetFailedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetDeletedEvent extends BaseDomainEvent<FileAssetDeletedPayload> {
  static readonly EVENT_NAME = 'file.asset.deleted.v1';
  constructor(payload: FileAssetDeletedPayload, actorId?: string) {
    super(FileAssetDeletedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetRestoredEvent extends BaseDomainEvent<FileAssetRestoredPayload> {
  static readonly EVENT_NAME = 'file.asset.restored.v1';
  constructor(payload: FileAssetRestoredPayload, actorId?: string) {
    super(FileAssetRestoredEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetMetadataUpdatedEvent extends BaseDomainEvent<FileAssetMetadataUpdatedPayload> {
  static readonly EVENT_NAME = 'file.asset.metadata-updated.v1';
  constructor(payload: FileAssetMetadataUpdatedPayload, actorId?: string) {
    super(FileAssetMetadataUpdatedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetVisibilityChangedEvent extends BaseDomainEvent<FileAssetVisibilityChangedPayload> {
  static readonly EVENT_NAME = 'file.asset.visibility-changed.v1';
  constructor(payload: FileAssetVisibilityChangedPayload, actorId?: string) {
    super(FileAssetVisibilityChangedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetCategoryChangedEvent extends BaseDomainEvent<FileAssetCategoryChangedPayload> {
  static readonly EVENT_NAME = 'file.asset.category-changed.v1';
  constructor(payload: FileAssetCategoryChangedPayload, actorId?: string) {
    super(FileAssetCategoryChangedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetDownloadUrlGeneratedEvent extends BaseDomainEvent<FileAssetDownloadUrlGeneratedPayload> {
  static readonly EVENT_NAME = 'file.asset.download-url-generated.v1';
  constructor(payload: FileAssetDownloadUrlGeneratedPayload, actorId?: string) {
    super(FileAssetDownloadUrlGeneratedEvent.EVENT_NAME, payload.assetId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export class FileAssetSecurityValidationFailedEvent extends BaseDomainEvent<FileAssetSecurityValidationFailedPayload> {
  static readonly EVENT_NAME = 'file.asset.security-validation-failed.v1';
  constructor(payload: FileAssetSecurityValidationFailedPayload, actorId?: string) {
    super(
      FileAssetSecurityValidationFailedEvent.EVENT_NAME,
      payload.assetId || 'security-event',
      1,
      payload,
      undefined,
      undefined,
      undefined,
      { actorId },
    );
  }
}
