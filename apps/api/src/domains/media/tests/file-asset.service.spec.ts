import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAssetService } from '../services/file-asset.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';

describe('FileAssetService', () => {
  let service: FileAssetService;
  let mockRepo: jest.Mocked<FileAssetRepository>;
  let mockLifecycle: jest.Mocked<FileLifecycleService>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockCache: jest.Mocked<CacheService>;

  const mockAsset = {
    id: 'asset-svc-1',
    salonId: 'salon-1',
    uploadedByUserId: 'user-1',
    originalFileName: 'service.jpg',
    storedFileName: 'stored-service.jpg',
    objectKey: 'salons/salon-1/service.jpg',
    bucket: 'saloon-assets',
    provider: 'R2',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 20000,
    checksum: null,
    status: FileStatus.READY,
    visibility: FileVisibility.PUBLIC,
    category: FileCategory.SERVICE,
    width: 800,
    height: 600,
    duration: null,
    metadata: null,
    altText: 'Haircut style',
    folder: 'services',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn().mockResolvedValue(mockAsset),
      findBySalon: jest.fn().mockResolvedValue({ data: [mockAsset], total: 1 }),
      findByUser: jest.fn().mockResolvedValue({ data: [mockAsset], total: 1 }),
      search: jest.fn().mockResolvedValue({ data: [mockAsset], total: 1 }),
      update: jest.fn().mockImplementation((id, data) =>
        Promise.resolve({ ...mockAsset, ...data }),
      ),
    } as any;

    mockLifecycle = {
      softDelete: jest.fn().mockResolvedValue({
        ...mockAsset,
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      }),
      restore: jest.fn().mockResolvedValue({
        ...mockAsset,
        status: FileStatus.READY,
        deletedAt: null,
      }),
    } as any;

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockCache = {
      delete: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as any;

    service = new FileAssetService(
      mockRepo,
      mockLifecycle,
      mockAudit,
      mockEventBus,
      mockCache,
    );
  });

  describe('findById', () => {
    it('should return asset for authorized actor', async () => {
      const result = await service.findById('asset-svc-1', {
        userId: 'user-1',
        salonId: 'salon-1',
      });
      expect(result.id).toBe('asset-svc-1');
    });

    it('should throw NotFoundException if asset does not exist', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.findById('missing', { userId: 'user-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySalon', () => {
    it('should return salon assets when actor belongs to salon', async () => {
      const result = await service.findBySalon('salon-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should reject access if actor belongs to a different salon', async () => {
      await expect(
        service.findBySalon('salon-1', {
          userId: 'user-2',
          salonId: 'salon-2',
          role: 'OWNER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update asset metadata, emit event, log audit, and evict cache', async () => {
      const result = await service.update(
        'asset-svc-1',
        { altText: 'Updated Haircut' },
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
      );

      expect(mockRepo.update).toHaveBeenCalledWith('asset-svc-1', {
        altText: 'Updated Haircut',
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_METADATA_UPDATED',
        }),
      );
      expect(mockCache.delete).toHaveBeenCalledWith('file:asset:asset-svc-1');
      expect(result.altText).toBe('Updated Haircut');
    });
  });

  describe('changeVisibility', () => {
    it('should change visibility and emit FileAssetVisibilityChangedEvent', async () => {
      const result = await service.changeVisibility(
        'asset-svc-1',
        FileVisibility.TENANT,
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
      );

      expect(mockRepo.update).toHaveBeenCalledWith('asset-svc-1', {
        visibility: FileVisibility.TENANT,
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(result.visibility).toBe(FileVisibility.TENANT);
    });
  });

  describe('delete & restore delegation', () => {
    it('should delegate delete to lifecycle service and clear cache', async () => {
      const result = await service.delete('asset-svc-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });
      expect(mockLifecycle.softDelete).toHaveBeenCalledWith('asset-svc-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });
      expect(mockCache.delete).toHaveBeenCalledWith('file:asset:asset-svc-1');
      expect(result.status).toBe(FileStatus.DELETED);
    });

    it('should delegate restore to lifecycle service and clear cache', async () => {
      const result = await service.restore('asset-svc-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });
      expect(mockLifecycle.restore).toHaveBeenCalledWith('asset-svc-1', {
        userId: 'user-1',
        salonId: 'salon-1',
        role: 'OWNER',
      });
      expect(mockCache.delete).toHaveBeenCalledWith('file:asset:asset-svc-1');
      expect(result.status).toBe(FileStatus.READY);
    });
  });
});
