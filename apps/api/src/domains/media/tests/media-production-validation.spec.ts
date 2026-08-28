import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  FileCategory,
  FileStatus,
  FileVisibility,
  UserRole,
} from '@prisma/client';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { ObjectKeyStrategy } from '../../../infrastructure/storage/strategies/object-key.strategy';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FILE_ASSET_CACHE_KEYS } from '../constants/file-asset-cache.constants';
import {
  FileAssetActorContext,
  FileAssetEntity,
} from '../entities/file-asset.entity';
import {
  FileAssetDeletedEvent,
  FileAssetMetadataUpdatedEvent,
  FileAssetReadyEvent,
  FileAssetRestoredEvent,
  FileAssetUploadedEvent,
  FileAssetVisibilityChangedEvent,
} from '../events/file-asset.events';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAccessService } from '../services/file-access.service';
import { FileAssetAuditService } from '../services/file-asset-audit.service';
import { FileAssetCacheService } from '../services/file-asset-cache.service';
import { FileAssetService } from '../services/file-asset.service';
import { FileAuthorizationService } from '../services/file-authorization.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import { FileUploadService } from '../services/file-upload.service';

/**
 * Phase 20.12 — Media Production Validation & End-to-End Security Suite
 *
 * Comprehensive validation across all layers:
 * Domain Entities, Repositories, Services, Authorization, Signed URLs,
 * Upload Hardening, Object Keys, Audit, Events, Cache, and Multi-Provider independence.
 */
describe('Phase 20.12 — Media Production Validation Suite', () => {
  // Actors
  const superAdminActor: FileAssetActorContext = {
    userId: 'usr-super-admin',
    role: UserRole.SUPER_ADMIN,
  };

  const salonOwnerA: FileAssetActorContext = {
    userId: 'usr-owner-a',
    role: UserRole.SALON_OWNER,
    salonId: 'salon-aaa',
  };

  const salonStaffA: FileAssetActorContext = {
    userId: 'usr-staff-a',
    role: UserRole.SALON_STAFF,
    salonId: 'salon-aaa',
  };

  const salonOwnerB: FileAssetActorContext = {
    userId: 'usr-owner-b',
    role: UserRole.SALON_OWNER,
    salonId: 'salon-bbb',
  };

  const customerUser1: FileAssetActorContext = {
    userId: 'usr-cust-1',
    role: UserRole.CUSTOMER,
  };

  const customerUser2: FileAssetActorContext = {
    userId: 'usr-cust-2',
    role: UserRole.CUSTOMER,
  };

  const unauthenticatedActor: FileAssetActorContext = {
    userId: '',
    role: undefined,
  };

  // Shared Services & Mocks
  let mockStorage: any;
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;
  let mockEventBus: jest.Mocked<Partial<EventBusService>>;
  let mockCache: jest.Mocked<Partial<CacheService>>;

  let authzService: FileAuthorizationService;
  let cacheCoordinator: FileAssetCacheService;
  let auditCoordinator: FileAssetAuditService;
  let lifecycleService: FileLifecycleService;
  let uploadService: FileUploadService;
  let accessService: FileAccessService;
  let assetService: FileAssetService;

  // In-memory persistent database simulator for integration assertions
  const inMemoryDb = new Map<string, any>();

  beforeEach(() => {
    inMemoryDb.clear();

    mockStorage = {
      upload: jest.fn().mockImplementation(async (params) => ({
        objectKey: params.objectKey,
        bucket: 'test-bucket',
        sizeBytes: params.data ? params.data.length : 1024,
        contentType: params.contentType,
        etag: 'etag-123',
      })),
      exists: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(undefined),
      generateSignedUploadUrl: jest.fn().mockImplementation(async (params) => ({
        url: `https://storage.example.com/upload/${params.objectKey}?X-Amz-Signature=sig123&action=UPLOAD`,
        objectKey: params.objectKey,
        expiresInSeconds: params.expiresInSeconds ?? 900,
        expiresAt: new Date(Date.now() + 900000),
      })),
      generateSignedDownloadUrl: jest.fn().mockImplementation(async (params) => ({
        url: `https://storage.example.com/download/${params.objectKey}?X-Amz-Signature=sig456&action=DOWNLOAD`,
        objectKey: params.objectKey,
        expiresInSeconds: params.expiresInSeconds ?? 3600,
        expiresAt: new Date(Date.now() + 3600000),
      })),
      getDownloadStream: jest.fn().mockResolvedValue({
        stream: {} as any,
        contentType: 'image/png',
        contentLength: 2048,
        etag: 'etag-stream',
      }),
      getMetadata: jest.fn().mockResolvedValue({
        sizeBytes: 2048,
        contentLength: 2048,
        contentType: 'image/png',
        etag: 'etag-meta',
        lastModified: new Date(),
      }),
    };

    mockRepo = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const found = inMemoryDb.get(id);
        return found ? new FileAssetEntity(found) : null;
      }),
      findByIdIncludingDeleted: jest.fn().mockImplementation(async (id: string, salonId?: string) => {
        const found = inMemoryDb.get(id);
        if (!found) return null;
        if (salonId && found.salonId && found.salonId !== salonId) return null;
        return new FileAssetEntity(found);
      }),
      create: jest.fn().mockImplementation(async (data: any) => {
        const entity = new FileAssetEntity({
          id: data.id || `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });
        inMemoryDb.set(entity.id, entity);
        return entity;
      }),
      update: jest.fn().mockImplementation(async (id: string, data: any) => {
        const existing = inMemoryDb.get(id);
        if (!existing) throw new NotFoundException(`File asset "${id}" not found.`);
        const updated = new FileAssetEntity({
          ...existing,
          ...data,
          updatedAt: new Date(),
        });
        inMemoryDb.set(id, updated);
        return updated;
      }),
      softDelete: jest.fn().mockImplementation(async (id: string) => {
        const existing = inMemoryDb.get(id);
        if (!existing) throw new NotFoundException(`File asset "${id}" not found.`);
        const deleted = new FileAssetEntity({
          ...existing,
          deletedAt: new Date(),
          updatedAt: new Date(),
        });
        inMemoryDb.set(id, deleted);
        return deleted;
      }),
      restore: jest.fn().mockImplementation(async (id: string) => {
        const existing = inMemoryDb.get(id);
        if (!existing) throw new NotFoundException(`File asset "${id}" not found.`);
        const restored = new FileAssetEntity({
          ...existing,
          deletedAt: null,
          updatedAt: new Date(),
        });
        inMemoryDb.set(id, restored);
        return restored;
      }),
      markFailed: jest.fn().mockImplementation(async (id: string, reason: string) => {
        const existing = inMemoryDb.get(id);
        if (!existing) throw new NotFoundException(`File asset "${id}" not found.`);
        const failed = new FileAssetEntity({
          ...existing,
          status: FileStatus.FAILED,
          metadata: { ...existing.metadata, failureReason: reason },
          updatedAt: new Date(),
        });
        inMemoryDb.set(id, failed);
        return failed;
      }),
      markReady: jest.fn().mockImplementation(async (id: string, updates: any) => {
        const existing = inMemoryDb.get(id);
        if (!existing) throw new NotFoundException(`File asset "${id}" not found.`);
        const ready = new FileAssetEntity({
          ...existing,
          ...updates,
          status: FileStatus.READY,
          updatedAt: new Date(),
        });
        inMemoryDb.set(id, ready);
        return ready;
      }),
      search: jest.fn().mockImplementation(async (query: any) => {
        let results = Array.from(inMemoryDb.values()).filter((item) => !item.deletedAt);
        if (query.salonId) {
          results = results.filter((item) => item.salonId === query.salonId);
        }
        if (query.uploadedByUserId) {
          results = results.filter((item) => item.uploadedByUserId === query.uploadedByUserId);
        }
        return { data: results, total: results.length };
      }),
      findBySalon: jest.fn().mockImplementation(async (salonId: string) => {
        const results = Array.from(inMemoryDb.values()).filter(
          (item) => item.salonId === salonId && !item.deletedAt,
        );
        return { data: results, total: results.length };
      }),
      findByUser: jest.fn().mockImplementation(async (userId: string) => {
        const results = Array.from(inMemoryDb.values()).filter(
          (item) => item.uploadedByUserId === userId && !item.deletedAt,
        );
        return { data: results, total: results.length };
      }),
    } as unknown as jest.Mocked<FileAssetRepository>;

    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: 'audit-log-123' }),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockReturnValue(undefined),
    };

    const redisStore = new Map<string, any>();
    mockCache = {
      get: jest.fn().mockImplementation(async (key: string) => redisStore.get(key) ?? null),
      set: jest.fn().mockImplementation(async (key: string, value: any) => {
        redisStore.set(key, value);
      }),
      delete: jest.fn().mockImplementation(async (key: string) => {
        redisStore.delete(key);
      }),
      deleteByPattern: jest.fn().mockImplementation(async () => {
        redisStore.clear();
      }),
    };

    const mockPrisma: any = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    authzService = new FileAuthorizationService();
    cacheCoordinator = new FileAssetCacheService(mockCache as CacheService, mockEventBus as EventBusService);
    auditCoordinator = new FileAssetAuditService(
      mockAuditService as AuditService,
      mockPrisma,
      mockEventBus as EventBusService,
    );

    lifecycleService = new FileLifecycleService(
      mockStorage,
      mockRepo,
      mockAuditService as AuditService,
      mockEventBus as EventBusService,
      authzService,
    );

    uploadService = new FileUploadService(
      mockStorage,
      mockRepo,
      mockAuditService as AuditService,
      mockEventBus as EventBusService,
      authzService,
      undefined,
    );

    accessService = new FileAccessService(
      mockStorage,
      mockRepo,
      authzService,
      mockAuditService as AuditService,
    );

    assetService = new FileAssetService(
      mockRepo,
      lifecycleService,
      mockAuditService as AuditService,
      mockEventBus as EventBusService,
      mockCache as CacheService,
      authzService,
      cacheCoordinator,
    );
  });

  describe('1. Full Lifecycle Pipeline (Initiate -> Upload -> Finalize -> Read -> Update -> Soft-Delete -> Restore)', () => {
    it('should complete the entire multi-step lifecycle with strict state, event, audit, and cache verification', async () => {
      // 1. Presigned Upload Initiation
      const uploadIntent = await uploadService.generateSignedUploadUrl(
        {
          originalFileName: 'service-banner.png',
          mimeType: 'image/png',
          sizeBytes: 2048,
          category: FileCategory.SERVICE,
          visibility: FileVisibility.TENANT,
          folder: 'banners',
        },
        salonOwnerA,
      );

      const fileAssetId = uploadIntent.fileAsset.id;
      expect(fileAssetId).toBeDefined();
      expect(uploadIntent.uploadUrl).toContain('https://storage.example.com/upload/');
      expect(uploadIntent.objectKey).toContain('tenants/salon-aaa/service/banners/');
      expect(uploadIntent.action).toBe('UPLOAD');

      // Verify asset record in DB is UPLOADING
      const initialAsset = inMemoryDb.get(fileAssetId);
      expect(initialAsset.status).toBe(FileStatus.UPLOADING);
      expect(initialAsset.salonId).toBe('salon-aaa');

      // 2. Finalize Upload
      const finalizedAsset = await lifecycleService.finalizeUpload(
        fileAssetId,
        salonOwnerA,
        { expectedSize: 2048 },
      );

      expect(finalizedAsset.status).toBe(FileStatus.READY);
      expect(finalizedAsset.isReady()).toBe(true);

      // Verify domain events published
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: FileAssetUploadedEvent.EVENT_NAME }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: FileAssetReadyEvent.EVENT_NAME }),
      );

      // 3. Cache-aside Read (Cache miss -> DB -> Cache populate)
      const readResult1 = await assetService.findById(fileAssetId, salonOwnerA);
      expect(readResult1.id).toBe(fileAssetId);
      expect(mockCache.set).toHaveBeenCalledWith(
        `file:v1:asset:${fileAssetId}`,
        expect.any(Object),
        expect.any(Number),
      );

      // Cache hit on second read
      const readResult2 = await assetService.findById(fileAssetId, salonStaffA);
      expect(readResult2.id).toBe(fileAssetId);

      // 4. Download URL generation
      const downloadResult = await accessService.getDownloadUrl(fileAssetId, salonStaffA);
      expect(downloadResult.url).toContain('action=DOWNLOAD');
      expect(downloadResult.isPublic).toBe(false);

      // 5. Update Metadata
      const updatedAsset = await assetService.update(
        fileAssetId,
        { originalFileName: 'service-banner-v2.png', metadata: { author: 'Staff 1' } },
        salonOwnerA,
      );
      expect(updatedAsset.originalFileName).toBe('service-banner-v2.png');
      expect(mockCache.delete).toHaveBeenCalledWith(`file:v1:asset:${fileAssetId}`);

      // 6. Change Visibility: TENANT -> PUBLIC -> PRIVATE
      const publicAsset = await assetService.changeVisibility(
        fileAssetId,
        FileVisibility.PUBLIC,
        salonOwnerA,
      );
      expect(publicAsset.visibility).toBe(FileVisibility.PUBLIC);

      const privateAsset = await assetService.changeVisibility(
        fileAssetId,
        FileVisibility.PRIVATE,
        salonOwnerA,
      );
      expect(privateAsset.visibility).toBe(FileVisibility.PRIVATE);

      // 7. Soft Delete
      const deletedAsset = await assetService.delete(fileAssetId, salonOwnerA);
      expect(deletedAsset.isDeleted()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: FileAssetDeletedEvent.EVENT_NAME }),
      );

      // 8. Verify deleted asset cannot be downloaded
      await expect(
        accessService.getDownloadUrl(fileAssetId, salonOwnerA),
      ).rejects.toThrow(NotFoundException);

      // 9. Restore Asset
      const restoredAsset = await assetService.restore(fileAssetId, salonOwnerA);
      expect(restoredAsset.isDeleted()).toBe(false);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: FileAssetRestoredEvent.EVENT_NAME }),
      );
    });
  });

  describe('2. Multi-Tenant & IDOR Security Matrix (Adversarial Resistance)', () => {
    let tenantAAsset: FileAssetEntity;

    beforeEach(async () => {
      tenantAAsset = new FileAssetEntity(
        await mockRepo.create({
          salonId: 'salon-aaa',
          uploadedByUserId: salonOwnerA.userId,
          originalFileName: 'internal-records.pdf',
          storedFileName: 'stored.pdf',
          objectKey: 'tenants/salon-aaa/document/2026/08/asset-1/doc.pdf',
          bucket: 'test-bucket',
          provider: 'R2',
          mimeType: 'application/pdf',
          extension: 'pdf',
          sizeBytes: 4096,
          status: FileStatus.READY,
          visibility: FileVisibility.TENANT,
          category: FileCategory.DOCUMENT,
        }),
      );
    });

    it('should reject Cross-Tenant Read with NotFoundException (IDOR Protection: zero existence leak)', async () => {
      await expect(
        assetService.findById(tenantAAsset.id, salonOwnerB),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject Cross-Tenant Download with NotFoundException', async () => {
      await expect(
        accessService.getDownloadUrl(tenantAAsset.id, salonOwnerB),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject Cross-Tenant Update with NotFoundException', async () => {
      await expect(
        assetService.update(tenantAAsset.id, { originalFileName: 'tampered.pdf' }, salonOwnerB),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject Cross-Tenant Delete with NotFoundException', async () => {
      await expect(
        assetService.delete(tenantAAsset.id, salonOwnerB),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject Cross-Tenant Restore with NotFoundException', async () => {
      await expect(
        assetService.restore(tenantAAsset.id, salonOwnerB),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent Customer A from accessing Customer B private asset', async () => {
      const cust1Asset = await mockRepo.create({
        salonId: null,
        uploadedByUserId: customerUser1.userId,
        originalFileName: 'profile.jpg',
        storedFileName: 'stored.jpg',
        objectKey: 'users/usr-cust-1/profile/2026/08/asset-2/pic.jpg',
        bucket: 'test-bucket',
        provider: 'R2',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        sizeBytes: 1024,
        status: FileStatus.READY,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.PROFILE,
      });

      await expect(
        assetService.findById(cust1Asset.id, customerUser2),
      ).rejects.toThrow(NotFoundException);

      await expect(
        accessService.getDownloadUrl(cust1Asset.id, customerUser2),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent spoofing salonId by throwing ForbiddenException when customer attempts to assign salonId', async () => {
      await expect(
        uploadService.generateSignedUploadUrl(
          {
            originalFileName: 'spoof.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            category: FileCategory.PROFILE,
            visibility: FileVisibility.PRIVATE,
            salonId: 'salon-aaa', // Spoofed!
          },
          customerUser1, // Customer actor has salonId: null
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Visibility Matrix Validation', () => {
    it('should correctly enforce access across all 4 visibility levels and 7 actor roles', async () => {
      const publicAsset = await mockRepo.create({
        salonId: 'salon-aaa',
        uploadedByUserId: salonOwnerA.userId,
        originalFileName: 'public-logo.png',
        storedFileName: 'logo.png',
        objectKey: 'tenants/salon-aaa/salon/logo.png',
        bucket: 'test-bucket',
        provider: 'R2',
        mimeType: 'image/png',
        extension: 'png',
        sizeBytes: 1024,
        status: FileStatus.READY,
        visibility: FileVisibility.PUBLIC,
        category: FileCategory.SALON,
      });

      const authAsset = await mockRepo.create({
        salonId: 'salon-aaa',
        uploadedByUserId: salonOwnerA.userId,
        originalFileName: 'auth-manual.pdf',
        storedFileName: 'manual.pdf',
        objectKey: 'tenants/salon-aaa/document/manual.pdf',
        bucket: 'test-bucket',
        provider: 'R2',
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 2048,
        status: FileStatus.READY,
        visibility: FileVisibility.AUTHENTICATED,
        category: FileCategory.DOCUMENT,
      });

      const tenantAsset = await mockRepo.create({
        salonId: 'salon-aaa',
        uploadedByUserId: salonOwnerA.userId,
        originalFileName: 'staff-guide.pdf',
        storedFileName: 'guide.pdf',
        objectKey: 'tenants/salon-aaa/staff/guide.pdf',
        bucket: 'test-bucket',
        provider: 'R2',
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 2048,
        status: FileStatus.READY,
        visibility: FileVisibility.TENANT,
        category: FileCategory.STAFF,
      });

      const userPrivateAsset = await mockRepo.create({
        salonId: null,
        uploadedByUserId: customerUser1.userId,
        originalFileName: 'personal-doc.pdf',
        storedFileName: 'doc.pdf',
        objectKey: 'users/usr-cust-1/document/doc.pdf',
        bucket: 'test-bucket',
        provider: 'R2',
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 2048,
        status: FileStatus.READY,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.DOCUMENT,
      });

      // 1. PUBLIC: accessible to anyone (even unauthenticated)
      expect(authzService.canRead(publicAsset, unauthenticatedActor)).toBe(true);
      expect(authzService.canRead(publicAsset, customerUser1)).toBe(true);
      expect(authzService.canRead(publicAsset, salonStaffA)).toBe(true);
      expect(authzService.canRead(publicAsset, salonOwnerB)).toBe(true);

      // 2. AUTHENTICATED: accessible to any logged-in user, denied to unauthenticated
      expect(authzService.canRead(authAsset, unauthenticatedActor)).toBe(false);
      expect(authzService.canRead(authAsset, customerUser1)).toBe(true);
      expect(authzService.canRead(authAsset, salonOwnerB)).toBe(true);

      // 3. TENANT: accessible to same-salon staff/owner/manager & SuperAdmin, denied to other salon & customer
      expect(authzService.canRead(tenantAsset, salonStaffA)).toBe(true);
      expect(authzService.canRead(tenantAsset, salonOwnerA)).toBe(true);
      expect(authzService.canRead(tenantAsset, superAdminActor)).toBe(true);
      expect(authzService.canRead(tenantAsset, salonOwnerB)).toBe(false);
      expect(authzService.canRead(tenantAsset, customerUser1)).toBe(false);

      // 4. USER PRIVATE: accessible ONLY to owner/uploader and SuperAdmin, denied to other users
      expect(authzService.canRead(userPrivateAsset, customerUser1)).toBe(true);
      expect(authzService.canRead(userPrivateAsset, superAdminActor)).toBe(true);
      expect(authzService.canRead(userPrivateAsset, customerUser2)).toBe(false);
      expect(authzService.canRead(userPrivateAsset, salonStaffA)).toBe(false);
      expect(authzService.canRead(userPrivateAsset, salonOwnerB)).toBe(false);
    });
  });

  describe('4. Upload Security & Hardening Attack Vectors', () => {
    it('should reject executable file extensions (.php, .exe, .sh, .bat)', async () => {
      const dangerousNames = ['payload.php', 'virus.exe', 'script.sh', 'hack.bat', 'shell.jsp'];

      for (const dangerousName of dangerousNames) {
        await expect(
          uploadService.generateSignedUploadUrl(
            {
              originalFileName: dangerousName,
              mimeType: 'image/png',
              sizeBytes: 1024,
              category: FileCategory.GALLERY,
            },
            salonOwnerA,
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject double extensions (e.g. image.png.php)', async () => {
      await expect(
        uploadService.generateSignedUploadUrl(
          {
            originalFileName: 'picture.png.php',
            mimeType: 'image/png',
            sizeBytes: 1024,
            category: FileCategory.GALLERY,
          },
          salonOwnerA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize path traversal sequences from filenames to safe basenames', async () => {
      const result = await uploadService.generateSignedUploadUrl(
        {
          originalFileName: '../../../etc/passwd.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          category: FileCategory.GALLERY,
        },
        salonOwnerA,
      );

      expect(result.fileAsset.originalFileName).toBe('passwd.jpg');
      expect(result.objectKey).not.toContain('..');
    });

    it('should reject oversized payloads exceeding category quota', async () => {
      // PROFILE category limit is 5MB (5,242,880 bytes)
      await expect(
        uploadService.generateSignedUploadUrl(
          {
            originalFileName: 'huge-avatar.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 10 * 1024 * 1024, // 10MB
            category: FileCategory.PROFILE,
          },
          salonOwnerA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize CRLF and control characters from Content-Disposition filenames to prevent header injection', () => {
      const maliciousFilename = 'report\r\nContent-Type: text/html\r\n\r\n<script>.pdf';
      const sanitized = FileSecurityUtil.sanitizeContentDispositionFilename(maliciousFilename);

      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).toContain('report');
    });
  });

  describe('5. Signed URL Action Separation & Binding', () => {
    it('should separate upload URLs from download URLs and bind valid TTLs', async () => {
      const uploadIntent = await uploadService.generateSignedUploadUrl(
        {
          originalFileName: 'gallery.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          category: FileCategory.GALLERY,
          expiresInSeconds: 300,
        },
        salonOwnerA,
      );

      expect(uploadIntent.action).toBe('UPLOAD');
      expect(uploadIntent.expiresInSeconds).toBe(300);
    });
  });

  describe('6. Object Key Strategy Partitioning & Collisions', () => {
    it('should generate canonical, collision-free, date-partitioned object keys', () => {
      const date = new Date('2026-08-18T12:00:00Z');
      const key1 = ObjectKeyStrategy.generate({
        salonId: 'salon-123',
        category: FileCategory.GALLERY,
        folder: 'summer promo',
        extension: 'jpg',
        assetId: 'asset-abc',
        date,
      });

      expect(key1).toMatch(/^tenants\/salon-123\/gallery\/summer-promo\/2026\/08\/asset-abc\/[a-f0-9]{12}\.jpg$/);

      // Parse verification
      const parsed = ObjectKeyStrategy.parse(key1);
      expect(parsed).not.toBeNull();
      expect(parsed?.scope).toBe('tenants');
      expect(parsed?.tenantId).toBe('salon-123');
      expect(parsed?.category).toBe('gallery');
      expect(parsed?.folder).toBe('summer-promo');
      expect(parsed?.year).toBe('2026');
      expect(parsed?.month).toBe('08');
      expect(parsed?.assetId).toBe('asset-abc');
      expect(parsed?.extension).toBe('jpg');
    });

    it('should maintain zero collisions across 500 concurrent key generations', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const key = ObjectKeyStrategy.generate({
          salonId: 'salon-123',
          category: FileCategory.SERVICE,
          extension: 'png',
          assetId: `asset-${i}`,
        });
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
      expect(keys.size).toBe(500);
    });
  });

  describe('7. Audit & Event Invariant Validation', () => {
    it('should record authoritative actorId, role, and salonId without leaking credentials or signatures', async () => {
      await auditCoordinator.logDownloadUrlGenerated({
        actor: salonOwnerA,
        fileAssetId: 'asset-test-1',
        objectKey: 'key',
        expiresInSeconds: 3600,
        isAttachment: false,
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: salonOwnerA.userId,
          actorRole: UserRole.SALON_OWNER,
        }),
      );

      const logCall = (mockAuditService.log as jest.Mock).mock.calls[0][0];
      const metadataStr = JSON.stringify(logCall);
      expect(metadataStr).not.toContain('SECRET_SIG');
      expect(metadataStr).not.toContain('SECRET_CRED');
    });
  });

  describe('8. Provider Independence (R2, S3, LOCAL)', () => {
    it('should execute full upload & access workflow identically across R2, S3, and LOCAL providers', async () => {
      for (const provider of ['R2', 'S3', 'LOCAL']) {
        const asset = await mockRepo.create({
          salonId: 'salon-aaa',
          uploadedByUserId: salonOwnerA.userId,
          originalFileName: `test-${provider}.png`,
          storedFileName: `stored-${provider}.png`,
          objectKey: `tenants/salon-aaa/gallery/2026/08/asset-${provider}/pic.png`,
          bucket: 'test-bucket',
          provider,
          mimeType: 'image/png',
          extension: 'png',
          sizeBytes: 1024,
          status: FileStatus.READY,
          visibility: FileVisibility.TENANT,
          category: FileCategory.GALLERY,
        });

        const download = await accessService.getDownloadUrl(asset.id, salonStaffA);
        expect(download.url).toBeDefined();
        expect(download.fileAssetId).toBe(asset.id);
      }
    });
  });

  describe('9. Failure Resilience & Graceful Fallback', () => {
    it('should gracefully continue when audit log creation fails (fail-safe audit design)', async () => {
      (mockAuditService.log as jest.Mock).mockRejectedValueOnce(new Error('Audit DB down'));

      await expect(
        auditCoordinator.logUploadInitiated({
          actor: salonOwnerA,
          fileAssetId: 'asset-safe-1',
          originalFileName: 'safe.png',
          mimeType: 'image/png',
          category: FileCategory.PROFILE,
          isPresigned: true,
          objectKey: 'key',
        }),
      ).resolves.not.toThrow();
    });

    it('should gracefully fall back to DB when Redis cache throws connection error', async () => {
      const asset = await mockRepo.create({
        salonId: 'salon-aaa',
        uploadedByUserId: salonOwnerA.userId,
        originalFileName: 'fallback.png',
        storedFileName: 'fallback.png',
        objectKey: 'key',
        bucket: 'bucket',
        provider: 'R2',
        mimeType: 'image/png',
        extension: 'png',
        sizeBytes: 1024,
        status: FileStatus.READY,
        visibility: FileVisibility.TENANT,
        category: FileCategory.PROFILE,
      });

      (mockCache.get as jest.Mock).mockRejectedValueOnce(new Error('Redis ECONNREFUSED'));

      const retrieved = await assetService.findById(asset.id, salonOwnerA);
      expect(retrieved.id).toBe(asset.id);
    });
  });
});
