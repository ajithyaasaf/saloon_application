import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Provider Independence (R2 / S3 / LOCAL)', () => {
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

  const providers = ['R2', 'S3', 'LOCAL', 'CLOUDINARY'];

  it.each(providers)(
    'should create and query FileAsset seamlessly regardless of provider "%s"',
    async (provider) => {
      const mockAsset = {
        id: `asset-${provider}`,
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'doc.pdf',
        storedFileName: 'stored-doc.pdf',
        objectKey: `salons/salon-1/doc.pdf`,
        bucket: `${provider.toLowerCase()}-bucket`,
        provider,
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 2048,
        checksum: 'hash',
        status: FileStatus.READY,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.DOCUMENT,
        deletedAt: null,
      };

      mockDb.fileAsset.create.mockResolvedValueOnce(mockAsset);
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(mockAsset);

      const created = await repository.create({
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'doc.pdf',
        storedFileName: 'stored-doc.pdf',
        objectKey: `salons/salon-1/doc.pdf`,
        bucket: `${provider.toLowerCase()}-bucket`,
        provider,
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 2048,
      });

      expect(created.provider).toBe(provider);

      const found = await repository.findByStorageProviderAndObjectKey(
        provider,
        `salons/salon-1/doc.pdf`,
      );
      expect(found).toEqual(mockAsset);
      expect(found?.provider).toBe(provider);
    },
  );
});
