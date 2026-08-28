import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
} from '@prisma/client';

export class ReviewFlagEntity {
  id: string;
  reviewId: string;
  reportedByUserId: string;
  reasonCategory: ReviewFlagReason;
  explanation?: string | null;
  status: ReviewFlagStatus;
  resolutionNotes?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ReviewFlagEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === ReviewFlagStatus.PENDING || this.status === ReviewFlagStatus.UNDER_REVIEW;
  }
}

export class ReviewDisputeEntity {
  id: string;
  disputeCode: string;
  reviewId: string;
  salonId: string;
  submittedByUserId: string;
  disputeReason: string;
  evidenceDetails?: string | null;
  status: ReviewDisputeStatus;
  adminDecisionNotes?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ReviewDisputeEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === ReviewDisputeStatus.SUBMITTED || this.status === ReviewDisputeStatus.IN_REVIEW;
  }
}
