import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { STORAGE_PROVIDER_TOKEN } from '../../../infrastructure/storage/constants/storage.constants';
import {
  IStorageProvider,
  StorageStreamDownloadResult,
} from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import {
  DownloadUrlResult,
  GenerateSignedDownloadUrlDto,
} from '../dto/file-asset.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAuthorizationService } from './file-authorization.service';

export interface FileDownloadStreamOutput {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength: number;
  originalFileName: string;
}

/**
 * FileAccessService — Handles access authorization, visibility enforcement,
 * signed download URL generation, public URL retrieval, and binary stream retrieval.
 */
@Injectable()
export class FileAccessService {
  private readonly logger = new Logger(FileAccessService.name);

  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
    private readonly repository: FileAssetRepository,
    private readonly authzService: FileAuthorizationService = new FileAuthorizationService(),
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  /**
   * Generates an authorized download URL for a file asset:
   * - Checks actor permissions against visibility, salon tenancy, and user ownership.
   * - Enforces readiness (must be in READY state).
   * - Sanitizes Content-Disposition attachment filenames against CRLF/header injection.
   * - If PUBLIC: returns public/CDN URL with action 'DOWNLOAD'.
   * - If PRIVATE / TENANT / AUTHENTICATED: generates a signed download URL with limited TTL.
   * - Emits an audit trail log for signed URL generation without exposing signature secrets.
   */
  public async getDownloadUrl(
    assetId: string,
    actor: FileAssetActorContext,
    options?: GenerateSignedDownloadUrlDto,
  ): Promise<DownloadUrlResult> {
    const rawAsset = await this.repository.findById(assetId);
    const asset = this.authzService.assertCanDownload(rawAsset, actor, assetId);

    const safeFilename = FileSecurityUtil.sanitizeContentDispositionFilename(
      options?.filename || asset.originalFileName,
    );

    if (asset.isPublic()) {
      const downloadResult = await this.storageProvider.generateSignedDownloadUrl({
        objectKey: asset.objectKey,
        filename: safeFilename,
        contentType: options?.contentType ?? asset.mimeType,
      });

      if (this.auditService && actor?.userId) {
        await this.auditService.log({
          action: 'FILE_ASSET_SIGNED_DOWNLOAD_URL_GENERATED',
          entityType: 'FileAsset',
          entityId: asset.id,
          actorId: actor.userId,
          metadata: {
            isPublic: true,
            expiresInSeconds: null,
            category: asset.category,
            provider: asset.provider,
            action: 'DOWNLOAD',
          },
        });
      }

      return {
        fileAssetId: asset.id,
        url: downloadResult.url,
        isPublic: true,
        expiresInSeconds: null,
        expiresAt: null,
        action: 'DOWNLOAD',
      };
    }

    const signed = await this.storageProvider.generateSignedDownloadUrl({
      objectKey: asset.objectKey,
      expiresInSeconds: options?.expiresInSeconds,
      filename: safeFilename,
      contentType: options?.contentType ?? asset.mimeType,
    });

    if (this.auditService && actor?.userId) {
      await this.auditService.log({
        action: 'FILE_ASSET_SIGNED_DOWNLOAD_URL_GENERATED',
        entityType: 'FileAsset',
        entityId: asset.id,
        actorId: actor.userId,
        metadata: {
          isPublic: false,
          expiresInSeconds: signed.expiresInSeconds,
          category: asset.category,
          provider: asset.provider,
          action: 'DOWNLOAD',
        },
      });
    }

    return {
      fileAssetId: asset.id,
      url: signed.url,
      isPublic: false,
      expiresInSeconds: signed.expiresInSeconds,
      expiresAt: signed.expiresAt,
      action: 'DOWNLOAD',
    };
  }

  /**
   * Returns the direct public URL for a publicly visible asset.
   * Throws ForbiddenException if visibility is not PUBLIC.
   */
  public async getPublicUrl(assetId: string): Promise<string> {
    const rawAsset = await this.repository.findById(assetId);
    if (!rawAsset || rawAsset.deletedAt) {
      throw new NotFoundException(`File asset "${assetId}" not found.`);
    }

    const asset = new FileAssetEntity(rawAsset);
    if (!asset.isPublic()) {
      throw new ForbiddenException(
        `File asset "${assetId}" has visibility "${asset.visibility}" and cannot be accessed via public URL.`,
      );
    }

    if (!asset.isReady()) {
      throw new BadRequestException(`File asset "${assetId}" is not ready.`);
    }

    const downloadResult = await this.storageProvider.generateSignedDownloadUrl({
      objectKey: asset.objectKey,
    });
    return downloadResult.url;
  }

  /**
   * Streams file content directly from storage after access verification.
   */
  public async downloadStream(
    assetId: string,
    actor: FileAssetActorContext,
  ): Promise<FileDownloadStreamOutput> {
    const rawAsset = await this.repository.findById(assetId);
    const asset = this.authzService.assertCanDownload(rawAsset, actor, assetId);

    const safeFilename = FileSecurityUtil.sanitizeContentDispositionFilename(
      asset.originalFileName,
    );

    const streamResult: StorageStreamDownloadResult =
      await this.storageProvider.getDownloadStream(asset.objectKey);

    return {
      stream: streamResult.stream,
      contentType: streamResult.contentType,
      contentLength: streamResult.contentLength ?? asset.sizeBytes,
      originalFileName: safeFilename,
    };
  }
}
