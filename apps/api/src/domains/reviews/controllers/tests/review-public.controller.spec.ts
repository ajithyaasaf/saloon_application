import { Test, TestingModule } from '@nestjs/testing';
import { ReviewStatus } from '@prisma/client';
import { ReviewPublicController } from '../review-public.controller';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../../services/reputation-summary.service';
import { ReviewInvitationService } from '../../services/review-invitation.service';
import { ReviewService } from '../../services/review.service';

describe('ReviewPublicController', () => {
  let controller: ReviewPublicController;
  let reviewService: any;
  let salonRatingService: any;
  let branchRatingService: any;
  let staffRatingService: any;
  let serviceRatingService: any;
  let invitationService: any;

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    overallRating: 5,
    reviewTitle: 'Amazing!',
    reviewComment: 'Best salon ever',
    isVerifiedPurchase: true,
    isAnonymous: false,
    helpfulVotesCount: 4,
    status: ReviewStatus.PUBLISHED,
    createdAt: new Date(),
    customer: { user: { fullName: 'Jane Doe' } },
  };

  const mockSummary = {
    totalReviews: 12,
    averageRating: 4.9,
    oneStarCount: 0,
    twoStarCount: 0,
    threeStarCount: 0,
    fourStarCount: 2,
    fiveStarCount: 10,
    npsScore: 85,
    bayesianScore: 4.8,
    lastCalculatedAt: new Date(),
  };

  beforeEach(async () => {
    reviewService = {
      search: jest.fn().mockResolvedValue({ data: [mockReview], total: 1 }),
      getById: jest.fn().mockResolvedValue(mockReview),
    };

    salonRatingService = {
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    };

    branchRatingService = {
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    };

    staffRatingService = {
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    };

    serviceRatingService = {
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    };

    invitationService = {
      validateAndOpenToken: jest.fn().mockResolvedValue({
        id: 'inv-1',
        bookingId: 'bk-1',
        salonId: 'sal-1',
        branchId: 'br-1',
        expiresAt: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewPublicController],
      providers: [
        { provide: ReviewService, useValue: reviewService },
        { provide: SalonRatingService, useValue: salonRatingService },
        { provide: BranchRatingService, useValue: branchRatingService },
        { provide: StaffRatingService, useValue: staffRatingService },
        { provide: ServiceRatingService, useValue: serviceRatingService },
        { provide: ReviewInvitationService, useValue: invitationService },
      ],
    }).compile();

    controller = module.get<ReviewPublicController>(ReviewPublicController);
  });

  it('should search published reviews and sanitize public output', async () => {
    const res = await controller.searchReviews({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].reviewerName).toBe('Jane Doe');
    expect(reviewService.search).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReviewStatus.PUBLISHED }),
    );
  });

  it('should return anonymous reviewer name when isAnonymous is true', async () => {
    reviewService.search.mockResolvedValueOnce({
      data: [{ ...mockReview, isAnonymous: true }],
      total: 1,
    });
    const res = await controller.searchReviews({});
    expect(res.data[0].reviewerName).toBe('Verified Customer');
  });

  it('should get public salon reviews', async () => {
    const res = await controller.getSalonReviews('sal-1', {});
    expect(res.success).toBe(true);
    expect(reviewService.search).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1', status: ReviewStatus.PUBLISHED }),
    );
  });

  it('should get public salon rating summary', async () => {
    const res = await controller.getSalonRatingSummary('sal-1');
    expect(res.success).toBe(true);
    expect(res.data.averageRating).toBe(4.9);
  });

  it('should validate and open review invitation token', async () => {
    const res = await controller.validateInvitation('valid-token-123');
    expect(res.success).toBe(true);
    expect(res.data.bookingId).toBe('bk-1');
    expect(invitationService.validateAndOpenToken).toHaveBeenCalledWith('valid-token-123');
  });
});
