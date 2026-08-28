import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
  ReviewInvitationStatus,
  ReviewStatus,
} from '@prisma/client';

export class PublicReviewReplyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  replyText: string;

  @ApiProperty()
  publishedAt: Date;
}

export class PublicItemRatingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serviceId: string;

  @ApiPropertyOptional()
  staffId?: string | null;

  @ApiProperty()
  ratingStars: number;

  @ApiPropertyOptional()
  itemComment?: string | null;
}

export class PublicMediaAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  mediaId: string;

  @ApiPropertyOptional()
  caption?: string | null;

  @ApiProperty()
  isBeforePhoto: boolean;

  @ApiProperty()
  isAfterPhoto: boolean;

  @ApiProperty()
  displayOrder: number;
}

export class PublicReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  salonId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  overallRating: number;

  @ApiPropertyOptional()
  reviewTitle?: string | null;

  @ApiPropertyOptional()
  reviewComment?: string | null;

  @ApiPropertyOptional()
  cleanlinessRating?: number | null;

  @ApiPropertyOptional()
  hospitalityRating?: number | null;

  @ApiPropertyOptional()
  valueRating?: number | null;

  @ApiPropertyOptional()
  ambienceRating?: number | null;

  @ApiProperty()
  isVerifiedPurchase: boolean;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiProperty()
  helpfulVotesCount: number;

  @ApiProperty()
  publishedAt: Date;

  @ApiPropertyOptional({ type: PublicReviewReplyResponseDto })
  reply?: PublicReviewReplyResponseDto | null;

  @ApiPropertyOptional({ type: [PublicItemRatingResponseDto] })
  itemRatings?: PublicItemRatingResponseDto[];

  @ApiPropertyOptional({ type: [PublicMediaAttachmentResponseDto] })
  mediaAttachments?: PublicMediaAttachmentResponseDto[];

  @ApiProperty()
  reviewerName: string;
}

export class CustomerReviewResponseDto extends PublicReviewResponseDto {
  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiProperty()
  status: ReviewStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OwnerReviewResponseDto extends CustomerReviewResponseDto {
  @ApiProperty()
  customerId: string;

  @ApiProperty()
  version: number;
}

export class RatingSummaryResponseDto {
  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  averageRating: number;

  @ApiPropertyOptional()
  oneStarCount?: number;

  @ApiPropertyOptional()
  twoStarCount?: number;

  @ApiPropertyOptional()
  threeStarCount?: number;

  @ApiPropertyOptional()
  fourStarCount?: number;

  @ApiPropertyOptional()
  fiveStarCount?: number;

  @ApiPropertyOptional()
  npsScore?: number | null;

  @ApiPropertyOptional()
  bayesianScore?: number | null;

  @ApiProperty()
  lastCalculatedAt: Date;
}

export class ReviewInvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  salonId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  status: ReviewInvitationStatus;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}
