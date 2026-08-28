import {
  NotificationChannel,
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
  ReviewInvitationStatus,
  ReviewStatus,
} from '@prisma/client';

export interface CreateReviewData {
  salonId: string;
  branchId: string;
  customerId: string;
  bookingId?: string | null;
  appointmentId?: string | null;
  overallRating: number;
  reviewTitle?: string | null;
  reviewComment?: string | null;
  cleanlinessRating?: number | null;
  hospitalityRating?: number | null;
  valueRating?: number | null;
  ambienceRating?: number | null;
  status?: ReviewStatus;
  isVerifiedPurchase?: boolean;
  isAnonymous?: boolean;
  publishedAt?: Date | null;
}

export interface UpdateReviewData {
  overallRating?: number;
  reviewTitle?: string | null;
  reviewComment?: string | null;
  cleanlinessRating?: number | null;
  hospitalityRating?: number | null;
  valueRating?: number | null;
  ambienceRating?: number | null;
  status?: ReviewStatus;
  isAnonymous?: boolean;
  editedAt?: Date | null;
}

export interface CreateReviewItemRatingData {
  reviewId: string;
  serviceId: string;
  staffId?: string | null;
  bookingItemId?: string | null;
  ratingStars: number;
  itemComment?: string | null;
}

export interface CreateReviewMediaAttachmentData {
  reviewId: string;
  mediaId: string;
  caption?: string | null;
  isBeforePhoto?: boolean;
  isAfterPhoto?: boolean;
  displayOrder?: number;
}

export interface CreateReviewReplyData {
  reviewId: string;
  salonId: string;
  responderUserId: string;
  replyText: string;
  publishedAt?: Date;
}

export interface UpdateReviewReplyData {
  replyText?: string;
  publishedAt?: Date;
}

export interface CreateReviewFlagData {
  reviewId: string;
  reportedByUserId: string;
  reasonCategory: ReviewFlagReason;
  explanation?: string | null;
  status?: ReviewFlagStatus;
}

export interface CreateReviewDisputeData {
  disputeCode: string;
  reviewId: string;
  salonId: string;
  submittedByUserId: string;
  disputeReason: string;
  evidenceDetails?: string | null;
  status?: ReviewDisputeStatus;
}

export interface UpdateReviewDisputeData {
  disputeReason?: string;
  evidenceDetails?: string | null;
  status?: ReviewDisputeStatus;
  adminDecisionNotes?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | null;
}

export interface CreateSalonRatingSummaryData {
  salonId: string;
  totalReviews?: number;
  averageRating?: number | string;
  oneStarCount?: number;
  twoStarCount?: number;
  threeStarCount?: number;
  fourStarCount?: number;
  fiveStarCount?: number;
  npsScore?: number | string | null;
  bayesianScore?: number | string | null;
  lastCalculatedAt?: Date;
}

export interface CreateBranchRatingSummaryData {
  branchId: string;
  salonId: string;
  totalReviews?: number;
  averageRating?: number | string;
  oneStarCount?: number;
  twoStarCount?: number;
  threeStarCount?: number;
  fourStarCount?: number;
  fiveStarCount?: number;
  npsScore?: number | string | null;
  lastCalculatedAt?: Date;
}

export interface CreateStaffRatingSummaryData {
  staffId: string;
  salonId: string;
  totalReviews?: number;
  averageRating?: number | string;
  fiveStarRate?: number | string;
  lastCalculatedAt?: Date;
}

export interface CreateServiceRatingSummaryData {
  serviceId: string;
  salonId: string;
  totalReviews?: number;
  averageRating?: number | string;
  lastCalculatedAt?: Date;
}

export interface CreateReviewInvitationData {
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  channel?: NotificationChannel;
  invitationToken: string;
  status?: ReviewInvitationStatus;
  expiresAt: Date;
  sentAt?: Date | null;
}
