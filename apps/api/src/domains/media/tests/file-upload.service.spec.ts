import { BadRequestException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileUploadService } from '../services/file-upload.service';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let mockStorage: jest.Mocked<IStorageProvider>;
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  beforeEach(() => {
    mockStorage = {
      providerName: 'R2',
      bucket: 'saloon-test-bucket',
      publicUrl: 'https://cdn.saloon.test',
      upload: jest.fn().mockResolvedValue({
        provider: 'R2',
        bucket: 'saloon-test-bucket',
        objectKey: 'salons/s1/profile/file.jpg',
        sizeBytes: 1024,
        contentType: 'image/jpeg',
      }),
      generateSignedUploadUrl: jest.fn().mockResolvedValue({
        url: 'https://upload.r2.com/signed-url',
        expiresInSeconds: 900,
        provider: 'R2',
        bucket: 'saloon-test-bucket',
        objectKey: 'salons/s1/profile/file.jpg',
      }),
      generateSignedDownloadUrl: jest.fn(),
      download: jest.fn(),
      getDownloadStream: jest.fn(),
      uploadStream: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      exists: jest.fn(),
      getMetadata: jest.fn(),
      copy: jest.fn(),
      move: jest.fn(),
    } as any;

    mockRepo = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'asset-created-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }),
      ),
      objectKeyExists: jest.fn().mockResolvedValue(false),
    } as any;

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new FileUploadService(
      mockStorage,
      mockRepo,
      mockAudit,
      mockEventBus,
    );
  });

  describe('initiatePresignedUpload', () => {
    it('should validate metadata, generate secure key, persist UPLOADING record, and return presigned URL', async () => {
      const result = await service.initiatePresignedUpload(
        {
          originalFileName: 'profile-pic.png',
          mimeType: 'image/png',
          sizeBytes: 2 * 1024 * 1024, // 2MB
          category: FileCategory.PROFILE,
          visibility: FileVisibility.PUBLIC,
        },
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          salonId: 'salon-1',
          uploadedByUserId: 'user-1',
          originalFileName: 'profile-pic.png',
          mimeType: 'image/png',
          status: FileStatus.UPLOADING,
          visibility: FileVisibility.PUBLIC,
          category: FileCategory.PROFILE,
        }),
      );

      expect(mockStorage.generateSignedUploadUrl).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_UPLOAD_INITIATED',
        }),
      );

      expect(result.uploadUrl).toBe('https://upload.r2.com/signed-url');
      expect(result.fileAsset.status).toBe(FileStatus.UPLOADING);
    });

    it('should reject unsupported MIME types', async () => {
      await expect(
        service.initiatePresignedUpload(
          {
            originalFileName: 'malware.exe',
            mimeType: 'application/x-msdownload',
            sizeBytes: 1024,
          },
          { userId: 'user-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file sizes exceeding category limits', async () => {
      await expect(
        service.initiatePresignedUpload(
          {
            originalFileName: 'huge-profile.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 10 * 1024 * 1024, // 10MB exceeds Profile 5MB limit
            category: FileCategory.PROFILE,
          },
          { userId: 'user-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require authenticated actor context', async () => {
      await expect(
        service.initiatePresignedUpload(
          {
            originalFileName: 'file.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          },
          { userId: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadDirect', () => {
    it('should upload buffer directly to storage and persist READY record', async () => {
      const buffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00,
        0x48, 0x00, 0x48, 0x00, 0x00,
      ]);

      const result = await service.uploadDirect(
        {
          buffer,
          originalFileName: 'service-hair.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: buffer.length,
          category: FileCategory.SERVICE,
          visibility: FileVisibility.PUBLIC,
        },
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
      );

      expect(mockStorage.upload).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: FileStatus.READY,
          category: FileCategory.SERVICE,
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_UPLOADED',
        }),
      );
      expect(result.status).toBe(FileStatus.READY);
    });
  });
});
