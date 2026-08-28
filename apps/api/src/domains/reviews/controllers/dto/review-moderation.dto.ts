import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReviewFlagRequestDto {
  @ApiProperty({ enum: ReviewFlagReason, description: 'Flag reason category' })
  @IsEnum(ReviewFlagReason)
  @IsNotEmpty()
  reasonCategory: ReviewFlagReason;

  @ApiPropertyOptional({ description: 'Detailed explanation for the flag', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  explanation?: string;
}

export class ResolveReviewFlagRequestDto {
  @ApiProperty({ enum: ReviewFlagStatus, description: 'Resolution status' })
  @IsEnum(ReviewFlagStatus)
  @IsNotEmpty()
  status: ReviewFlagStatus;

  @ApiProperty({ description: 'Resolution notes', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolutionNotes: string;

  @ApiPropertyOptional({
    description: 'Action on associated review',
    enum: ['HIDE', 'REJECT', 'RESTORE'],
  })
  @IsOptional()
  actionOnReview?: 'HIDE' | 'REJECT' | 'RESTORE';
}

export class CreateReviewDisputeRequestDto {
  @ApiProperty({ description: 'Review UUID' })
  @IsUUID()
  @IsNotEmpty()
  reviewId: string;

  @ApiProperty({ description: 'Dispute reason explanation', maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  disputeReason: string;

  @ApiPropertyOptional({ description: 'Evidence details supporting the dispute', maxLength: 4000 })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  evidenceDetails?: string;
}

export class ResolveReviewDisputeRequestDto {
  @ApiProperty({ enum: ReviewDisputeStatus, description: 'Dispute resolution status' })
  @IsEnum(ReviewDisputeStatus)
  @IsNotEmpty()
  status: ReviewDisputeStatus;

  @ApiProperty({ description: 'Super Admin decision notes', maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  adminDecisionNotes: string;

  @ApiPropertyOptional({ description: 'Optimistic concurrency version' })
  @IsInt()
  @IsOptional()
  version?: number;
}
