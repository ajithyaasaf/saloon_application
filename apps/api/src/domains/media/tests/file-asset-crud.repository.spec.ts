import { NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';

describe('FileAssetRepository - Basic CRUD Operations', () => {
  let repository: FileAssetRepository;
  let mockDb: any;

  const mockFileAsset = {
    id: 'asset-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'avatar.jpg',
    storedFileName: 'stored-avatar-123.jpg',
    objectKey: 'salons/salon-1/avatar.jpg',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 10240,
    checksum: 'sha256-hash-1',
    status: FileStatus.UPLOADING,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.PROFILE,
    width: 400,
    height: 400,
    duration: null,
    metadata: { tag: 'profile' },
    altText: 'User avatar',
    folder: 'avatars',
    createdAt: new Date('2026-08-18T00:00:00Z'),
    updatedAt: new Date('2026-08-18T00:00:00Z'),
    deletedAt: null,
  };

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

  describe('create', () => {
    it('should successfully create a new FileAsset', async () => {
      mockDb.fileAsset.create.mockResolvedValueOnce(mockFileAsset);

      const result = await repository.create({
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'avatar.jpg',
        storedFileName: 'stored-avatar-123.jpg',
        objectKey: 'salons/salon-1/avatar.jpg',
        bucket: 'saloon-assets',
        provider: 'R2',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        sizeBytes: 10240,
        checksum: 'sha256-hash-1',
        visibility: FileVisibility.PUBLIC,
        category: FileCategory.PROFILE,
        width: 400,
        height: 400,
      });

      expect(mockDb.fileAsset.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFileAsset);
      expect(result.id).toBe('asset-1');
      expect(result.status).toBe(FileStatus.UPLOADING);
    });
  });

  describe('findById', () => {
    it('should find active asset by id', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(mockFileAsset);

      const result = await repository.findById('asset-1');
      expect(mockDb.fileAsset.findFirst).toHaveBeenCalledWith({
        where: { id: 'asset-1', deletedAt: null },
      });
      expect(result).toEqual(mockFileAsset);
    });

    it('should return null if asset not found', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update asset fields successfully', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(mockFileAsset);
      const updatedAsset = { ...mockFileAsset, altText: 'Updated alt text', width: 800 };
      mockDb.fileAsset.update.mockResolvedValueOnce(updatedAsset);

      const result = await repository.update('asset-1', {
        altText: 'Updated alt text',
        width: 800,
      });

      expect(result.altText).toBe('Updated alt text');
      expect(result.width).toBe(800);
    });

    it('should throw NotFoundException when updating non-existent asset', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(null);

      await expect(repository.update('missing', { altText: 'text' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMetadata', () => {
    it('should merge and update metadata on asset', async () => {
      mockDb.fileAsset.findFirst.mockResolvedValueOnce(mockFileAsset);
      const updated = {
        ...mockFileAsset,
        sizeBytes: 20480,
        metadata: { tag: 'profile', extra: 'data' },
      };
      mockDb.fileAsset.update.mockResolvedValueOnce(updated);

      const result = await repository.updateMetadata('asset-1', {
        sizeBytes: 20480,
        metadata: { extra: 'data' },
      });

      expect(result.sizeBytes).toBe(20480);
      expect(result.metadata).toEqual({ tag: 'profile', extra: 'data' });
    });
  });
});
