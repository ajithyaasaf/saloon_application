import { Injectable, Logger } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  BranchRatingSummaryEntity,
  SalonRatingSummaryEntity,
  ServiceRatingSummaryEntity,
  StaffRatingSummaryEntity,
} from '../entities/reputation-summary.entity';
import { RatingSummaryUpdatedEvent } from '../events/reviews-events.event';
import {
  BranchRatingSummaryRepository,
  SalonRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  StaffRatingSummaryRepository,
} from '../repositories/reputation-summary.repository';
import { ReviewItemRatingRepository, ReviewRepository } from '../repositories/review.repository';

@Injectable()
export class SalonRatingService {
  private readonly logger = new Logger(SalonRatingService.name);

  constructor(
    private readonly salonSummaryRepo: SalonRatingSummaryRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getSummary(salonId: string): Promise<SalonRatingSummaryEntity | null> {
    const cacheKey = `reviews:salon-summary:${salonId}`;
    const cached = await this.cacheService.get<SalonRatingSummaryEntity>(cacheKey);
    if (cached) return cached;

    const summary = await this.salonSummaryRepo.findBySalon(salonId);
    if (summary) {
      const entity = new SalonRatingSummaryEntity({
        ...summary,
        averageRating: Number(summary.averageRating),
        npsScore: summary.npsScore ? Number(summary.npsScore) : null,
        bayesianScore: summary.bayesianScore ? Number(summary.bayesianScore) : null,
      });
      await this.cacheService.set(cacheKey, entity, 3600);
      return entity;
    }
    return null;
  }

  public async recalculateSummary(salonId: string, actorUserId?: string): Promise<SalonRatingSummaryEntity> {
    const stats = await this.reviewRepo.calculateStarDistribution(salonId);

    // Calculate NPS: Promoters (5-star), Passives (4-star), Detractors (1,2,3-star)
    let npsScore: number | null = null;
    if (stats.total > 0) {
      const promoters = stats.fiveStar;
      const detractors = stats.oneStar + stats.twoStar + stats.threeStar;
      npsScore = Number((((promoters - detractors) / stats.total) * 100).toFixed(2));
    }

    // Bayesian average: C = 10 prior reviews, m = 4.5 prior mean
    const C = 10;
    const m = 4.5;
    const bayesianScore =
      stats.total > 0
        ? Number(((C * m + stats.total * stats.average) / (C + stats.total)).toFixed(2))
        : null;

    const summary = await this.salonSummaryRepo.upsert(salonId, {
      salonId,
      totalReviews: stats.total,
      averageRating: stats.average,
      oneStarCount: stats.oneStar,
      twoStarCount: stats.twoStar,
      threeStarCount: stats.threeStar,
      fourStarCount: stats.fourStar,
      fiveStarCount: stats.fiveStar,
      npsScore,
      bayesianScore,
      lastCalculatedAt: new Date(),
    });

    const entity = new SalonRatingSummaryEntity({
      ...summary,
      averageRating: Number(summary.averageRating),
      npsScore: summary.npsScore ? Number(summary.npsScore) : null,
      bayesianScore: summary.bayesianScore ? Number(summary.bayesianScore) : null,
    });

    await this.cacheService.delete(`reviews:salon-summary:${salonId}`);

    this.eventBus.publish(
      new RatingSummaryUpdatedEvent(
        {
          entityType: 'SALON',
          entityId: salonId,
          salonId,
          averageRating: entity.averageRating,
          totalReviews: entity.totalReviews,
        },
        actorUserId,
      ),
    );

    return entity;
  }
}

@Injectable()
export class BranchRatingService {
  constructor(
    private readonly branchSummaryRepo: BranchRatingSummaryRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getSummary(branchId: string, salonId?: string): Promise<BranchRatingSummaryEntity | null> {
    const cacheKey = salonId
      ? `reviews:branch-summary:${salonId}:${branchId}`
      : `reviews:branch-summary:${branchId}`;
    const cached = await this.cacheService.get<BranchRatingSummaryEntity>(cacheKey);
    if (cached) return cached;

    const summary = await this.branchSummaryRepo.findByBranch(branchId);
    if (summary) {
      const entity = new BranchRatingSummaryEntity({
        ...summary,
        averageRating: Number(summary.averageRating),
        npsScore: summary.npsScore ? Number(summary.npsScore) : null,
      });
      await this.cacheService.set(cacheKey, entity, 3600);
      return entity;
    }
    return null;
  }

  public async recalculateSummary(
    branchId: string,
    salonId: string,
    actorUserId?: string,
  ): Promise<BranchRatingSummaryEntity> {
    const stats = await this.reviewRepo.calculateStarDistribution(salonId, branchId);

    let npsScore: number | null = null;
    if (stats.total > 0) {
      const promoters = stats.fiveStar;
      const detractors = stats.oneStar + stats.twoStar + stats.threeStar;
      npsScore = Number((((promoters - detractors) / stats.total) * 100).toFixed(2));
    }

    const summary = await this.branchSummaryRepo.upsert(branchId, {
      branchId,
      salonId,
      totalReviews: stats.total,
      averageRating: stats.average,
      oneStarCount: stats.oneStar,
      twoStarCount: stats.twoStar,
      threeStarCount: stats.threeStar,
      fourStarCount: stats.fourStar,
      fiveStarCount: stats.fiveStar,
      npsScore,
      lastCalculatedAt: new Date(),
    });

    const entity = new BranchRatingSummaryEntity({
      ...summary,
      averageRating: Number(summary.averageRating),
      npsScore: summary.npsScore ? Number(summary.npsScore) : null,
    });

    await this.cacheService.delete(`reviews:branch-summary:${salonId}:${branchId}`);

    this.eventBus.publish(
      new RatingSummaryUpdatedEvent(
        {
          entityType: 'BRANCH',
          entityId: branchId,
          salonId,
          averageRating: entity.averageRating,
          totalReviews: entity.totalReviews,
        },
        actorUserId,
      ),
    );

    return entity;
  }
}

@Injectable()
export class StaffRatingService {
  constructor(
    private readonly staffSummaryRepo: StaffRatingSummaryRepository,
    private readonly itemRatingRepo: ReviewItemRatingRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getSummary(staffId: string, salonId?: string): Promise<StaffRatingSummaryEntity | null> {
    const cacheKey = salonId
      ? `reviews:staff-summary:${salonId}:${staffId}`
      : `reviews:staff-summary:${staffId}`;
    const cached = await this.cacheService.get<StaffRatingSummaryEntity>(cacheKey);
    if (cached) return cached;

    const summary = await this.staffSummaryRepo.findByStaff(staffId);
    if (summary) {
      const entity = new StaffRatingSummaryEntity({
        ...summary,
        averageRating: Number(summary.averageRating),
        fiveStarRate: Number(summary.fiveStarRate),
      });
      await this.cacheService.set(cacheKey, entity, 3600);
      return entity;
    }
    return null;
  }

  public async recalculateSummary(
    staffId: string,
    salonId: string,
    actorUserId?: string,
  ): Promise<StaffRatingSummaryEntity> {
    const itemRatings = await this.itemRatingRepo.findByStaff(staffId, { limit: 10000 });
    const total = itemRatings.total;
    let sum = 0;
    let fiveStars = 0;

    for (const r of itemRatings.data) {
      sum += r.ratingStars;
      if (r.ratingStars === 5) fiveStars++;
    }

    const average = total > 0 ? Number((sum / total).toFixed(2)) : 0;
    const fiveStarRate = total > 0 ? Number(((fiveStars / total) * 100).toFixed(2)) : 0;

    const summary = await this.staffSummaryRepo.upsert(staffId, {
      staffId,
      salonId,
      totalReviews: total,
      averageRating: average,
      fiveStarRate,
      lastCalculatedAt: new Date(),
    });

    const entity = new StaffRatingSummaryEntity({
      ...summary,
      averageRating: Number(summary.averageRating),
      fiveStarRate: Number(summary.fiveStarRate),
    });

    await this.cacheService.delete(`reviews:staff-summary:${salonId}:${staffId}`);

    this.eventBus.publish(
      new RatingSummaryUpdatedEvent(
        {
          entityType: 'STAFF',
          entityId: staffId,
          salonId,
          averageRating: entity.averageRating,
          totalReviews: entity.totalReviews,
        },
        actorUserId,
      ),
    );

    return entity;
  }
}

@Injectable()
export class ServiceRatingService {
  constructor(
    private readonly serviceSummaryRepo: ServiceRatingSummaryRepository,
    private readonly itemRatingRepo: ReviewItemRatingRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getSummary(serviceId: string, salonId?: string): Promise<ServiceRatingSummaryEntity | null> {
    const cacheKey = salonId
      ? `reviews:service-summary:${salonId}:${serviceId}`
      : `reviews:service-summary:${serviceId}`;
    const cached = await this.cacheService.get<ServiceRatingSummaryEntity>(cacheKey);
    if (cached) return cached;

    const summary = await this.serviceSummaryRepo.findByService(serviceId);
    if (summary) {
      const entity = new ServiceRatingSummaryEntity({
        ...summary,
        averageRating: Number(summary.averageRating),
      });
      await this.cacheService.set(cacheKey, entity, 3600);
      return entity;
    }
    return null;
  }

  public async recalculateSummary(
    serviceId: string,
    salonId: string,
    actorUserId?: string,
  ): Promise<ServiceRatingSummaryEntity> {
    const itemRatings = await this.itemRatingRepo.findByService(serviceId, { limit: 10000 });
    const total = itemRatings.total;
    let sum = 0;

    for (const r of itemRatings.data) {
      sum += r.ratingStars;
    }

    const average = total > 0 ? Number((sum / total).toFixed(2)) : 0;

    const summary = await this.serviceSummaryRepo.upsert(serviceId, {
      serviceId,
      salonId,
      totalReviews: total,
      averageRating: average,
      lastCalculatedAt: new Date(),
    });

    const entity = new ServiceRatingSummaryEntity({
      ...summary,
      averageRating: Number(summary.averageRating),
    });

    await this.cacheService.delete(`reviews:service-summary:${salonId}:${serviceId}`);

    this.eventBus.publish(
      new RatingSummaryUpdatedEvent(
        {
          entityType: 'SERVICE',
          entityId: serviceId,
          salonId,
          averageRating: entity.averageRating,
          totalReviews: entity.totalReviews,
        },
        actorUserId,
      ),
    );

    return entity;
  }
}
