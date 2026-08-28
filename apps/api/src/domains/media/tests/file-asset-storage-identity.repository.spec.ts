import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Storage Identity Queries', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const storageAsset = {
    id: 'asset-storage-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'product-shampoo.jpg',
    storedFileName: 'stored-shampoo-123.jpg',
    objectKey: 'salons/salon-1/products/shampoo.jpg',
    bucket: 'r2-production-bucket',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 45000,
    checksum: 'sha256-checksum-xyz',
    status: FileStatus.READY,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.PRODUCT,
    width: 600,
    height: 600,
    duration: null,
    metadata: null,
    altText: 'Organic Shampoo',
    folder: 'products',
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

  it('should find asset by objectKey', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(storageAsset);

    const result = await repository.findByObjectKey(
      'salons/salon-1/products/shampoo.jpg',
    );
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: {
        objectKey: 'salons/salon-1/products/shampoo.jpg',
        deletedAt: null,
      },
    });
    expect(result).toEqual(storageAsset);
  });

  it('should find assets by checksum for deduplication lookup', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce([storageAsset]);

    const result = await repository.findByChecksum('sha256-checksum-xyz');
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith({
      where: {
        checksum: 'sha256-checksum-xyz',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([storageAsset]);
  });

  it('should find asset by storage provider and objectKey', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(storageAsset);

    const result = await repository.findByStorageProviderAndObjectKey(
      'R2',
      'salons/salon-1/products/shampoo.jpg',
    );
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'R2',
        objectKey: 'salons/salon-1/products/shampoo.jpg',
        deletedAt: null,
      },
    });
    expect(result).toEqual(storageAsset);
  });

  it('should check if objectKey exists returning true when count > 0', async () => {
    mockDb.fileAsset.count.mockResolvedValueOnce(1);

    const exists = await repository.objectKeyExists(
      'salons/salon-1/products/shampoo.jpg',
    );
    expect(exists).toBe(true);
  });

  it('should check if objectKey exists returning false when count === 0', async () => {
    mockDb.fileAsset.count.mockResolvedValueOnce(0);

    const exists = await repository.objectKeyExists('non-existent-key.jpg');
    expect(exists).toBe(false);
  });

  it('should check objectKeyExists excluding a specific asset ID', async () => {
    mockDb.fileAsset.count.mockResolvedValueOnce(0);

    const exists = await repository.objectKeyExists(
      'salons/salon-1/products/shampoo.jpg',
      'asset-storage-1',
    );
    expect(mockDb.fileAsset.count).toHaveBeenCalledWith({
      where: {
        objectKey: 'salons/salon-1/products/shampoo.jpg',
        id: { not: 'asset-storage-1' },
      },
    });
    expect(exists).toBe(false);
  });
});
