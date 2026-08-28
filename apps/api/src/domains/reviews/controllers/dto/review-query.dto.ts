import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
  ReviewInvitationStatus,
  ReviewStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ReviewSearchRequestDto {
  @ApiPropertyOptional({ description: 'Salon UUID' })
  @IsUUID()
  @IsOptional()
  salonId?: string;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Customer UUID' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Staff UUID' })
  @IsUUID()
  @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Service UUID' })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Exact overall rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  @IsOptional()
  overallRating?: number;

  @ApiPropertyOptional({ description: 'Minimum rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  @IsOptional()
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  @IsOptional()
  maxRating?: number;

  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Review status' })
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: 'Filter only verified purchases' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isVerifiedPurchase?: boolean;

  @ApiPropertyOptional({ description: 'Filter reviews with photo attachments' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  hasPhotos?: boolean;

  @ApiPropertyOptional({ description: 'Search text query' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['publishedAt', 'overallRating', 'helpfulVotesCount', 'createdAt'],
  })
  @IsOptional()
  sortBy?: 'publishedAt' | 'overallRating' | 'helpfulVotesCount' | 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class ReviewFlagSearchRequestDto {
  @ApiPropertyOptional({ description: 'Review UUID' })
  @IsUUID()
  @IsOptional()
  reviewId?: string;

  @ApiPropertyOptional({ enum: ReviewFlagReason, description: 'Reason category' })
  @IsEnum(ReviewFlagReason)
  @IsOptional()
  reasonCategory?: ReviewFlagReason;

  @ApiPropertyOptional({ enum: ReviewFlagStatus, description: 'Flag status' })
  @IsEnum(ReviewFlagStatus)
  @IsOptional()
  status?: ReviewFlagStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

export class ReviewDisputeSearchRequestDto {
  @ApiPropertyOptional({ description: 'Salon UUID' })
  @IsUUID()
  @IsOptional()
  salonId?: string;

  @ApiPropertyOptional({ description: 'Review UUID' })
  @IsUUID()
  @IsOptional()
  reviewId?: string;

  @ApiPropertyOptional({ description: 'Dispute tracking code' })
  @IsString()
  @IsOptional()
  disputeCode?: string;

  @ApiPropertyOptional({ enum: ReviewDisputeStatus, description: 'Dispute status' })
  @IsEnum(ReviewDisputeStatus)
  @IsOptional()
  status?: ReviewDisputeStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

export class ReviewInvitationSearchRequestDto {
  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: ReviewInvitationStatus, description: 'Invitation status' })
  @IsEnum(ReviewInvitationStatus)
  @IsOptional()
  status?: ReviewInvitationStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
