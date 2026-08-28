import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { FileCategory, FileVisibility, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  FileAssetAuditAction,
  FileAssetAuditOutcome,
} from '../constants/file-asset-audit.constants';
import {
  FileAssetAuditQueryDto,
  FileAssetAuditRecord,
} from '../dto/file-asset-audit.dto';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import {
  FileAssetCategoryChangedEvent,
  FileAssetCreatedEvent,
  FileAssetDeletedEvent,
  FileAssetDownloadUrlGeneratedEvent,
  FileAssetFailedEvent,
  FileAssetMetadataUpdatedEvent,
  FileAssetReadyEvent,
  FileAssetRestoredEvent,
  FileAssetSecurityValidationFailedEvent,
  FileAssetUploadedEvent,
  FileAssetVisibilityChangedEvent,
} from '../events/file-asset.events';
import { FileAssetAuditSanitizer } from '../utils/file-asset-audit-sanitizer.util';

/**
 * FileAssetAuditService — Dedicated audit trail coordinator and domain event integration
 * for the File & Media Storage Engine.
 *
 * Responsibilities:
 *  - Enforces authoritative actor and tenant context (anti-spoofing)
 *  - Sanitizes all audit metadata (strips secrets, credentials, binary buffers, CRLF)
 *  - Standardizes audit actions and outcomes (SUCCESS, FAILURE, DENIED)
 *  - Dispatches strongly typed domain events via EventBusService
 *  - Provides tenant-isolated, paginated audit query capabilities
 */
@Injectable()
export class FileAssetAuditService {
  private readonly logger = new Logger(FileAssetAuditService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  // ─── Direct Audit Logging Methods ──────────────────────────────────────────

  /**
   * Records an upload initiation audit entry.
   */
  public async logUploadInitiated(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    category: FileCategory;
    mimeType: string;
    originalFileName: string;
    isPresigned: boolean;
    folder?: string | null;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      category: params.category,
      mimeType: params.mimeType,
      originalFileName: params.originalFileName,
      isPresigned: params.isPresigned,
      folder: params.folder,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.UPLOAD_INITIATED,
      newState: sanitizedDetails ?? undefined,
    });
  }

  /**
   * Records a successful upload completion and publishes FileAssetUploadedEvent.
   */
  public async logUploadCompleted(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    sizeBytes: number;
    mimeType: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      sizeBytes: params.sizeBytes,
      mimeType: params.mimeType,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.UPLOAD_COMPLETED,
      newState: sanitizedDetails ?? undefined,
    });

    // Publish domain event
    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetUploadedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            uploadedByUserId: params.actor.userId,
            objectKey: params.objectKey,
            sizeBytes: params.sizeBytes,
            mimeType: params.mimeType,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records an upload rejection due to validation failure.
   */
  public async logUploadRejected(params: {
    actor: FileAssetActorContext;
    fileName: string;
    mimeType?: string;
    reason: string;
    category?: FileCategory;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      fileName: params.fileName,
      mimeType: params.mimeType,
      reason: params.reason,
      category: params.category,
      outcome: FileAssetAuditOutcome.FAILURE,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: 'unassigned-upload',
      action: FileAssetAuditAction.UPLOAD_REJECTED,
      newState: sanitizedDetails ?? undefined,
    });
  }

  /**
   * Records upload finalization and publishes FileAssetReadyEvent.
   */
  public async logUploadFinalized(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    sizeBytes: number;
    mimeType: string;
    checksum?: string | null;
    visibility: FileVisibility;
    category: FileCategory;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      sizeBytes: params.sizeBytes,
      mimeType: params.mimeType,
      checksum: params.checksum,
      visibility: params.visibility,
      category: params.category,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.UPLOAD_FINALIZED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetReadyEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            uploadedByUserId: params.actor.userId,
            objectKey: params.objectKey,
            sizeBytes: params.sizeBytes,
            mimeType: params.mimeType,
            checksum: params.checksum,
            visibility: params.visibility,
            category: params.category,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records upload failure and publishes FileAssetFailedEvent.
   */
  public async logUploadFailed(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    reason: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      reason: params.reason,
      outcome: FileAssetAuditOutcome.FAILURE,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.UPLOAD_FAILED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetFailedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            objectKey: params.objectKey,
            reason: params.reason,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records download URL generation and publishes FileAssetDownloadUrlGeneratedEvent.
   */
  public async logDownloadUrlGenerated(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    expiresInSeconds: number;
    isAttachment: boolean;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      expiresInSeconds: params.expiresInSeconds,
      isAttachment: params.isAttachment,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.DOWNLOAD_URL_GENERATED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetDownloadUrlGeneratedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            requestedByUserId: params.actor.userId,
            objectKey: params.objectKey,
            expiresInSeconds: params.expiresInSeconds,
            isAttachment: params.isAttachment,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records download completion.
   */
  public async logDownloadCompleted(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
    sizeBytes?: number;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      sizeBytes: params.sizeBytes,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.DOWNLOAD_COMPLETED,
      newState: sanitizedDetails ?? undefined,
    });
  }

  /**
   * Records download failure.
   */
  public async logDownloadFailed(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    reason: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      reason: params.reason,
      outcome: FileAssetAuditOutcome.FAILURE,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.DOWNLOAD_FAILED,
      newState: sanitizedDetails ?? undefined,
    });
  }

  /**
   * Records asset metadata update and publishes FileAssetMetadataUpdatedEvent.
   */
  public async logMetadataUpdated(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    previousMetadata?: Record<string, unknown> | null;
    newMetadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const sanitizedPrev = FileAssetAuditSanitizer.sanitizeMetadata(params.previousMetadata);
    const sanitizedNew = FileAssetAuditSanitizer.sanitizeMetadata(params.newMetadata);

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.METADATA_UPDATED,
      previousState: sanitizedPrev ?? undefined,
      newState: {
        ...(sanitizedNew ?? {}),
        outcome: FileAssetAuditOutcome.SUCCESS,
        salonId: params.actor.salonId,
      },
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetMetadataUpdatedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            updatedByUserId: params.actor.userId,
            updatedFields: sanitizedNew ?? {},
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records visibility change and publishes FileAssetVisibilityChangedEvent.
   */
  public async logVisibilityChanged(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    previousVisibility: FileVisibility;
    newVisibility: FileVisibility;
  }): Promise<void> {
    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.VISIBILITY_CHANGED,
      previousState: { visibility: params.previousVisibility },
      newState: {
        visibility: params.newVisibility,
        outcome: FileAssetAuditOutcome.SUCCESS,
        salonId: params.actor.salonId,
      },
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetVisibilityChangedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            previousVisibility: params.previousVisibility,
            newVisibility: params.newVisibility,
            changedByUserId: params.actor.userId,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records category change and publishes FileAssetCategoryChangedEvent.
   */
  public async logCategoryChanged(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    previousCategory: FileCategory;
    newCategory: FileCategory;
  }): Promise<void> {
    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.CATEGORY_CHANGED,
      previousState: { category: params.previousCategory },
      newState: {
        category: params.newCategory,
        outcome: FileAssetAuditOutcome.SUCCESS,
        salonId: params.actor.salonId,
      },
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetCategoryChangedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            previousCategory: params.previousCategory,
            newCategory: params.newCategory,
            changedByUserId: params.actor.userId,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records soft deletion and publishes FileAssetDeletedEvent.
   */
  public async logFileDeleted(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.FILE_DELETED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetDeletedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            deletedByUserId: params.actor.userId,
            objectKey: params.objectKey,
            deletedAt: new Date(),
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records asset restoration and publishes FileAssetRestoredEvent.
   */
  public async logFileRestored(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    objectKey: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      objectKey: params.objectKey,
      outcome: FileAssetAuditOutcome.SUCCESS,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.FILE_RESTORED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetRestoredEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            restoredByUserId: params.actor.userId,
            objectKey: params.objectKey,
          },
          params.actor.userId,
        ),
      );
    }
  }

  /**
   * Records access denial (IDOR attempt / permission violation).
   */
  public async logAccessDenied(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    attemptedAction: string;
    reason: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      attemptedAction: params.attemptedAction,
      reason: params.reason,
      outcome: FileAssetAuditOutcome.DENIED,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId,
      action: FileAssetAuditAction.ACCESS_DENIED,
      newState: sanitizedDetails ?? undefined,
    });
  }

  /**
   * Records security validation failure and publishes FileAssetSecurityValidationFailedEvent.
   */
  public async logSecurityValidationFailed(params: {
    actor: FileAssetActorContext;
    fileAssetId?: string;
    reason: string;
    validationType: string;
  }): Promise<void> {
    const sanitizedDetails = FileAssetAuditSanitizer.sanitizeMetadata({
      validationType: params.validationType,
      reason: params.reason,
      outcome: FileAssetAuditOutcome.FAILURE,
      salonId: params.actor.salonId,
    });

    await this.safeAuditLog({
      actor: params.actor,
      fileAssetId: params.fileAssetId || 'security-violation',
      action: FileAssetAuditAction.SECURITY_VALIDATION_FAILED,
      newState: sanitizedDetails ?? undefined,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        new FileAssetSecurityValidationFailedEvent(
          {
            assetId: params.fileAssetId,
            salonId: params.actor.salonId,
            attemptedByUserId: params.actor.userId,
            reason: params.reason,
            validationType: params.validationType,
          },
          params.actor.userId,
        ),
      );
    }
  }

  // ─── Querying Audit Logs (Admin & Tenant Isolated) ─────────────────────────

  /**
   * Retrieves paginated, tenant-isolated File Asset audit history.
   */
  public async getAuditHistory(
    query: FileAssetAuditQueryDto,
    actor: FileAssetActorContext,
  ): Promise<{
    records: FileAssetAuditRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 1. Enforce Tenant Isolation & Authorization Boundary
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isSalonScoped =
      actor.role === UserRole.SALON_OWNER || actor.role === UserRole.SALON_STAFF;

    if (isSalonScoped) {
      if (!actor.salonId) {
        throw new ForbiddenException('Salon context is required to query audit logs.');
      }
      if (query.salonId && query.salonId !== actor.salonId) {
        throw new ForbiddenException('Cross-tenant audit log access is forbidden.');
      }
    } else if (!isSuperAdmin) {
      // Regular customers can only query audits for their own user ID
      if (query.actorId && query.actorId !== actor.userId) {
        throw new ForbiddenException('You are not authorized to view audit logs for other users.');
      }
    }

    // 2. Build Prisma Query Filters
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      entityType: 'FileAsset',
    };

    if (query.fileAssetId) {
      where.entityId = query.fileAssetId;
    }

    if (!isSuperAdmin && !isSalonScoped) {
      where.whoId = actor.userId;
    } else if (query.actorId) {
      where.whoId = query.actorId;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    // 3. Fetch Records and Total Count
    const [rawLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // 4. Transform Records to Safe DTO
    const records: FileAssetAuditRecord[] = rawLogs.map((log) => {
      const parsedNew = (log.newValueJson as Record<string, unknown>) || {};
      const parsedPrev = (log.oldValueJson as Record<string, unknown>) || {};

      return {
        id: log.id,
        whoId: log.whoId,
        role: log.role,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        outcome: (parsedNew.outcome as FileAssetAuditOutcome) || FileAssetAuditOutcome.SUCCESS,
        salonId: (parsedNew.salonId as string) || null,
        details: parsedNew,
        previousState: Object.keys(parsedPrev).length > 0 ? parsedPrev : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      records,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async safeAuditLog(params: {
    actor: FileAssetActorContext;
    fileAssetId: string;
    action: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.log({
        action: params.action,
        entityType: 'FileAsset',
        entityId: params.fileAssetId,
        actorId: params.actor.userId,
        actorRole: params.actor.role,
        previousState: params.previousState,
        newState: params.newState,
      });
    } catch (error: unknown) {
      // Fail-safe: Log error without breaking business operation unless critical
      const message = error instanceof Error ? error.message : 'Audit log write failed';
      this.logger.warn(`Failed to write file asset audit record: ${message}`);
    }
  }
}
