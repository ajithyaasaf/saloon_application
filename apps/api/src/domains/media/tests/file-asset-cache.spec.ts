import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility, UserRole } from '@prisma/client';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  FILE_ASSET_CACHE_KEYS,
  FILE_ASSET_CACHE_TTL,
} from '../constants/file-asset-cache.constants';
import { CachedFileAssetDto } from '../dto/cached-file-asset.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import {
  FileAssetCategoryChangedEvent,
  FileAssetDeletedEvent,
  FileAssetFailedEvent,
  FileAssetMetadataUpdatedEvent,
  FileAssetReadyEvent,
  FileAssetRestoredEvent,
  FileAssetUploadedEvent,
  FileAssetVisibilityChangedEvent,
} from '../events/file-asset.events';
import { FileAssetCacheService } from '../services/file-asset-cache.service';
import { FileAssetService } from '../services/file-asset.service';
import { FileAuthorizationService } from '../services/file-authorization.service';

describe('Phase 20.11 — File Asset Cache Suite', () => {
  let cacheServiceMock: jest.Mocked<Partial<CacheService>>;
  let eventBusMock: jest.Mocked<Partial<EventBusService>>;
  let fileAssetCacheService: FileAssetCacheService;

  const sampleDate = new Date('2026-08-18T12:00:00.000Z');

  const createSampleEntity = (overrides?: Partial<any>): FileAssetEntity => {
    return new FileAssetEntity({
      id: 'asset-test-123',
      salonId: 'salon-456',
      uploadedByUserId: 'user-789',
      originalFileName: 'avatar.png',
      storedFileName: 'stored-avatar.png',
      objectKey: 'tenants/salon-456/profile/2026/08/asset-test-123/abc.png',
      bucket: 'test-bucket',
      provider: 'R2',
      mimeType: 'image/png',
      extension: 'png',
      sizeBytes: 1024,
      visibility: FileVisibility.TENANT,
      category: FileCategory.PROFILE,
      status: FileStatus.READY,
      checksum: 'sha256-abc',
      width: 400,
      height: 400,
      metadata: { width: 400, height: 400 },
      createdAt: sampleDate,
      updatedAt: sampleDate,
      deletedAt: null,
      ...overrides,
    });
  };

  beforeEach(() => {
    cacheServiceMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };

    eventBusMock = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockReturnValue(undefined),
    };

    fileAssetCacheService = new FileAssetCacheService(
      cacheServiceMock as CacheService,
      eventBusMock as EventBusService,
    );
  });

  describe('1. Cache Key Strategy & Versioning', () => {
    it('should generate versioned asset key by ID', () => {
      const key = FILE_ASSET_CACHE_KEYS.ASSET_BY_ID('asset-123');
      expect(key).toBe('file:v1:asset:asset-123');
    });

    it('should generate versioned tenant-scoped asset key', () => {
      const key = FILE_ASSET_CACHE_KEYS.TENANT_ASSET('salon-1', 'asset-123');
      expect(key).toBe('file:v1:tenant:salon-1:asset:asset-123');
    });

    it('should generate versioned user-scoped asset key', () => {
      const key = FILE_ASSET_CACHE_KEYS.USER_ASSET('user-99', 'asset-123');
      expect(key).toBe('file:v1:user:user-99:asset:asset-123');
    });

    it('should generate public asset key and tenant summary key', () => {
      expect(FILE_ASSET_CACHE_KEYS.PUBLIC_ASSET('asset-123')).toBe('file:v1:public:asset:asset-123');
      expect(FILE_ASSET_CACHE_KEYS.TENANT_SUMMARY('salon-1')).toBe('file:v1:tenant:salon-1:summary');
    });
  });

  describe('2. Serialization & Deserialization', () => {
    it('should serialize FileAssetEntity to CachedFileAssetDto safely', () => {
      const entity = createSampleEntity();
      const dto = fileAssetCacheService.entityToDto(entity);

      expect(dto.id).toBe(entity.id);
      expect(dto.salonId).toBe('salon-456');
      expect(dto.uploadedByUserId).toBe('user-789');
      expect(dto.createdAt).toBe(sampleDate.toISOString());
      expect(dto.updatedAt).toBe(sampleDate.toISOString());
      expect(dto.deletedAt).toBeNull();
      expect(dto.metadata).toEqual({ width: 400, height: 400 });
    });

    it('should reconstruct FileAssetEntity from CachedFileAssetDto correctly', () => {
      const entity = createSampleEntity();
      const dto = fileAssetCacheService.entityToDto(entity);
      const reconstructed = fileAssetCacheService.dtoToEntity(dto);

      expect(reconstructed.id).toBe(entity.id);
      expect(reconstructed.salonId).toBe(entity.salonId);
      expect(reconstructed.createdAt).toEqual(sampleDate);
      expect(reconstructed.updatedAt).toEqual(sampleDate);
      expect(reconstructed.isReady()).toBe(true);
      expect(reconstructed.isTenantScoped()).toBe(true);
    });
  });

  describe('3. Cache-Aside Operations & TTL Strategy', () => {
    it('should store READY asset with STABLE_METADATA TTL (3600s)', async () => {
      const entity = createSampleEntity({ status: FileStatus.READY });
      await fileAssetCacheService.setAsset(entity);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:asset-test-123',
        expect.objectContaining({ id: 'asset-test-123', status: FileStatus.READY }),
        FILE_ASSET_CACHE_TTL.STABLE_METADATA,
      );
      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:tenant:salon-456:asset:asset-test-123',
        expect.objectContaining({ id: 'asset-test-123' }),
        FILE_ASSET_CACHE_TTL.STABLE_METADATA,
      );
    });

    it('should store UPLOADING asset with VOLATILE_METADATA TTL (120s)', async () => {
      const entity = createSampleEntity({ status: FileStatus.UPLOADING });
      await fileAssetCacheService.setAsset(entity);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:asset-test-123',
        expect.objectContaining({ id: 'asset-test-123', status: FileStatus.UPLOADING }),
        FILE_ASSET_CACHE_TTL.VOLATILE_METADATA,
      );
    });

    it('should return cached entity on cache hit without invoking factory', async () => {
      const entity = createSampleEntity();
      const dto = fileAssetCacheService.entityToDto(entity);
      (cacheServiceMock.get as jest.Mock).mockResolvedValue(dto);

      const factory = jest.fn();
      const result = await fileAssetCacheService.getOrSetAsset(entity.id, factory);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(entity.id);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should query factory and populate cache on cache miss', async () => {
      const entity = createSampleEntity();
      (cacheServiceMock.get as jest.Mock).mockResolvedValue(null);

      const factory = jest.fn().mockResolvedValue(entity);
      const result = await fileAssetCacheService.getOrSetAsset(entity.id, factory);

      expect(result).toEqual(entity);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:asset-test-123',
        expect.objectContaining({ id: 'asset-test-123' }),
        FILE_ASSET_CACHE_TTL.STABLE_METADATA,
      );
    });
  });

  describe('4. Cache Stampede Protection (Single-Flight Coalescing)', () => {
    it('should coalesce multiple concurrent cold misses into a single database factory invocation', async () => {
      const entity = createSampleEntity();
      (cacheServiceMock.get as jest.Mock).mockResolvedValue(null);

      let factoryCallCount = 0;
      const factory = jest.fn().mockImplementation(async () => {
        factoryCallCount++;
        // Small async delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return entity;
      });

      // Fire 5 concurrent requests simultaneously
      const results = await Promise.all([
        fileAssetCacheService.getOrSetAsset(entity.id, factory),
        fileAssetCacheService.getOrSetAsset(entity.id, factory),
        fileAssetCacheService.getOrSetAsset(entity.id, factory),
        fileAssetCacheService.getOrSetAsset(entity.id, factory),
        fileAssetCacheService.getOrSetAsset(entity.id, factory),
      ]);

      expect(factoryCallCount).toBe(1);
      expect(results).toHaveLength(5);
      for (const res of results) {
        expect(res?.id).toBe(entity.id);
      }
    });
  });

  describe('5. Direct & Multi-Tenant Cache Invalidation', () => {
    it('should invalidate global, tenant, user, and public cache keys on asset deletion/mutation', async () => {
      await fileAssetCacheService.invalidateAsset('asset-test-123', 'salon-456', 'user-789');

      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:asset:asset-test-123');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:public:asset:asset-test-123');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:tenant:salon-456:asset:asset-test-123');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:tenant:salon-456:summary');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:user:user-789:asset:asset-test-123');
    });

    it('should invalidate tenant summary key', async () => {
      await fileAssetCacheService.invalidateTenant('salon-456');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:tenant:salon-456:summary');
    });
  });

  describe('6. Event-Driven Cache Invalidation', () => {
    it('should register event subscriptions on module initialization', () => {
      fileAssetCacheService.onModuleInit();

      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetUploadedEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetReadyEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetFailedEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetDeletedEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetRestoredEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetMetadataUpdatedEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetVisibilityChangedEvent.EVENT_NAME,
        expect.any(Function),
      );
      expect(eventBusMock.subscribe).toHaveBeenCalledWith(
        FileAssetCategoryChangedEvent.EVENT_NAME,
        expect.any(Function),
      );
    });

    it('should invalidate cache when a subscribed domain event triggers', async () => {
      const handlers: Record<string, Function> = {};
      (eventBusMock.subscribe as jest.Mock).mockImplementation((eventName: string, handler: Function) => {
        handlers[eventName] = handler;
      });

      fileAssetCacheService.onModuleInit();

      // Trigger FileAssetReadyEvent handler
      const readyHandler = handlers[FileAssetReadyEvent.EVENT_NAME];
      expect(readyHandler).toBeDefined();

      await readyHandler({
        eventName: 'file.asset.ready.v1',
        payload: { assetId: 'asset-ev-1', salonId: 'salon-ev-1' },
      });

      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:asset:asset-ev-1');
      expect(cacheServiceMock.delete).toHaveBeenCalledWith('file:v1:tenant:salon-ev-1:asset:asset-ev-1');
    });
  });

  describe('7. Fail-Safe Resilience (Redis Errors Never Break Flow)', () => {
    it('should log warning and return factory result when cache GET throws', async () => {
      (cacheServiceMock.get as jest.Mock).mockRejectedValue(new Error('Redis connection timeout'));

      const entity = createSampleEntity();
      const factory = jest.fn().mockResolvedValue(entity);

      const result = await fileAssetCacheService.getOrSetAsset(entity.id, factory);
      expect(result).toEqual(entity);
      expect(factory).toHaveBeenCalled();
    });

    it('should log warning and continue when cache SET throws', async () => {
      (cacheServiceMock.set as jest.Mock).mockRejectedValue(new Error('OOM command not allowed'));

      const entity = createSampleEntity();
      await expect(fileAssetCacheService.setAsset(entity)).resolves.not.toThrow();
    });

    it('should log warning and continue when cache DEL throws', async () => {
      (cacheServiceMock.delete as jest.Mock).mockRejectedValue(new Error('Cluster down'));

      await expect(
        fileAssetCacheService.invalidateAsset('asset-123', 'salon-1', 'user-1'),
      ).resolves.not.toThrow();
    });
  });

  describe('8. Security Invariant: Authorization NEVER Bypassed by Cache Hits', () => {
    let mockRepo: any;
    let mockLifecycle: any;
    let mockAudit: any;
    let mockEventBus: any;
    let fileAssetService: FileAssetService;

    beforeEach(() => {
      mockRepo = {
        findById: jest.fn(),
        update: jest.fn(),
      };
      mockLifecycle = {
        softDelete: jest.fn(),
        restore: jest.fn(),
      };
      mockAudit = { log: jest.fn() };
      mockEventBus = { publish: jest.fn() };

      fileAssetService = new FileAssetService(
        mockRepo,
        mockLifecycle,
        mockAudit,
        mockEventBus,
        cacheServiceMock as CacheService,
        new FileAuthorizationService(),
        fileAssetCacheService,
      );
    });

    it('should deny unauthorized tenant user even when asset is cached in Redis', async () => {
      const entity = createSampleEntity({
        salonId: 'salon-TENANT-A',
        visibility: FileVisibility.TENANT,
      });
      const dto = fileAssetCacheService.entityToDto(entity);
      (cacheServiceMock.get as jest.Mock).mockResolvedValue(dto);

      // Actor is from a different salon (TENANT B)
      const unauthorizedActor: FileAssetActorContext = {
        userId: 'user-tenant-b',
        role: UserRole.SALON_OWNER,
        salonId: 'salon-TENANT-B',
      };

      await expect(
        fileAssetService.findById(entity.id, unauthorizedActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow authorized tenant user when asset is cached in Redis', async () => {
      const entity = createSampleEntity({
        salonId: 'salon-TENANT-A',
        visibility: FileVisibility.TENANT,
      });
      const dto = fileAssetCacheService.entityToDto(entity);
      (cacheServiceMock.get as jest.Mock).mockResolvedValue(dto);

      // Actor is from the same salon
      const authorizedActor: FileAssetActorContext = {
        userId: 'user-tenant-a',
        role: UserRole.SALON_STAFF,
        salonId: 'salon-TENANT-A',
      };

      const result = await fileAssetService.findById(entity.id, authorizedActor);
      expect(result.id).toBe(entity.id);
      expect(mockRepo.findById).not.toHaveBeenCalled(); // Cache hit!
    });
  });

  describe('9. Storage Provider Independence', () => {
    it('should work identically across R2, S3, and LOCAL providers', async () => {
      const r2Entity = createSampleEntity({ provider: 'R2' });
      const s3Entity = createSampleEntity({ provider: 'S3', id: 's3-asset' });
      const localEntity = createSampleEntity({ provider: 'LOCAL', id: 'local-asset' });

      await fileAssetCacheService.setAsset(r2Entity);
      await fileAssetCacheService.setAsset(s3Entity);
      await fileAssetCacheService.setAsset(localEntity);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:asset-test-123',
        expect.objectContaining({ provider: 'R2' }),
        expect.any(Number),
      );
      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:s3-asset',
        expect.objectContaining({ provider: 'S3' }),
        expect.any(Number),
      );
      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        'file:v1:asset:local-asset',
        expect.objectContaining({ provider: 'LOCAL' }),
        expect.any(Number),
      );
    });
  });
});
