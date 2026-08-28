import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Concurrency & High Load Queries', () => {
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

  it('should handle parallel repository lookups concurrently', async () => {
    const mockAsset = {
      id: 'asset-concurrent-1',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'image.jpg',
      storedFileName: 'stored-image.jpg',
      objectKey: 'salons/salon-1/image.jpg',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: 1024,
      checksum: null,
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      category: FileCategory.GALLERY,
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

    mockDb.fileAsset.findFirst.mockResolvedValue(mockAsset);

    const lookupPromises = Array.from({ length: 20 }, (_, i) =>
      repository.findById(`asset-${i}`),
    );

    const results = await Promise.all(lookupPromises);
    expect(results.length).toBe(20);
    results.forEach((res) => {
      expect(res).toEqual(mockAsset);
    });
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledTimes(20);
  });
});
