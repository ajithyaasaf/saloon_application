import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { IFileAssetRepository } from '../repositories/interfaces/file-asset.repository.interface';

describe('FileAssetRepository - Contract Conformance', () => {
  let repository: IFileAssetRepository;
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

  it('should expose all required contract methods', () => {
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByIdIncludingDeleted).toBe('function');
    expect(typeof repository.findByObjectKey).toBe('function');
    expect(typeof repository.findByChecksum).toBe('function');
    expect(typeof repository.findByStorageProviderAndObjectKey).toBe('function');
    expect(typeof repository.findByUser).toBe('function');
    expect(typeof repository.findBySalon).toBe('function');
    expect(typeof repository.findByUserAndId).toBe('function');
    expect(typeof repository.findBySalonAndId).toBe('function');
    expect(typeof repository.findByCategory).toBe('function');
    expect(typeof repository.findByStatus).toBe('function');
    expect(typeof repository.findByVisibility).toBe('function');
    expect(typeof repository.findBySalonAndCategory).toBe('function');
    expect(typeof repository.findBySalonAndStatus).toBe('function');
    expect(typeof repository.search).toBe('function');
    expect(typeof repository.count).toBe('function');
    expect(typeof repository.objectKeyExists).toBe('function');
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.update).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
    expect(typeof repository.updateMetadata).toBe('function');
    expect(typeof repository.markUploaded).toBe('function');
    expect(typeof repository.markProcessing).toBe('function');
    expect(typeof repository.markReady).toBe('function');
    expect(typeof repository.markFailed).toBe('function');
    expect(typeof repository.softDelete).toBe('function');
    expect(typeof repository.restore).toBe('function');
  });
});
