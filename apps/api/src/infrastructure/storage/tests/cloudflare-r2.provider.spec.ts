import { Readable } from 'stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageInvalidKeyError,
  StorageObjectNotFoundError,
  StorageUploadError,
} from '../errors/storage.errors';
import { CloudflareR2StorageProvider } from '../providers/cloudflare-r2.provider';

// Mock getSignedUrl from @aws-sdk/s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockImplementation(async (_client, command, options) => {
    const isPut = command instanceof PutObjectCommand;
    const action = isPut ? 'upload' : 'download';
    const key = command.input.Key;
    return `https://mock.r2.cloudflarestorage.com/${action}/${key}?expires=${options.expiresIn}`;
  }),
}));

describe('CloudflareR2StorageProvider', () => {
  let provider: CloudflareR2StorageProvider;
  let mockS3Client: { send: jest.Mock };

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn(),
    };

    provider = new CloudflareR2StorageProvider({
      provider: 'R2',
      r2: {
        bucket: 'test-r2-bucket',
        accountId: 'test-account-id',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        publicUrl: 'https://cdn.saloon.platform',
      },
      s3: { region: 'us-east-1', bucket: 's3-test' },
      local: { baseDir: './uploads' },
    });

    provider.setClient(mockS3Client as unknown as S3Client);
  });

  it('should have providerName = "R2"', () => {
    expect(provider.providerName).toBe('R2');
  });

  describe('upload', () => {
    it('should successfully upload buffer to R2', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        ETag: '"mock-etag-123"',
      });

      const result = await provider.upload({
        objectKey: 'salons/123/avatar.jpg',
        body: Buffer.from('image bytes'),
        contentType: 'image/jpeg',
        metadata: { uploader: 'usr-1' },
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(PutObjectCommand);
      expect(callArg.input.Bucket).toBe('test-r2-bucket');
      expect(callArg.input.Key).toBe('salons/123/avatar.jpg');
      expect(callArg.input.ContentType).toBe('image/jpeg');
      expect(callArg.input.Metadata).toEqual({ uploader: 'usr-1' });

      expect(result.objectKey).toBe('salons/123/avatar.jpg');
      expect(result.provider).toBe('R2');
      expect(result.bucket).toBe('test-r2-bucket');
      expect(result.etag).toBe('mock-etag-123');
      expect(result.publicUrl).toBe('https://cdn.saloon.platform/salons/123/avatar.jpg');
    });

    it('should throw StorageUploadError on S3 upload failure', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('S3 connection timeout'));

      await expect(
        provider.upload({
          objectKey: 'salons/123/avatar.jpg',
          body: Buffer.from('data'),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow(StorageUploadError);
    });

    it('should reject unsafe object key', async () => {
      await expect(
        provider.upload({
          objectKey: '../unsafe/file.jpg',
          body: Buffer.from('data'),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow(StorageInvalidKeyError);
    });
  });

  describe('uploadStream', () => {
    it('should upload a readable stream to R2', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        ETag: '"stream-etag"',
      });

      const stream = Readable.from(['chunk1', 'chunk2']);
      const result = await provider.uploadStream({
        objectKey: 'videos/recording.mp4',
        body: stream,
        contentType: 'video/mp4',
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(PutObjectCommand);
      expect(callArg.input.Key).toBe('videos/recording.mp4');
      expect(result.etag).toBe('stream-etag');
      expect(result.sizeBytes).toBe(12);
    });
  });

  describe('download & getDownloadStream', () => {
    it('should download object as Buffer', async () => {
      const mockStream = Readable.from(['downloaded content']);
      mockS3Client.send.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'text/plain',
        ContentLength: 18,
        ETag: '"download-etag"',
        LastModified: new Date('2026-08-18T00:00:00Z'),
      });

      const result = await provider.download('docs/terms.txt');

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(GetObjectCommand);
      expect(callArg.input.Key).toBe('docs/terms.txt');

      expect(result.body.toString('utf-8')).toBe('downloaded content');
      expect(result.contentType).toBe('text/plain');
      expect(result.etag).toBe('download-etag');
    });

    it('should throw StorageObjectNotFoundError on 404 NoSuchKey', async () => {
      const notFoundError = new Error('NoSuchKey');
      (notFoundError as any).name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      await expect(provider.download('missing.txt')).rejects.toThrow(
        StorageObjectNotFoundError,
      );
    });

    it('should return download stream', async () => {
      const mockStream = Readable.from(['stream data']);
      mockS3Client.send.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'application/pdf',
        ContentLength: 11,
      });

      const result = await provider.getDownloadStream('invoice.pdf');
      expect(result.objectKey).toBe('invoice.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.stream).toBeDefined();
    });
  });

  describe('delete & deleteMany', () => {
    it('should delete object from R2', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await provider.delete('salons/123/old.jpg');

      expect(result).toBe(true);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(DeleteObjectCommand);
      expect(callArg.input.Key).toBe('salons/123/old.jpg');
    });

    it('should throw StorageDeleteError on delete failure', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Internal S3 Error'));

      await expect(provider.delete('file.jpg')).rejects.toThrow(StorageDeleteError);
    });

    it('should delete multiple objects in batch', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        Deleted: [{ Key: 'f1.jpg' }, { Key: 'f2.jpg' }],
        Errors: [],
      });

      const result = await provider.deleteMany(['f1.jpg', 'f2.jpg']);
      expect(result).toEqual([true, true]);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(DeleteObjectsCommand);
    });
  });

  describe('exists & getMetadata', () => {
    it('should return true when HeadObject succeeds', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        ContentLength: 1024,
      });

      expect(await provider.exists('present.jpg')).toBe(true);
      const callArg = mockS3Client.send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(HeadObjectCommand);
    });

    it('should return false when HeadObject returns NotFound / NoSuchKey', async () => {
      const notFoundError = new Error('NotFound');
      (notFoundError as any).name = 'NotFound';
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      expect(await provider.exists('missing.jpg')).toBe(false);
    });

    it('should return metadata on success and null on NotFound', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        ContentLength: 2048,
        ContentType: 'image/png',
        ETag: '"png-etag"',
        LastModified: new Date('2026-08-18T00:00:00Z'),
        Metadata: { category: 'avatar' },
      });

      const meta = await provider.getMetadata('avatar.png');
      expect(meta).toEqual({
        objectKey: 'avatar.png',
        sizeBytes: 2048,
        contentType: 'image/png',
        etag: 'png-etag',
        lastModified: new Date('2026-08-18T00:00:00Z'),
        metadata: { category: 'avatar' },
      });

      const notFoundError = new Error('NoSuchKey');
      (notFoundError as any).name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      expect(await provider.getMetadata('missing.png')).toBeNull();
    });
  });

  describe('copy & move', () => {
    it('should copy object within bucket', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({ CopyObjectResult: { ETag: '"copy-etag"' } }) // CopyObjectCommand
        .mockResolvedValueOnce({ ContentLength: 500, ContentType: 'text/plain' }); // HeadObjectCommand (getMetadata)

      const result = await provider.copy({
        sourceKey: 'src/file.txt',
        destinationKey: 'dest/file.txt',
      });

      expect(result.objectKey).toBe('dest/file.txt');
      expect(result.etag).toBe('copy-etag');
      const copyCall = mockS3Client.send.mock.calls[0][0];
      expect(copyCall).toBeInstanceOf(CopyObjectCommand);
      expect(copyCall.input.CopySource).toBe('test-r2-bucket/src%2Ffile.txt');
    });

    it('should move object by copying then deleting source', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({ CopyObjectResult: { ETag: '"move-etag"' } })
        .mockResolvedValueOnce({ ContentLength: 500, ContentType: 'text/plain' })
        .mockResolvedValueOnce({}); // DeleteObjectCommand

      const result = await provider.move({
        sourceKey: 'src.txt',
        destinationKey: 'dest.txt',
      });

      expect(result.objectKey).toBe('dest.txt');
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
      expect(mockS3Client.send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
    });
  });

  describe('signed URLs', () => {
    it('should generate signed upload URL with expiry', async () => {
      const result = await provider.generateSignedUploadUrl({
        objectKey: 'client-upload.jpg',
        contentType: 'image/jpeg',
        expiresInSeconds: 600,
      });

      expect(result.url).toContain('/upload/client-upload.jpg');
      expect(result.url).toContain('expires=600');
      expect(result.objectKey).toBe('client-upload.jpg');
      expect(result.expiresInSeconds).toBe(600);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate signed download URL with attachment filename', async () => {
      const result = await provider.generateSignedDownloadUrl({
        objectKey: 'reports/audit.pdf',
        expiresInSeconds: 900,
        filename: 'Financial_Report.pdf',
      });

      expect(result.url).toContain('/download/reports/audit.pdf');
      expect(result.objectKey).toBe('reports/audit.pdf');
      expect(result.expiresInSeconds).toBe(900);
    });
  });
});
