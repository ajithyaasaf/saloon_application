import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StringUtil } from '../../../common/utils/string.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { ReviewReplyEntity } from '../entities/review.entity';
import {
  ReviewReplyCreatedEvent,
  ReviewReplyUpdatedEvent,
} from '../events/reviews-events.event';
import {
  ReviewReplyRepository,
  ReviewRepository,
} from '../repositories/review.repository';

@Injectable()
export class ReviewReplyService {
  private readonly logger = new Logger(ReviewReplyService.name);

  constructor(
    private readonly replyRepo: ReviewReplyRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getByReview(reviewId: string): Promise<ReviewReplyEntity | null> {
    const reply = await this.replyRepo.findByReview(reviewId);
    if (!reply) return null;
    return new ReviewReplyEntity(reply as any);
  }

  public async createReply(
    reviewId: string,
    salonId: string,
    responderUserId: string,
    replyText: string,
  ): Promise<ReviewReplyEntity> {
    if (!replyText || replyText.trim().length === 0) {
      throw new BadRequestException('Reply text cannot be empty.');
    }

    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found.`);
    }

    if (review.salonId !== salonId) {
      throw new ForbiddenException('You cannot reply to a review from another salon.');
    }

    const existingReply = await this.replyRepo.findByReview(reviewId);
    if (existingReply) {
      throw new ConflictException('A reply has already been submitted for this review.');
    }

    const sanitizedReplyText = StringUtil.sanitizeText(replyText, 2000);

    const created = await this.replyRepo.create({
      reviewId,
      salonId,
      responderUserId,
      replyText: sanitizedReplyText,
      publishedAt: new Date(),
    });

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    await this.auditService.log({
      action: 'REVIEW_REPLY_CREATED',
      actorId: responderUserId,
      entityType: 'ReviewReply',
      entityId: created.id,
      metadata: { salonId, reviewId },
    });

    this.eventBus.publish(
      new ReviewReplyCreatedEvent(
        {
          replyId: created.id,
          reviewId,
          salonId,
          responderUserId,
        },
        responderUserId,
      ),
    );

    return new ReviewReplyEntity(created as any);
  }

  public async updateReply(
    replyId: string,
    salonId: string,
    responderUserId: string,
    replyText: string,
    expectedVersion?: number,
  ): Promise<ReviewReplyEntity> {
    if (!replyText || replyText.trim().length === 0) {
      throw new BadRequestException('Reply text cannot be empty.');
    }

    const existing = await this.replyRepo.findById(replyId);
    if (!existing) {
      throw new NotFoundException(`Review reply with id ${replyId} not found.`);
    }

    if (existing.salonId !== salonId) {
      throw new ForbiddenException('You cannot edit a reply belonging to another salon.');
    }

    const sanitizedReplyText = StringUtil.sanitizeText(replyText, 2000);

    const updated = await this.replyRepo.update(
      replyId,
      { replyText: sanitizedReplyText },
      expectedVersion,
    );

    await this.cacheService.delete(`reviews:review:${existing.reviewId}`);

    await this.auditService.log({
      action: 'REVIEW_REPLY_UPDATED',
      actorId: responderUserId,
      entityType: 'ReviewReply',
      entityId: replyId,
      metadata: { salonId },
    });

    this.eventBus.publish(
      new ReviewReplyUpdatedEvent(
        {
          replyId,
          reviewId: existing.reviewId,
          salonId,
        },
        responderUserId,
      ),
    );

    return new ReviewReplyEntity(updated as any);
  }

  public async deleteReply(
    replyId: string,
    salonId: string,
    responderUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewReplyEntity> {
    const existing = await this.replyRepo.findById(replyId);
    if (!existing) {
      throw new NotFoundException(`Review reply with id ${replyId} not found.`);
    }

    if (existing.salonId !== salonId) {
      throw new ForbiddenException('You cannot delete a reply belonging to another salon.');
    }

    const deleted = await this.replyRepo.softDelete(replyId, expectedVersion);
    await this.cacheService.delete(`reviews:review:${existing.reviewId}`);

    return new ReviewReplyEntity(deleted as any);
  }
}
