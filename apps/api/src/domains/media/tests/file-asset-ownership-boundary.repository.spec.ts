import { NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Explicit Scoped Method Boundaries', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      fileAsset: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    repository = new FileAssetRepository(mockDb as unknown as PrismaService);
  });

  it('should find asset by objectKey scoped to specific salon', async () => {
    const mockAsset = {
      id: 'asset-obj-1',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'key.png',
      storedFileName: 'stored-key.png',
      objectKey: 'salons/salon-1/key.png',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'image/png',
      extension: 'png',
      sizeBytes: 1024,
      checksum: null,
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      category: FileCategory.OTHER,
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

    mockDb.fileAsset.findFirst.mockResolvedValueOnce(mockAsset);

    const result = await repository.findByObjectKey(
      'salons/salon-1/key.png',
      'salon-1',
    );
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: {
        objectKey: 'salons/salon-1/key.png',
        deletedAt: null,
        salonId: 'salon-1',
      },
    });
    expect(result).toEqual(mockAsset);
  });

  it('should return null if findByChecksum with non-matching salonId', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce([]);

    const result = await repository.findByChecksum('hash-123', 'salon-2');
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith({
      where: {
        checksum: 'hash-123',
        deletedAt: null,
        salonId: 'salon-2',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([]);
  });
});
