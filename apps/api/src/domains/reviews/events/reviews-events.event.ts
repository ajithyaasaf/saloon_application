import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

// ─── Review Lifecycle Events ──────────────────────────────────────────────────

export interface ReviewCreatedPayload {
  reviewId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  bookingId?: string | null;
  overallRating: number;
}

export class ReviewCreatedEvent extends BaseDomainEvent<ReviewCreatedPayload> {
  static readonly EVENT_NAME = 'review.created.v1';
  constructor(payload: ReviewCreatedPayload, actorId?: string) {
    super(ReviewCreatedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewUpdatedPayload {
  reviewId: string;
  salonId: string;
  updatedFields: string[];
}

export class ReviewUpdatedEvent extends BaseDomainEvent<ReviewUpdatedPayload> {
  static readonly EVENT_NAME = 'review.updated.v1';
  constructor(payload: ReviewUpdatedPayload, actorId?: string) {
    super(ReviewUpdatedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewPublishedPayload {
  reviewId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  overallRating: number;
}

export class ReviewPublishedEvent extends BaseDomainEvent<ReviewPublishedPayload> {
  static readonly EVENT_NAME = 'review.published.v1';
  constructor(payload: ReviewPublishedPayload, actorId?: string) {
    super(ReviewPublishedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewHiddenPayload {
  reviewId: string;
  salonId: string;
  reason?: string;
}

export class ReviewHiddenEvent extends BaseDomainEvent<ReviewHiddenPayload> {
  static readonly EVENT_NAME = 'review.hidden.v1';
  constructor(payload: ReviewHiddenPayload, actorId?: string) {
    super(ReviewHiddenEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewRejectedPayload {
  reviewId: string;
  salonId: string;
  reason?: string;
}

export class ReviewRejectedEvent extends BaseDomainEvent<ReviewRejectedPayload> {
  static readonly EVENT_NAME = 'review.rejected.v1';
  constructor(payload: ReviewRejectedPayload, actorId?: string) {
    super(ReviewRejectedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewArchivedPayload {
  reviewId: string;
  salonId: string;
}

export class ReviewArchivedEvent extends BaseDomainEvent<ReviewArchivedPayload> {
  static readonly EVENT_NAME = 'review.archived.v1';
  constructor(payload: ReviewArchivedPayload, actorId?: string) {
    super(ReviewArchivedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Review Reply Events ──────────────────────────────────────────────────────

export interface ReviewReplyCreatedPayload {
  replyId: string;
  reviewId: string;
  salonId: string;
  responderUserId: string;
}

export class ReviewReplyCreatedEvent extends BaseDomainEvent<ReviewReplyCreatedPayload> {
  static readonly EVENT_NAME = 'review.reply-created.v1';
  constructor(payload: ReviewReplyCreatedPayload, actorId?: string) {
    super(ReviewReplyCreatedEvent.EVENT_NAME, payload.replyId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewReplyUpdatedPayload {
  replyId: string;
  reviewId: string;
  salonId: string;
}

export class ReviewReplyUpdatedEvent extends BaseDomainEvent<ReviewReplyUpdatedPayload> {
  static readonly EVENT_NAME = 'review.reply-updated.v1';
  constructor(payload: ReviewReplyUpdatedPayload, actorId?: string) {
    super(ReviewReplyUpdatedEvent.EVENT_NAME, payload.replyId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Helpful Vote Events ──────────────────────────────────────────────────────

export interface ReviewHelpfulVoteAddedPayload {
  voteId: string;
  reviewId: string;
  userId: string;
}

export class ReviewHelpfulVoteAddedEvent extends BaseDomainEvent<ReviewHelpfulVoteAddedPayload> {
  static readonly EVENT_NAME = 'review.helpful-vote-added.v1';
  constructor(payload: ReviewHelpfulVoteAddedPayload, actorId?: string) {
    super(ReviewHelpfulVoteAddedEvent.EVENT_NAME, payload.voteId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewHelpfulVoteRemovedPayload {
  reviewId: string;
  userId: string;
}

export class ReviewHelpfulVoteRemovedEvent extends BaseDomainEvent<ReviewHelpfulVoteRemovedPayload> {
  static readonly EVENT_NAME = 'review.helpful-vote-removed.v1';
  constructor(payload: ReviewHelpfulVoteRemovedPayload, actorId?: string) {
    super(ReviewHelpfulVoteRemovedEvent.EVENT_NAME, payload.reviewId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Moderation Flag Events ───────────────────────────────────────────────────

export interface ReviewFlaggedPayload {
  flagId: string;
  reviewId: string;
  reportedByUserId: string;
  reasonCategory: string;
}

export class ReviewFlaggedEvent extends BaseDomainEvent<ReviewFlaggedPayload> {
  static readonly EVENT_NAME = 'review.flagged.v1';
  constructor(payload: ReviewFlaggedPayload, actorId?: string) {
    super(ReviewFlaggedEvent.EVENT_NAME, payload.flagId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewFlagResolvedPayload {
  flagId: string;
  reviewId: string;
  status: string;
  resolvedByUserId: string;
}

export class ReviewFlagResolvedEvent extends BaseDomainEvent<ReviewFlagResolvedPayload> {
  static readonly EVENT_NAME = 'review.flag-resolved.v1';
  constructor(payload: ReviewFlagResolvedPayload, actorId?: string) {
    super(ReviewFlagResolvedEvent.EVENT_NAME, payload.flagId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Dispute Events ───────────────────────────────────────────────────────────

export interface ReviewDisputeSubmittedPayload {
  disputeId: string;
  disputeCode: string;
  reviewId: string;
  salonId: string;
  submittedByUserId: string;
}

export class ReviewDisputeSubmittedEvent extends BaseDomainEvent<ReviewDisputeSubmittedPayload> {
  static readonly EVENT_NAME = 'review.dispute-submitted.v1';
  constructor(payload: ReviewDisputeSubmittedPayload, actorId?: string) {
    super(ReviewDisputeSubmittedEvent.EVENT_NAME, payload.disputeId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewDisputeResolvedPayload {
  disputeId: string;
  disputeCode: string;
  reviewId: string;
  salonId: string;
  status: string;
  reviewedByUserId: string;
}

export class ReviewDisputeResolvedEvent extends BaseDomainEvent<ReviewDisputeResolvedPayload> {
  static readonly EVENT_NAME = 'review.dispute-resolved.v1';
  constructor(payload: ReviewDisputeResolvedPayload, actorId?: string) {
    super(ReviewDisputeResolvedEvent.EVENT_NAME, payload.disputeId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Reputation Summary Events ────────────────────────────────────────────────

export interface RatingSummaryUpdatedPayload {
  entityType: 'SALON' | 'BRANCH' | 'STAFF' | 'SERVICE';
  entityId: string;
  salonId: string;
  averageRating: number;
  totalReviews: number;
}

export class RatingSummaryUpdatedEvent extends BaseDomainEvent<RatingSummaryUpdatedPayload> {
  static readonly EVENT_NAME = 'review.rating-summary-updated.v1';
  constructor(payload: RatingSummaryUpdatedPayload, actorId?: string) {
    super(RatingSummaryUpdatedEvent.EVENT_NAME, payload.entityId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Review Invitation Events ─────────────────────────────────────────────────

export interface ReviewInvitationCreatedPayload {
  invitationId: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  invitationToken: string;
}

export class ReviewInvitationCreatedEvent extends BaseDomainEvent<ReviewInvitationCreatedPayload> {
  static readonly EVENT_NAME = 'review.invitation-created.v1';
  constructor(payload: ReviewInvitationCreatedPayload, actorId?: string) {
    super(ReviewInvitationCreatedEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewInvitationSentPayload {
  invitationId: string;
  bookingId: string;
  customerId: string;
}

export class ReviewInvitationSentEvent extends BaseDomainEvent<ReviewInvitationSentPayload> {
  static readonly EVENT_NAME = 'review.invitation-sent.v1';
  constructor(payload: ReviewInvitationSentPayload, actorId?: string) {
    super(ReviewInvitationSentEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewInvitationOpenedPayload {
  invitationId: string;
  bookingId: string;
}

export class ReviewInvitationOpenedEvent extends BaseDomainEvent<ReviewInvitationOpenedPayload> {
  static readonly EVENT_NAME = 'review.invitation-opened.v1';
  constructor(payload: ReviewInvitationOpenedPayload, actorId?: string) {
    super(ReviewInvitationOpenedEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewInvitationCompletedPayload {
  invitationId: string;
  bookingId: string;
  reviewId: string;
}

export class ReviewInvitationCompletedEvent extends BaseDomainEvent<ReviewInvitationCompletedPayload> {
  static readonly EVENT_NAME = 'review.invitation-completed.v1';
  constructor(payload: ReviewInvitationCompletedPayload, actorId?: string) {
    super(ReviewInvitationCompletedEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewInvitationExpiredPayload {
  invitationId: string;
  bookingId: string;
}

export class ReviewInvitationExpiredEvent extends BaseDomainEvent<ReviewInvitationExpiredPayload> {
  static readonly EVENT_NAME = 'review.invitation-expired.v1';
  constructor(payload: ReviewInvitationExpiredPayload, actorId?: string) {
    super(ReviewInvitationExpiredEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReviewInvitationFailedPayload {
  invitationId: string;
  bookingId: string;
  reason?: string;
}

export class ReviewInvitationFailedEvent extends BaseDomainEvent<ReviewInvitationFailedPayload> {
  static readonly EVENT_NAME = 'review.invitation-failed.v1';
  constructor(payload: ReviewInvitationFailedPayload, actorId?: string) {
    super(ReviewInvitationFailedEvent.EVENT_NAME, payload.invitationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}
