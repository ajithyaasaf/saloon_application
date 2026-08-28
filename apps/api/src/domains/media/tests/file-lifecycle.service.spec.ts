import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileLifecycleService } from '../services/file-lifecycle.service';

describe('FileLifecycleService', () => {
  let service: FileLifecycleService;
  let mockStorage: jest.Mocked<IStorageProvider>;
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const mockUploadingAsset = {
    id: 'asset-life-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'service.jpg',
    storedFileName: 'stored-service.jpg',
    objectKey: 'salons/salon-1/service/service.jpg',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 15000,
    checksum: null,
    status: FileStatus.UPLOADING,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.SERVICE,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: null,
    folder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockStorage = {
      providerName: 'R2',
      exists: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn().mockResolvedValue({
        objectKey: 'salons/salon-1/service/service.jpg',
        sizeBytes: 15000,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      }),
    } as any;

    mockRepo = {
      findById: jest.fn().mockResolvedValue(mockUploadingAsset),
      findByIdIncludingDeleted: jest.fn(),
      markReady: jest.fn().mockImplementation((id, meta) =>
        Promise.resolve({
          ...mockUploadingAsset,
          status: FileStatus.READY,
          ...meta,
        }),
      ),
      markProcessing: jest.fn().mockImplementation((id) =>
        Promise.resolve({
          ...mockUploadingAsset,
          status: FileStatus.PROCESSING,
        }),
      ),
      markFailed: jest.fn().mockImplementation((id, reason) =>
        Promise.resolve({
          ...mockUploadingAsset,
          status: FileStatus.FAILED,
          metadata: { failureReason: reason },
        }),
      ),
      softDelete: jest.fn().mockImplementation((id) =>
        Promise.resolve({
          ...mockUploadingAsset,
          status: FileStatus.DELETED,
          deletedAt: new Date(),
        }),
      ),
      restore: jest.fn().mockImplementation((id) =>
        Promise.resolve({
          ...mockUploadingAsset,
          status: FileStatus.READY,
          deletedAt: null,
        }),
      ),
    } as any;

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new FileLifecycleService(
      mockStorage,
      mockRepo,
      mockAudit,
      mockEventBus,
    );
  });

  describe('finalizeUpload', () => {
    it('should verify storage object exists, update metadata, mark READY, and emit events', async () => {
      const result = await service.finalizeUpload(
        'asset-life-1',
        { userId: 'user-1', salonId: 'salon-1' },
        { expectedSize: 15000 },
      );

      expect(mockStorage.exists).toHaveBeenCalledWith(mockUploadingAsset.objectKey);
      expect(mockStorage.getMetadata).toHaveBeenCalledWith(mockUploadingAsset.objectKey);
      expect(mockRepo.markReady).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_FINALIZED',
        }),
      );
      expect(result.status).toBe(FileStatus.READY);
    });

    it('should throw BadRequestException and mark FAILED if physical object does not exist', async () => {
      mockStorage.exists.mockResolvedValueOnce(false);

      await expect(
        service.finalizeUpload('asset-life-1', { userId: 'user-1', salonId: 'salon-1' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.markFailed).toHaveBeenCalled();
    });

    it('should throw BadRequestException and mark FAILED if size does not match expectedSize', async () => {
      mockStorage.getMetadata.mockResolvedValueOnce({
        objectKey: mockUploadingAsset.objectKey,
        sizeBytes: 99999, // Mismatched size
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      await expect(
        service.finalizeUpload(
          'asset-life-1',
          { userId: 'user-1', salonId: 'salon-1' },
          { expectedSize: 15000 },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.markFailed).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should soft delete asset when authorized', async () => {
      const result = await service.softDelete('asset-life-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });

      expect(mockRepo.softDelete).toHaveBeenCalledWith('asset-life-1', 'salon-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_DELETED',
        }),
      );
      expect(result.status).toBe(FileStatus.DELETED);
    });

    it('should throw ForbiddenException if actor cannot delete', async () => {
      await expect(
        service.softDelete('asset-life-1', {
          userId: 'staff-2',
          salonId: 'salon-1',
          role: 'SALON_STAFF',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted asset after verifying physical object existence', async () => {
      const deletedAsset = {
        ...mockUploadingAsset,
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      };
      mockRepo.findByIdIncludingDeleted.mockResolvedValueOnce(deletedAsset);

      const result = await service.restore('asset-life-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });

      expect(mockStorage.exists).toHaveBeenCalledWith(deletedAsset.objectKey);
      expect(mockRepo.restore).toHaveBeenCalledWith('asset-life-1', 'salon-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_RESTORED',
        }),
      );
      expect(result.status).toBe(FileStatus.READY);
    });

    it('should throw BadRequestException if physical object in storage is permanently missing on restore', async () => {
      const deletedAsset = {
        ...mockUploadingAsset,
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      };
      mockRepo.findByIdIncludingDeleted.mockResolvedValueOnce(deletedAsset);
      mockStorage.exists.mockResolvedValueOnce(false); // Storage object missing

      await expect(
        service.restore('asset-life-1', {
          userId: 'user-1',
          salonId: 'salon-1',
          role: 'OWNER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
