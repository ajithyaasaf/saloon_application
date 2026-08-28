import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewDisputeStatus, ReviewStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { ReviewDisputeRepository } from '../repositories/review-moderation.repository';
import { ReviewRepository } from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
} from '../services/reputation-summary.service';
import { ReviewDisputeService } from '../services/review-dispute.service';

describe('ReviewDisputeService', () => {
  let service: ReviewDisputeService;
  let disputeRepo: any;
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

  const mockDispute = {
    id: 'dsp-1',
    disputeCode: 'DSP-202608-ABCD',
    reviewId: 'rev-1',
    salonId: 'sal-1',
    submittedByUserId: 'owner-1',
    disputeReason: 'Customer never showed up',
    status: ReviewDisputeStatus.SUBMITTED,
    version: 1,
  };

  beforeEach(async () => {
    disputeRepo = {
      findById: jest.fn().mockResolvedValue(mockDispute),
      findByReview: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockDispute),
      updateStatus: jest.fn().mockResolvedValue({ ...mockDispute, status: ReviewDisputeStatus.RESOLVED_REMOVED }),
      search: jest.fn().mockResolvedValue({ data: [mockDispute], total: 1 }),
    };

    reviewRepo = {
      findById: jest.fn().mockResolvedValue(mockReview),
      updateStatus: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.UNDER_REVIEW }),
      hide: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.HIDDEN }),
      publish: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.PUBLISHED }),
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
        ReviewDisputeService,
        { provide: ReviewDisputeRepository, useValue: disputeRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: SalonRatingService, useValue: salonRatingService },
        { provide: BranchRatingService, useValue: branchRatingService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewDisputeService>(ReviewDisputeService);
  });

  it('should submit dispute and set review status to UNDER_REVIEW', async () => {
    const res = await service.submitDispute(
      {
        reviewId: 'rev-1',
        salonId: 'sal-1',
        disputeReason: 'Customer never showed up',
      },
      'owner-1',
    );
    expect(res.id).toBe('dsp-1');
    expect(disputeRepo.create).toHaveBeenCalled();
    expect(reviewRepo.updateStatus).toHaveBeenCalledWith('rev-1', ReviewStatus.UNDER_REVIEW);
  });

  it('should reject dispute for another salon review', async () => {
    await expect(
      service.submitDispute(
        {
          reviewId: 'rev-1',
          salonId: 'different-salon',
          disputeReason: 'Reason',
        },
        'owner-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject duplicate active dispute for the same review', async () => {
    disputeRepo.findByReview.mockResolvedValueOnce(mockDispute);
    await expect(
      service.submitDispute(
        {
          reviewId: 'rev-1',
          salonId: 'sal-1',
          disputeReason: 'Reason',
        },
        'owner-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should resolve dispute as RESOLVED_REMOVED and hide review and update reputation', async () => {
    const res = await service.resolveDispute(
      'dsp-1',
      ReviewDisputeStatus.RESOLVED_REMOVED,
      'Evidence accepted',
      'super-admin-1',
      1,
    );
    expect(res.id).toBe('dsp-1');
    expect(reviewRepo.hide).toHaveBeenCalledWith('rev-1');
    expect(salonRatingService.recalculateSummary).toHaveBeenCalledWith('sal-1', 'super-admin-1');
  });
});
