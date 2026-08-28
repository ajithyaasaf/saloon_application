import { NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Failure & Edge Error Handling', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

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

  it('should throw NotFoundException when marking non-existent asset as failed', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.markFailed('missing-asset', 'Virus detected'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when marking non-existent asset as ready', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(repository.markReady('missing-asset')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when marking non-existent asset as uploaded', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(repository.markUploaded('missing-asset')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when marking non-existent asset as processing', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(repository.markProcessing('missing-asset')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should store failure timestamp and reason in metadata on markFailed', async () => {
    const uploadingAsset = {
      id: 'asset-failed-1',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'corrupted.bin',
      storedFileName: 'stored-corrupted.bin',
      objectKey: 'salons/salon-1/corrupted.bin',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'application/octet-stream',
      extension: 'bin',
      sizeBytes: 100,
      checksum: null,
      status: FileStatus.UPLOADING,
      visibility: FileVisibility.PRIVATE,
      category: FileCategory.OTHER,
      width: null,
      height: null,
      duration: null,
      metadata: { originalMeta: 'test' },
      altText: null,
      folder: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    mockDb.fileAsset.findFirst.mockResolvedValueOnce(uploadingAsset);
    mockDb.fileAsset.update.mockResolvedValueOnce({
      ...uploadingAsset,
      status: FileStatus.FAILED,
      metadata: {
        originalMeta: 'test',
        failureReason: 'Corrupted payload',
        failedAt: '2026-08-18T10:00:00.000Z',
      },
    });

    const result = await repository.markFailed(
      'asset-failed-1',
      'Corrupted payload',
    );

    expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-failed-1' },
      data: {
        status: FileStatus.FAILED,
        metadata: expect.objectContaining({
          originalMeta: 'test',
          failureReason: 'Corrupted payload',
          failedAt: expect.any(String),
        }),
      },
    });
    expect(result.status).toBe(FileStatus.FAILED);
  });
});
