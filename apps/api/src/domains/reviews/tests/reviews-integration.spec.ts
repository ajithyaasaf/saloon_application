import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BookingStatus,
  NotificationChannel,
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
  ReviewInvitationStatus,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  BranchRatingSummaryRepository,
  SalonRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  StaffRatingSummaryRepository,
} from '../repositories/reputation-summary.repository';
import { ReviewInvitationRepository } from '../repositories/review-invitation.repository';
import {
  ReviewDisputeRepository,
  ReviewFlagRepository,
} from '../repositories/review-moderation.repository';
import {
  ReviewHelpfulVoteRepository,
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewReplyRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';
import { ReviewDisputeService } from '../services/review-dispute.service';
import { ReviewHelpfulVoteService } from '../services/review-helpful-vote.service';
import { ReviewInvitationService } from '../services/review-invitation.service';
import { ReviewItemRatingService } from '../services/review-item-rating.service';
import { ReviewModerationService } from '../services/review-moderation.service';
import { ReviewReplyService } from '../services/review-reply.service';
import { ReviewService } from '../services/review.service';

describe('Reviews Domain Full Integration & Security Hardening Tests', () => {
  let reviewService: ReviewService;
  let replyService: ReviewReplyService;
  let moderationService: ReviewModerationService;
  let disputeService: ReviewDisputeService;
  let salonRatingService: SalonRatingService;
  let branchRatingService: BranchRatingService;
  let staffRatingService: StaffRatingService;
  let serviceRatingService: ServiceRatingService;
  let invitationService: ReviewInvitationService;
  let helpfulVoteService: ReviewHelpfulVoteService;

  let mockPrisma: any;
  let mockReviewRepo: any;
  let mockItemRatingRepo: any;
  let mockMediaRepo: any;
  let mockReplyRepo: any;
  let mockHelpfulVoteRepo: any;
  let mockFlagRepo: any;
  let mockDisputeRepo: any;
  let mockSalonSummaryRepo: any;
  let mockBranchSummaryRepo: any;
  let mockStaffSummaryRepo: any;
  let mockServiceSummaryRepo: any;
  let mockInvitationRepo: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockEventBus: any;
  let mockTransactionService: any;

  // In-memory data store for integration test simulation
  let inMemoryReviews: Map<string, any>;
  let inMemoryReplies: Map<string, any>;
  let inMemoryFlags: Map<string, any>;
  let inMemoryDisputes: Map<string, any>;
  let inMemoryInvitations: Map<string, any>;
  let inMemoryVotes: Map<string, any>;
  let inMemorySalonSummary: any;

  const validBooking = {
    id: 'bk-test-100',
    customerId: 'cust-valid-user',
    salonId: 'sal-gold-spa',
    branchId: 'br-main-spa',
    status: BookingStatus.COMPLETED,
  };

  beforeEach(async () => {
    inMemoryReviews = new Map();
    inMemoryReplies = new Map();
    inMemoryFlags = new Map();
    inMemoryDisputes = new Map();
    inMemoryInvitations = new Map();
    inMemoryVotes = new Map();
    inMemorySalonSummary = null;

    mockPrisma = {
      booking: {
        findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
          if (id === validBooking.id) return Promise.resolve(validBooking);
          return Promise.resolve(null);
        }),
      },
      review: {
        update: jest.fn().mockImplementation(({ where: { id }, data }) => {
          const rev = inMemoryReviews.get(id);
          if (rev) {
            Object.assign(rev, data);
            return Promise.resolve(rev);
          }
          return Promise.resolve(null);
        }),
      },
    };

    mockTransactionService = {
      run: jest.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    mockReviewRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(inMemoryReviews.get(id) || null);
      }),
      findByBooking: jest.fn().mockImplementation((bookingId: string) => {
        for (const rev of inMemoryReviews.values()) {
          if (rev.bookingId === bookingId) return Promise.resolve(rev);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `rev-${Date.now()}-${Math.random()}`;
        const newRev = { ...data, id, version: 1, helpfulVotesCount: 0, createdAt: new Date() };
        inMemoryReviews.set(id, newRev);
        return Promise.resolve(newRev);
      }),
      update: jest.fn().mockImplementation((id: string, data: any, expectedVersion?: number) => {
        const rev = inMemoryReviews.get(id);
        if (!rev) return Promise.resolve(null);
        if (expectedVersion !== undefined && rev.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        rev.version = (rev.version || 1) + 1;
        Object.assign(rev, data);
        return Promise.resolve(rev);
      }),
      publish: jest.fn().mockImplementation((id: string) => {
        const rev = inMemoryReviews.get(id);
        if (rev) rev.status = ReviewStatus.PUBLISHED;
        return Promise.resolve(rev);
      }),
      hide: jest.fn().mockImplementation((id: string) => {
        const rev = inMemoryReviews.get(id);
        if (rev) rev.status = ReviewStatus.HIDDEN;
        return Promise.resolve(rev);
      }),
      reject: jest.fn().mockImplementation((id: string) => {
        const rev = inMemoryReviews.get(id);
        if (rev) rev.status = ReviewStatus.REJECTED;
        return Promise.resolve(rev);
      }),
      archive: jest.fn().mockImplementation((id: string) => {
        const rev = inMemoryReviews.get(id);
        if (rev) rev.status = ReviewStatus.ARCHIVED;
        return Promise.resolve(rev);
      }),
      updateStatus: jest.fn().mockImplementation((id: string, status: ReviewStatus) => {
        const rev = inMemoryReviews.get(id);
        if (rev) rev.status = status;
        return Promise.resolve(rev);
      }),
      calculateStarDistribution: jest.fn().mockImplementation(() => {
        let total = 0;
        let sum = 0;
        let fiveStar = 0;
        for (const rev of inMemoryReviews.values()) {
          if (rev.status === ReviewStatus.PUBLISHED) {
            total++;
            sum += rev.overallRating;
            if (rev.overallRating === 5) fiveStar++;
          }
        }
        return Promise.resolve({
          oneStar: 0,
          twoStar: 0,
          threeStar: 0,
          fourStar: total - fiveStar,
          fiveStar,
          total,
          average: total > 0 ? Number((sum / total).toFixed(2)) : 0,
        });
      }),
    };

    mockItemRatingRepo = {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findByStaff: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findByService: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    mockMediaRepo = {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    };

    mockReplyRepo = {
      findByReview: jest.fn().mockImplementation((reviewId: string) => {
        for (const rep of inMemoryReplies.values()) {
          if (rep.reviewId === reviewId && !rep.deletedAt) return Promise.resolve(rep);
        }
        return Promise.resolve(null);
      }),
      findById: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(inMemoryReplies.get(id) || null);
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `rep-${Date.now()}`;
        const newRep = { ...data, id, version: 1 };
        inMemoryReplies.set(id, newRep);
        return Promise.resolve(newRep);
      }),
      update: jest.fn().mockImplementation((id: string, data: any, expectedVersion?: number) => {
        const rep = inMemoryReplies.get(id);
        if (!rep) return Promise.resolve(null);
        if (expectedVersion !== undefined && rep.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict on reply');
        }
        rep.version = (rep.version || 1) + 1;
        Object.assign(rep, data);
        return Promise.resolve(rep);
      }),
      softDelete: jest.fn().mockImplementation((id: string) => {
        const rep = inMemoryReplies.get(id);
        if (rep) rep.deletedAt = new Date();
        return Promise.resolve(rep);
      }),
    };

    mockHelpfulVoteRepo = {
      findByUserAndReview: jest.fn().mockImplementation((userId: string, reviewId: string) => {
        const key = `${reviewId}:${userId}`;
        return Promise.resolve(inMemoryVotes.get(key) || null);
      }),
      create: jest.fn().mockImplementation((reviewId: string, userId: string, isHelpful: boolean) => {
        const key = `${reviewId}:${userId}`;
        const vote = { reviewId, userId, isHelpful };
        inMemoryVotes.set(key, vote);
        return Promise.resolve(vote);
      }),
      delete: jest.fn().mockImplementation((reviewId: string, userId: string) => {
        const key = `${reviewId}:${userId}`;
        const existing = inMemoryVotes.get(key);
        inMemoryVotes.delete(key);
        return Promise.resolve(existing);
      }),
      countByReview: jest.fn().mockImplementation((reviewId: string) => {
        let count = 0;
        for (const vote of inMemoryVotes.values()) {
          if (vote.reviewId === reviewId && vote.isHelpful) count++;
        }
        return Promise.resolve(count);
      }),
    };

    mockFlagRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(inMemoryFlags.get(id) || null);
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `flg-${Date.now()}`;
        const flag = { ...data, id, status: ReviewFlagStatus.PENDING };
        inMemoryFlags.set(id, flag);
        return Promise.resolve(flag);
      }),
      resolve: jest.fn().mockImplementation((id: string, status: ReviewFlagStatus, resolutionNotes: string) => {
        const flag = inMemoryFlags.get(id);
        if (flag) {
          flag.status = status;
          flag.resolutionNotes = resolutionNotes;
        }
        return Promise.resolve(flag);
      }),
    };

    mockDisputeRepo = {
      findByReview: jest.fn().mockImplementation((reviewId: string) => {
        for (const dsp of inMemoryDisputes.values()) {
          if (dsp.reviewId === reviewId) return Promise.resolve(dsp);
        }
        return Promise.resolve(null);
      }),
      findById: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(inMemoryDisputes.get(id) || null);
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `dsp-${Date.now()}`;
        const dsp = { ...data, id, version: 1 };
        inMemoryDisputes.set(id, dsp);
        return Promise.resolve(dsp);
      }),
      updateStatus: jest.fn().mockImplementation((id: string, status: ReviewDisputeStatus, adminDecisionNotes: string, adminUserId: string, expectedVersion?: number) => {
        const dsp = inMemoryDisputes.get(id);
        if (!dsp) return Promise.resolve(null);
        if (expectedVersion !== undefined && dsp.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict on dispute');
        }
        dsp.version = (dsp.version || 1) + 1;
        dsp.status = status;
        dsp.adminDecisionNotes = adminDecisionNotes;
        return Promise.resolve(dsp);
      }),
    };

    mockSalonSummaryRepo = {
      findBySalon: jest.fn().mockImplementation(() => Promise.resolve(inMemorySalonSummary)),
      upsert: jest.fn().mockImplementation((salonId: string, data: any) => {
        inMemorySalonSummary = { ...data, salonId, id: 'sum-1' };
        return Promise.resolve(inMemorySalonSummary);
      }),
    };

    mockBranchSummaryRepo = {
      findByBranch: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation((id: string, data: any) => Promise.resolve({ ...data, id })),
    };

    mockStaffSummaryRepo = {
      findByStaff: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation((id: string, data: any) => Promise.resolve({ ...data, id })),
    };

    mockServiceSummaryRepo = {
      findByService: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation((id: string, data: any) => Promise.resolve({ ...data, id })),
    };

    mockInvitationRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(inMemoryInvitations.get(id) || null);
      }),
      findByBooking: jest.fn().mockImplementation((bookingId: string) => {
        for (const inv of inMemoryInvitations.values()) {
          if (inv.bookingId === bookingId) return Promise.resolve(inv);
        }
        return Promise.resolve(null);
      }),
      findByToken: jest.fn().mockImplementation((token: string) => {
        for (const inv of inMemoryInvitations.values()) {
          if (inv.invitationToken === token) return Promise.resolve(inv);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `inv-${Date.now()}`;
        const inv = { ...data, id };
        inMemoryInvitations.set(id, inv);
        return Promise.resolve(inv);
      }),
      markOpened: jest.fn().mockImplementation((id: string) => {
        const inv = inMemoryInvitations.get(id);
        if (inv) inv.status = ReviewInvitationStatus.OPENED;
        return Promise.resolve(inv);
      }),
      markCompleted: jest.fn().mockImplementation((id: string) => {
        const inv = inMemoryInvitations.get(id);
        if (inv) inv.status = ReviewInvitationStatus.COMPLETED;
        return Promise.resolve(inv);
      }),
      markExpired: jest.fn().mockImplementation((id: string) => {
        const inv = inMemoryInvitations.get(id);
        if (inv) inv.status = ReviewInvitationStatus.EXPIRED;
        return Promise.resolve(inv);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        ReviewItemRatingService,
        ReviewReplyService,
        ReviewHelpfulVoteService,
        ReviewModerationService,
        ReviewDisputeService,
        SalonRatingService,
        BranchRatingService,
        StaffRatingService,
        ServiceRatingService,
        ReviewInvitationService,
        { provide: ReviewRepository, useValue: mockReviewRepo },
        { provide: ReviewItemRatingRepository, useValue: mockItemRatingRepo },
        { provide: ReviewMediaAttachmentRepository, useValue: mockMediaRepo },
        { provide: ReviewReplyRepository, useValue: mockReplyRepo },
        { provide: ReviewHelpfulVoteRepository, useValue: mockHelpfulVoteRepo },
        { provide: ReviewFlagRepository, useValue: mockFlagRepo },
        { provide: ReviewDisputeRepository, useValue: mockDisputeRepo },
        { provide: SalonRatingSummaryRepository, useValue: mockSalonSummaryRepo },
        { provide: BranchRatingSummaryRepository, useValue: mockBranchSummaryRepo },
        { provide: StaffRatingSummaryRepository, useValue: mockStaffSummaryRepo },
        { provide: ServiceRatingSummaryRepository, useValue: mockServiceSummaryRepo },
        { provide: ReviewInvitationRepository, useValue: mockInvitationRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    reviewService = module.get<ReviewService>(ReviewService);
    replyService = module.get<ReviewReplyService>(ReviewReplyService);
    moderationService = module.get<ReviewModerationService>(ReviewModerationService);
    disputeService = module.get<ReviewDisputeService>(ReviewDisputeService);
    salonRatingService = module.get<SalonRatingService>(SalonRatingService);
    branchRatingService = module.get<BranchRatingService>(BranchRatingService);
    staffRatingService = module.get<StaffRatingService>(StaffRatingService);
    serviceRatingService = module.get<ServiceRatingService>(ServiceRatingService);
    invitationService = module.get<ReviewInvitationService>(ReviewInvitationService);
    helpfulVoteService = module.get<ReviewHelpfulVoteService>(ReviewHelpfulVoteService);
  });

  // 1. Complete Booking -> Review Submission -> Publication -> Reputation Calculation
  it('1. should execute end-to-end verified review submission and calculate Bayesian reputation', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
        reviewTitle: 'Exceptional haircut',
        reviewComment: 'Will return soon!',
      },
      'cust-valid-user',
    );

    expect(review).toBeDefined();
    expect(review.status).toBe(ReviewStatus.PUBLISHED);
    expect(mockCacheService.delete).toHaveBeenCalledWith(`reviews:salon-summary:${validBooking.salonId}`);
    expect(mockEventBus.publish).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REVIEW_CREATED', entityType: 'Review' }),
    );
    expect(inMemorySalonSummary).toBeDefined();
    expect(inMemorySalonSummary.totalReviews).toBe(1);
    expect(inMemorySalonSummary.averageRating).toBe(5);
  });

  // 2. Customer IDOR Attempt (Reviewing another customer's booking)
  it('2. should reject customer reviewing another customer booking (IDOR protection)', async () => {
    await expect(
      reviewService.createReview(
        {
          bookingId: validBooking.id,
          salonId: validBooking.salonId,
          branchId: validBooking.branchId,
          overallRating: 5,
        },
        'malicious-intruder-user',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 3. Owner Cross-Salon IDOR Attempt (Replying to another salon's review)
  it('3. should reject salon owner replying to another salon review (Cross-Salon IDOR)', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
      },
      'cust-valid-user',
    );

    await expect(
      replyService.createReply(
        review.id,
        'other-unauthorized-salon',
        'owner-other',
        'Thanks for coming',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 4. Official Review Reply Lifecycle
  it('4. should create official salon reply and reject duplicate reply for same review', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
      },
      'cust-valid-user',
    );

    const reply = await replyService.createReply(
      review.id,
      validBooking.salonId,
      'owner-1',
      'Thank you so much for the feedback!',
    );
    expect(reply.id).toBeDefined();

    // Duplicate attempt
    await expect(
      replyService.createReply(
        review.id,
        validBooking.salonId,
        'owner-1',
        'Second reply attempt',
      ),
    ).rejects.toThrow(ConflictException);
  });

  // 5. Helpful Vote Duplicate / Toggle Behavior
  it('5. should toggle helpful votes and prevent author self-voting', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
      },
      'cust-valid-user',
    );

    // Self voting blocked
    await expect(
      helpfulVoteService.toggleVote(review.id, 'cust-valid-user'),
    ).rejects.toThrow(BadRequestException);

    // Voter 1 upvotes
    const vote1 = await helpfulVoteService.toggleVote(review.id, 'voter-cust-1');
    expect(vote1.isVoted).toBe(true);
    expect(vote1.helpfulVotesCount).toBe(1);

    // Voter 1 toggles vote off
    const vote1Off = await helpfulVoteService.toggleVote(review.id, 'voter-cust-1');
    expect(vote1Off.isVoted).toBe(false);
    expect(vote1Off.helpfulVotesCount).toBe(0);
  });

  // 6. Review Flag -> Moderation -> Resolution (UPHELD hides review and updates reputation)
  it('6. should flag review and hide upon moderation UPHELD resolution', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
      },
      'cust-valid-user',
    );

    const flag = await moderationService.flagReview(
      {
        reviewId: review.id,
        reportedByUserId: 'concerned-customer',
        reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
      },
      'concerned-customer',
    );
    expect(flag.status).toBe(ReviewFlagStatus.PENDING);

    const resolved = await moderationService.resolveFlag(
      flag.id,
      ReviewFlagStatus.UPHELD,
      'Confirmed bot spam',
      'super-admin-1',
      'HIDE',
    );
    expect(resolved.status).toBe(ReviewFlagStatus.UPHELD);

    const updatedReview = inMemoryReviews.get(review.id);
    expect(updatedReview.status).toBe(ReviewStatus.HIDDEN);
  });

  // 7. Owner Dispute -> Super Admin Arbitration
  it('7. should submit review dispute and allow Super Admin resolution', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 1,
        reviewComment: 'Terrible service',
      },
      'cust-valid-user',
    );

    const dispute = await disputeService.submitDispute(
      {
        reviewId: review.id,
        salonId: validBooking.salonId,
        disputeReason: 'Customer missed appointment and never received service',
      },
      'owner-user-1',
    );
    expect(dispute.disputeCode).toMatch(/^DSP-/);

    const resolved = await disputeService.resolveDispute(
      dispute.id,
      ReviewDisputeStatus.RESOLVED_REMOVED,
      'GPS and CCTV verified customer was a no-show',
      'super-admin-1',
      1,
    );
    expect(resolved.status).toBe(ReviewDisputeStatus.RESOLVED_REMOVED);

    const updatedReview = inMemoryReviews.get(review.id);
    expect(updatedReview.status).toBe(ReviewStatus.HIDDEN);
  });

  // 8. Invitation Creation -> Validation -> Expiration & Reuse Prevention
  it('8. should validate single-use invitation token and prevent completed token reuse', async () => {
    const invitation = await invitationService.createInvitation({
      bookingId: validBooking.id,
      salonId: validBooking.salonId,
      branchId: validBooking.branchId,
      customerId: validBooking.customerId,
      channel: NotificationChannel.SMS,
      expiresInDays: 7,
    });

    expect(invitation.invitationToken).toBeDefined();
    expect(invitation.invitationToken.length).toBe(64); // 256-bit hex

    // Open token
    const opened = await invitationService.validateAndOpenToken(invitation.invitationToken);
    expect(opened.status).toBe(ReviewInvitationStatus.OPENED);

    // Complete token
    await invitationService.markCompleted(invitation.id, 'rev-123');

    // Attempt to reuse completed token
    await expect(
      invitationService.validateAndOpenToken(invitation.invitationToken),
    ).rejects.toThrow(BadRequestException);
  });

  // 9. Optimistic Concurrency Conflict Handling
  it('9. should reject stale review update with ConflictException (HTTP 409)', async () => {
    const review = await reviewService.createReview(
      {
        bookingId: validBooking.id,
        salonId: validBooking.salonId,
        branchId: validBooking.branchId,
        overallRating: 5,
      },
      'cust-valid-user',
    );

    // Concurrent read with expectedVersion 1
    await reviewService.updateReview(
      review.id,
      { reviewTitle: 'First Update' },
      'cust-valid-user',
      1,
    );

    // Second update trying to use stale version 1
    await expect(
      reviewService.updateReview(
        review.id,
        { reviewTitle: 'Stale Second Update' },
        'cust-valid-user',
        1,
      ),
    ).rejects.toThrow(ConflictException);
  });

  // 10. Rating Boundary Invariant Verification (1 to 5 stars)
  it('10. should reject invalid ratings outside [1, 5] range', async () => {
    await expect(
      reviewService.createReview(
        {
          bookingId: validBooking.id,
          salonId: validBooking.salonId,
          branchId: validBooking.branchId,
          overallRating: 0,
        },
        'cust-valid-user',
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      reviewService.createReview(
        {
          bookingId: validBooking.id,
          salonId: validBooking.salonId,
          branchId: validBooking.branchId,
          overallRating: 6,
        },
        'cust-valid-user',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
