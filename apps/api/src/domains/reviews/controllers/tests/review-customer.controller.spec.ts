import { Test, TestingModule } from '@nestjs/testing';
import { ReviewStatus } from '@prisma/client';
import { ReviewCustomerController } from '../review-customer.controller';
import { ReviewHelpfulVoteService } from '../../services/review-helpful-vote.service';
import { ReviewModerationService } from '../../services/review-moderation.service';
import { ReviewService } from '../../services/review.service';

describe('ReviewCustomerController', () => {
  let controller: ReviewCustomerController;
  let reviewService: any;
  let helpfulVoteService: any;
  let moderationService: any;

  const mockUser = {
    id: 'cust-1',
    role: 'CUSTOMER',
  };

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    bookingId: 'bk-1',
    overallRating: 5,
    reviewTitle: 'Loved it',
    status: ReviewStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    reviewService = {
      createReview: jest.fn().mockResolvedValue(mockReview),
      search: jest.fn().mockResolvedValue({ data: [mockReview], total: 1 }),
      getById: jest.fn().mockResolvedValue(mockReview),
      updateReview: jest.fn().mockResolvedValue({ ...mockReview, overallRating: 4 }),
      archiveReview: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.ARCHIVED }),
    };

    helpfulVoteService = {
      toggleVote: jest.fn().mockResolvedValue({ isVoted: true, helpfulVotesCount: 5 }),
    };

    moderationService = {
      flagReview: jest.fn().mockResolvedValue({ id: 'flg-1', status: 'PENDING' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewCustomerController],
      providers: [
        { provide: ReviewService, useValue: reviewService },
        { provide: ReviewHelpfulVoteService, useValue: helpfulVoteService },
        { provide: ReviewModerationService, useValue: moderationService },
      ],
    }).compile();

    controller = module.get<ReviewCustomerController>(ReviewCustomerController);
  });

  it('should create review using authenticated customer identity', async () => {
    const res = await controller.createReview(mockUser, {
      salonId: 'sal-1',
      branchId: 'br-1',
      bookingId: 'bk-1',
      overallRating: 5,
    });
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('rev-1');
    expect(reviewService.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1', overallRating: 5 }),
      'cust-1',
    );
  });

  it('should list only own customer reviews', async () => {
    const res = await controller.getMyReviews(mockUser, { page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(reviewService.search).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-1' }),
    );
  });

  it('should reject access to another customer review (IDOR protection)', async () => {
    reviewService.getById.mockResolvedValueOnce({
      ...mockReview,
      customerId: 'other-cust-id',
    });
    await expect(controller.getMyReview(mockUser, 'rev-1')).rejects.toThrow(
      'Forbidden: Review does not belong to you',
    );
  });

  it('should update own review', async () => {
    const res = await controller.updateMyReview(mockUser, 'rev-1', { overallRating: 4 });
    expect(res.success).toBe(true);
    expect(reviewService.updateReview).toHaveBeenCalledWith('rev-1', { overallRating: 4 }, 'cust-1', undefined);
  });

  it('should toggle helpful vote', async () => {
    const res = await controller.toggleHelpfulVote(mockUser, 'rev-1');
    expect(res.success).toBe(true);
    expect(helpfulVoteService.toggleVote).toHaveBeenCalledWith('rev-1', 'cust-1');
  });

  it('should flag review with authenticated user identity', async () => {
    const res = await controller.flagReview(mockUser, 'rev-1', {
      reasonCategory: 'SPAM_OR_FAKE' as any,
      explanation: 'Fake bot review',
    });
    expect(res.success).toBe(true);
    expect(moderationService.flagReview).toHaveBeenCalledWith(
      expect.objectContaining({ reportedByUserId: 'cust-1', reasonCategory: 'SPAM_OR_FAKE' }),
      'cust-1',
    );
  });
});
