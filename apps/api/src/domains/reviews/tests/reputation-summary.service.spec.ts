import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  BranchRatingSummaryRepository,
  SalonRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  StaffRatingSummaryRepository,
} from '../repositories/reputation-summary.repository';
import {
  ReviewItemRatingRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';

describe('ReputationSummaryServices', () => {
  let salonService: SalonRatingService;
  let branchService: BranchRatingService;
  let staffService: StaffRatingService;
  let serviceRatingService: ServiceRatingService;

  let salonSummaryRepo: any;
  let branchSummaryRepo: any;
  let staffSummaryRepo: any;
  let serviceSummaryRepo: any;
  let reviewRepo: any;
  let itemRatingRepo: any;
  let cacheService: any;
  let auditService: any;
  let eventBus: any;

  beforeEach(async () => {
    salonSummaryRepo = {
      findBySalon: jest.fn().mockResolvedValue({
        salonId: 'sal-1',
        totalReviews: 10,
        averageRating: 4.8,
        npsScore: 80,
        bayesianScore: 4.7,
      }),
      upsert: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...data, id: 'sum-1' })),
    };

    branchSummaryRepo = {
      findByBranch: jest.fn().mockResolvedValue({
        branchId: 'br-1',
        salonId: 'sal-1',
        totalReviews: 5,
        averageRating: 4.9,
        npsScore: 90,
      }),
      upsert: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...data, id: 'sum-br-1' })),
    };

    staffSummaryRepo = {
      findByStaff: jest.fn().mockResolvedValue({
        staffId: 'stf-1',
        salonId: 'sal-1',
        totalReviews: 6,
        averageRating: 5.0,
        fiveStarRate: 100,
      }),
      upsert: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...data, id: 'sum-stf-1' })),
    };

    serviceSummaryRepo = {
      findByService: jest.fn().mockResolvedValue({
        serviceId: 'srv-1',
        salonId: 'sal-1',
        totalReviews: 8,
        averageRating: 4.75,
      }),
      upsert: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...data, id: 'sum-srv-1' })),
    };

    reviewRepo = {
      calculateStarDistribution: jest.fn().mockResolvedValue({
        oneStar: 0,
        twoStar: 0,
        threeStar: 1,
        fourStar: 2,
        fiveStar: 7,
        total: 10,
        average: 4.6,
      }),
    };

    itemRatingRepo = {
      findByStaff: jest.fn().mockResolvedValue({
        data: [{ ratingStars: 5 }, { ratingStars: 5 }],
        total: 2,
      }),
      findByService: jest.fn().mockResolvedValue({
        data: [{ ratingStars: 5 }, { ratingStars: 4 }],
        total: 2,
      }),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonRatingService,
        BranchRatingService,
        StaffRatingService,
        ServiceRatingService,
        { provide: SalonRatingSummaryRepository, useValue: salonSummaryRepo },
        { provide: BranchRatingSummaryRepository, useValue: branchSummaryRepo },
        { provide: StaffRatingSummaryRepository, useValue: staffSummaryRepo },
        { provide: ServiceRatingSummaryRepository, useValue: serviceSummaryRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: ReviewItemRatingRepository, useValue: itemRatingRepo },
        { provide: CacheService, useValue: cacheService },
        { provide: AuditService, useValue: auditService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    salonService = module.get<SalonRatingService>(SalonRatingService);
    branchService = module.get<BranchRatingService>(BranchRatingService);
    staffService = module.get<StaffRatingService>(StaffRatingService);
    serviceRatingService = module.get<ServiceRatingService>(ServiceRatingService);
  });

  describe('SalonRatingService', () => {
    it('should recalculate salon rating summary with NPS and Bayesian score', async () => {
      const summary = await salonService.recalculateSummary('sal-1', 'actor-1');
      expect(summary.totalReviews).toBe(10);
      expect(summary.averageRating).toBe(4.6);
      expect(summary.npsScore).toBe(60); // (7 - 1) / 10 * 100
      expect(salonSummaryRepo.upsert).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('BranchRatingService', () => {
    it('should recalculate branch rating summary', async () => {
      const summary = await branchService.recalculateSummary('br-1', 'sal-1', 'actor-1');
      expect(summary.totalReviews).toBe(10);
      expect(branchSummaryRepo.upsert).toHaveBeenCalled();
    });
  });

  describe('StaffRatingService', () => {
    it('should recalculate staff rating summary and 5-star rate', async () => {
      const summary = await staffService.recalculateSummary('stf-1', 'sal-1', 'actor-1');
      expect(summary.totalReviews).toBe(2);
      expect(summary.averageRating).toBe(5.0);
      expect(summary.fiveStarRate).toBe(100);
      expect(staffSummaryRepo.upsert).toHaveBeenCalled();
    });
  });

  describe('ServiceRatingService', () => {
    it('should recalculate service rating summary', async () => {
      const summary = await serviceRatingService.recalculateSummary('srv-1', 'sal-1', 'actor-1');
      expect(summary.totalReviews).toBe(2);
      expect(summary.averageRating).toBe(4.5);
      expect(serviceSummaryRepo.upsert).toHaveBeenCalled();
    });
  });
});
