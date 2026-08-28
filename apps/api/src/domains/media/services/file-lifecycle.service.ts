import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileCategory, FileStatus } from '@prisma/client';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { STORAGE_PROVIDER_TOKEN } from '../../../infrastructure/storage/constants/storage.constants';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { UpdateFileAssetMetadataData } from '../dto/file-asset.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import {
  FileAssetDeletedEvent,
  FileAssetFailedEvent,
  FileAssetProcessingEvent,
  FileAssetReadyEvent,
  FileAssetRestoredEvent,
  FileAssetUploadedEvent,
} from '../events/file-asset.events';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAuthorizationService } from './file-authorization.service';
import { CATEGORY_FILE_SIZE_LIMITS } from './file-upload.service';

/**
 * FileLifecycleService — Manages state transitions, physical storage checks,
 * finalization, soft deletion, and storage-verified restoration.
 */
@Injectable()
export class FileLifecycleService {
  private readonly logger = new Logger(FileLifecycleService.name);

  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
    private readonly repository: FileAssetRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly authzService: FileAuthorizationService = new FileAuthorizationService(),
  ) {}

  /**
   * Finalizes an upload after the client has directly PUT to the storage provider:
   * 1. Verifies physical file existence in storage.
   * 2. Retrieves metadata and asserts file size is non-zero and within category limits.
   * 3. Validates binary content signature from stream header where feasible.
   * 4. Transitions status from UPLOADING -> READY.
   * 5. Emits FileAssetUploadedEvent + FileAssetReadyEvent and logs audit trail.
   */
  public async finalizeUpload(
    assetId: string,
    actor: FileAssetActorContext,
    options?: { expectedSize?: number; checksum?: string },
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(
      assetId,
      actor.salonId ?? undefined,
    );
    const asset = this.authzService.assertCanModify(rawAsset, actor, assetId);

    if (asset.isReady()) {
      return asset; // Idempotent
    }

    if (asset.isDeleted()) {
      throw new BadRequestException(`Cannot finalize deleted file asset "${asset.id}".`);
    }

    // Verify physical object presence in storage
    const exists = await this.storageProvider.exists(asset.objectKey);
    if (!exists) {
      const reason = 'Physical object not found in storage. Upload was not completed.';
      await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
      await this.eventBus.publish(
        new FileAssetFailedEvent(
          {
            assetId: asset.id,
            salonId: asset.salonId,
            objectKey: asset.objectKey,
            reason,
          },
          actor.userId,
        ),
      );
      await this.auditService.log({
        action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
        entityType: 'FileAsset',
        entityId: asset.id,
        actorId: actor.userId,
        metadata: { reason, objectKey: asset.objectKey },
      });
      throw new BadRequestException(reason);
    }

    // Retrieve storage metadata
    const storageMeta = await this.storageProvider.getMetadata(asset.objectKey);
    if (!storageMeta) {
      const reason = 'Physical object metadata not found in storage.';
      await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
      throw new BadRequestException(reason);
    }

    // Physical Size Verification (Zero-byte & Category Upper Limits)
    if (storageMeta.sizeBytes <= 0) {
      const reason = 'Uploaded file is empty (0 bytes).';
      await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
      await this.eventBus.publish(
        new FileAssetFailedEvent(
          {
            assetId: asset.id,
            salonId: asset.salonId,
            objectKey: asset.objectKey,
            reason,
          },
          actor.userId,
        ),
      );
      await this.auditService.log({
        action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
        entityType: 'FileAsset',
        entityId: asset.id,
        actorId: actor.userId,
        metadata: { reason, sizeBytes: storageMeta.sizeBytes },
      });
      throw new BadRequestException(reason);
    }

    const maxSizeBytes = CATEGORY_FILE_SIZE_LIMITS[asset.category] ?? 50 * 1024 * 1024;
    if (storageMeta.sizeBytes > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      const reason = `Uploaded file size (${storageMeta.sizeBytes} bytes) exceeds maximum limit for category "${asset.category}" (${maxMb} MB).`;
      await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
      await this.eventBus.publish(
        new FileAssetFailedEvent(
          {
            assetId: asset.id,
            salonId: asset.salonId,
            objectKey: asset.objectKey,
            reason,
          },
          actor.userId,
        ),
      );
      await this.auditService.log({
        action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
        entityType: 'FileAsset',
        entityId: asset.id,
        actorId: actor.userId,
        metadata: { reason, sizeBytes: storageMeta.sizeBytes, maxSizeBytes },
      });
      throw new BadRequestException(reason);
    }

    if (
      options?.expectedSize !== undefined &&
      storageMeta.sizeBytes !== options.expectedSize
    ) {
      const reason = `Uploaded file size (${storageMeta.sizeBytes} bytes) does not match expected size (${options.expectedSize} bytes).`;
      await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
      await this.eventBus.publish(
        new FileAssetFailedEvent(
          {
            assetId: asset.id,
            salonId: asset.salonId,
            objectKey: asset.objectKey,
            reason,
          },
          actor.userId,
        ),
      );
      await this.auditService.log({
        action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
        entityType: 'FileAsset',
        entityId: asset.id,
        actorId: actor.userId,
        metadata: { reason, sizeBytes: storageMeta.sizeBytes, expectedSize: options.expectedSize },
      });
      throw new BadRequestException(reason);
    }

    // Binary Content & Magic-Byte Verification from Stream Header (if supported)
    try {
      const streamOutput = await this.storageProvider.getDownloadStream(asset.objectKey);
      if (streamOutput && streamOutput.stream) {
        const headerChunk = await this.readFirstChunk(streamOutput.stream, 1024);
        if (headerChunk && headerChunk.length > 0) {
          const check = FileSecurityUtil.validateBufferConsistency(
            headerChunk,
            asset.mimeType,
            asset.originalFileName,
            asset.category,
          );
          if (!check.isValid) {
            const reason = check.reason || 'Binary signature mismatch detected during upload finalization.';
            await this.repository.markFailed(asset.id, reason, actor.salonId ?? undefined);
            await this.eventBus.publish(
              new FileAssetFailedEvent(
                {
                  assetId: asset.id,
                  salonId: asset.salonId,
                  objectKey: asset.objectKey,
                  reason,
                },
                actor.userId,
              ),
            );
            await this.auditService.log({
              action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
              entityType: 'FileAsset',
              entityId: asset.id,
              actorId: actor.userId,
              metadata: { reason, mimeType: asset.mimeType },
            });
            throw new BadRequestException(reason);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.debug(`Stream header inspection skipped for ${asset.id}: ${(err as Error)?.message}`);
    }

    const updatedRaw = await this.repository.markReady(
      asset.id,
      {
        sizeBytes: storageMeta.sizeBytes,
        checksum: options?.checksum ?? undefined,
      },
      actor.salonId ?? undefined,
    );

    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetUploadedEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          uploadedByUserId: updatedEntity.uploadedByUserId,
          objectKey: updatedEntity.objectKey,
          sizeBytes: updatedEntity.sizeBytes,
          mimeType: updatedEntity.mimeType,
        },
        actor.userId,
      ),
    );

    await this.eventBus.publish(
      new FileAssetReadyEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          uploadedByUserId: updatedEntity.uploadedByUserId,
          objectKey: updatedEntity.objectKey,
          sizeBytes: updatedEntity.sizeBytes,
          mimeType: updatedEntity.mimeType,
          checksum: updatedEntity.checksum,
          visibility: updatedEntity.visibility,
          category: updatedEntity.category,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_FINALIZED',
      entityType: 'FileAsset',
      entityId: updatedEntity.id,
      actorId: actor.userId,
      metadata: {
        objectKey: updatedEntity.objectKey,
        sizeBytes: updatedEntity.sizeBytes,
        status: updatedEntity.status,
      },
    });

    return updatedEntity;
  }

  public async startProcessing(
    assetId: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(
      assetId,
      actor.salonId ?? undefined,
    );
    const asset = this.authzService.assertCanModify(rawAsset, actor, assetId);

    const updatedRaw = await this.repository.markProcessing(
      asset.id,
      actor.salonId ?? undefined,
    );
    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetProcessingEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          objectKey: updatedEntity.objectKey,
        },
        actor.userId,
      ),
    );

    return updatedEntity;
  }

  public async markReady(
    assetId: string,
    metadata?: UpdateFileAssetMetadataData,
    actor?: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(
      assetId,
      actor?.salonId ?? undefined,
    );
    if (!rawAsset) {
      throw new NotFoundException(`File asset "${assetId}" not found.`);
    }

    if (actor) {
      this.authzService.assertCanModify(rawAsset, actor, assetId);
    }

    const updatedRaw = await this.repository.markReady(
      assetId,
      metadata,
      actor?.salonId ?? undefined,
    );
    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetReadyEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          uploadedByUserId: updatedEntity.uploadedByUserId,
          objectKey: updatedEntity.objectKey,
          sizeBytes: updatedEntity.sizeBytes,
          mimeType: updatedEntity.mimeType,
          checksum: updatedEntity.checksum,
          visibility: updatedEntity.visibility,
          category: updatedEntity.category,
        },
        actor?.userId,
      ),
    );

    return updatedEntity;
  }

  public async markFailed(
    assetId: string,
    reason: string,
    actor?: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(
      assetId,
      actor?.salonId ?? undefined,
    );
    if (!rawAsset) {
      throw new NotFoundException(`File asset "${assetId}" not found.`);
    }

    if (actor) {
      this.authzService.assertCanModify(rawAsset, actor, assetId);
    }

    const updatedRaw = await this.repository.markFailed(
      assetId,
      reason,
      actor?.salonId ?? undefined,
    );
    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetFailedEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          objectKey: updatedEntity.objectKey,
          reason,
        },
        actor?.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_FAILED',
      entityType: 'FileAsset',
      entityId: updatedEntity.id,
      actorId: actor?.userId,
      metadata: { reason },
    });

    return updatedEntity;
  }

  public async softDelete(
    assetId: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findById(
      assetId,
      actor.salonId ?? undefined,
    );
    const asset = this.authzService.assertCanDelete(rawAsset, actor, assetId);

    const updatedRaw = await this.repository.softDelete(
      asset.id,
      actor.salonId ?? undefined,
    );
    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetDeletedEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          deletedByUserId: actor.userId,
          objectKey: updatedEntity.objectKey,
          deletedAt: updatedEntity.deletedAt ?? new Date(),
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_DELETED',
      entityType: 'FileAsset',
      entityId: updatedEntity.id,
      actorId: actor.userId,
      metadata: { objectKey: updatedEntity.objectKey },
    });

    return updatedEntity;
  }

  public async restore(
    assetId: string,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    const rawAsset = await this.repository.findByIdIncludingDeleted(
      assetId,
      actor.salonId ?? undefined,
    );
    const asset = this.authzService.assertCanRestore(rawAsset, actor, assetId);

    // Verify physical storage object is still intact
    const exists = await this.storageProvider.exists(asset.objectKey);
    if (!exists) {
      throw new BadRequestException(
        'Cannot restore file asset: physical object no longer exists in storage.',
      );
    }

    const updatedRaw = await this.repository.restore(
      asset.id,
      actor.salonId ?? undefined,
    );
    const updatedEntity = new FileAssetEntity(updatedRaw);

    await this.eventBus.publish(
      new FileAssetRestoredEvent(
        {
          assetId: updatedEntity.id,
          salonId: updatedEntity.salonId,
          restoredByUserId: actor.userId,
          objectKey: updatedEntity.objectKey,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_RESTORED',
      entityType: 'FileAsset',
      entityId: updatedEntity.id,
      actorId: actor.userId,
      metadata: { objectKey: updatedEntity.objectKey },
    });

    return updatedEntity;
  }

  // ─── Private Stream Helper ────────────────────────────────────────────────

  private async readFirstChunk(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let totalLen = 0;

      const onData = (chunk: Buffer | string) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        totalLen += buf.length;
        if (totalLen >= maxBytes) {
          cleanup();
          resolve(Buffer.concat(chunks).slice(0, maxBytes));
        }
      };

      const onEnd = () => {
        cleanup();
        resolve(chunks.length > 0 ? Buffer.concat(chunks) : null);
      };

      const onError = () => {
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        stream.removeListener('data', onData);
        stream.removeListener('end', onEnd);
        stream.removeListener('error', onError);
        if (typeof (stream as any).destroy === 'function') {
          (stream as any).destroy();
        }
      };

      stream.on('data', onData);
      stream.once('end', onEnd);
      stream.once('error', onError);
    });
  }
}
