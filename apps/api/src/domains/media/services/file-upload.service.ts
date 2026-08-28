import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { FileValidationUtil } from '../../../common/utils/file-validation.util';
import { STORAGE_PROVIDER_TOKEN } from '../../../infrastructure/storage/constants/storage.constants';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { ObjectKeyStrategy } from '../../../infrastructure/storage/strategies/object-key.strategy';
import { StorageSecurityUtil } from '../../../infrastructure/storage/utils/storage-security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  DirectUploadInput,
  InitiatePresignedUploadDto,
  PresignedUploadResult,
} from '../dto/file-asset.dto';
import { FileAssetActorContext, FileAssetEntity } from '../entities/file-asset.entity';
import {
  FileAssetCreatedEvent,
  FileAssetReadyEvent,
} from '../events/file-asset.events';
import {
  FILE_SECURITY_SCANNER_TOKEN,
  IFileSecurityScanner,
} from '../interfaces/file-security-scanner.interface';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAuthorizationService } from './file-authorization.service';

export const CATEGORY_FILE_SIZE_LIMITS: Record<FileCategory, number> = {
  [FileCategory.PROFILE]: 5 * 1024 * 1024, // 5 MB
  [FileCategory.SALON]: 10 * 1024 * 1024, // 10 MB
  [FileCategory.STAFF]: 5 * 1024 * 1024, // 5 MB
  [FileCategory.SERVICE]: 10 * 1024 * 1024, // 10 MB
  [FileCategory.PRODUCT]: 10 * 1024 * 1024, // 10 MB
  [FileCategory.GALLERY]: 20 * 1024 * 1024, // 20 MB
  [FileCategory.DOCUMENT]: 25 * 1024 * 1024, // 25 MB
  [FileCategory.MARKETING]: 30 * 1024 * 1024, // 30 MB
  [FileCategory.TEMPORARY]: 50 * 1024 * 1024, // 50 MB
  [FileCategory.OTHER]: 50 * 1024 * 1024, // 50 MB
};

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // Media / Audio / Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

/**
 * FileUploadService — Handles upload validation, storage key generation,
 * presigned upload coordination, direct upload persistence, and domain events.
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
    private readonly repository: FileAssetRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly authzService: FileAuthorizationService = new FileAuthorizationService(),
    @Optional()
    @Inject(FILE_SECURITY_SCANNER_TOKEN)
    private readonly securityScanner?: IFileSecurityScanner,
  ) {}

  /**
   * Initiates a presigned upload session:
   * 1. Validates upload parameters against category limits and MIME allowlist.
   * 2. Enforces authoritative tenant and uploader context (anti-spoofing).
   * 3. Generates an isolated, collision-free storage object key.
   * 4. Creates the FileAsset record in UPLOADING status.
   * 5. Asks the storage provider for a signed upload URL.
   * 6. Emits FileAssetCreatedEvent and writes an audit log.
   */
  public async initiatePresignedUpload(
    dto: InitiatePresignedUploadDto,
    actor: FileAssetActorContext,
  ): Promise<PresignedUploadResult> {
    this.validateActorContext(actor);

    const salonId = this.authzService.resolveAuthoritativeSalonId(actor, (dto as any).salonId);
    const uploadedByUserId = this.authzService.resolveAuthoritativeUploaderId(
      actor,
      (dto as any).uploadedByUserId,
    );

    if (!this.authzService.canGenerateSignedUploadUrl(actor, salonId)) {
      throw new ForbiddenException('Not authorized to generate upload URL for this scope.');
    }

    const category = dto.category ?? FileCategory.OTHER;
    const visibility = dto.visibility ?? FileVisibility.PRIVATE;

    // Hardened Filename Sanitization & Dangerous Extension Check
    const sanitizedFileName = FileSecurityUtil.sanitizeFileName(dto.originalFileName);
    const dangerousExt = FileSecurityUtil.findDangerousExtension(dto.originalFileName);
    if (dangerousExt) {
      await this.auditService.log({
        action: 'FILE_ASSET_UPLOAD_REJECTED',
        entityType: 'FileAsset',
        entityId: 'PRESIGNED_INIT',
        actorId: actor.userId,
        metadata: {
          originalFileName: dto.originalFileName,
          dangerousExtension: dangerousExt,
          reason: 'Dangerous file extension rejected',
        },
      });
      throw new BadRequestException(
        `File name contains dangerous executable/script extension: "${dangerousExt}". Upload rejected.`,
      );
    }

    this.validateFileMetadata({
      fileName: sanitizedFileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      category,
      folder: dto.folder,
    });

    const sanitizedMetadata = dto.metadata
      ? FileSecurityUtil.sanitizeCustomMetadata(dto.metadata)
      : null;

    const extension = FileValidationUtil.getFileExtension(sanitizedFileName);
    const objectKey = this.generateObjectKey({
      salonId,
      userId: uploadedByUserId,
      category,
      folder: dto.folder,
      extension,
    });

    const storedFileName = objectKey.split('/').pop()!;
    const bucket = 'saloon-assets';

    const fileAssetModel = await this.repository.create({
      salonId,
      uploadedByUserId,
      originalFileName: sanitizedFileName,
      storedFileName,
      objectKey,
      bucket,
      provider: this.storageProvider.providerName,
      mimeType: dto.mimeType.trim().toLowerCase(),
      extension,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum ?? null,
      status: FileStatus.UPLOADING,
      visibility,
      category,
      altText: dto.altText ?? null,
      folder: dto.folder ?? null,
      metadata: sanitizedMetadata ?? undefined,
    });

    const fileAsset = new FileAssetEntity(fileAssetModel);

    const signedUrlResult = await this.storageProvider.generateSignedUploadUrl({
      objectKey,
      contentType: dto.mimeType,
      expiresInSeconds: dto.expiresInSeconds,
      maxSizeBytes: dto.sizeBytes,
    });

    await this.eventBus.publish(
      new FileAssetCreatedEvent(
        {
          assetId: fileAsset.id,
          salonId: fileAsset.salonId,
          uploadedByUserId: fileAsset.uploadedByUserId,
          originalFileName: fileAsset.originalFileName,
          objectKey: fileAsset.objectKey,
          bucket: fileAsset.bucket,
          provider: fileAsset.provider,
          mimeType: fileAsset.mimeType,
          sizeBytes: fileAsset.sizeBytes,
          visibility: fileAsset.visibility,
          category: fileAsset.category,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_UPLOAD_INITIATED',
      entityType: 'FileAsset',
      entityId: fileAsset.id,
      actorId: actor.userId,
      metadata: {
        objectKey,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.sizeBytes,
        provider: fileAsset.provider,
        action: 'UPLOAD',
      },
    });

    return {
      fileAsset,
      uploadUrl: signedUrlResult.url,
      expiresInSeconds: signedUrlResult.expiresInSeconds,
      expiresAt: signedUrlResult.expiresAt,
      objectKey,
      action: 'UPLOAD',
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  /**
   * Alias for initiatePresignedUpload conforming to GenerateSignedUploadUrl naming convention.
   */
  public async generateSignedUploadUrl(
    dto: InitiatePresignedUploadDto,
    actor: FileAssetActorContext,
  ): Promise<PresignedUploadResult> {
    return this.initiatePresignedUpload(dto, actor);
  }

  /**
   * Direct server-mediated file upload:
   * 1. Validates file metadata and binary content size.
   * 2. Inspects magic-byte signature and validates consistency against declared MIME and extension.
   * 3. Scans for script polyglot payloads and SVG security hazards.
   * 4. Uploads payload to storage provider.
   * 5. Persists FileAsset in READY status.
   * 6. Emits FileAssetCreatedEvent + FileAssetReadyEvent and writes audit log.
   */
  public async uploadDirect(
    input: DirectUploadInput,
    actor: FileAssetActorContext,
  ): Promise<FileAssetEntity> {
    this.validateActorContext(actor);

    const salonId = this.authzService.resolveAuthoritativeSalonId(actor, (input as any).salonId);
    const uploadedByUserId = this.authzService.resolveAuthoritativeUploaderId(
      actor,
      (input as any).uploadedByUserId,
    );

    if (!this.authzService.canGenerateSignedUploadUrl(actor, salonId)) {
      throw new ForbiddenException('Not authorized to upload files for this scope.');
    }

    const category = input.category ?? FileCategory.OTHER;
    const visibility = input.visibility ?? FileVisibility.PRIVATE;

    // Hardened Filename Sanitization
    const sanitizedFileName = FileSecurityUtil.sanitizeFileName(input.originalFileName);

    this.validateFileMetadata({
      fileName: sanitizedFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category,
      folder: input.folder,
    });

    // Binary Content & Magic-Byte Validation
    const signatureCheck = FileSecurityUtil.validateBufferConsistency(
      input.buffer,
      input.mimeType,
      sanitizedFileName,
      category,
    );

    if (!signatureCheck.isValid) {
      await this.auditService.log({
        action: 'FILE_ASSET_SECURITY_VALIDATION_FAILED',
        entityType: 'FileAsset',
        entityId: 'DIRECT_UPLOAD',
        actorId: actor.userId,
        metadata: {
          originalFileName: sanitizedFileName,
          declaredMime: input.mimeType,
          reason: signatureCheck.reason,
        },
      });
      throw new BadRequestException(signatureCheck.reason);
    }

    // Optional Antivirus Scanner
    if (this.securityScanner) {
      const scanResult = await this.securityScanner.scanBuffer(input.buffer, sanitizedFileName);
      if (!scanResult.isClean) {
        await this.auditService.log({
          action: 'FILE_ASSET_SECURITY_VALIDATION_FAILED',
          entityType: 'FileAsset',
          entityId: 'DIRECT_UPLOAD',
          actorId: actor.userId,
          metadata: {
            originalFileName: sanitizedFileName,
            threatFound: scanResult.threatFound,
            scannerName: scanResult.scannerName,
          },
        });
        throw new BadRequestException(`Malware/threat detected: ${scanResult.threatFound || 'Security scan failed'}`);
      }
    }

    // Compute Authoritative SHA-256 Checksum
    const calculatedChecksum = createHash('sha256').update(input.buffer).digest('hex');

    const sanitizedMetadata = input.metadata
      ? FileSecurityUtil.sanitizeCustomMetadata(input.metadata)
      : null;

    const extension = FileValidationUtil.getFileExtension(sanitizedFileName);
    const objectKey = this.generateObjectKey({
      salonId,
      userId: uploadedByUserId,
      category,
      folder: input.folder,
      extension,
    });

    const storedFileName = objectKey.split('/').pop()!;

    // Upload to storage provider
    const uploadResult = await this.storageProvider.upload({
      objectKey,
      body: input.buffer,
      contentType: input.mimeType,
    });

    const fileAssetModel = await this.repository.create({
      salonId,
      uploadedByUserId,
      originalFileName: sanitizedFileName,
      storedFileName,
      objectKey,
      bucket: uploadResult.bucket,
      provider: this.storageProvider.providerName,
      mimeType: input.mimeType.trim().toLowerCase(),
      extension,
      sizeBytes: uploadResult.sizeBytes,
      checksum: calculatedChecksum,
      status: FileStatus.READY,
      visibility,
      category,
      width: input.width ?? null,
      height: input.height ?? null,
      duration: input.duration ?? null,
      altText: input.altText ?? null,
      folder: input.folder ?? null,
      metadata: sanitizedMetadata ?? undefined,
    });

    const fileAsset = new FileAssetEntity(fileAssetModel);

    await this.eventBus.publish(
      new FileAssetCreatedEvent(
        {
          assetId: fileAsset.id,
          salonId: fileAsset.salonId,
          uploadedByUserId: fileAsset.uploadedByUserId,
          originalFileName: fileAsset.originalFileName,
          objectKey: fileAsset.objectKey,
          bucket: fileAsset.bucket,
          provider: fileAsset.provider,
          mimeType: fileAsset.mimeType,
          sizeBytes: fileAsset.sizeBytes,
          visibility: fileAsset.visibility,
          category: fileAsset.category,
        },
        actor.userId,
      ),
    );

    await this.eventBus.publish(
      new FileAssetReadyEvent(
        {
          assetId: fileAsset.id,
          salonId: fileAsset.salonId,
          uploadedByUserId: fileAsset.uploadedByUserId,
          objectKey: fileAsset.objectKey,
          sizeBytes: fileAsset.sizeBytes,
          mimeType: fileAsset.mimeType,
          checksum: fileAsset.checksum,
          visibility: fileAsset.visibility,
          category: fileAsset.category,
        },
        actor.userId,
      ),
    );

    await this.auditService.log({
      action: 'FILE_ASSET_UPLOADED',
      entityType: 'FileAsset',
      entityId: fileAsset.id,
      actorId: actor.userId,
      metadata: {
        objectKey,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.sizeBytes,
        provider: fileAsset.provider,
      },
    });

    return fileAsset;
  }

  // ─── Private Helpers & Invariants ─────────────────────────────────────────

  private validateActorContext(actor: FileAssetActorContext): void {
    if (!actor || !actor.userId || typeof actor.userId !== 'string') {
      throw new BadRequestException('Authenticated user context is required for file upload.');
    }
  }

  private validateFileMetadata(params: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    category: FileCategory;
    folder?: string | null;
  }): void {
    if (!params.fileName || typeof params.fileName !== 'string' || params.fileName.trim().length === 0) {
      throw new BadRequestException('File name cannot be empty.');
    }

    if (params.folder && !StorageSecurityUtil.isSafeObjectKey(params.folder)) {
      throw new BadRequestException(
        `Invalid folder path: "${params.folder}". Path traversal sequences are not allowed.`,
      );
    }

    if (!FileValidationUtil.isValidMimeType(params.mimeType, ALLOWED_MIME_TYPES)) {
      throw new BadRequestException(`Unsupported MIME type: "${params.mimeType}".`);
    }

    const maxSizeBytes = CATEGORY_FILE_SIZE_LIMITS[params.category] ?? 50 * 1024 * 1024;
    if (!FileValidationUtil.isValidFileSize(params.sizeBytes, maxSizeBytes)) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `File size (${params.sizeBytes} bytes) exceeds maximum limit for category "${params.category}" (${maxMb} MB).`,
      );
    }
  }

  private generateObjectKey(params: {
    salonId?: string | null;
    userId: string;
    category: FileCategory;
    folder?: string | null;
    extension: string;
    assetId?: string | null;
  }): string {
    return ObjectKeyStrategy.generate({
      salonId: params.salonId,
      userId: params.userId,
      category: params.category,
      folder: params.folder,
      extension: params.extension,
      assetId: params.assetId,
    });
  }
}
