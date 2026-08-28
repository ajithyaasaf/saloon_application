import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewFlagReason, ReviewFlagStatus, ReviewStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { ReviewFlagRepository } from '../repositories/review-moderation.repository';
import { ReviewRepository } from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
} from '../services/reputation-summary.service';
import { ReviewModerationService } from '../services/review-moderation.service';

describe('ReviewModerationService', () => {
  let service: ReviewModerationService;
  let flagRepo: any;
  let reviewRepo: any;
  let salonRatingService: any;
  let branchRatingService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    status: ReviewStatus.PUBLISHED,
  };

  const mockFlag = {
    id: 'flg-1',
    reviewId: 'rev-1',
    reportedByUserId: 'cust-reporter',
    reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
    status: ReviewFlagStatus.PENDING,
  };

  beforeEach(async () => {
    flagRepo = {
      findById: jest.fn().mockResolvedValue(mockFlag),
      create: jest.fn().mockResolvedValue(mockFlag),
      resolve: jest.fn().mockResolvedValue({ ...mockFlag, status: ReviewFlagStatus.UPHELD }),
      search: jest.fn().mockResolvedValue({ data: [mockFlag], total: 1 }),
    };

    reviewRepo = {
      findById: jest.fn().mockResolvedValue(mockReview),
      updateStatus: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.FLAGGED }),
      hide: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.HIDDEN }),
      publish: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.PUBLISHED }),
      reject: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.REJECTED }),
    };

    salonRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    branchRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewModerationService,
        { provide: ReviewFlagRepository, useValue: flagRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: SalonRatingService, useValue: salonRatingService },
        { provide: BranchRatingService, useValue: branchRatingService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewModerationService>(ReviewModerationService);
  });

  it('should flag review and set review status to FLAGGED', async () => {
    const res = await service.flagReview(
      {
        reviewId: 'rev-1',
        reportedByUserId: 'cust-reporter',
        reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
      },
      'cust-reporter',
    );
    expect(res.id).toBe('flg-1');
    expect(flagRepo.create).toHaveBeenCalled();
    expect(reviewRepo.updateStatus).toHaveBeenCalledWith('rev-1', ReviewStatus.FLAGGED);
  });

  it('should prevent user from flagging their own review', async () => {
    await expect(
      service.flagReview(
        {
          reviewId: 'rev-1',
          reportedByUserId: 'cust-1',
          reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
        },
        'cust-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should resolve flag as UPHELD and hide review and recalculate reputation', async () => {
    const res = await service.resolveFlag(
      'flg-1',
      ReviewFlagStatus.UPHELD,
      'Spam verified',
      'mod-user-1',
      'HIDE',
    );
    expect(res.id).toBe('flg-1');
    expect(reviewRepo.hide).toHaveBeenCalledWith('rev-1');
    expect(salonRatingService.recalculateSummary).toHaveBeenCalledWith('sal-1', 'mod-user-1');
  });
});
