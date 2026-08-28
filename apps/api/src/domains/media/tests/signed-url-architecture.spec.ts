import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import {
  DEFAULT_DOWNLOAD_TTL_SECONDS,
  DEFAULT_UPLOAD_TTL_SECONDS,
  MAX_SIGNED_URL_TTL_SECONDS,
  MIN_SIGNED_URL_TTL_SECONDS,
} from '../dto/signed-url.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import { FileAccessService } from '../services/file-access.service';
import { FileAuthorizationService } from '../services/file-authorization.service';
import { FileUploadService } from '../services/file-upload.service';

describe('Phase 20.6 — Signed URL Architecture Specification', () => {
  let uploadService: FileUploadService;
  let accessService: FileAccessService;
  let authzService: FileAuthorizationService;
  let mockStorage: any;
  let mockRepo: any;
  let mockAudit: any;
  let mockEventBus: any;

  const tenantASalonId = 'salon-AAA';
  const tenantBSalonId = 'salon-BBB';
  const ownerUserA = 'user-owner-a';
  const staffUserA = 'user-staff-a';
  const customerUserA = 'user-cust-a';
  const ownerUserB = 'user-owner-b';

  const mockBaseAsset = {
    id: 'asset-signed-1',
    salonId: tenantASalonId,
    uploadedByUserId: staffUserA,
    originalFileName: 'service-brochure.pdf',
    storedFileName: 'stored-brochure.pdf',
    objectKey: 'salons/salon-AAA/service/service-brochure.pdf',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 150000,
    checksum: 'mock-checksum-hash',
    status: FileStatus.READY,
    visibility: FileVisibility.TENANT,
    category: FileCategory.SERVICE,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: 'Brochure PDF',
    folder: 'service',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockStorage = {
      providerName: 'R2',
      generateSignedUploadUrl: jest.fn().mockImplementation(async (opts) => {
        const expiresIn = Math.max(
          MIN_SIGNED_URL_TTL_SECONDS,
          Math.min(opts.expiresInSeconds ?? DEFAULT_UPLOAD_TTL_SECONDS, MAX_SIGNED_URL_TTL_SECONDS),
        );
        return {
          url: `https://r2.storage.com/upload/${opts.objectKey}?X-Amz-Expires=${expiresIn}&action=upload`,
          objectKey: opts.objectKey,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          expiresInSeconds: expiresIn,
        };
      }),
      generateSignedDownloadUrl: jest.fn().mockImplementation(async (opts) => {
        const expiresIn = Math.max(
          MIN_SIGNED_URL_TTL_SECONDS,
          Math.min(opts.expiresInSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS, MAX_SIGNED_URL_TTL_SECONDS),
        );
        return {
          url: `https://r2.storage.com/download/${opts.objectKey}?X-Amz-Expires=${expiresIn}&action=download`,
          objectKey: opts.objectKey,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          expiresInSeconds: expiresIn,
        };
      }),
      getPublicUrl: jest.fn().mockImplementation((key) => `https://cdn.saloon.com/${key}`),
      getDownloadStream: jest.fn().mockResolvedValue({
        stream: {} as any,
        contentType: 'application/pdf',
        contentLength: 150000,
      }),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        id: 'new-asset-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })),
      findById: jest.fn().mockResolvedValue(mockBaseAsset),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    authzService = new FileAuthorizationService();

    uploadService = new FileUploadService(
      mockStorage,
      mockRepo,
      mockAudit,
      mockEventBus,
      authzService,
    );

    accessService = new FileAccessService(
      mockStorage,
      mockRepo,
      authzService,
      mockAudit,
    );
  });

  // ─── 1. Upload URL Generation & Security ───────────────────────────────────

  describe('Upload URL Architecture & Security', () => {
    it('1. Generates presigned upload URL with valid parameters and binds objectKey & TTL', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const result = await uploadService.initiatePresignedUpload(
        {
          originalFileName: 'price-list.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 50000,
          category: FileCategory.SERVICE,
          visibility: FileVisibility.TENANT,
          expiresInSeconds: 600,
        },
        actor,
      );

      expect(result.action).toBe('UPLOAD');
      expect(result.uploadUrl).toContain('X-Amz-Expires=600');
      expect(result.uploadUrl).toContain('action=upload');
      expect(result.expiresInSeconds).toBe(600);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.headers?.['Content-Type']).toBe('application/pdf');
      expect(result.fileAsset.status).toBe(FileStatus.UPLOADING);
      expect(result.fileAsset.salonId).toBe(tenantASalonId);
      expect(result.fileAsset.uploadedByUserId).toBe(staffUserA);

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_UPLOAD_INITIATED',
          metadata: expect.objectContaining({
            action: 'UPLOAD',
          }),
        }),
      );
    });

    it('2. Unauthenticated upload URL generation -> throws BadRequestException', async () => {
      const invalidActor: FileAssetActorContext = {
        userId: '',
        role: 'CUSTOMER',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1000,
          },
          invalidActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('2b. Unauthorized upload URL generation -> throws ForbiddenException when actor lacks permission for scope', async () => {
      jest.spyOn(authzService, 'canGenerateSignedUploadUrl').mockReturnValueOnce(false);
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1000,
          },
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. Presigned upload tenant spoofing -> rejects client-provided salonId with ForbiddenException', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'hack.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1000,
            salonId: tenantBSalonId, // Spoofed salonId
          } as any,
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. Presigned upload uploaderId spoofing -> rejects client-provided uploadedByUserId with ForbiddenException', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'hack.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1000,
            uploadedByUserId: 'victim-user-id', // Spoofed uploader
          } as any,
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5. Path traversal in upload folder -> rejects ../ escape with BadRequestException', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'document.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1000,
            folder: '../../../../root/malicious',
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. Unsupported/disallowed MIME type -> rejects with BadRequestException', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'script.sh',
            mimeType: 'application/x-sh',
            sizeBytes: 1000,
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. Exceeding category size limit -> rejects with BadRequestException', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'avatar.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 20 * 1024 * 1024, // 20 MB (PROFILE limit is 5MB)
            category: FileCategory.PROFILE,
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 2. Download URL Generation & Security ─────────────────────────────────

  describe('Download URL Architecture & Security', () => {
    it('8. Generates signed download URL for authorized tenant staff on TENANT asset', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const result = await accessService.getDownloadUrl('asset-signed-1', actor, {
        expiresInSeconds: 1800,
      });

      expect(result.action).toBe('DOWNLOAD');
      expect(result.fileAssetId).toBe('asset-signed-1');
      expect(result.isPublic).toBe(false);
      expect(result.expiresInSeconds).toBe(1800);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.url).toContain('action=download');
      expect(result.url).toContain('X-Amz-Expires=1800');

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_SIGNED_DOWNLOAD_URL_GENERATED',
          entityId: 'asset-signed-1',
          metadata: expect.objectContaining({
            action: 'DOWNLOAD',
            isPublic: false,
            expiresInSeconds: 1800,
          }),
        }),
      );
    });

    it('9. Unauthorized cross-tenant download attempt -> throws NotFoundException (anti-IDOR)', async () => {
      const crossTenantActor: FileAssetActorContext = {
        userId: ownerUserB,
        salonId: tenantBSalonId,
        role: 'SALON_OWNER',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', crossTenantActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('10. Cross-user PRIVATE asset download attempt -> throws NotFoundException (anti-IDOR)', async () => {
      const privateAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.PRIVATE,
        uploadedByUserId: staffUserA,
      };
      mockRepo.findById.mockResolvedValueOnce(privateAsset);

      const customerActor: FileAssetActorContext = {
        userId: customerUserA,
        role: 'CUSTOMER',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', customerActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('11. Deleted asset signed download attempt -> throws NotFoundException', async () => {
      const deletedAsset = {
        ...mockBaseAsset,
        deletedAt: new Date(),
        status: FileStatus.DELETED,
      };
      mockRepo.findById.mockResolvedValueOnce(deletedAsset);

      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('12. UPLOADING asset download attempt -> throws BadRequestException (not ready)', async () => {
      const uploadingAsset = {
        ...mockBaseAsset,
        status: FileStatus.UPLOADING,
      };
      mockRepo.findById.mockResolvedValueOnce(uploadingAsset);

      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('13. PROCESSING asset download attempt -> throws BadRequestException (not ready)', async () => {
      const processingAsset = {
        ...mockBaseAsset,
        status: FileStatus.PROCESSING,
      };
      mockRepo.findById.mockResolvedValueOnce(processingAsset);

      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('14. FAILED asset download attempt -> throws BadRequestException (not ready)', async () => {
      const failedAsset = {
        ...mockBaseAsset,
        status: FileStatus.FAILED,
      };
      mockRepo.findById.mockResolvedValueOnce(failedAsset);

      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      await expect(
        accessService.getDownloadUrl('asset-signed-1', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('15. PUBLIC asset access -> returns public download result with isPublic: true and null expiresInSeconds', async () => {
      const publicAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.PUBLIC,
      };
      mockRepo.findById.mockResolvedValueOnce(publicAsset);

      const customerActor: FileAssetActorContext = {
        userId: customerUserA,
        role: 'CUSTOMER',
      };

      const result = await accessService.getDownloadUrl('asset-signed-1', customerActor);

      expect(result.action).toBe('DOWNLOAD');
      expect(result.isPublic).toBe(true);
      expect(result.expiresInSeconds).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.url).toBeDefined();
    });

    it('16. AUTHENTICATED asset access -> allowed for authenticated users, returns signed URL', async () => {
      const authAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.AUTHENTICATED,
      };
      mockRepo.findById.mockResolvedValueOnce(authAsset);

      const customerActor: FileAssetActorContext = {
        userId: customerUserA,
        role: 'CUSTOMER',
      };

      const result = await accessService.getDownloadUrl('asset-signed-1', customerActor);

      expect(result.action).toBe('DOWNLOAD');
      expect(result.isPublic).toBe(false);
      expect(result.expiresInSeconds).toBe(DEFAULT_DOWNLOAD_TTL_SECONDS);
      expect(result.url).toBeDefined();
    });

    it('17. Public URL getter (getPublicUrl) -> succeeds for PUBLIC ready asset', async () => {
      const publicAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.PUBLIC,
      };
      mockRepo.findById.mockResolvedValueOnce(publicAsset);

      const url = await accessService.getPublicUrl('asset-signed-1');
      expect(url).toBeDefined();
    });

    it('18. Public URL getter (getPublicUrl) -> rejects non-public asset with ForbiddenException', async () => {
      const privateAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.PRIVATE,
      };
      mockRepo.findById.mockResolvedValueOnce(privateAsset);

      await expect(accessService.getPublicUrl('asset-signed-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('19. Public URL getter (getPublicUrl) -> rejects deleted asset with NotFoundException', async () => {
      const deletedPublicAsset = {
        ...mockBaseAsset,
        visibility: FileVisibility.PUBLIC,
        deletedAt: new Date(),
      };
      mockRepo.findById.mockResolvedValueOnce(deletedPublicAsset);

      await expect(accessService.getPublicUrl('asset-signed-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── 3. Expiration & TTL Policy ────────────────────────────────────────────

  describe('Expiration & TTL Bounds Policy', () => {
    it('20. Minimum TTL clamping: requests below 60s are clamped to 60s', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const result = await uploadService.initiatePresignedUpload(
        {
          originalFileName: 'test.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5000,
          expiresInSeconds: 10, // Below 60s minimum
        },
        actor,
      );

      expect(result.expiresInSeconds).toBe(MIN_SIGNED_URL_TTL_SECONDS);
    });

    it('21. Maximum TTL clamping: requests above 86400s are clamped to 86400s', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const result = await uploadService.initiatePresignedUpload(
        {
          originalFileName: 'test.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5000,
          expiresInSeconds: 999999, // Above 24h maximum
        },
        actor,
      );

      expect(result.expiresInSeconds).toBe(MAX_SIGNED_URL_TTL_SECONDS);
    });

    it('22. Default TTL application: applies 900s for upload and 3600s for download', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const uploadResult = await uploadService.initiatePresignedUpload(
        {
          originalFileName: 'test.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5000,
        },
        actor,
      );
      expect(uploadResult.expiresInSeconds).toBe(DEFAULT_UPLOAD_TTL_SECONDS);

      const downloadResult = await accessService.getDownloadUrl('asset-signed-1', actor);
      expect(downloadResult.expiresInSeconds).toBe(DEFAULT_DOWNLOAD_TTL_SECONDS);
    });
  });

  // ─── 4. Action Separation & Concurrency ─────────────────────────────────────

  describe('Action Separation & Concurrency', () => {
    it('23. Upload and Download actions are strictly distinct and tagged', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const upload = await uploadService.initiatePresignedUpload(
        {
          originalFileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1000,
        },
        actor,
      );
      expect(upload.action).toBe('UPLOAD');

      const download = await accessService.getDownloadUrl('asset-signed-1', actor);
      expect(download.action).toBe('DOWNLOAD');
    });

    it('24. Concurrent signed URL requests execute independently without collisions', async () => {
      const actor: FileAssetActorContext = {
        userId: staffUserA,
        salonId: tenantASalonId,
        role: 'SALON_STAFF',
      };

      const requests = Array.from({ length: 10 }, (_, i) =>
        uploadService.initiatePresignedUpload(
          {
            originalFileName: `file-${i}.jpg`,
            mimeType: 'image/jpeg',
            sizeBytes: 1000 + i,
          },
          actor,
        ),
      );

      const results = await Promise.all(requests);
      expect(results).toHaveLength(10);
      const objectKeys = new Set(results.map((r) => r.objectKey));
      expect(objectKeys.size).toBe(10); // All 10 objectKeys are completely unique
    });

    it('25. Sanitization strips internal bucket and provider secrets from returned entity', async () => {
      const actor: FileAssetActorContext = {
        userId: customerUserA,
        role: 'CUSTOMER',
      };

      const raw = { ...mockBaseAsset, visibility: FileVisibility.AUTHENTICATED };
      mockRepo.findById.mockResolvedValueOnce(raw);

      const result = await accessService.getDownloadUrl('asset-signed-1', actor);
      expect(result.fileAssetId).toBe('asset-signed-1');
      expect((result as any).bucket).toBeUndefined();
      expect((result as any).provider).toBeUndefined();
    });
  });
});
