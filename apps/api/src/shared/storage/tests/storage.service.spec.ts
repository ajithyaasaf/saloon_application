import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { StorageService } from '../storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('uploadFile() & uploadStream()', () => {
    it('should upload file buffer and return provider-agnostic StorageUploadResult', async () => {
      const buffer = Buffer.from('test image binary');
      const result = await service.uploadFile(buffer, 'salons/logos', 'logo.png');

      expect(result.fileId).toBe('salons/logos/logo.png');
      expect(result.secureUrl).toContain('https://');
      expect(result.provider).toBe('cloudinary');
      expect(result.sizeBytes).toBe(buffer.length);
    });

    it('should upload readable stream', async () => {
      const stream = Readable.from(['chunk1', 'chunk2']);
      const result = await service.uploadStream(stream, 'documents');

      expect(result.fileId).toBeDefined();
      expect(result.secureUrl).toBeDefined();
    });

    it('should throw ValidationException on empty buffer or invalid folder', async () => {
      await expect(service.uploadFile(Buffer.alloc(0), 'folder')).rejects.toThrow(ValidationException);
      await expect(service.uploadFile(Buffer.from('data'), '')).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteFile() and deleteFiles()', () => {
    it('should delete file by fileId', async () => {
      const deleted = await service.deleteFile('salons/logos/logo.png');
      expect(deleted).toBe(true);
    });

    it('should batch delete files', async () => {
      const results = await service.deleteFiles(['f1', 'f2']);
      expect(results).toEqual([true, true]);
    });
  });

  describe('signed URLs, copy, move, metadata', () => {
    it('should generate signed URL with expiration timestamp', async () => {
      const url = await service.getSignedUrl('salons/logos/logo.png', 1800000);
      expect(url).toContain('signature=signed_token');
      expect(url).toContain('expires=');
    });

    it('should copy file to new folder', async () => {
      const res = await service.copyFile('f1', 'new_folder');
      expect(res.fileId).toContain('new_folder/');
    });

    it('should move file to new folder', async () => {
      const res = await service.moveFile('f1', 'target_folder');
      expect(res.fileId).toContain('target_folder/');
    });

    it('should retrieve presigned upload URL for direct client upload', async () => {
      const res = await service.getPresignedUploadUrl('uploads/user_avatars', 'image/jpeg');
      expect(res.uploadUrl).toContain('presigned=true');
      expect(res.fileId).toContain('uploads/user_avatars/');
    });
  });
});
