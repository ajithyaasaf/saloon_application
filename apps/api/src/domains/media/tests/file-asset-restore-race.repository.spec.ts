import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Restore & Deletion Idempotence', () => {
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

  it('should be idempotent when restoring an asset that is already active (deletedAt === null)', async () => {
    const activeAsset = {
      id: 'asset-active-1',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'active.png',
      storedFileName: 'stored-active.png',
      objectKey: 'salons/salon-1/active.png',
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

    mockDb.fileAsset.findFirst.mockResolvedValueOnce(activeAsset);

    const result = await repository.restore('asset-active-1');
    expect(mockDb.fileAsset.update).not.toHaveBeenCalled();
    expect(result).toEqual(activeAsset);
  });
});
