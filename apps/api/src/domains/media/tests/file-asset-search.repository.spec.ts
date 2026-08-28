import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Paginated Search & Filtering', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const mockAssets = [
    {
      id: 'asset-1',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'service-haircut.jpg',
      storedFileName: 'haircut.jpg',
      objectKey: 'salons/salon-1/haircut.jpg',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: 12000,
      checksum: 'hash-1',
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      category: FileCategory.SERVICE,
      width: 800,
      height: 600,
      duration: null,
      metadata: null,
      altText: 'Haircut style',
      folder: 'services',
      createdAt: new Date('2026-08-10T00:00:00Z'),
      updatedAt: new Date('2026-08-10T00:00:00Z'),
      deletedAt: null,
    },
    {
      id: 'asset-2',
      salonId: 'salon-1',
      uploadedByUserId: 'user-1',
      originalFileName: 'service-coloring.jpg',
      storedFileName: 'coloring.jpg',
      objectKey: 'salons/salon-1/coloring.jpg',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: 14000,
      checksum: 'hash-2',
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      category: FileCategory.SERVICE,
      width: 800,
      height: 600,
      duration: null,
      metadata: null,
      altText: 'Hair coloring',
      folder: 'services',
      createdAt: new Date('2026-08-12T00:00:00Z'),
      updatedAt: new Date('2026-08-12T00:00:00Z'),
      deletedAt: null,
    },
  ];

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

  it('should search by salonId, category, status, and visibility with pagination', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce(mockAssets);
    mockDb.fileAsset.count.mockResolvedValueOnce(2);

    const result = await repository.search({
      salonId: 'salon-1',
      category: FileCategory.SERVICE,
      status: FileStatus.READY,
      visibility: FileVisibility.PUBLIC,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        salonId: 'salon-1',
        category: FileCategory.SERVICE,
        status: FileStatus.READY,
        visibility: FileVisibility.PUBLIC,
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    expect(result.data).toEqual(mockAssets);
    expect(result.total).toBe(2);
  });

  it('should filter by originalFileName case-insensitively', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce([mockAssets[0]]);
    mockDb.fileAsset.count.mockResolvedValueOnce(1);

    const result = await repository.search({
      originalFileName: 'haircut',
    });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          originalFileName: { contains: 'haircut', mode: 'insensitive' },
        }),
      }),
    );
    expect(result.total).toBe(1);
  });

  it('should filter by date range', async () => {
    const startDate = new Date('2026-08-01');
    const endDate = new Date('2026-08-15');

    mockDb.fileAsset.findMany.mockResolvedValueOnce(mockAssets);
    mockDb.fileAsset.count.mockResolvedValueOnce(2);

    await repository.search({ startDate, endDate });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: startDate, lte: endDate },
        }),
      }),
    );
  });

  it('should include deleted items when includeDeleted is true', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce(mockAssets);
    mockDb.fileAsset.count.mockResolvedValueOnce(2);

    await repository.search({ includeDeleted: true });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('should return total count for salon and category', async () => {
    mockDb.fileAsset.count.mockResolvedValueOnce(5);

    const count = await repository.count(
      'salon-1',
      FileStatus.READY,
      FileCategory.SERVICE,
    );
    expect(mockDb.fileAsset.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        salonId: 'salon-1',
        status: FileStatus.READY,
        category: FileCategory.SERVICE,
      },
    });
    expect(count).toBe(5);
  });
});
