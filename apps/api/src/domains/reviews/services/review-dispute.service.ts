import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReviewDisputeStatus, ReviewStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { SearchReviewDisputeQueryDto } from '../dto/search-review.dto';
import { ReviewDisputeEntity } from '../entities/review-moderation.entity';
import {
  ReviewDisputeResolvedEvent,
  ReviewDisputeSubmittedEvent,
} from '../events/reviews-events.event';
import { ReviewDisputeRepository } from '../repositories/review-moderation.repository';
import { ReviewRepository } from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
} from './reputation-summary.service';

export interface SubmitDisputeInput {
  reviewId: string;
  salonId: string;
  disputeReason: string;
  evidenceDetails?: string | null;
}

@Injectable()
export class ReviewDisputeService {
  private readonly logger = new Logger(ReviewDisputeService.name);

  constructor(
    private readonly disputeRepo: ReviewDisputeRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly salonRatingService: SalonRatingService,
    private readonly branchRatingService: BranchRatingService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async submitDispute(
    input: SubmitDisputeInput,
    actorUserId: string,
  ): Promise<ReviewDisputeEntity> {
    const review = await this.reviewRepo.findById(input.reviewId);
    if (!review) {
      throw new NotFoundException(`Review with id ${input.reviewId} not found.`);
    }

    if (review.salonId !== input.salonId) {
      throw new ForbiddenException('You cannot dispute a review from another salon.');
    }

    const existingDispute = await this.disputeRepo.findByReview(input.reviewId);
    if (existingDispute) {
      throw new ConflictException('A dispute has already been submitted for this review.');
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const disputeCode = `DSP-${yearMonth}-${randomSuffix}`;

    const dispute = await this.disputeRepo.create({
      disputeCode,
      reviewId: input.reviewId,
      salonId: input.salonId,
      submittedByUserId: actorUserId,
      disputeReason: input.disputeReason,
      evidenceDetails: input.evidenceDetails,
      status: ReviewDisputeStatus.SUBMITTED,
    });

    // Mark review as UNDER_REVIEW
    await this.reviewRepo.updateStatus(input.reviewId, ReviewStatus.UNDER_REVIEW);

    await this.auditService.log({
      action: 'REVIEW_DISPUTE_SUBMITTED',
      actorId: actorUserId,
      entityType: 'ReviewDispute',
      entityId: dispute.id,
      metadata: {
        salonId: input.salonId,
        reviewId: input.reviewId,
        disputeCode,
        disputeReason: input.disputeReason,
      },
    });

    this.eventBus.publish(
      new ReviewDisputeSubmittedEvent(
        {
          disputeId: dispute.id,
          disputeCode,
          reviewId: input.reviewId,
          salonId: input.salonId,
          submittedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new ReviewDisputeEntity(dispute as any);
  }

  public async searchDisputes(
    query: SearchReviewDisputeQueryDto,
  ): Promise<{ data: ReviewDisputeEntity[]; total: number }> {
    const res = await this.disputeRepo.search(query);
    return {
      data: res.data.map((d) => new ReviewDisputeEntity(d as any)),
      total: res.total,
    };
  }

  public async resolveDispute(
    disputeId: string,
    status: ReviewDisputeStatus,
    adminDecisionNotes: string,
    adminUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewDisputeEntity> {
    const dispute = await this.disputeRepo.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Review dispute with id ${disputeId} not found.`);
    }

    if (
      status !== ReviewDisputeStatus.RESOLVED_REMOVED &&
      status !== ReviewDisputeStatus.RESOLVED_EDITED &&
      status !== ReviewDisputeStatus.REJECTED_MAINTAINED
    ) {
      throw new BadRequestException(`Invalid resolution status ${status}.`);
    }

    const updated = await this.disputeRepo.updateStatus(
      disputeId,
      status,
      adminDecisionNotes,
      adminUserId,
      expectedVersion,
    );

    const review = await this.reviewRepo.findById(dispute.reviewId);
    if (review) {
      if (status === ReviewDisputeStatus.RESOLVED_REMOVED) {
        await this.reviewRepo.hide(dispute.reviewId);
      } else if (status === ReviewDisputeStatus.REJECTED_MAINTAINED) {
        await this.reviewRepo.publish(dispute.reviewId);
      }

      await Promise.all([
        this.salonRatingService.recalculateSummary(review.salonId, adminUserId),
        this.branchRatingService.recalculateSummary(review.branchId, review.salonId, adminUserId),
      ]);

      await this.cacheService.delete(`reviews:review:${dispute.reviewId}`);
    }

    await this.auditService.log({
      action: 'REVIEW_DISPUTE_RESOLVED',
      actorId: adminUserId,
      entityType: 'ReviewDispute',
      entityId: disputeId,
      metadata: { salonId: dispute.salonId, status, adminDecisionNotes },
    });

    this.eventBus.publish(
      new ReviewDisputeResolvedEvent(
        {
          disputeId,
          disputeCode: dispute.disputeCode,
          reviewId: dispute.reviewId,
          salonId: dispute.salonId,
          status,
          reviewedByUserId: adminUserId,
        },
        adminUserId,
      ),
    );

    return new ReviewDisputeEntity(updated as any);
  }
}
