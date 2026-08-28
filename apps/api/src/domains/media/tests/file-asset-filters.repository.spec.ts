import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Multi-Criteria Filtering', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      fileAsset: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    repository = new FileAssetRepository(mockDb as unknown as PrismaService);
  });

  it('should construct comprehensive query with all active filters', async () => {
    await repository.search({
      salonId: 'salon-123',
      uploadedByUserId: 'user-456',
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      category: FileCategory.GALLERY,
      storageProvider: 'R2',
      mimeType: 'image/webp',
      folder: 'gallery/spring',
      originalFileName: 'hero',
      objectKey: 'salons/salon-123/gallery',
    });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        salonId: 'salon-123',
        uploadedByUserId: 'user-456',
        status: FileStatus.READY,
        visibility: FileVisibility.PUBLIC,
        category: FileCategory.GALLERY,
        provider: 'R2',
        mimeType: 'image/webp',
        folder: 'gallery/spring',
        originalFileName: { contains: 'hero', mode: 'insensitive' },
        objectKey: { contains: 'salons/salon-123/gallery', mode: 'insensitive' },
      },
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  });
});
