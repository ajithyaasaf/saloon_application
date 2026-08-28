import { Test, TestingModule } from '@nestjs/testing';
import { ReviewStatus } from '@prisma/client';
import { ReviewOwnerController } from '../review-owner.controller';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../../services/reputation-summary.service';
import { ReviewDisputeService } from '../../services/review-dispute.service';
import { ReviewInvitationService } from '../../services/review-invitation.service';
import { ReviewReplyService } from '../../services/review-reply.service';
import { ReviewService } from '../../services/review.service';

describe('ReviewOwnerController', () => {
  let controller: ReviewOwnerController;
  let reviewService: any;
  let replyService: any;
  let disputeService: any;
  let salonRatingService: any;
  let branchRatingService: any;
  let staffRatingService: any;
  let serviceRatingService: any;
  let invitationService: any;

  const mockOwner = {
    id: 'owner-1',
    salonId: 'sal-1',
    role: 'SALON_OWNER',
  };

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    overallRating: 5,
    status: ReviewStatus.PUBLISHED,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReply = {
    id: 'rep-1',
    reviewId: 'rev-1',
    salonId: 'sal-1',
    replyText: 'Thank you for visiting!',
  };

  beforeEach(async () => {
    reviewService = {
      search: jest.fn().mockResolvedValue({ data: [mockReview], total: 1 }),
      getById: jest.fn().mockResolvedValue(mockReview),
    };

    replyService = {
      createReply: jest.fn().mockResolvedValue(mockReply),
      getByReview: jest.fn().mockResolvedValue(mockReply),
      updateReply: jest.fn().mockResolvedValue({ ...mockReply, replyText: 'Updated reply' }),
      deleteReply: jest.fn().mockResolvedValue({ ...mockReply, deletedAt: new Date() }),
    };

    disputeService = {
      submitDispute: jest.fn().mockResolvedValue({ id: 'dsp-1', status: 'SUBMITTED' }),
      searchDisputes: jest.fn().mockResolvedValue({ data: [{ id: 'dsp-1' }], total: 1 }),
    };

    salonRatingService = {
      getSummary: jest.fn().mockResolvedValue({ totalReviews: 5, averageRating: 4.8 }),
    };

    branchRatingService = {
      getSummary: jest.fn().mockResolvedValue({ totalReviews: 3, averageRating: 4.9 }),
    };

    staffRatingService = {
      getSummary: jest.fn().mockResolvedValue({ totalReviews: 2, averageRating: 5.0 }),
    };

    serviceRatingService = {
      getSummary: jest.fn().mockResolvedValue({ totalReviews: 2, averageRating: 4.7 }),
    };

    invitationService = {
      createInvitation: jest.fn().mockResolvedValue({
        id: 'inv-1',
        bookingId: 'bk-1',
        salonId: 'sal-1',
        branchId: 'br-1',
        customerId: 'cust-1',
        status: 'PENDING',
        expiresAt: new Date(),
        createdAt: new Date(),
      }),
      searchInvitations: jest.fn().mockResolvedValue({ data: [{ id: 'inv-1' }], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewOwnerController],
      providers: [
        { provide: ReviewService, useValue: reviewService },
        { provide: ReviewReplyService, useValue: replyService },
        { provide: ReviewDisputeService, useValue: disputeService },
        { provide: SalonRatingService, useValue: salonRatingService },
        { provide: BranchRatingService, useValue: branchRatingService },
        { provide: StaffRatingService, useValue: staffRatingService },
        { provide: ServiceRatingService, useValue: serviceRatingService },
        { provide: ReviewInvitationService, useValue: invitationService },
      ],
    }).compile();

    controller = module.get<ReviewOwnerController>(ReviewOwnerController);
  });

  it('should list reviews strictly scoped to salonId from authenticated context', async () => {
    const res = await controller.getSalonReviews(mockOwner, { page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(reviewService.search).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1' }),
    );
  });

  it('should reject access to review from another salon (cross-salon IDOR protection)', async () => {
    reviewService.getById.mockResolvedValueOnce({
      ...mockReview,
      salonId: 'other-salon-id',
    });
    await expect(controller.getSalonReview(mockOwner, 'rev-1')).rejects.toThrow(
      'Forbidden: Review does not belong to your salon',
    );
  });

  it('should create reply scoped to authenticated salon and user', async () => {
    const res = await controller.createReply(mockOwner, 'rev-1', {
      replyText: 'Thank you for visiting!',
    });
    expect(res.success).toBe(true);
    expect(replyService.createReply).toHaveBeenCalledWith(
      'rev-1',
      'sal-1',
      'owner-1',
      'Thank you for visiting!',
    );
  });

  it('should submit dispute scoped to authenticated salon', async () => {
    const res = await controller.submitDispute(mockOwner, {
      reviewId: 'rev-1',
      disputeReason: 'Customer missed appointment',
    });
    expect(res.success).toBe(true);
    expect(disputeService.submitDispute).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: 'rev-1', salonId: 'sal-1' }),
      'owner-1',
    );
  });

  it('should create review invitation for salon customer', async () => {
    const res = await controller.createInvitation(mockOwner, {
      bookingId: 'bk-1',
      branchId: 'br-1',
      customerId: 'cust-1',
    });
    expect(res.success).toBe(true);
    expect(invitationService.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'bk-1', salonId: 'sal-1', branchId: 'br-1' }),
      'owner-1',
    );
  });
});
