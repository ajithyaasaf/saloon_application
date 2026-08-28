import { ReviewStatus } from '@prisma/client';

export class ReviewEntity {
  id: string;
  salonId: string;
  branchId: string;
  bookingId?: string | null;
  appointmentId?: string | null;
  customerId: string;
  overallRating: number;
  reviewTitle?: string | null;
  reviewComment?: string | null;
  cleanlinessRating?: number | null;
  hospitalityRating?: number | null;
  valueRating?: number | null;
  ambienceRating?: number | null;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  isAnonymous: boolean;
  helpfulVotesCount: number;
  publishedAt?: Date | null;
  editedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  itemRatings?: ReviewItemRatingEntity[];
  mediaAttachments?: ReviewMediaAttachmentEntity[];
  reply?: ReviewReplyEntity | null;

  constructor(partial: Partial<ReviewEntity>) {
    Object.assign(this, partial);
  }

  public isPublished(): boolean {
    return this.status === ReviewStatus.PUBLISHED && !this.deletedAt;
  }

  public isEligibleForReputation(): boolean {
    return this.status === ReviewStatus.PUBLISHED && !this.deletedAt;
  }

  public validateRating(): void {
    if (this.overallRating < 1 || this.overallRating > 5) {
      throw new Error('Overall rating must be between 1 and 5');
    }
  }

  public canBeRepliedTo(): boolean {
    return this.isPublished();
  }
}

export class ReviewItemRatingEntity {
  id: string;
  reviewId: string;
  bookingItemId?: string | null;
  serviceId: string;
  staffId?: string | null;
  ratingStars: number;
  itemComment?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ReviewItemRatingEntity>) {
    Object.assign(this, partial);
  }

  public validate(): void {
    if (this.ratingStars < 1 || this.ratingStars > 5) {
      throw new Error('Item rating must be between 1 and 5 stars');
    }
  }
}

export class ReviewMediaAttachmentEntity {
  id: string;
  reviewId: string;
  mediaId: string;
  caption?: string | null;
  isBeforePhoto: boolean;
  isAfterPhoto: boolean;
  displayOrder: number;
  createdAt: Date;

  constructor(partial: Partial<ReviewMediaAttachmentEntity>) {
    Object.assign(this, partial);
  }
}

export class ReviewReplyEntity {
  id: string;
  reviewId: string;
  salonId: string;
  responderUserId: string;
  replyText: string;
  publishedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<ReviewReplyEntity>) {
    Object.assign(this, partial);
  }

  public isActive(): boolean {
    return !this.deletedAt;
  }
}

export class ReviewHelpfulVoteEntity {
  id: string;
  reviewId: string;
  userId: string;
  isHelpful: boolean;
  createdAt: Date;

  constructor(partial: Partial<ReviewHelpfulVoteEntity>) {
    Object.assign(this, partial);
  }
}
