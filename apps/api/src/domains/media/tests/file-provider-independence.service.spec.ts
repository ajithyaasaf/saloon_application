import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileUploadService } from '../services/file-upload.service';

describe('File Services - Provider Independence (R2 / S3 / LOCAL)', () => {
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ id: 'test-asset-id', ...data }),
      ),
      objectKeyExists: jest.fn().mockResolvedValue(false),
    } as any;
    mockAudit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) } as any;
  });

  const providers = [
    { name: 'R2', bucket: 'cloudflare-r2-bucket' },
    { name: 'S3', bucket: 'aws-s3-bucket' },
    { name: 'LOCAL', bucket: 'local-disk' },
  ];

  it.each(providers)(
    'should execute initiatePresignedUpload seamlessly with provider $name',
    async ({ name, bucket }) => {
      const mockStorage: IStorageProvider = {
        providerName: name,
        generateSignedUploadUrl: jest.fn().mockResolvedValue({
          url: `https://${name.toLowerCase()}.example.com/signed-upload`,
          expiresInSeconds: 600,
          provider: name,
          bucket,
          objectKey: `salons/salon-1/profile/test.jpg`,
        }),
        generateSignedDownloadUrl: jest.fn(),
        upload: jest.fn(),
        uploadStream: jest.fn(),
        download: jest.fn(),
        getDownloadStream: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        exists: jest.fn(),
        getMetadata: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
      };

      const service = new FileUploadService(mockStorage, mockRepo, mockAudit, mockEventBus);

      const result = await service.initiatePresignedUpload(
        {
          originalFileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          category: FileCategory.PROFILE,
        },
        { userId: 'user-1', salonId: 'salon-1' },
      );

      expect(result.fileAsset.provider).toBe(name);
      expect(result.uploadUrl).toBe(`https://${name.toLowerCase()}.example.com/signed-upload`);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: name,
        }),
      );
    },
  );
});
