import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
  ReviewInvitationStatus,
  ReviewStatus,
} from '@prisma/client';

export interface SearchReviewQueryDto {
  salonId?: string;
  branchId?: string;
  customerId?: string;
  staffId?: string;
  serviceId?: string;
  overallRating?: number;
  minRating?: number;
  maxRating?: number;
  status?: ReviewStatus;
  isVerifiedPurchase?: boolean;
  hasPhotos?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'overallRating' | 'helpfulVotesCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchReviewFlagQueryDto {
  salonId?: string;
  reviewId?: string;
  reportedByUserId?: string;
  reasonCategory?: ReviewFlagReason;
  status?: ReviewFlagStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchReviewDisputeQueryDto {
  salonId?: string;
  reviewId?: string;
  disputeCode?: string;
  status?: ReviewDisputeStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchReviewInvitationQueryDto {
  salonId?: string;
  branchId?: string;
  customerId?: string;
  status?: ReviewInvitationStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'sentAt';
  sortOrder?: 'asc' | 'desc';
}
