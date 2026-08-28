import {
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  FILE_ASSET_CACHE_KEYS,
  FILE_ASSET_CACHE_TTL,
} from '../constants/file-asset-cache.constants';
import { CachedFileAssetDto } from '../dto/cached-file-asset.dto';
import { FileAssetEntity } from '../entities/file-asset.entity';
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

/**
 * FileAssetCacheService — Dedicated caching coordinator for FileAsset domain entities.
 *
 * Responsibilities:
 *  - Cache-aside retrieval and population for read-heavy metadata lookups
 *  - Fail-safe fallback to database on Redis read/write errors
 *  - Event-driven and direct cache invalidation on lifecycle/mutation state changes
 *  - Single-flight coalescing for stampede protection under high concurrent load
 *  - Clear tenant and user key isolation (preventing cross-tenant cache contamination)
 *  - Zero caching of sensitive binary bodies or presigned URL query signatures
 */
@Injectable()
export class FileAssetCacheService implements OnModuleInit {
  private readonly logger = new Logger(FileAssetCacheService.name);
  private readonly inFlightRequests = new Map<string, Promise<FileAssetEntity | null>>();

  constructor(
    private readonly cacheService: CacheService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  /**
   * Initializes event-driven cache invalidation subscriptions on module bootstrap.
   */
  public onModuleInit(): void {
    if (!this.eventBus) {
      return;
    }

    const invalidationEvents = [
      FileAssetUploadedEvent.EVENT_NAME,
      FileAssetReadyEvent.EVENT_NAME,
      FileAssetFailedEvent.EVENT_NAME,
      FileAssetDeletedEvent.EVENT_NAME,
      FileAssetRestoredEvent.EVENT_NAME,
      FileAssetMetadataUpdatedEvent.EVENT_NAME,
      FileAssetVisibilityChangedEvent.EVENT_NAME,
      FileAssetCategoryChangedEvent.EVENT_NAME,
    ];

    for (const eventName of invalidationEvents) {
      this.eventBus.subscribe(eventName, async (event: any) => {
        const assetId = event.payload?.assetId || event.aggregateId;
        const salonId = event.payload?.salonId;
        if (assetId) {
          await this.invalidateAsset(assetId, salonId);
        }
      });
    }

    this.logger.log('[FileAssetCacheService] Event-driven cache invalidation hooks registered.');
  }

  // ─── Cache Operations ───────────────────────────────────────────────────────

  /**
   * Retrieves a cached FileAsset DTO or returns null if miss / error.
   */
  public async getAsset(assetId: string): Promise<CachedFileAssetDto | null> {
    if (!assetId || typeof assetId !== 'string') {
      return null;
    }

    const key = FILE_ASSET_CACHE_KEYS.ASSET_BY_ID(assetId);
    try {
      return await this.cacheService.get<CachedFileAssetDto>(key);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache GET error';
      this.logger.warn(`Fail-safe GET error for ${key}: ${message}`);
      return null;
    }
  }

  /**
   * Stores a FileAsset in cache with appropriate volatility-based TTL.
   */
  public async setAsset(
    asset: FileAssetEntity | CachedFileAssetDto,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!asset || !asset.id) {
      return;
    }

    const dto = asset instanceof FileAssetEntity ? this.entityToDto(asset) : asset;
    const ttl =
      ttlSeconds ??
      (dto.status === FileStatus.READY
        ? FILE_ASSET_CACHE_TTL.STABLE_METADATA
        : FILE_ASSET_CACHE_TTL.VOLATILE_METADATA);

    const primaryKey = FILE_ASSET_CACHE_KEYS.ASSET_BY_ID(dto.id);

    try {
      await this.cacheService.set(primaryKey, dto, ttl);

      // Populate tenant-isolated key if salon-scoped
      if (dto.salonId) {
        const tenantKey = FILE_ASSET_CACHE_KEYS.TENANT_ASSET(dto.salonId, dto.id);
        await this.cacheService.set(tenantKey, dto, ttl);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache SET error';
      this.logger.warn(`Fail-safe SET error for asset ${dto.id}: ${message}`);
    }
  }

  /**
   * Invalidates all cache entries associated with an asset.
   */
  public async invalidateAsset(
    assetId: string,
    salonId?: string | null,
    userId?: string | null,
  ): Promise<void> {
    if (!assetId || typeof assetId !== 'string') {
      return;
    }

    const keysToDelete = [
      FILE_ASSET_CACHE_KEYS.ASSET_BY_ID(assetId),
      FILE_ASSET_CACHE_KEYS.PUBLIC_ASSET(assetId),
    ];

    if (salonId) {
      keysToDelete.push(FILE_ASSET_CACHE_KEYS.TENANT_ASSET(salonId, assetId));
      keysToDelete.push(FILE_ASSET_CACHE_KEYS.TENANT_SUMMARY(salonId));
    }

    if (userId) {
      keysToDelete.push(FILE_ASSET_CACHE_KEYS.USER_ASSET(userId, assetId));
    }

    for (const key of keysToDelete) {
      try {
        await this.cacheService.delete(key);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Cache DEL error';
        this.logger.warn(`Fail-safe DEL error for key ${key}: ${message}`);
      }
    }
  }

  /**
   * Invalidates all cached summaries for a salon tenant.
   */
  public async invalidateTenant(salonId: string): Promise<void> {
    if (!salonId) {
      return;
    }

    try {
      await this.cacheService.delete(FILE_ASSET_CACHE_KEYS.TENANT_SUMMARY(salonId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cache DEL error';
      this.logger.warn(`Fail-safe DEL error for tenant ${salonId}: ${message}`);
    }
  }

  /**
   * Cache-Aside coordinator with single-flight stampede coalescing:
   * 1. Checks cache for asset.
   * 2. If cached, reconstructs FileAssetEntity and returns.
   * 3. If missing, coalesces concurrent in-flight queries to a single database call.
   * 4. Populates cache on successful query.
   */
  public async getOrSetAsset(
    assetId: string,
    factory: () => Promise<FileAssetEntity | null>,
    ttlSeconds?: number,
  ): Promise<FileAssetEntity | null> {
    if (!assetId || typeof assetId !== 'string') {
      return factory();
    }

    // 1. Try cache read
    const cachedDto = await this.getAsset(assetId);
    if (cachedDto !== null) {
      return this.dtoToEntity(cachedDto);
    }

    // 2. Single-flight stampede protection
    const inFlight = this.inFlightRequests.get(assetId);
    if (inFlight) {
      return inFlight;
    }

    const queryPromise = (async () => {
      try {
        const freshEntity = await factory();
        if (freshEntity !== null) {
          await this.setAsset(freshEntity, ttlSeconds);
        }
        return freshEntity;
      } finally {
        this.inFlightRequests.delete(assetId);
      }
    })();

    this.inFlightRequests.set(assetId, queryPromise);
    return queryPromise;
  }

  // ─── Serialization Converters ─────────────────────────────────────────────

  /**
   * Converts a FileAssetEntity to a safely serializable CachedFileAssetDto.
   */
  public entityToDto(entity: FileAssetEntity): CachedFileAssetDto {
    return {
      id: entity.id,
      salonId: entity.salonId ?? null,
      uploadedByUserId: entity.uploadedByUserId,
      originalFileName: entity.originalFileName,
      storedFileName: entity.storedFileName,
      objectKey: entity.objectKey,
      bucket: entity.bucket,
      provider: entity.provider,
      mimeType: entity.mimeType,
      extension: entity.extension,
      sizeBytes: entity.sizeBytes,
      checksum: entity.checksum ?? null,
      status: entity.status,
      visibility: entity.visibility,
      category: entity.category,
      width: entity.width ?? null,
      height: entity.height ?? null,
      duration: entity.duration ?? null,
      metadata: entity.metadata ?? null,
      altText: entity.altText ?? null,
      folder: entity.folder ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      deletedAt: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    };
  }

  /**
   * Reconstructs a FileAssetEntity from a CachedFileAssetDto.
   */
  public dtoToEntity(dto: CachedFileAssetDto): FileAssetEntity {
    return new FileAssetEntity({
      id: dto.id,
      salonId: dto.salonId,
      uploadedByUserId: dto.uploadedByUserId,
      originalFileName: dto.originalFileName,
      storedFileName: dto.storedFileName,
      objectKey: dto.objectKey,
      bucket: dto.bucket,
      provider: dto.provider,
      mimeType: dto.mimeType,
      extension: dto.extension,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum,
      status: dto.status,
      visibility: dto.visibility,
      category: dto.category,
      width: dto.width,
      height: dto.height,
      duration: dto.duration,
      metadata: dto.metadata,
      altText: dto.altText,
      folder: dto.folder,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    });
  }
}
