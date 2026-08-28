import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Sorting Capabilities', () => {
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

  it('should sort by createdAt desc by default', async () => {
    await repository.search({});
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should sort by sizeBytes asc when requested', async () => {
    await repository.search({ sortBy: 'sizeBytes', sortOrder: 'asc' });
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sizeBytes: 'asc' },
      }),
    );
  });

  it('should sort by originalFileName asc when requested', async () => {
    await repository.search({ sortBy: 'originalFileName', sortOrder: 'asc' });
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { originalFileName: 'asc' },
      }),
    );
  });

  it('should sort by updatedAt desc when requested', async () => {
    await repository.search({ sortBy: 'updatedAt', sortOrder: 'desc' });
    expect(mockDb.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });
});
