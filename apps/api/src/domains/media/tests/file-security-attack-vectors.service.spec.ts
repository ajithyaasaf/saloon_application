import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAccessService } from '../services/file-access.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import { FileUploadService } from '../services/file-upload.service';

describe('File & Media Domain - Security & Attack Vector Validation', () => {
  let uploadService: FileUploadService;
  let accessService: FileAccessService;
  let lifecycleService: FileLifecycleService;
  let mockStorage: jest.Mocked<IStorageProvider>;
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const tenantAAsset = {
    id: 'asset-tenant-a',
    salonId: 'salon-A',
    uploadedByUserId: 'user-a',
    originalFileName: 'confidential.pdf',
    storedFileName: 'stored-confidential.pdf',
    objectKey: 'salons/salon-A/documents/confidential.pdf',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 10000,
    checksum: null,
    status: FileStatus.READY,
    visibility: FileVisibility.TENANT,
    category: FileCategory.DOCUMENT,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: null,
    folder: 'documents',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockStorage = {
      providerName: 'R2',
      bucket: 'saloon-assets',
      upload: jest.fn(),
      generateSignedUploadUrl: jest.fn().mockResolvedValue({
        url: 'https://upload.r2.com/signed',
        expiresInSeconds: 900,
        provider: 'R2',
        bucket: 'saloon-assets',
        objectKey: 'salons/salon-A/documents/test.pdf',
      }),
      generateSignedDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://download.r2.com/signed',
        expiresInSeconds: 3600,
        provider: 'R2',
        bucket: 'saloon-assets',
        objectKey: 'salons/salon-A/documents/test.pdf',
      }),
      exists: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn().mockResolvedValue({
        provider: 'R2',
        bucket: 'saloon-assets',
        objectKey: 'salons/salon-A/documents/test.pdf',
        sizeBytes: 10000,
        contentType: 'application/pdf',
        lastModified: new Date(),
      }),
    } as any;

    mockRepo = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ id: 'new-id', ...data }),
      ),
      findById: jest.fn().mockResolvedValue(tenantAAsset),
      findByIdIncludingDeleted: jest.fn().mockResolvedValue(tenantAAsset),
      softDelete: jest.fn(),
      restore: jest.fn(),
      markReady: jest.fn(),
      markFailed: jest.fn(),
      objectKeyExists: jest.fn().mockResolvedValue(false),
    } as any;

    mockAudit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) } as any;

    uploadService = new FileUploadService(mockStorage, mockRepo, mockAudit, mockEventBus);
    accessService = new FileAccessService(mockStorage, mockRepo);
    lifecycleService = new FileLifecycleService(mockStorage, mockRepo, mockAudit, mockEventBus);
  });

  it('Attack Vector 1: Cross-Tenant Download Access -> Rejected with NotFoundException', async () => {
    // Salon B user tries to access Salon A asset
    await expect(
      accessService.getDownloadUrl('asset-tenant-a', {
        userId: 'user-b',
        salonId: 'salon-B',
        role: 'STAFF',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Attack Vector 2: Cross-Tenant Deletion -> Rejected with NotFoundException (IDOR safety)', async () => {
    // Salon B owner tries to softDelete Salon A asset
    await expect(
      lifecycleService.softDelete('asset-tenant-a', {
        userId: 'owner-b',
        salonId: 'salon-B',
        role: 'OWNER',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Attack Vector 3: Cross-Tenant Restoration -> Rejected with NotFoundException (IDOR safety)', async () => {
    // Salon B owner tries to restore Salon A asset
    await expect(
      lifecycleService.restore('asset-tenant-a', {
        userId: 'owner-b',
        salonId: 'salon-B',
        role: 'OWNER',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Attack Vector 4: Path Traversal in Upload Folder -> Rejected with BadRequestException', async () => {
    await expect(
      uploadService.initiatePresignedUpload(
        {
          originalFileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 5000,
          folder: '../../../root/escape',
        },
        { userId: 'user-1', salonId: 'salon-1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Attack Vector 5: Unsupported Executable MIME Type Upload -> Rejected with BadRequestException', async () => {
    await expect(
      uploadService.initiatePresignedUpload(
        {
          originalFileName: 'payload.sh',
          mimeType: 'application/x-sh',
          sizeBytes: 200,
        },
        { userId: 'user-1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Attack Vector 6: Accessing Incomplete / Non-Ready Asset -> Rejected with BadRequestException', async () => {
    const uploadingAsset = { ...tenantAAsset, status: FileStatus.UPLOADING };
    mockRepo.findById.mockResolvedValueOnce(uploadingAsset);

    await expect(
      accessService.getDownloadUrl('asset-tenant-a', {
        userId: 'user-a',
        salonId: 'salon-A',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Attack Vector 7: Public URL Request on Private File -> Rejected with ForbiddenException', async () => {
    const privateAsset = { ...tenantAAsset, visibility: FileVisibility.PRIVATE };
    mockRepo.findById.mockResolvedValueOnce(privateAsset);

    await expect(accessService.getPublicUrl('asset-tenant-a')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('Attack Vector 8: Presigned Upload Tenant Spoofing -> Rejected with ForbiddenException', async () => {
    // Staff in salon-A attempts to specify salon-B in payload
    await expect(
      uploadService.initiatePresignedUpload(
        {
          originalFileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 5000,
          salonId: 'salon-B',
        } as any,
        { userId: 'user-a', salonId: 'salon-A', role: 'SALON_STAFF' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Attack Vector 9: Presigned Upload User Identity Spoofing -> Rejected with ForbiddenException', async () => {
    // Customer user-1 attempts to specify victim user-2 in payload
    await expect(
      uploadService.initiatePresignedUpload(
        {
          originalFileName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5000,
          uploadedByUserId: 'victim-user-2',
        } as any,
        { userId: 'user-1', role: 'CUSTOMER' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Attack Vector 10: Customer Unauthorized Deletion of Salon Document -> Rejected with NotFoundException (IDOR safety)', async () => {
    // Customer tries to delete salon document
    await expect(
      lifecycleService.softDelete('asset-tenant-a', {
        userId: 'customer-1',
        role: 'CUSTOMER',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Attack Vector 11: Cross-User Private Download Stream -> Rejected with NotFoundException', async () => {
    const privateUserAsset = {
      ...tenantAAsset,
      salonId: null,
      uploadedByUserId: 'user-alice',
      visibility: FileVisibility.PRIVATE,
    };
    mockRepo.findById.mockResolvedValueOnce(privateUserAsset);

    await expect(
      accessService.downloadStream('asset-tenant-a', {
        userId: 'user-bob',
        role: 'CUSTOMER',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
