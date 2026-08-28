import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { FileCategory, FileVisibility } from '@prisma/client';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { SearchFileAssetsQueryDto, UpdateFileAssetData } from '../dto/file-asset.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import {
  FileAssetMetadataUpdatedEvent,
  FileAssetVisibilityChangedEvent,
} from '../events/file-asset.events';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAssetCacheService } from './file-asset-cache.service';
import { FileAuthorizationService } from './file-authorization.service';
import { FileLifecycleService } from './file-lifecycle.service';

/**
 * FileAssetService — Core coordinator for file asset queries, updates,
 * visibility/category modifications, and life-cycle delegation.
 */
@Injectable()
export class FileAssetService {
  private readonly logger = new Logger(FileAssetService.name);

  constructor(
    private readonly repository: FileAssetRepository,
    private readonly lifecycleService: FileLifecycleService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
    private readonly authzService: FileAuthorizationService = new FileAuthorizationService(),
    @Optional()
    private readonly fileAssetCacheService?: FileAssetCacheService,
  ) {}

  public async findById(
    id: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    let rawAsset: FileAssetEntity | null = null;
    if (this.fileAssetCacheService) {
      rawAsset = await this.fileAssetCacheService.getOrSetAsset(id, async () => {
        const found = await this.repository.findById(id);
        return found ? (found instanceof FileAssetEntity ? found : new FileAssetEntity(found)) : null;
      });
    } else {
      const found = await this.repository.findById(id);
      rawAsset = found ? (found instanceof FileAssetEntity ? found : new FileAssetEntity(found)) : null;
    }
    return this.authzService.assertCanRead(rawAsset, actor, id);
  }

  public async findBySalon(
    salonId: string,
    actor: FileAssetActorContext,
    options?: { page?: number; limit?: number; category?: FileCategory },
  ): Promise<{ data: FileAssetEntity[]; total: number }> {
    if (!this.isAdmin(actor) && actor.salonId !== salonId) {
      throw new ForbiddenException('Not authorized to access assets for this salon.');
    }

    const result = await this.repository.findBySalon(salonId, options);
    return {
      data: result.data.map((m) => new FileAssetEntity(m)),
      total: result.total,
    };
  }

  public async findByUser(
    userId: string,
    actor: FileAssetActorContext,
    options?: { page?: number; limit?: number; category?: FileCategory },
  ): Promise<{ data: FileAssetEntity[]; total: number }> {
    if (!this.isAdmin(actor) && actor.userId !== userId) {
      throw new ForbiddenException('Not authorized to access assets for this user.');
    }

    const result = await this.repository.findByUser(userId, options);
    return {
      data: result.data.map((m) => new FileAssetEntity(m)),
      total: result.total,
    };
  }

  public async search(
    query: SearchFileAssetsQueryDto,
    actor: FileAssetActorContext,
  ): Promise<{ data: FileAssetEntity[]; total: number }> {
    // Tenant safety enforcement: non-admins cannot cross tenant boundaries
    const effectiveQuery: SearchFileAssetsQueryDto = { ...query };

    if (!this.isAdmin(actor)) {
      if (actor.salonId) {
        effectiveQuery.salonId = actor.salonId;
      } else {
        effectiveQuery.uploadedByUserId = actor.userId;
      }
    }

    const result = await this.repository.search(effectiveQuery);
    return {
      data: result.data.map((m) => new FileAssetEntity(m)),
      total: result.total,
    };
  }

  public async update(
    id: string,
    data: UpdateFileAssetData,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(id);
    this.authzService.assertCanModify(rawAsset, actor, id);

    const sanitizedData: UpdateFileAssetData = { ...data };
    if (data.originalFileName) {
      sanitizedData.originalFileName = FileSecurityUtil.sanitizeFileName(data.originalFileName);
    }
    if (data.metadata !== undefined) {
      sanitizedData.metadata = data.metadata
        ? FileSecurityUtil.sanitizeCustomMetadata(data.metadata)
        : null;
    }

    const updatedRaw = await this.repository.update(id, sanitizedData);
    const updated = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetMetadataUpdatedEvent(
        {
          assetId: updated.id,
          salonId: updated.salonId,
          updatedByUserId: actor.userId,
          updatedFields: data,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_METADATA_UPDATED',
      entityType: 'FileAsset',
      entityId: updated.id,
      actorId: actor.userId,
      metadata: { updatedFields: data },
    });

    await this.cacheService.delete(`file:asset:${id}`);
    await this.fileAssetCacheService?.invalidateAsset(id, updated.salonId, updated.uploadedByUserId);

    return updated;
  }

  public async changeVisibility(
    id: string,
    visibility: FileVisibility,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(id);
    const asset = this.authzService.assertCanChangeVisibility(rawAsset, actor, visibility, id);

    const previousVisibility = asset.visibility;
    asset.changeVisibility(visibility);

    const updatedRaw = await this.repository.update(id, { visibility });
    const updated = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetVisibilityChangedEvent(
        {
          assetId: updated.id,
          salonId: updated.salonId,
          previousVisibility,
          newVisibility: visibility,
          changedByUserId: actor.userId,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_VISIBILITY_CHANGED',
      entityType: 'FileAsset',
      entityId: updated.id,
      actorId: actor.userId,
      metadata: { previousVisibility, newVisibility: visibility },
    });

    await this.cacheService.delete(`file:asset:${id}`);
    await this.fileAssetCacheService?.invalidateAsset(id, updated.salonId, updated.uploadedByUserId);

    return updated;
  }

  public async changeCategory(
    id: string,
    category: FileCategory,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(id);
    const asset = this.authzService.assertCanChangeCategory(rawAsset, actor, category, id);

    asset.changeCategory(category);
    const updatedRaw = await this.repository.update(id, { category });
    const updated = new FileAssetEntity(updatedRaw);

    await this.cacheService.delete(`file:asset:${id}`);
    await this.fileAssetCacheService?.invalidateAsset(id, updated.salonId, updated.uploadedByUserId);
    return updated;
  }

  public async delete(
    id: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const deleted = await this.lifecycleService.softDelete(id, actor);
    await this.cacheService.delete(`file:asset:${id}`);
    await this.fileAssetCacheService?.invalidateAsset(id, deleted.salonId, deleted.uploadedByUserId);
    return deleted;
  }

  public async restore(
    id: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const restored = await this.lifecycleService.restore(id, actor);
    await this.cacheService.delete(`file:asset:${id}`);
    await this.fileAssetCacheService?.invalidateAsset(id, restored.salonId, restored.uploadedByUserId);
    return restored;
  }

  private isAdmin(actor: FileAssetActorContext): boolean {
    return actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN';
  }
}
