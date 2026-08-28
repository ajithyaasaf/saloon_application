import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * InitiatePresignedUploadRequestDto — Request body for initiating presigned upload session.
 */
export class InitiatePresignedUploadRequestDto {
  @ApiProperty({ example: 'portfolio-photo.jpg', description: 'Original filename of the file' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName: string;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @IsInt()
  @IsPositive()
  sizeBytes: number;

  @ApiPropertyOptional({ enum: FileCategory, default: FileCategory.OTHER, description: 'Asset category' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: FileVisibility, default: FileVisibility.PRIVATE, description: 'Access visibility level' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ example: 'galleries/bridal', description: 'Logical folder path' })
  @IsOptional()
  @IsString()
  folder?: string | null;

  @ApiPropertyOptional({ example: 'Bridal makeup sample 1', description: 'Accessible alternative text' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @ApiPropertyOptional({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', description: 'SHA-256 or MD5 checksum' })
  @IsOptional()
  @IsString()
  checksum?: string | null;

  @ApiPropertyOptional({ example: 900, description: 'Requested URL expiry TTL in seconds (60-86400)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresInSeconds?: number;

  @ApiPropertyOptional({ example: 'salon-uuid', description: 'Target salon ID for tenant scoping' })
  @IsOptional()
  @IsString()
  salonId?: string | null;

  @ApiPropertyOptional({ example: { customTag: 'promo' }, description: 'Custom metadata payload' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;
}

/**
 * DirectUploadRequestDto — Additional body fields accompanying multipart binary upload.
 */
export class DirectUploadRequestDto {
  @ApiPropertyOptional({ enum: FileCategory, default: FileCategory.OTHER, description: 'Asset category' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: FileVisibility, default: FileVisibility.PRIVATE, description: 'Access visibility level' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ example: 'services/haircuts', description: 'Logical folder path' })
  @IsOptional()
  @IsString()
  folder?: string | null;

  @ApiPropertyOptional({ example: 'Haircut service preview', description: 'Accessible alternative text' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @ApiPropertyOptional({ example: 1920, description: 'Image width in pixels' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  width?: number | null;

  @ApiPropertyOptional({ example: 1080, description: 'Image height in pixels' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  height?: number | null;

  @ApiPropertyOptional({ example: 120.5, description: 'Audio/video duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number | null;

  @ApiPropertyOptional({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', description: 'SHA-256 or MD5 checksum' })
  @IsOptional()
  @IsString()
  checksum?: string | null;

  @ApiPropertyOptional({ example: 'salon-uuid', description: 'Target salon ID for tenant scoping' })
  @IsOptional()
  @IsString()
  salonId?: string | null;

  @ApiPropertyOptional({ example: { customTag: 'promo' }, description: 'Custom metadata payload' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;
}

/**
 * UpdateFileAssetRequestDto — Body for updating mutable metadata of an existing FileAsset.
 */
export class UpdateFileAssetRequestDto {
  @ApiPropertyOptional({ example: 'updated-title.jpg', description: 'Updated display file name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @ApiPropertyOptional({ example: 'Updated alternative text description', description: 'Accessible alternative text' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Updated visibility' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ enum: FileCategory, description: 'Updated category' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ example: { tags: ['bridal', 'summer'] }, description: 'Custom structured JSON metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional({ example: 'galleries/updated', description: 'Updated logical folder' })
  @IsOptional()
  @IsString()
  folder?: string | null;
}

/**
 * UpdateVisibilityDto — Body for changing an asset's visibility level.
 */
export class UpdateVisibilityDto {
  @ApiProperty({ enum: FileVisibility, description: 'New visibility level' })
  @IsEnum(FileVisibility)
  visibility: FileVisibility;
}

/**
 * UpdateCategoryDto — Body for changing an asset's category.
 */
export class UpdateCategoryDto {
  @ApiProperty({ enum: FileCategory, description: 'New category' })
  @IsEnum(FileCategory)
  category: FileCategory;
}

/**
 * DownloadUrlQueryDto — Query parameters for requesting a signed download URL.
 */
export class DownloadUrlQueryDto {
  @ApiPropertyOptional({ example: 3600, description: 'Requested URL expiry TTL in seconds (60-86400)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresInSeconds?: number;

  @ApiPropertyOptional({ example: 'invoice-2026.pdf', description: 'Custom filename for Content-Disposition attachment header' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ example: 'application/pdf', description: 'Override response Content-Type' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

/**
 * MarkReadyRequestDto — Body for manually transitioning processing assets to READY with metadata.
 */
export class MarkReadyRequestDto {
  @ApiPropertyOptional({ example: 1048576, description: 'Final verified size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 'checksum-hash', description: 'Final verified checksum' })
  @IsOptional()
  @IsString()
  checksum?: string | null;

  @ApiPropertyOptional({ example: 1920, description: 'Image width' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  width?: number | null;

  @ApiPropertyOptional({ example: 1080, description: 'Image height' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  height?: number | null;

  @ApiPropertyOptional({ example: 120.0, description: 'Duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number | null;

  @ApiPropertyOptional({ example: { processed: true }, description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional({ example: 'Verified alt text', description: 'Alt text' })
  @IsOptional()
  @IsString()
  altText?: string | null;
}

/**
 * MarkFailedRequestDto — Body for marking an asset upload/processing as failed.
 */
export class MarkFailedRequestDto {
  @ApiPropertyOptional({ example: 'Image processing timed out', description: 'Reason for failure' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * SearchFileAssetsQueryRequestDto — Query parameters for searching/filtering file assets.
 */
export class SearchFileAssetsQueryRequestDto {
  @ApiPropertyOptional({ example: 'salon-uuid', description: 'Filter by salon ID (admin only or validated by tenant scope)' })
  @IsOptional()
  @IsString()
  salonId?: string | null;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'Filter by uploader user ID' })
  @IsOptional()
  @IsString()
  uploadedByUserId?: string;

  @ApiPropertyOptional({ enum: FileStatus, description: 'Filter by file status' })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Filter by visibility level' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ enum: FileCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ example: 'image/jpeg', description: 'Filter by MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 'galleries', description: 'Filter by folder prefix' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ example: 'portfolio', description: 'Search term for original filename' })
  @IsOptional()
  @IsString()
  originalFileName?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: false, description: 'Include soft-deleted files (admin/privileged only)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Items per page (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'sizeBytes', 'originalFileName'], default: 'createdAt', description: 'Sort field' })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'sizeBytes', 'originalFileName'])
  sortBy?: 'createdAt' | 'updatedAt' | 'sizeBytes' | 'originalFileName' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
