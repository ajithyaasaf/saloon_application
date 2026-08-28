import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { Readable } from 'stream';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAccessService } from '../services/file-access.service';

describe('FileAccessService', () => {
  let service: FileAccessService;
  let mockStorage: jest.Mocked<IStorageProvider>;
  let mockRepo: jest.Mocked<FileAssetRepository>;

  const mockPublicAsset = {
    id: 'asset-public-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'banner.png',
    storedFileName: 'stored-banner.png',
    objectKey: 'salons/salon-1/marketing/banner.png',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/png',
    extension: 'png',
    sizeBytes: 50000,
    checksum: null,
    status: FileStatus.READY,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.MARKETING,
    width: null,
    height: null,
    duration: null,
    metadata: null,
    altText: null,
    folder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrivateAsset = {
    ...mockPublicAsset,
    id: 'asset-private-1',
    visibility: FileVisibility.PRIVATE,
    objectKey: 'salons/salon-1/documents/contract.pdf',
  };

  beforeEach(() => {
    mockStorage = {
      providerName: 'R2',
      bucket: 'saloon-assets',
      publicUrl: 'https://cdn.saloon.test',
      generateSignedDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://download.r2.com/signed-url',
        expiresInSeconds: 3600,
        provider: 'R2',
        bucket: 'saloon-assets',
        objectKey: 'salons/salon-1/documents/contract.pdf',
      }),
      getDownloadStream: jest.fn().mockResolvedValue({
        stream: Readable.from([Buffer.from('test data')]),
        contentType: 'image/png',
        contentLength: 50000,
      }),
    } as any;

    mockRepo = {
      findById: jest.fn(),
    } as any;

    service = new FileAccessService(mockStorage, mockRepo);
  });

  describe('getDownloadUrl', () => {
    it('should return direct CDN public URL for PUBLIC assets', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPublicAsset);

      const result = await service.getDownloadUrl('asset-public-1', {
        userId: 'any-user',
      });

      expect(result.isPublic).toBe(true);
      expect(result.url).toBe('https://download.r2.com/signed-url');
      expect(result.expiresInSeconds).toBeNull();
    });

    it('should generate signed URL for PRIVATE assets when authorized', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPrivateAsset);

      const result = await service.getDownloadUrl('asset-private-1', {
        userId: 'user-1', // Uploader
      });

      expect(result.isPublic).toBe(false);
      expect(result.url).toBe('https://download.r2.com/signed-url');
      expect(result.expiresInSeconds).toBe(3600);
    });

    it('should throw NotFoundException if actor is unauthorized (IDOR safety)', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPrivateAsset);

      await expect(
        service.getDownloadUrl('asset-private-1', {
          userId: 'unauthorized-user',
          salonId: 'salon-2',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if asset is not in READY status', async () => {
      const uploading = { ...mockPublicAsset, status: FileStatus.UPLOADING };
      mockRepo.findById.mockResolvedValueOnce(uploading);

      await expect(
        service.getDownloadUrl('asset-public-1', { userId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL for public ready asset', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPublicAsset);

      const url = await service.getPublicUrl('asset-public-1');
      expect(url).toBe('https://download.r2.com/signed-url');
    });

    it('should throw ForbiddenException if asset visibility is PRIVATE', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPrivateAsset);

      await expect(service.getPublicUrl('asset-private-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('downloadStream', () => {
    it('should return readable stream for authorized caller', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockPublicAsset);

      const streamResult = await service.downloadStream('asset-public-1', {
        userId: 'user-1',
      });

      expect(mockStorage.getDownloadStream).toHaveBeenCalledWith(
        mockPublicAsset.objectKey,
      );
      expect(streamResult.originalFileName).toBe('banner.png');
      expect(streamResult.contentType).toBe('image/png');
    });
  });
});
