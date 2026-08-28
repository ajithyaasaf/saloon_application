import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewItemRatingRequestDto {
  @ApiProperty({ description: 'Service UUID' })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Staff UUID' })
  @IsUUID()
  @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Booking Item UUID' })
  @IsUUID()
  @IsOptional()
  bookingItemId?: string;

  @ApiProperty({ description: 'Rating stars from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  ratingStars: number;

  @ApiPropertyOptional({ description: 'Itemized rating comment', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  itemComment?: string;
}

export class CreateReviewMediaAttachmentRequestDto {
  @ApiProperty({ description: 'Media UUID' })
  @IsUUID()
  @IsNotEmpty()
  mediaId: string;

  @ApiPropertyOptional({ description: 'Photo caption' })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Flag indicating before photo' })
  @IsBoolean()
  @IsOptional()
  isBeforePhoto?: boolean;

  @ApiPropertyOptional({ description: 'Flag indicating after photo' })
  @IsBoolean()
  @IsOptional()
  isAfterPhoto?: boolean;

  @ApiPropertyOptional({ description: 'Display ordering' })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class CreateReviewRequestDto {
  @ApiProperty({ description: 'Salon UUID' })
  @IsUUID()
  @IsNotEmpty()
  salonId: string;

  @ApiProperty({ description: 'Branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Legacy appointment UUID' })
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @ApiProperty({ description: 'Overall rating stars from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  reviewTitle?: string;

  @ApiPropertyOptional({ description: 'Review comment body' })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  reviewComment?: string;

  @ApiPropertyOptional({ description: 'Cleanliness rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  cleanlinessRating?: number;

  @ApiPropertyOptional({ description: 'Hospitality rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  hospitalityRating?: number;

  @ApiPropertyOptional({ description: 'Value for money rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  valueRating?: number;

  @ApiPropertyOptional({ description: 'Ambience rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  ambienceRating?: number;

  @ApiPropertyOptional({ description: 'Anonymous review toggle' })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ type: [CreateReviewItemRatingRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReviewItemRatingRequestDto)
  @IsOptional()
  itemRatings?: CreateReviewItemRatingRequestDto[];

  @ApiPropertyOptional({ type: [CreateReviewMediaAttachmentRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReviewMediaAttachmentRequestDto)
  @IsOptional()
  mediaAttachments?: CreateReviewMediaAttachmentRequestDto[];
}

export class UpdateReviewRequestDto {
  @ApiPropertyOptional({ description: 'Overall rating stars from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  overallRating?: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  reviewTitle?: string;

  @ApiPropertyOptional({ description: 'Review comment body' })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  reviewComment?: string;

  @ApiPropertyOptional({ description: 'Cleanliness rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  cleanlinessRating?: number;

  @ApiPropertyOptional({ description: 'Hospitality rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  hospitalityRating?: number;

  @ApiPropertyOptional({ description: 'Value for money rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  valueRating?: number;

  @ApiPropertyOptional({ description: 'Ambience rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  ambienceRating?: number;

  @ApiPropertyOptional({ description: 'Anonymous review toggle' })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Optimistic lock version' })
  @IsInt()
  @IsOptional()
  version?: number;
}
