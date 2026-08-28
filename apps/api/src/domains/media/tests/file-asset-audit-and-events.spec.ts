import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileCategory, FileVisibility, UserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  FileAssetAuditAction,
  FileAssetAuditOutcome,
} from '../constants/file-asset-audit.constants';
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
import { FileAssetAuditService } from '../services/file-asset-audit.service';
import { FileAssetAuditSanitizer } from '../utils/file-asset-audit-sanitizer.util';

describe('Phase 20.10 — File Asset Audit & Events Suite', () => {
  let service: FileAssetAuditService;
  let auditServiceMock: { log: jest.Mock };
  let eventBusMock: { publish: jest.Mock };
  let prismaMock: {
    auditLog: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const actorSalonOwner: FileAssetActorContext = {
    userId: '11111111-1111-4111-8111-111111111111',
    role: UserRole.SALON_OWNER,
    salonId: '22222222-2222-4222-8222-222222222222',
  };

  const actorSuperAdmin: FileAssetActorContext = {
    userId: '33333333-3333-4333-8333-333333333333',
    role: UserRole.SUPER_ADMIN,
    salonId: null,
  };

  const actorCustomer: FileAssetActorContext = {
    userId: '44444444-4444-4444-8444-444444444444',
    role: UserRole.CUSTOMER,
    salonId: null,
  };

  beforeEach(() => {
    auditServiceMock = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    eventBusMock = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    prismaMock = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new FileAssetAuditService(
      auditServiceMock as unknown as AuditService,
      prismaMock as unknown as PrismaService,
      eventBusMock as unknown as EventBusService,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Audit Identity & Anti-Spoofing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Audit Identity & Anti-Spoofing', () => {
    it('should always bind authoritative actorId, role, and salonId to audit log', async () => {
      await service.logUploadInitiated({
        actor: actorSalonOwner,
        fileAssetId: 'asset-1',
        objectKey: 'tenants/salon-1/profile/a.jpg',
        category: FileCategory.PROFILE,
        mimeType: 'image/jpeg',
        originalFileName: 'avatar.jpg',
        isPresigned: true,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.UPLOAD_INITIATED,
          entityType: 'FileAsset',
          entityId: 'asset-1',
          actorId: actorSalonOwner.userId,
          actorRole: UserRole.SALON_OWNER,
          newState: expect.objectContaining({
            salonId: actorSalonOwner.salonId,
            outcome: FileAssetAuditOutcome.SUCCESS,
          }),
        }),
      );
    });

    it('should record null salonId for platform-level assets without leaking tenant context', async () => {
      await service.logUploadInitiated({
        actor: actorSuperAdmin,
        fileAssetId: 'asset-plat-1',
        objectKey: 'platform/marketing/banner.png',
        category: FileCategory.MARKETING,
        mimeType: 'image/png',
        originalFileName: 'banner.png',
        isPresigned: false,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: actorSuperAdmin.userId,
          actorRole: UserRole.SUPER_ADMIN,
        }),
      );
      const logCall = auditServiceMock.log.mock.calls[0][0];
      expect(logCall.newState.salonId).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Sensitive Data Protection & Sanitizer
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Sensitive Data Protection & Sanitizer', () => {
    it('should strip passwords, secrets, apiKeys, and auth tokens from metadata', () => {
      const rawMetadata = {
        description: 'Store logo',
        password: 'SuperSecretPassword123!',
        apiKey: 'sk-live-123456789',
        bearerToken: 'Bearer eyJhbGciOi...',
        authHeader: 'Basic YWRtaW46cGFzc3dvcmQ=',
        safeField: 'active',
      };

      const sanitized = FileAssetAuditSanitizer.sanitizeMetadata(rawMetadata);

      expect(sanitized).toEqual({
        description: 'Store logo',
        safeField: 'active',
      });
      expect(sanitized?.password).toBeUndefined();
      expect(sanitized?.apiKey).toBeUndefined();
      expect(sanitized?.bearerToken).toBeUndefined();
    });

    it('should strip AWS/R2 presigned query parameters from URLs', () => {
      const signedUrl =
        'https://r2.storage.com/bucket/avatar.jpg?X-Amz-Signature=abcd1234ef5678&X-Amz-Credential=AKIA...&token=secret123';

      const sanitizedUrl = FileAssetAuditSanitizer.sanitizeUrl(signedUrl);

      expect(sanitizedUrl).toBe('https://r2.storage.com/bucket/avatar.jpg');
      expect(sanitizedUrl).not.toContain('X-Amz-Signature');
      expect(sanitizedUrl).not.toContain('token=');
    });

    it('should strip binary buffer payloads from metadata', () => {
      const metadata = {
        fileInfo: 'binary upload',
        filePayload: Buffer.from('malicious or large payload'),
      };

      const sanitized = FileAssetAuditSanitizer.sanitizeMetadata(metadata);

      expect(sanitized?.filePayload).toBe('[BINARY_BUFFER_OMITTED]');
    });

    it('should neutralize CRLF and control characters in string fields to prevent log injection', () => {
      const maliciousInput = 'admin_action\r\n[CRITICAL] System compromised!\n\tAdditional log line';
      const sanitized = FileAssetAuditSanitizer.sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).not.toContain('\t');
      expect(sanitized).toContain('admin_action  [CRITICAL] System compromised!  Additional log line');
    });

    it('should enforce depth and key count bounds on nested metadata', () => {
      const deepObject = {
        l1: {
          l2: {
            l3: {
              l4: {
                tooDeep: 'value',
              },
            },
          },
        },
      };

      const sanitized = FileAssetAuditSanitizer.sanitizeMetadata(deepObject);
      expect((sanitized as any)?.l1?.l2?.l3).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. File Operations Lifecycle Auditing & Domain Events
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. File Operations Lifecycle Auditing & Domain Events', () => {
    it('should log UPLOAD_COMPLETED and publish FileAssetUploadedEvent', async () => {
      await service.logUploadCompleted({
        actor: actorSalonOwner,
        fileAssetId: 'asset-10',
        objectKey: 'tenants/s-1/gallery/photo.jpg',
        sizeBytes: 102400,
        mimeType: 'image/jpeg',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.UPLOAD_COMPLETED,
          entityId: 'asset-10',
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetUploadedEvent),
      );
    });

    it('should log UPLOAD_FINALIZED and publish FileAssetReadyEvent', async () => {
      await service.logUploadFinalized({
        actor: actorSalonOwner,
        fileAssetId: 'asset-20',
        objectKey: 'tenants/s-1/gallery/final.png',
        sizeBytes: 204800,
        mimeType: 'image/png',
        checksum: 'abc123sha256',
        visibility: FileVisibility.PUBLIC,
        category: FileCategory.GALLERY,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.UPLOAD_FINALIZED,
          entityId: 'asset-20',
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetReadyEvent),
      );
    });

    it('should log UPLOAD_FAILED and publish FileAssetFailedEvent', async () => {
      await service.logUploadFailed({
        actor: actorSalonOwner,
        fileAssetId: 'asset-30',
        objectKey: 'tenants/s-1/doc/corrupt.pdf',
        reason: 'Zero byte file detected',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.UPLOAD_FAILED,
          entityId: 'asset-30',
          newState: expect.objectContaining({
            outcome: FileAssetAuditOutcome.FAILURE,
            reason: 'Zero byte file detected',
          }),
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetFailedEvent),
      );
    });

    it('should log DOWNLOAD_URL_GENERATED and publish FileAssetDownloadUrlGeneratedEvent', async () => {
      await service.logDownloadUrlGenerated({
        actor: actorSalonOwner,
        fileAssetId: 'asset-40',
        objectKey: 'tenants/s-1/service/brochure.pdf',
        expiresInSeconds: 3600,
        isAttachment: true,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.DOWNLOAD_URL_GENERATED,
          entityId: 'asset-40',
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetDownloadUrlGeneratedEvent),
      );
    });

    it('should log FILE_DELETED and publish FileAssetDeletedEvent', async () => {
      await service.logFileDeleted({
        actor: actorSalonOwner,
        fileAssetId: 'asset-50',
        objectKey: 'tenants/s-1/gallery/deleted.jpg',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.FILE_DELETED,
          entityId: 'asset-50',
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetDeletedEvent),
      );
    });

    it('should log FILE_RESTORED and publish FileAssetRestoredEvent', async () => {
      await service.logFileRestored({
        actor: actorSalonOwner,
        fileAssetId: 'asset-60',
        objectKey: 'tenants/s-1/gallery/restored.jpg',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.FILE_RESTORED,
          entityId: 'asset-60',
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetRestoredEvent),
      );
    });

    it('should log VISIBILITY_CHANGED and publish FileAssetVisibilityChangedEvent', async () => {
      await service.logVisibilityChanged({
        actor: actorSalonOwner,
        fileAssetId: 'asset-70',
        previousVisibility: FileVisibility.PRIVATE,
        newVisibility: FileVisibility.PUBLIC,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.VISIBILITY_CHANGED,
          previousState: { visibility: FileVisibility.PRIVATE },
          newState: expect.objectContaining({ visibility: FileVisibility.PUBLIC }),
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetVisibilityChangedEvent),
      );
    });

    it('should log CATEGORY_CHANGED and publish FileAssetCategoryChangedEvent', async () => {
      await service.logCategoryChanged({
        actor: actorSalonOwner,
        fileAssetId: 'asset-80',
        previousCategory: FileCategory.TEMPORARY,
        newCategory: FileCategory.GALLERY,
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.CATEGORY_CHANGED,
          previousState: { category: FileCategory.TEMPORARY },
          newState: expect.objectContaining({ category: FileCategory.GALLERY }),
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetCategoryChangedEvent),
      );
    });

    it('should log METADATA_UPDATED and publish FileAssetMetadataUpdatedEvent', async () => {
      await service.logMetadataUpdated({
        actor: actorSalonOwner,
        fileAssetId: 'asset-90',
        previousMetadata: { tag: 'spring' },
        newMetadata: { tag: 'summer', featured: true },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.METADATA_UPDATED,
          previousState: { tag: 'spring' },
          newState: expect.objectContaining({ tag: 'summer', featured: true }),
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetMetadataUpdatedEvent),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Security Events & Access Denials
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Security Events & Access Denials', () => {
    it('should log ACCESS_DENIED with DENIED outcome on unauthorized asset access', async () => {
      await service.logAccessDenied({
        actor: actorCustomer,
        fileAssetId: 'asset-secret-100',
        attemptedAction: 'DOWNLOAD',
        reason: 'Cross-tenant access forbidden',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.ACCESS_DENIED,
          entityId: 'asset-secret-100',
          newState: expect.objectContaining({
            attemptedAction: 'DOWNLOAD',
            reason: 'Cross-tenant access forbidden',
            outcome: FileAssetAuditOutcome.DENIED,
          }),
        }),
      );
    });

    it('should log SECURITY_VALIDATION_FAILED and publish FileAssetSecurityValidationFailedEvent', async () => {
      await service.logSecurityValidationFailed({
        actor: actorCustomer,
        fileAssetId: 'malicious-upload-1',
        reason: 'Windows PE executable disguised as JPG',
        validationType: 'MAGIC_BYTE_MISMATCH',
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: FileAssetAuditAction.SECURITY_VALIDATION_FAILED,
          newState: expect.objectContaining({
            outcome: FileAssetAuditOutcome.FAILURE,
            reason: 'Windows PE executable disguised as JPG',
            validationType: 'MAGIC_BYTE_MISMATCH',
          }),
        }),
      );

      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.any(FileAssetSecurityValidationFailedEvent),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Multi-Tenant Isolated Audit History Querying
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. Multi-Tenant Isolated Audit History Querying', () => {
    it('should allow Super Admin to query platform-wide audit history', async () => {
      prismaMock.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          whoId: actorSalonOwner.userId,
          role: UserRole.SALON_OWNER,
          action: 'CREATE',
          entityType: 'FileAsset',
          entityId: 'asset-1',
          newValueJson: { outcome: FileAssetAuditOutcome.SUCCESS, salonId: 'salon-1' },
          oldValueJson: null,
          createdAt: new Date(),
        },
      ]);
      prismaMock.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditHistory(
        { page: 1, limit: 10 },
        actorSuperAdmin,
      );

      expect(result.total).toBe(1);
      expect(result.records.length).toBe(1);
      expect(result.records[0].entityId).toBe('asset-1');
      expect(prismaMock.auditLog.findMany).toHaveBeenCalled();
    });

    it('should prevent Salon Owner from querying audit logs of another salon (Cross-Tenant Violation)', async () => {
      await expect(
        service.getAuditHistory(
          { salonId: 'different-salon-33333' },
          actorSalonOwner,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should restrict Regular Customer to their own audit records', async () => {
      await expect(
        service.getAuditHistory(
          { actorId: 'other-user-9999' },
          actorCustomer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should clamp pagination parameters safely (page >= 1, limit <= 100)', async () => {
      prismaMock.auditLog.findMany.mockResolvedValue([]);
      prismaMock.auditLog.count.mockResolvedValue(0);

      const result = await service.getAuditHistory(
        { page: -5, limit: 500 },
        actorSuperAdmin,
      );

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Domain Event Integrity & Contract
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. Domain Event Integrity & Contract', () => {
    it('should generate unique event IDs, valid ISO timestamp, and positive version', () => {
      const event1 = new FileAssetCreatedEvent({
        assetId: 'asset-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'test.jpg',
        objectKey: 'tenants/s1/p.jpg',
        bucket: 'assets',
        provider: 'R2',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.PROFILE,
      });

      const event2 = new FileAssetCreatedEvent({
        assetId: 'asset-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'test.jpg',
        objectKey: 'tenants/s1/p.jpg',
        bucket: 'assets',
        provider: 'R2',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.PROFILE,
      });

      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
      expect(event1.version).toBe(1);
      expect(event1.eventName).toBe('file.asset.created.v1');
      expect(new Date(event1.timestamp).toISOString()).toBe(event1.timestamp);
    });
  });
});
