import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - User Ownership Isolation', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const userAsset = {
    id: 'user-asset-1',
    salonId: null,
    uploadedByUserId: 'user-123',
    originalFileName: 'my-resume.pdf',
    storedFileName: 'stored-resume-123.pdf',
    objectKey: 'users/user-123/my-resume.pdf',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 50000,
    checksum: 'hash-pdf',
    status: FileStatus.READY,
    visibility: FileVisibility.PRIVATE,
    category: FileCategory.DOCUMENT,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: null,
    folder: 'documents',
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

  it('should find user asset by user ID and asset ID', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(userAsset);

    const result = await repository.findByUserAndId('user-123', 'user-asset-1');
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-asset-1',
        uploadedByUserId: 'user-123',
        deletedAt: null,
      },
    });
    expect(result).toEqual(userAsset);
  });

  it('should return null if querying an asset belonging to a different user', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findByUserAndId('user-456', 'user-asset-1');
    expect(result).toBeNull();
  });

  it('should paginate and filter assets by user', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce([userAsset]);
    mockDb.fileAsset.count.mockResolvedValueOnce(1);

    const result = await repository.findByUser('user-123', {
      page: 1,
      limit: 10,
      category: FileCategory.DOCUMENT,
      status: FileStatus.READY,
    });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith({
      where: {
        uploadedByUserId: 'user-123',
        deletedAt: null,
        category: FileCategory.DOCUMENT,
        status: FileStatus.READY,
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    expect(result.data).toEqual([userAsset]);
    expect(result.total).toBe(1);
  });
});
