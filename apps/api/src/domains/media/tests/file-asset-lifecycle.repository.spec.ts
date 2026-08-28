import { BadRequestException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Lifecycle State Machine & Invariants', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const baseAsset = {
    id: 'asset-lifecycle-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'gallery-interior.jpg',
    storedFileName: 'stored-interior.jpg',
    objectKey: 'salons/salon-1/gallery/interior.jpg',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 100000,
    checksum: 'hash-xyz',
    status: FileStatus.UPLOADING,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.GALLERY,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: null,
    folder: 'gallery',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockDb = {
      fileAsset: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new FileAssetRepository(mockDb as unknown as PrismaService);
  });

  describe('Valid Lifecycle Transitions', () => {
    it('should transition from UPLOADING -> UPLOADED via markUploaded', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(baseAsset);
      const updated = { ...baseAsset, status: FileStatus.UPLOADED };
      mockDb.fileAsset.update.mockResolvedValueOnce(updated);

      const result = await repository.markUploaded('asset-lifecycle-1');
      expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-lifecycle-1' },
        data: { status: FileStatus.UPLOADED },
      });
      expect(result.status).toBe(FileStatus.UPLOADED);
    });

    it('should transition from UPLOADED -> PROCESSING via markProcessing', async () => {
      const uploadedAsset = { ...baseAsset, status: FileStatus.UPLOADED };
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(uploadedAsset);
      const processingAsset = { ...baseAsset, status: FileStatus.PROCESSING };
      mockDb.fileAsset.update.mockResolvedValueOnce(processingAsset);

      const result = await repository.markProcessing('asset-lifecycle-1');
      expect(result.status).toBe(FileStatus.PROCESSING);
    });

    it('should transition from PROCESSING -> READY via markReady with metadata', async () => {
      const processingAsset = { ...baseAsset, status: FileStatus.PROCESSING };
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(processingAsset);
      const readyAsset = {
        ...baseAsset,
        status: FileStatus.READY,
        width: 1920,
        height: 1080,
      };
      mockDb.fileAsset.update.mockResolvedValueOnce(readyAsset);

      const result = await repository.markReady('asset-lifecycle-1', {
        width: 1920,
        height: 1080,
      });

      expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-lifecycle-1' },
        data: expect.objectContaining({
          status: FileStatus.READY,
          width: 1920,
          height: 1080,
        }),
      });
      expect(result.status).toBe(FileStatus.READY);
    });

    it('should transition from UPLOADING -> FAILED via markFailed with failure reason', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(baseAsset);
      const failedAsset = {
        ...baseAsset,
        status: FileStatus.FAILED,
        metadata: { failureReason: 'Upload timeout' },
      };
      mockDb.fileAsset.update.mockResolvedValueOnce(failedAsset);

      const result = await repository.markFailed(
        'asset-lifecycle-1',
        'Upload timeout',
      );

      expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-lifecycle-1' },
        data: {
          status: FileStatus.FAILED,
          metadata: expect.objectContaining({ failureReason: 'Upload timeout' }),
        },
      });
      expect(result.status).toBe(FileStatus.FAILED);
    });
  });

  describe('Invalid Lifecycle Transitions (State Invariants)', () => {
    it('should reject invalid transition from UPLOADING directly to READY without UPLOADED/PROCESSING', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(baseAsset); // UPLOADING

      await expect(
        repository.updateStatus('asset-lifecycle-1', FileStatus.READY),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition from PROCESSING directly to UPLOADING', async () => {
      const processing = { ...baseAsset, status: FileStatus.PROCESSING };
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(processing);

      await expect(
        repository.updateStatus('asset-lifecycle-1', FileStatus.UPLOADING),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition from READY to UPLOADING', async () => {
      const ready = { ...baseAsset, status: FileStatus.READY };
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(ready);

      await expect(
        repository.updateStatus('asset-lifecycle-1', FileStatus.UPLOADING),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
