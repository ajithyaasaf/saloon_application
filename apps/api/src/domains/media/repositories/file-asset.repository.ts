import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileAsset,
  FileCategory,
  FileStatus,
  FileVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ALLOWED_FILE_STATUS_TRANSITIONS,
  CreateFileAssetData,
  SearchFileAssetsQueryDto,
  UpdateFileAssetData,
  UpdateFileAssetMetadataData,
} from '../dto/file-asset.dto';
import { IFileAssetRepository } from './interfaces/file-asset.repository.interface';

/**
 * FileAssetRepository — Production-grade repository for FileAsset persistence.
 *
 * Enforces:
 *  - Multi-tenant isolation (salonId scoping)
 *  - User ownership scoping
 *  - Soft-delete semantics (deletedAt == null)
 *  - Storage-provider independence
 *  - Lifecycle state machine invariants
 */
@Injectable()
export class FileAssetRepository implements IFileAssetRepository {
  constructor(private readonly db: PrismaService) {}

  // ─── Single Asset Queries ──────────────────────────────────────────────────

  public async findById(id: string, salonId?: string): Promise<FileAsset | null> {
    const where: Prisma.FileAssetWhereInput = {
      id,
      deletedAt: null,
    };

    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.fileAsset.findFirst({ where });
  }

  public async findByIdIncludingDeleted(
    id: string,
    salonId?: string,
  ): Promise<FileAsset | null> {
    const where: Prisma.FileAssetWhereInput = { id };

    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.fileAsset.findFirst({ where });
  }

  public async findByObjectKey(
    objectKey: string,
    salonId?: string,
  ): Promise<FileAsset | null> {
    const where: Prisma.FileAssetWhereInput = {
      objectKey,
      deletedAt: null,
    };

    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.fileAsset.findFirst({ where });
  }

  public async findByChecksum(
    checksum: string,
    salonId?: string,
  ): Promise<FileAsset[]> {
    const where: Prisma.FileAssetWhereInput = {
      checksum,
      deletedAt: null,
    };

    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.fileAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByStorageProviderAndObjectKey(
    provider: string,
    objectKey: string,
  ): Promise<FileAsset | null> {
    return this.db.fileAsset.findFirst({
      where: {
        provider,
        objectKey,
        deletedAt: null,
      },
    });
  }

  // ─── Ownership / Tenant Queries ───────────────────────────────────────────

  public async findByUser(
    userId: string,
    options?: { page?: number; limit?: number; category?: FileCategory; status?: FileStatus },
  ): Promise<{ data: FileAsset[]; total: number }> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FileAssetWhereInput = {
      uploadedByUserId: userId,
      deletedAt: null,
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.status ? { status: options.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.fileAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.fileAsset.count({ where }),
    ]);

    return { data, total };
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number; category?: FileCategory; status?: FileStatus },
  ): Promise<{ data: FileAsset[]; total: number }> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FileAssetWhereInput = {
      salonId,
      deletedAt: null,
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.status ? { status: options.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.fileAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.fileAsset.count({ where }),
    ]);

    return { data, total };
  }

  public async findByUserAndId(userId: string, id: string): Promise<FileAsset | null> {
    return this.db.fileAsset.findFirst({
      where: {
        id,
        uploadedByUserId: userId,
        deletedAt: null,
      },
    });
  }

  public async findBySalonAndId(salonId: string, id: string): Promise<FileAsset | null> {
    return this.db.fileAsset.findFirst({
      where: {
        id,
        salonId,
        deletedAt: null,
      },
    });
  }

  // ─── Category / Status / Visibility Queries ───────────────────────────────

  public async findByCategory(
    category: FileCategory,
    salonId?: string,
  ): Promise<FileAsset[]> {
    const where: Prisma.FileAssetWhereInput = {
      category,
      deletedAt: null,
      ...(salonId !== undefined ? { salonId } : {}),
    };

    return this.db.fileAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByStatus(
    status: FileStatus,
    salonId?: string,
  ): Promise<FileAsset[]> {
    const where: Prisma.FileAssetWhereInput = {
      status,
      deletedAt: null,
      ...(salonId !== undefined ? { salonId } : {}),
    };

    return this.db.fileAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByVisibility(
    visibility: FileVisibility,
    salonId?: string,
  ): Promise<FileAsset[]> {
    const where: Prisma.FileAssetWhereInput = {
      visibility,
      deletedAt: null,
      ...(salonId !== undefined ? { salonId } : {}),
    };

    return this.db.fileAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findBySalonAndCategory(
    salonId: string,
    category: FileCategory,
  ): Promise<FileAsset[]> {
    return this.db.fileAsset.findMany({
      where: {
        salonId,
        category,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findBySalonAndStatus(
    salonId: string,
    status: FileStatus,
  ): Promise<FileAsset[]> {
    return this.db.fileAsset.findMany({
      where: {
        salonId,
        status,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Search & Aggregates ──────────────────────────────────────────────────

  public async search(
    query: SearchFileAssetsQueryDto,
  ): Promise<{ data: FileAsset[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FileAssetWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.salonId !== undefined ? { salonId: query.salonId } : {}),
      ...(query.uploadedByUserId ? { uploadedByUserId: query.uploadedByUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.storageProvider ? { provider: query.storageProvider } : {}),
      ...(query.mimeType ? { mimeType: query.mimeType } : {}),
      ...(query.folder ? { folder: query.folder } : {}),
    };

    if (query.originalFileName) {
      where.originalFileName = {
        contains: query.originalFileName,
        mode: 'insensitive',
      };
    }

    if (query.objectKey) {
      where.objectKey = {
        contains: query.objectKey,
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.db.fileAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.db.fileAsset.count({ where }),
    ]);

    return { data, total };
  }

  public async count(
    salonId?: string,
    status?: FileStatus,
    category?: FileCategory,
  ): Promise<number> {
    const where: Prisma.FileAssetWhereInput = {
      deletedAt: null,
      ...(salonId !== undefined ? { salonId } : {}),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
    };

    return this.db.fileAsset.count({ where });
  }

  public async objectKeyExists(objectKey: string, excludeId?: string): Promise<boolean> {
    const count = await this.db.fileAsset.count({
      where: {
        objectKey,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count > 0;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  public async create(data: CreateFileAssetData): Promise<FileAsset> {
    try {
      return await this.db.fileAsset.create({
        data: {
          id: data.id,
          salonId: data.salonId,
          uploadedByUserId: data.uploadedByUserId,
          originalFileName: data.originalFileName,
          storedFileName: data.storedFileName,
          objectKey: data.objectKey,
          bucket: data.bucket,
          provider: data.provider ?? 'R2',
          mimeType: data.mimeType,
          extension: data.extension,
          sizeBytes: data.sizeBytes,
          checksum: data.checksum,
          status: data.status ?? FileStatus.UPLOADING,
          visibility: data.visibility ?? FileVisibility.PRIVATE,
          category: data.category ?? FileCategory.OTHER,
          width: data.width,
          height: data.height,
          duration: data.duration,
          metadata: data.metadata ?? undefined,
          altText: data.altText,
          folder: data.folder,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `File with objectKey "${data.objectKey}" already exists.`,
        );
      }
      throw error;
    }
  }

  public async update(
    id: string,
    data: UpdateFileAssetData,
    salonId?: string,
  ): Promise<FileAsset> {
    const existing = await this.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    return this.db.fileAsset.update({
      where: { id },
      data: {
        originalFileName: data.originalFileName,
        altText: data.altText,
        visibility: data.visibility,
        category: data.category,
        width: data.width,
        height: data.height,
        duration: data.duration,
        metadata: data.metadata !== undefined ? data.metadata ?? Prisma.DbNull : undefined,
        folder: data.folder,
      },
    });
  }

  public async updateStatus(
    id: string,
    newStatus: FileStatus,
    salonId?: string,
  ): Promise<FileAsset> {
    const existing = await this.findByIdIncludingDeleted(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    this.assertValidTransition(existing.status, newStatus);

    return this.db.fileAsset.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  public async updateMetadata(
    id: string,
    data: UpdateFileAssetMetadataData,
    salonId?: string,
  ): Promise<FileAsset> {
    const existing = await this.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    const mergedMetadata =
      data.metadata !== undefined
        ? { ...((existing.metadata as Record<string, any>) ?? {}), ...(data.metadata ?? {}) }
        : undefined;

    return this.db.fileAsset.update({
      where: { id },
      data: {
        sizeBytes: data.sizeBytes,
        checksum: data.checksum,
        width: data.width,
        height: data.height,
        duration: data.duration,
        altText: data.altText,
        metadata: mergedMetadata ?? undefined,
      },
    });
  }

  public async markUploaded(id: string, salonId?: string): Promise<FileAsset> {
    return this.updateStatus(id, FileStatus.UPLOADED, salonId);
  }

  public async markProcessing(id: string, salonId?: string): Promise<FileAsset> {
    return this.updateStatus(id, FileStatus.PROCESSING, salonId);
  }

  public async markReady(
    id: string,
    metadata?: UpdateFileAssetMetadataData,
    salonId?: string,
  ): Promise<FileAsset> {
    const existing = await this.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    this.assertValidTransition(existing.status, FileStatus.READY);

    const mergedMetadata =
      metadata?.metadata !== undefined
        ? { ...((existing.metadata as Record<string, any>) ?? {}), ...(metadata.metadata ?? {}) }
        : undefined;

    return this.db.fileAsset.update({
      where: { id },
      data: {
        status: FileStatus.READY,
        ...(metadata?.sizeBytes !== undefined ? { sizeBytes: metadata.sizeBytes } : {}),
        ...(metadata?.checksum !== undefined ? { checksum: metadata.checksum } : {}),
        ...(metadata?.width !== undefined ? { width: metadata.width } : {}),
        ...(metadata?.height !== undefined ? { height: metadata.height } : {}),
        ...(metadata?.duration !== undefined ? { duration: metadata.duration } : {}),
        ...(metadata?.altText !== undefined ? { altText: metadata.altText } : {}),
        ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
      },
    });
  }

  public async markFailed(
    id: string,
    reason?: string,
    salonId?: string,
  ): Promise<FileAsset> {
    const existing = await this.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    this.assertValidTransition(existing.status, FileStatus.FAILED);

    const currentMeta = (existing.metadata as Record<string, any>) ?? {};
    const updatedMeta = reason
      ? { ...currentMeta, failureReason: reason, failedAt: new Date().toISOString() }
      : currentMeta;

    return this.db.fileAsset.update({
      where: { id },
      data: {
        status: FileStatus.FAILED,
        metadata: updatedMeta,
      },
    });
  }

  public async softDelete(id: string, salonId?: string): Promise<FileAsset> {
    const existing = await this.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    return this.db.fileAsset.update({
      where: { id },
      data: {
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  public async restore(id: string, salonId?: string): Promise<FileAsset> {
    const existing = await this.findByIdIncludingDeleted(id, salonId);
    if (!existing) {
      throw new NotFoundException(`File asset "${id}" not found.`);
    }

    if (existing.deletedAt === null) {
      return existing; // Already active
    }

    return this.db.fileAsset.update({
      where: { id },
      data: {
        status: FileStatus.READY,
        deletedAt: null,
      },
    });
  }

  // ─── Lifecycle Invariants ─────────────────────────────────────────────────

  private assertValidTransition(current: FileStatus, next: FileStatus): void {
    if (current === next) {
      return;
    }

    const allowed = ALLOWED_FILE_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid FileAsset status transition: cannot change from "${current}" to "${next}".`,
      );
    }
  }
}
