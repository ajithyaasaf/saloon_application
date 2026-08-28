import { ConflictException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Concurrency & Data Integrity', () => {
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

  it('should map Prisma P2002 unique constraint error to ConflictException', async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`objectKey`)',
      {
        code: 'P2002',
        clientVersion: '5.22.0',
      },
    );

    mockDb.fileAsset.create.mockRejectedValueOnce(p2002Error);

    await expect(
      repository.create({
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'duplicate.png',
        storedFileName: 'stored-dup.png',
        objectKey: 'salons/salon-1/duplicate.png',
        bucket: 'saloon-assets',
        provider: 'R2',
        mimeType: 'image/png',
        extension: 'png',
        sizeBytes: 5000,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should propagate unexpected database errors on create', async () => {
    const dbError = new Error('Database connection failed');
    mockDb.fileAsset.create.mockRejectedValueOnce(dbError);

    await expect(
      repository.create({
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'error.png',
        storedFileName: 'stored-err.png',
        objectKey: 'salons/salon-1/error.png',
        bucket: 'saloon-assets',
        provider: 'R2',
        mimeType: 'image/png',
        extension: 'png',
        sizeBytes: 5000,
      }),
    ).rejects.toThrow('Database connection failed');
  });

  it('should find by category, status, and visibility with tenant scoping', async () => {
    const assets = [
      {
        id: 'asset-cat-1',
        salonId: 'salon-1',
        category: FileCategory.STAFF,
        status: FileStatus.READY,
        visibility: FileVisibility.PUBLIC,
        deletedAt: null,
      },
    ];

    mockDb.fileAsset.findMany.mockResolvedValue(assets);

    const byCat = await repository.findByCategory(
      FileCategory.STAFF,
      'salon-1',
    );
    expect(byCat).toEqual(assets);

    const byStatus = await repository.findByStatus(
      FileStatus.READY,
      'salon-1',
    );
    expect(byStatus).toEqual(assets);

    const byVis = await repository.findByVisibility(
      FileVisibility.PUBLIC,
      'salon-1',
    );
    expect(byVis).toEqual(assets);

    const bySalonCat = await repository.findBySalonAndCategory(
      'salon-1',
      FileCategory.STAFF,
    );
    expect(bySalonCat).toEqual(assets);

    const bySalonStatus = await repository.findBySalonAndStatus(
      'salon-1',
      FileStatus.READY,
    );
    expect(bySalonStatus).toEqual(assets);
  });
});
