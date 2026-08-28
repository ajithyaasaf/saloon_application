import { S3Client } from '@aws-sdk/client-s3';
import {
  StorageConfigurationError,
  StorageDeleteError,
  StorageDownloadError,
  StorageObjectNotFoundError,
  StorageProviderError,
  StorageUploadError,
} from '../errors/storage.errors';
import { CloudflareR2StorageProvider } from '../providers/cloudflare-r2.provider';

describe('Storage Error Mapping & Resilience', () => {
  let provider: CloudflareR2StorageProvider;
  let mockS3Client: { send: jest.Mock };

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn(),
    };

    provider = new CloudflareR2StorageProvider({
      provider: 'R2',
      r2: {
        bucket: 'test-bucket',
        accountId: 'acc-1',
        accessKeyId: 'key',
        secretAccessKey: 'sec',
      },
      s3: { region: 'us-east-1', bucket: 's3' },
      local: { baseDir: './uploads' },
    });

    provider.setClient(mockS3Client as unknown as S3Client);
  });

  it('should map NoSuchBucket to StorageObjectNotFoundError', async () => {
    const error = new Error('NoSuchBucket');
    (error as any).name = 'NoSuchBucket';
    mockS3Client.send.mockRejectedValueOnce(error);

    await expect(provider.download('file.txt')).rejects.toThrow(
      StorageObjectNotFoundError,
    );
  });

  it('should map 404 httpStatusCode to StorageObjectNotFoundError', async () => {
    const error = new Error('Not Found');
    (error as any).$metadata = { httpStatusCode: 404 };
    mockS3Client.send.mockRejectedValueOnce(error);

    await expect(provider.download('file.txt')).rejects.toThrow(
      StorageObjectNotFoundError,
    );
  });

  it('should map AccessDenied / 403 on upload to StorageUploadError', async () => {
    const error = new Error('AccessDenied');
    (error as any).$metadata = { httpStatusCode: 403 };
    mockS3Client.send.mockRejectedValueOnce(error);

    await expect(
      provider.upload({ objectKey: 'file.txt', body: Buffer.from('x'), contentType: 'text/plain' }),
    ).rejects.toThrow(StorageUploadError);
  });

  it('should map connection errors on delete to StorageDeleteError', async () => {
    const error = new Error('ECONNRESET');
    mockS3Client.send.mockRejectedValueOnce(error);

    await expect(provider.delete('file.txt')).rejects.toThrow(StorageDeleteError);
  });

  it('should throw StorageConfigurationError when assertConfigured fails', () => {
    const unconfigured = new CloudflareR2StorageProvider({
      provider: 'R2',
      r2: { bucket: '' },
      s3: { region: 'us-east-1', bucket: 's3' },
      local: { baseDir: './uploads' },
    });

    (unconfigured as any).client = null;
    expect(() => unconfigured.assertConfigured()).toThrow(StorageConfigurationError);
  });
});
