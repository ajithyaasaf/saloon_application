import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import {
  StorageInvalidKeyError,
  StorageObjectNotFoundError,
} from '../errors/storage.errors';
import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saloon-storage-test-'));
    provider = new LocalStorageProvider({
      provider: 'LOCAL',
      r2: { bucket: 'r2-test' },
      s3: { region: 'us-east-1', bucket: 's3-test' },
      local: {
        baseDir: tempDir,
        publicUrl: 'http://localhost:3000/uploads',
      },
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should have providerName = "LOCAL"', () => {
    expect(provider.providerName).toBe('LOCAL');
  });

  describe('upload & download', () => {
    it('should upload a buffer and download it back', async () => {
      const content = Buffer.from('Hello Local Storage', 'utf-8');
      const uploadResult = await provider.upload({
        objectKey: 'salons/1/test.txt',
        body: content,
        contentType: 'text/plain',
      });

      expect(uploadResult.objectKey).toBe('salons/1/test.txt');
      expect(uploadResult.provider).toBe('LOCAL');
      expect(uploadResult.sizeBytes).toBe(content.length);
      expect(uploadResult.publicUrl).toBe('http://localhost:3000/uploads/salons/1/test.txt');

      const downloadResult = await provider.download('salons/1/test.txt');
      expect(downloadResult.body.toString('utf-8')).toBe('Hello Local Storage');
      expect(downloadResult.contentLength).toBe(content.length);
    });

    it('should upload a string body', async () => {
      await provider.upload({
        objectKey: 'notes/test.txt',
        body: 'String Body',
        contentType: 'text/plain',
      });

      const downloaded = await provider.download('notes/test.txt');
      expect(downloaded.body.toString('utf-8')).toBe('String Body');
    });

    it('should upload a stream and download it back', async () => {
      const stream = Readable.from(['Chunk 1 ', 'Chunk 2']);
      const uploadResult = await provider.uploadStream({
        objectKey: 'streams/test.txt',
        body: stream,
        contentType: 'text/plain',
      });

      expect(uploadResult.sizeBytes).toBe(15);

      const streamDownload = await provider.getDownloadStream('streams/test.txt');
      const chunks: Buffer[] = [];
      for await (const chunk of streamDownload.stream) {
        chunks.push(Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks).toString('utf-8')).toBe('Chunk 1 Chunk 2');
    });

    it('should throw StorageObjectNotFoundError when downloading missing file', async () => {
      await expect(provider.download('non-existent.txt')).rejects.toThrow(
        StorageObjectNotFoundError,
      );
      await expect(provider.getDownloadStream('non-existent.txt')).rejects.toThrow(
        StorageObjectNotFoundError,
      );
    });
  });

  describe('exists & getMetadata', () => {
    it('should return true for existing and false for missing', async () => {
      expect(await provider.exists('file.txt')).toBe(false);

      await provider.upload({
        objectKey: 'file.txt',
        body: Buffer.from('test'),
        contentType: 'text/plain',
      });

      expect(await provider.exists('file.txt')).toBe(true);
    });

    it('should return metadata for existing and null for missing', async () => {
      expect(await provider.getMetadata('file.txt')).toBeNull();

      await provider.upload({
        objectKey: 'file.txt',
        body: Buffer.from('metadata-test'),
        contentType: 'text/plain',
      });

      const meta = await provider.getMetadata('file.txt');
      expect(meta).not.toBeNull();
      expect(meta?.sizeBytes).toBe(13);
      expect(meta?.objectKey).toBe('file.txt');
    });
  });

  describe('delete & deleteMany', () => {
    it('should delete existing file idempotently', async () => {
      await provider.upload({
        objectKey: 'delete-me.txt',
        body: Buffer.from('delete'),
        contentType: 'text/plain',
      });

      expect(await provider.exists('delete-me.txt')).toBe(true);
      expect(await provider.delete('delete-me.txt')).toBe(true);
      expect(await provider.exists('delete-me.txt')).toBe(false);
      // Second delete should also return true (idempotent)
      expect(await provider.delete('delete-me.txt')).toBe(true);
    });

    it('should delete multiple files', async () => {
      await provider.upload({ objectKey: 'f1.txt', body: Buffer.from('1'), contentType: 'text/plain' });
      await provider.upload({ objectKey: 'f2.txt', body: Buffer.from('2'), contentType: 'text/plain' });

      const results = await provider.deleteMany(['f1.txt', 'f2.txt']);
      expect(results).toEqual([true, true]);
      expect(await provider.exists('f1.txt')).toBe(false);
      expect(await provider.exists('f2.txt')).toBe(false);
    });
  });

  describe('copy & move', () => {
    it('should copy file to new key', async () => {
      await provider.upload({ objectKey: 'orig.txt', body: Buffer.from('copy-me'), contentType: 'text/plain' });

      const copyResult = await provider.copy({
        sourceKey: 'orig.txt',
        destinationKey: 'copied.txt',
      });

      expect(copyResult.objectKey).toBe('copied.txt');
      expect(await provider.exists('orig.txt')).toBe(true);
      expect(await provider.exists('copied.txt')).toBe(true);
      expect((await provider.download('copied.txt')).body.toString()).toBe('copy-me');
    });

    it('should throw StorageObjectNotFoundError when copying missing source', async () => {
      await expect(
        provider.copy({ sourceKey: 'missing.txt', destinationKey: 'dest.txt' }),
      ).rejects.toThrow(StorageObjectNotFoundError);
    });

    it('should move file and delete original', async () => {
      await provider.upload({ objectKey: 'move-orig.txt', body: Buffer.from('move-me'), contentType: 'text/plain' });

      const moveResult = await provider.move({
        sourceKey: 'move-orig.txt',
        destinationKey: 'move-dest.txt',
      });

      expect(moveResult.objectKey).toBe('move-dest.txt');
      expect(await provider.exists('move-orig.txt')).toBe(false);
      expect(await provider.exists('move-dest.txt')).toBe(true);
    });
  });

  describe('signed URLs', () => {
    it('should generate valid signed upload URL', async () => {
      const result = await provider.generateSignedUploadUrl({
        objectKey: 'upload/target.jpg',
        contentType: 'image/jpeg',
        expiresInSeconds: 300,
      });

      expect(result.url).toContain('/_signed/upload/upload/target.jpg');
      expect(result.url).toContain('expires=');
      expect(result.url).toContain('sig=');
      expect(result.objectKey).toBe('upload/target.jpg');
      expect(result.expiresInSeconds).toBe(300);
    });

    it('should generate valid signed download URL', async () => {
      const result = await provider.generateSignedDownloadUrl({
        objectKey: 'docs/invoice.pdf',
        expiresInSeconds: 600,
      });

      expect(result.url).toContain('/_signed/download/docs/invoice.pdf');
      expect(result.url).toContain('expires=');
      expect(result.url).toContain('sig=');
      expect(result.objectKey).toBe('docs/invoice.pdf');
      expect(result.expiresInSeconds).toBe(600);
    });
  });

  describe('security sandbox checks', () => {
    it('should reject path traversal in upload', async () => {
      await expect(
        provider.upload({
          objectKey: '../escaped.txt',
          body: Buffer.from('escape'),
          contentType: 'text/plain',
        }),
      ).rejects.toThrow(StorageInvalidKeyError);
    });

    it('should reject path traversal in download', async () => {
      await expect(provider.download('folder/../../escaped.txt')).rejects.toThrow(
        StorageInvalidKeyError,
      );
    });
  });
});
