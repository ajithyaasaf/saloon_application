import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3StorageProvider } from '../providers/s3-storage.provider';

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let mockS3Client: { send: jest.Mock };

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn(),
    };

    provider = new S3StorageProvider({
      provider: 'S3',
      r2: { bucket: 'r2-bucket' },
      s3: {
        region: 'ap-south-1',
        bucket: 'test-s3-bucket',
        accessKeyId: 'aws-key',
        secretAccessKey: 'aws-secret',
        publicUrl: 'https://s3.ap-south-1.amazonaws.com/test-s3-bucket',
      },
      local: { baseDir: './uploads' },
    });

    provider.setClient(mockS3Client as unknown as S3Client);
  });

  it('should have providerName = "S3"', () => {
    expect(provider.providerName).toBe('S3');
  });

  it('should upload object to S3 bucket', async () => {
    mockS3Client.send.mockResolvedValueOnce({
      ETag: '"s3-etag-1"',
    });

    const result = await provider.upload({
      objectKey: 'products/item1.png',
      body: Buffer.from('product image'),
      contentType: 'image/png',
    });

    expect(result.provider).toBe('S3');
    expect(result.bucket).toBe('test-s3-bucket');
    expect(result.objectKey).toBe('products/item1.png');
    expect(result.etag).toBe('s3-etag-1');
    expect(result.publicUrl).toBe(
      'https://s3.ap-south-1.amazonaws.com/test-s3-bucket/products/item1.png',
    );

    const callArg = mockS3Client.send.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(PutObjectCommand);
    expect(callArg.input.Bucket).toBe('test-s3-bucket');
  });
});
