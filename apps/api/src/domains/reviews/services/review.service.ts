import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StringUtil } from '../../../common/utils/string.util';
import {
  CreateReviewData,
  CreateReviewItemRatingData,
  CreateReviewMediaAttachmentData,
  UpdateReviewData,
} from '../dto/review.dto';
import { SearchReviewQueryDto } from '../dto/search-review.dto';
import { ReviewEntity } from '../entities/review.entity';
import {
  ReviewArchivedEvent,
  ReviewCreatedEvent,
  ReviewHiddenEvent,
  ReviewPublishedEvent,
  ReviewRejectedEvent,
  ReviewUpdatedEvent,
} from '../events/reviews-events.event';
import {
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from './reputation-summary.service';

export interface SubmitReviewInput {
  salonId: string;
  branchId: string;
  bookingId?: string | null;
  appointmentId?: string | null;
  overallRating: number;
  reviewTitle?: string | null;
  reviewComment?: string | null;
  cleanlinessRating?: number | null;
  hospitalityRating?: number | null;
  valueRating?: number | null;
  ambienceRating?: number | null;
  isAnonymous?: boolean;
  itemRatings?: Array<{
    serviceId: string;
    staffId?: string | null;
    bookingItemId?: string | null;
    ratingStars: number;
    itemComment?: string | null;
  }>;
  mediaAttachments?: Array<{
    mediaId: string;
    caption?: string | null;
    isBeforePhoto?: boolean;
    isAfterPhoto?: boolean;
    displayOrder?: number;
  }>;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly itemRatingRepo: ReviewItemRatingRepository,
    private readonly mediaAttachmentRepo: ReviewMediaAttachmentRepository,
    private readonly salonRatingService: SalonRatingService,
    private readonly branchRatingService: BranchRatingService,
    private readonly staffRatingService: StaffRatingService,
    private readonly serviceRatingService: ServiceRatingService,
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getById(id: string): Promise<ReviewEntity> {
    const cacheKey = `reviews:review:${id}`;
    const cached = await this.cacheService.get<ReviewEntity>(cacheKey);
    if (cached) return cached;

    const review = await this.reviewRepo.findById(id);
    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found.`);
    }

    const entity = new ReviewEntity(review as any);
    await this.cacheService.set(cacheKey, entity, 600);
    return entity;
  }

  public async search(query: SearchReviewQueryDto): Promise<{ data: ReviewEntity[]; total: number }> {
    const res = await this.reviewRepo.search(query);
    return {
      data: res.data.map((r) => new ReviewEntity(r as any)),
      total: res.total,
    };
  }

  public async createReview(
    input: SubmitReviewInput,
    actorCustomerId: string,
  ): Promise<ReviewEntity> {
    // 1. Invariant Validation: Overall rating range 1-5
    if (input.overallRating < 1 || input.overallRating > 5) {
      throw new BadRequestException('Overall rating must be between 1 and 5 stars.');
    }

    // Dimensional ratings validation
    for (const [dim, val] of Object.entries({
      cleanliness: input.cleanlinessRating,
      hospitality: input.hospitalityRating,
      value: input.valueRating,
      ambience: input.ambienceRating,
    })) {
      if (val !== undefined && val !== null && (val < 1 || val > 5)) {
        throw new BadRequestException(`${dim} rating must be between 1 and 5 stars.`);
      }
    }

    // 2. Booking Eligibility Verification
    if (input.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { items: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with id ${input.bookingId} not found.`);
      }

      if (booking.customerId !== actorCustomerId) {
        throw new ForbiddenException('You cannot review a booking that belongs to another customer.');
      }

      if (booking.salonId !== input.salonId) {
        throw new BadRequestException('Booking does not belong to the specified salon.');
      }

      if (booking.branchId !== input.branchId) {
        throw new BadRequestException('Booking does not belong to the specified branch.');
      }

      if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException('Only completed bookings can be reviewed.');
      }

      // Check if a review already exists for this booking
      const existing = await this.reviewRepo.findByBooking(input.bookingId);
      if (existing) {
        throw new ConflictException('A review has already been submitted for this booking.');
      }
    }

    // 3. Item ratings validation
    if (input.itemRatings && input.itemRatings.length > 0) {
      for (const item of input.itemRatings) {
        if (item.ratingStars < 1 || item.ratingStars > 5) {
          throw new BadRequestException('Item ratings must be between 1 and 5 stars.');
        }
      }
    }

    // 4. Atomic Execution
    const createdReview = await this.transactionService.run(async (tx) => {
      const review = await this.reviewRepo.create(
        {
          salonId: input.salonId,
          branchId: input.branchId,
          customerId: actorCustomerId,
          bookingId: input.bookingId,
          appointmentId: input.appointmentId,
          overallRating: input.overallRating,
          reviewTitle: input.reviewTitle ? StringUtil.sanitizeText(input.reviewTitle, 150) : input.reviewTitle,
          reviewComment: input.reviewComment ? StringUtil.sanitizeText(input.reviewComment, 4000) : input.reviewComment,
          cleanlinessRating: input.cleanlinessRating,
          hospitalityRating: input.hospitalityRating,
          valueRating: input.valueRating,
          ambienceRating: input.ambienceRating,
          status: ReviewStatus.PUBLISHED,
          isVerifiedPurchase: true,
          isAnonymous: input.isAnonymous ?? false,
          publishedAt: new Date(),
        },
        tx,
      );

      if (input.itemRatings && input.itemRatings.length > 0) {
        const itemRatingsData: CreateReviewItemRatingData[] = input.itemRatings.map((item) => ({
          reviewId: review.id,
          serviceId: item.serviceId,
          staffId: item.staffId,
          bookingItemId: item.bookingItemId,
          ratingStars: item.ratingStars,
          itemComment: item.itemComment ? StringUtil.sanitizeText(item.itemComment, 1000) : item.itemComment,
        }));
        await this.itemRatingRepo.createMany(itemRatingsData, tx);
      }

      if (input.mediaAttachments && input.mediaAttachments.length > 0) {
        const mediaData: CreateReviewMediaAttachmentData[] = input.mediaAttachments.map((m) => ({
          reviewId: review.id,
          mediaId: m.mediaId,
          caption: m.caption,
          isBeforePhoto: m.isBeforePhoto,
          isAfterPhoto: m.isAfterPhoto,
          displayOrder: m.displayOrder,
        }));
        await this.mediaAttachmentRepo.createMany(mediaData, tx);
      }

      return review;
    });

    // 5. Post-Commit Recalculations & Notifications
    await Promise.all([
      this.salonRatingService.recalculateSummary(input.salonId, actorCustomerId),
      this.branchRatingService.recalculateSummary(input.branchId, input.salonId, actorCustomerId),
    ]);

    if (input.itemRatings) {
      for (const item of input.itemRatings) {
        if (item.serviceId) {
          await this.serviceRatingService.recalculateSummary(
            item.serviceId,
            input.salonId,
            actorCustomerId,
          );
        }
        if (item.staffId) {
          await this.staffRatingService.recalculateSummary(
            item.staffId,
            input.salonId,
            actorCustomerId,
          );
        }
      }
    }

    await this.auditService.log({
      action: 'REVIEW_CREATED',
      actorId: actorCustomerId,
      entityType: 'Review',
      entityId: createdReview.id,
      metadata: {
        salonId: input.salonId,
        bookingId: input.bookingId,
        overallRating: input.overallRating,
      },
    });

    this.eventBus.publish(
      new ReviewCreatedEvent(
        {
          reviewId: createdReview.id,
          salonId: input.salonId,
          branchId: input.branchId,
          customerId: actorCustomerId,
          bookingId: input.bookingId,
          overallRating: input.overallRating,
        },
        actorCustomerId,
      ),
    );

    this.eventBus.publish(
      new ReviewPublishedEvent(
        {
          reviewId: createdReview.id,
          salonId: input.salonId,
          branchId: input.branchId,
          customerId: actorCustomerId,
          overallRating: input.overallRating,
        },
        actorCustomerId,
      ),
    );

    return new ReviewEntity(createdReview as any);
  }

  public async updateReview(
    reviewId: string,
    data: UpdateReviewData,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundException(`Review with id ${reviewId} not found.`);
    }

    if (existing.customerId !== actorUserId) {
      throw new ForbiddenException('You can only edit your own review.');
    }

    if (data.overallRating !== undefined && (data.overallRating < 1 || data.overallRating > 5)) {
      throw new BadRequestException('Overall rating must be between 1 and 5 stars.');
    }

    const sanitizedData: UpdateReviewData = {
      ...data,
      ...(data.reviewTitle !== undefined ? { reviewTitle: data.reviewTitle ? StringUtil.sanitizeText(data.reviewTitle, 150) : data.reviewTitle } : {}),
      ...(data.reviewComment !== undefined ? { reviewComment: data.reviewComment ? StringUtil.sanitizeText(data.reviewComment, 4000) : data.reviewComment } : {}),
    };

    const updated = await this.reviewRepo.update(reviewId, sanitizedData, expectedVersion);

    // Recalculate summary if rating changed
    if (data.overallRating !== undefined && data.overallRating !== existing.overallRating) {
      await Promise.all([
        this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
        this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
      ]);
    }

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    await this.auditService.log({
      action: 'REVIEW_UPDATED',
      actorId: actorUserId,
      entityType: 'Review',
      entityId: reviewId,
      metadata: { salonId: existing.salonId },
    });

    this.eventBus.publish(
      new ReviewUpdatedEvent(
        {
          reviewId,
          salonId: existing.salonId,
          updatedFields: Object.keys(data),
        },
        actorUserId,
      ),
    );

    return new ReviewEntity(updated as any);
  }

  public async publishReview(
    reviewId: string,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found.`);

    const updated = await this.reviewRepo.publish(reviewId, expectedVersion);

    await Promise.all([
      this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
      this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
    ]);

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    this.eventBus.publish(
      new ReviewPublishedEvent(
        {
          reviewId,
          salonId: existing.salonId,
          branchId: existing.branchId,
          customerId: existing.customerId,
          overallRating: existing.overallRating,
        },
        actorUserId,
      ),
    );

    return new ReviewEntity(updated as any);
  }

  public async hideReview(
    reviewId: string,
    reason: string,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found.`);

    const updated = await this.reviewRepo.hide(reviewId, expectedVersion);

    await Promise.all([
      this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
      this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
    ]);

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    this.eventBus.publish(
      new ReviewHiddenEvent(
        {
          reviewId,
          salonId: existing.salonId,
          reason,
        },
        actorUserId,
      ),
    );

    return new ReviewEntity(updated as any);
  }

  public async rejectReview(
    reviewId: string,
    reason: string,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found.`);

    const updated = await this.reviewRepo.reject(reviewId, expectedVersion);

    await Promise.all([
      this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
      this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
    ]);

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    this.eventBus.publish(
      new ReviewRejectedEvent(
        {
          reviewId,
          salonId: existing.salonId,
          reason,
        },
        actorUserId,
      ),
    );

    return new ReviewEntity(updated as any);
  }

  public async archiveReview(
    reviewId: string,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found.`);

    const updated = await this.reviewRepo.archive(reviewId, expectedVersion);

    await Promise.all([
      this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
      this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
    ]);

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    this.eventBus.publish(
      new ReviewArchivedEvent(
        {
          reviewId,
          salonId: existing.salonId,
        },
        actorUserId,
      ),
    );

    return new ReviewEntity(updated as any);
  }

  public async softDeleteReview(
    reviewId: string,
    actorUserId: string,
    expectedVersion?: number,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found.`);

    const updated = await this.reviewRepo.softDelete(reviewId, expectedVersion);

    await Promise.all([
      this.salonRatingService.recalculateSummary(existing.salonId, actorUserId),
      this.branchRatingService.recalculateSummary(existing.branchId, existing.salonId, actorUserId),
    ]);

    await this.cacheService.delete(`reviews:review:${reviewId}`);

    return new ReviewEntity(updated as any);
  }
}
