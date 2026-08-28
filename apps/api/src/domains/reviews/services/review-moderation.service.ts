import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReviewFlagReason, ReviewFlagStatus, ReviewStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { CreateReviewFlagData } from '../dto/review.dto';
import { SearchReviewFlagQueryDto } from '../dto/search-review.dto';
import { ReviewFlagEntity } from '../entities/review-moderation.entity';
import {
  ReviewFlaggedEvent,
  ReviewFlagResolvedEvent,
} from '../events/reviews-events.event';
import { ReviewFlagRepository } from '../repositories/review-moderation.repository';
import { ReviewRepository } from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
} from './reputation-summary.service';

@Injectable()
export class ReviewModerationService {
  private readonly logger = new Logger(ReviewModerationService.name);

  constructor(
    private readonly flagRepo: ReviewFlagRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly salonRatingService: SalonRatingService,
    private readonly branchRatingService: BranchRatingService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async flagReview(
    data: CreateReviewFlagData,
    actorUserId: string,
  ): Promise<ReviewFlagEntity> {
    const review = await this.reviewRepo.findById(data.reviewId);
    if (!review) {
      throw new NotFoundException(`Review with id ${data.reviewId} not found.`);
    }

    if (review.customerId === actorUserId) {
      throw new BadRequestException('You cannot flag your own review.');
    }

    const flag = await this.flagRepo.create({
      reviewId: data.reviewId,
      reportedByUserId: actorUserId,
      reasonCategory: data.reasonCategory,
      explanation: data.explanation,
    });

    // Mark review status as FLAGGED if currently PUBLISHED
    if (review.status === ReviewStatus.PUBLISHED) {
      await this.reviewRepo.updateStatus(data.reviewId, ReviewStatus.FLAGGED);
    }

    await this.auditService.log({
      action: 'REVIEW_FLAGGED',
      actorId: actorUserId,
      entityType: 'ReviewFlag',
      entityId: flag.id,
      metadata: {
        salonId: review.salonId,
        reviewId: data.reviewId,
        reasonCategory: data.reasonCategory,
      },
    });

    this.eventBus.publish(
      new ReviewFlaggedEvent(
        {
          flagId: flag.id,
          reviewId: data.reviewId,
          reportedByUserId: actorUserId,
          reasonCategory: data.reasonCategory,
        },
        actorUserId,
      ),
    );

    return new ReviewFlagEntity(flag as any);
  }

  public async getPendingFlags(query?: SearchReviewFlagQueryDto): Promise<{ data: ReviewFlagEntity[]; total: number }> {
    const res = await this.flagRepo.search({
      ...query,
      status: ReviewFlagStatus.PENDING,
    });
    return {
      data: res.data.map((f) => new ReviewFlagEntity(f as any)),
      total: res.total,
    };
  }

  public async resolveFlag(
    flagId: string,
    status: ReviewFlagStatus,
    resolutionNotes: string,
    moderatorUserId: string,
    actionOnReview?: 'HIDE' | 'REJECT' | 'RESTORE',
  ): Promise<ReviewFlagEntity> {
    const flag = await this.flagRepo.findById(flagId);
    if (!flag) {
      throw new NotFoundException(`Review flag with id ${flagId} not found.`);
    }

    const resolved = await this.flagRepo.resolve(
      flagId,
      status,
      resolutionNotes,
      moderatorUserId,
    );

    const review = await this.reviewRepo.findById(flag.reviewId);
    if (review) {
      if (status === ReviewFlagStatus.UPHELD) {
        if (actionOnReview === 'REJECT') {
          await this.reviewRepo.reject(flag.reviewId);
        } else {
          await this.reviewRepo.hide(flag.reviewId);
        }
        // Recalculate reputation
        await Promise.all([
          this.salonRatingService.recalculateSummary(review.salonId, moderatorUserId),
          this.branchRatingService.recalculateSummary(review.branchId, review.salonId, moderatorUserId),
        ]);
      } else if (status === ReviewFlagStatus.DISMISSED && actionOnReview === 'RESTORE') {
        await this.reviewRepo.publish(flag.reviewId);
        await Promise.all([
          this.salonRatingService.recalculateSummary(review.salonId, moderatorUserId),
          this.branchRatingService.recalculateSummary(review.branchId, review.salonId, moderatorUserId),
        ]);
      }

      await this.cacheService.delete(`reviews:review:${flag.reviewId}`);
    }

    await this.auditService.log({
      action: 'REVIEW_FLAG_RESOLVED',
      actorId: moderatorUserId,
      entityType: 'ReviewFlag',
      entityId: flagId,
      metadata: { salonId: review?.salonId, status, resolutionNotes, actionOnReview },
    });

    this.eventBus.publish(
      new ReviewFlagResolvedEvent(
        {
          flagId,
          reviewId: flag.reviewId,
          status,
          resolvedByUserId: moderatorUserId,
        },
        moderatorUserId,
      ),
    );

    return new ReviewFlagEntity(resolved as any);
  }
}
