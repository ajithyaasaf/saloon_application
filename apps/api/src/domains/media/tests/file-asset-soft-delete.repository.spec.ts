import { NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Soft Delete & Restoration', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const activeAsset = {
    id: 'asset-del-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'banner.png',
    storedFileName: 'stored-banner.png',
    objectKey: 'salons/salon-1/banner.png',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/png',
    extension: 'png',
    sizeBytes: 25000,
    checksum: 'hash-banner',
    status: FileStatus.READY,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.MARKETING,
    width: 1200,
    height: 600,
    duration: null,
    metadata: null,
    altText: null,
    folder: 'banners',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const softDeletedAsset = {
    ...activeAsset,
    status: FileStatus.DELETED,
    deletedAt: new Date('2026-08-18T10:00:00Z'),
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

  it('should soft delete active asset by setting status to DELETED and setting deletedAt', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(activeAsset);
    mockDb.fileAsset.update.mockResolvedValueOnce(softDeletedAsset);

    const result = await repository.softDelete('asset-del-1');
    expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-del-1' },
      data: {
        status: FileStatus.DELETED,
        deletedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe(FileStatus.DELETED);
    expect(result.deletedAt).toBeDefined();
  });

  it('should exclude soft-deleted assets from findById', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findById('asset-del-1');
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset-del-1', deletedAt: null },
    });
    expect(result).toBeNull();
  });

  it('should retrieve soft-deleted assets when using findByIdIncludingDeleted', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(softDeletedAsset);

    const result = await repository.findByIdIncludingDeleted('asset-del-1');
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset-del-1' },
    });
    expect(result).toEqual(softDeletedAsset);
  });

  it('should restore a soft-deleted asset by setting status to READY and deletedAt to null', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(softDeletedAsset);
    mockDb.fileAsset.update.mockResolvedValueOnce(activeAsset);

    const result = await repository.restore('asset-del-1');
    expect(mockDb.fileAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-del-1' },
      data: {
        status: FileStatus.READY,
        deletedAt: null,
      },
    });
    expect(result.deletedAt).toBeNull();
  });

  it('should return asset directly on restore if it is not deleted', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(activeAsset);

    const result = await repository.restore('asset-del-1');
    expect(mockDb.fileAsset.update).not.toHaveBeenCalled();
    expect(result).toEqual(activeAsset);
  });

  it('should throw NotFoundException if restoring non-existent asset', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(repository.restore('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
