import { NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Multi-Tenant Isolation & IDOR Protection', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const salonAAsset = {
    id: 'asset-a',
    salonId: 'salon-A',
    uploadedByUserId: 'user-a',
    originalFileName: 'service.jpg',
    storedFileName: 'stored-service-a.jpg',
    objectKey: 'salons/salon-A/service.jpg',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 15000,
    checksum: 'hash-a',
    status: FileStatus.READY,
    visibility: FileVisibility.TENANT,
    category: FileCategory.SERVICE,
    width: 600,
    height: 400,
    duration: null,
    metadata: null,
    altText: null,
    folder: 'services',
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

  it('should find asset when scoped to the matching salonId', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(salonAAsset);

    const result = await repository.findBySalonAndId('salon-A', 'asset-a');
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset-a', salonId: 'salon-A', deletedAt: null },
    });
    expect(result).toEqual(salonAAsset);
  });

  it('should return null when querying asset belonging to another salon (IDOR prevention)', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findBySalonAndId('salon-B', 'asset-a');
    expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset-a', salonId: 'salon-B', deletedAt: null },
    });
    expect(result).toBeNull();
  });

  it('should reject update on an asset belonging to another salon', async () => {
    // findById with salonId='salon-B' returns null
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.update('asset-a', { altText: 'Hacked alt' }, 'salon-B'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject softDelete on an asset belonging to another salon', async () => {
    // findById with salonId='salon-B' returns null
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(repository.softDelete('asset-a', 'salon-B')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject status update on an asset belonging to another salon', async () => {
    mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.updateStatus('asset-a', FileStatus.DELETED, 'salon-B'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should isolate findBySalon queries to the specified salonId', async () => {
    mockDb.fileAsset.findMany.mockResolvedValueOnce([salonAAsset]);
    mockDb.fileAsset.count.mockResolvedValueOnce(1);

    const result = await repository.findBySalon('salon-A');
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salonId: 'salon-A', deletedAt: null }),
      }),
    );
    expect(result.data.length).toBe(1);
    expect(result.data[0].salonId).toBe('salon-A');
  });
});
