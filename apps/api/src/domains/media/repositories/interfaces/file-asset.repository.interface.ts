import { FileAsset, FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import {
  CreateFileAssetData,
  SearchFileAssetsQueryDto,
  UpdateFileAssetData,
  UpdateFileAssetMetadataData,
} from '../../dto/file-asset.dto';

export interface IFileAssetRepository {
  // Single Asset Queries
  findById(id: string, salonId?: string): Promise<FileAsset | null>;
  findByIdIncludingDeleted(id: string, salonId?: string): Promise<FileAsset | null>;
  findByObjectKey(objectKey: string, salonId?: string): Promise<FileAsset | null>;
  findByChecksum(checksum: string, salonId?: string): Promise<FileAsset[]>;
  findByStorageProviderAndObjectKey(provider: string, objectKey: string): Promise<FileAsset | null>;

  // Ownership / Tenant Queries
  findByUser(
    userId: string,
    options?: { page?: number; limit?: number; category?: FileCategory; status?: FileStatus },
  ): Promise<{ data: FileAsset[]; total: number }>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number; category?: FileCategory; status?: FileStatus },
  ): Promise<{ data: FileAsset[]; total: number }>;
  findByUserAndId(userId: string, id: string): Promise<FileAsset | null>;
  findBySalonAndId(salonId: string, id: string): Promise<FileAsset | null>;

  // Category / Status / Visibility Queries
  findByCategory(category: FileCategory, salonId?: string): Promise<FileAsset[]>;
  findByStatus(status: FileStatus, salonId?: string): Promise<FileAsset[]>;
  findByVisibility(visibility: FileVisibility, salonId?: string): Promise<FileAsset[]>;
  findBySalonAndCategory(salonId: string, category: FileCategory): Promise<FileAsset[]>;
  findBySalonAndStatus(salonId: string, status: FileStatus): Promise<FileAsset[]>;

  // Search & Aggregate
  search(query: SearchFileAssetsQueryDto): Promise<{ data: FileAsset[]; total: number }>;
  count(salonId?: string, status?: FileStatus, category?: FileCategory): Promise<number>;
  objectKeyExists(objectKey: string, excludeId?: string): Promise<boolean>;

  // Create / Update / Lifecycle Mutations
  create(data: CreateFileAssetData): Promise<FileAsset>;
  update(id: string, data: UpdateFileAssetData, salonId?: string): Promise<FileAsset>;
  updateStatus(id: string, status: FileStatus, salonId?: string): Promise<FileAsset>;
  updateMetadata(id: string, data: UpdateFileAssetMetadataData, salonId?: string): Promise<FileAsset>;
  markUploaded(id: string, salonId?: string): Promise<FileAsset>;
  markProcessing(id: string, salonId?: string): Promise<FileAsset>;
  markReady(id: string, metadata?: UpdateFileAssetMetadataData, salonId?: string): Promise<FileAsset>;
  markFailed(id: string, reason?: string, salonId?: string): Promise<FileAsset>;
  softDelete(id: string, salonId?: string): Promise<FileAsset>;
  restore(id: string, salonId?: string): Promise<FileAsset>;
}
