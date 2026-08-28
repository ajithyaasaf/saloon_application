import { Test, TestingModule } from '@nestjs/testing';
import { ReviewDisputeStatus, ReviewFlagStatus } from '@prisma/client';
import { ReviewAdminController } from '../review-admin.controller';
import { ReviewDisputeService } from '../../services/review-dispute.service';
import { ReviewInvitationService } from '../../services/review-invitation.service';
import { ReviewModerationService } from '../../services/review-moderation.service';
import { ReviewService } from '../../services/review.service';

describe('ReviewAdminController', () => {
  let controller: ReviewAdminController;
  let reviewService: any;
  let moderationService: any;
  let disputeService: any;
  let invitationService: any;

  const mockAdmin = {
    id: 'admin-1',
    role: 'SUPER_ADMIN',
  };

  beforeEach(async () => {
    reviewService = {
      search: jest.fn().mockResolvedValue({ data: [{ id: 'rev-1' }], total: 1 }),
      hideReview: jest.fn().mockResolvedValue({ id: 'rev-1', status: 'HIDDEN' }),
      publishReview: jest.fn().mockResolvedValue({ id: 'rev-1', status: 'PUBLISHED' }),
      rejectReview: jest.fn().mockResolvedValue({ id: 'rev-1', status: 'REJECTED' }),
      archiveReview: jest.fn().mockResolvedValue({ id: 'rev-1', status: 'ARCHIVED' }),
    };

    moderationService = {
      getPendingFlags: jest.fn().mockResolvedValue({ data: [{ id: 'flg-1' }], total: 1 }),
      resolveFlag: jest.fn().mockResolvedValue({ id: 'flg-1', status: ReviewFlagStatus.UPHELD }),
    };

    disputeService = {
      searchDisputes: jest.fn().mockResolvedValue({ data: [{ id: 'dsp-1' }], total: 1 }),
      resolveDispute: jest.fn().mockResolvedValue({ id: 'dsp-1', status: ReviewDisputeStatus.RESOLVED_REMOVED }),
    };

    invitationService = {
      searchInvitations: jest.fn().mockResolvedValue({ data: [{ id: 'inv-1' }], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewAdminController],
      providers: [
        { provide: ReviewService, useValue: reviewService },
        { provide: ReviewModerationService, useValue: moderationService },
        { provide: ReviewDisputeService, useValue: disputeService },
        { provide: ReviewInvitationService, useValue: invitationService },
      ],
    }).compile();

    controller = module.get<ReviewAdminController>(ReviewAdminController);
  });

  it('should list reviews for moderation', async () => {
    const res = await controller.getModerationReviews({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(reviewService.search).toHaveBeenCalled();
  });

  it('should hide review', async () => {
    const res = await controller.hideReview(mockAdmin, 'rev-1', 'Abusive language');
    expect(res.success).toBe(true);
    expect(reviewService.hideReview).toHaveBeenCalledWith('rev-1', 'Abusive language', 'admin-1');
  });

  it('should publish/reinstate review', async () => {
    const res = await controller.publishReview(mockAdmin, 'rev-1');
    expect(res.success).toBe(true);
    expect(reviewService.publishReview).toHaveBeenCalledWith('rev-1', 'admin-1');
  });

  it('should resolve flag report', async () => {
    const res = await controller.resolveFlag(mockAdmin, 'flg-1', {
      status: ReviewFlagStatus.UPHELD,
      resolutionNotes: 'Spam confirmed',
      actionOnReview: 'HIDE',
    });
    expect(res.success).toBe(true);
    expect(moderationService.resolveFlag).toHaveBeenCalledWith(
      'flg-1',
      ReviewFlagStatus.UPHELD,
      'Spam confirmed',
      'admin-1',
      'HIDE',
    );
  });

  it('should resolve dispute as Super Admin', async () => {
    const res = await controller.resolveDispute(mockAdmin, 'dsp-1', {
      status: ReviewDisputeStatus.RESOLVED_REMOVED,
      adminDecisionNotes: 'Evidence verified',
    });
    expect(res.success).toBe(true);
    expect(disputeService.resolveDispute).toHaveBeenCalledWith(
      'dsp-1',
      ReviewDisputeStatus.RESOLVED_REMOVED,
      'Evidence verified',
      'admin-1',
      undefined,
    );
  });

  it('should search all review invitations platform-wide', async () => {
    const res = await controller.getInvitations({});
    expect(res.success).toBe(true);
    expect(invitationService.searchInvitations).toHaveBeenCalled();
  });
});
