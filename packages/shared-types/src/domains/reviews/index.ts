import { ReviewModerationStatus, ReviewRating } from '../../enums/index.js';

export interface ReviewReplyDto {
  id: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface ReviewDto {
  id: string;
  salonId: string;
  branchId: string;
  bookingId?: string | null;
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  overallRating: ReviewRating;
  cleanlinessRating?: ReviewRating | null;
  staffRating?: ReviewRating | null;
  valueRating?: ReviewRating | null;
  comment?: string | null;
  photos?: string[];
  status: ReviewModerationStatus;
  reply?: ReviewReplyDto | null;
  helpfulVotesCount: number;
  hasUserVotedHelpful?: boolean;
  createdAt: string;
}

export interface SalonReputationDto {
  salonId: string;
  averageRating: number;
  totalReviewsCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateReviewRequestDto {
  branchId: string;
  bookingId?: string;
  overallRating: ReviewRating;
  cleanlinessRating?: ReviewRating;
  staffRating?: ReviewRating;
  valueRating?: ReviewRating;
  comment?: string;
  photoMediaIds?: string[];
}

export interface ReplyToReviewRequestDto {
  comment: string;
}

export type CreateReviewDto = CreateReviewRequestDto;
