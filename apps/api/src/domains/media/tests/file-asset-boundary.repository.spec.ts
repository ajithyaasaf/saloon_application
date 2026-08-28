import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Boundary & Edge Cases', () => {
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

  it('should clamp pagination limit to 100 maximum and 1 minimum', async () => {
    await repository.search({ limit: 500, page: 0 });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100, // Clamped to 100
      }),
    );
  });

  it('should handle negative or zero page gracefully', async () => {
    await repository.findByUser('user-1', { page: -5, limit: -10 });

    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 1, // Clamped min limit
      }),
    );
  });
});
