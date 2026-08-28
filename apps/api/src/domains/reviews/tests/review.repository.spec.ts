import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ReviewHelpfulVoteRepository,
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewReplyRepository,
  ReviewRepository,
} from '../repositories/review.repository';

describe('ReviewRepository Suite', () => {
  let reviewRepo: ReviewRepository;
  let itemRatingRepo: ReviewItemRatingRepository;
  let mediaAttachmentRepo: ReviewMediaAttachmentRepository;
  let replyRepo: ReviewReplyRepository;
  let helpfulVoteRepo: ReviewHelpfulVoteRepository;
  let db: any;

  const mockReview = {
    id: 'rev-uuid-1',
    salonId: 'sal-uuid-1',
    branchId: 'br-uuid-1',
    customerId: 'cust-uuid-1',
    bookingId: 'bk-uuid-1',
    appointmentId: null,
    overallRating: 5,
    reviewTitle: 'Amazing hair transformation',
    reviewComment: 'The best styling ever!',
    cleanlinessRating: 5,
    hospitalityRating: 5,
    valueRating: 4,
    ambienceRating: 5,
    status: ReviewStatus.PUBLISHED,
    isVerifiedPurchase: true,
    isAnonymous: false,
    helpfulVotesCount: 3,
    publishedAt: new Date(),
    editedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockItemRating = {
    id: 'item-rat-uuid-1',
    reviewId: 'rev-uuid-1',
    serviceId: 'srv-uuid-1',
    staffId: 'stf-uuid-1',
    bookingItemId: 'bki-uuid-1',
    ratingStars: 5,
    itemComment: 'Great haircut',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedia = {
    id: 'med-att-uuid-1',
    reviewId: 'rev-uuid-1',
    mediaId: 'med-uuid-1',
    caption: 'Before and After Hair Cut',
    isBeforePhoto: false,
    isAfterPhoto: true,
    displayOrder: 1,
    createdAt: new Date(),
  };

  const mockReply = {
    id: 'rep-uuid-1',
    reviewId: 'rev-uuid-1',
    salonId: 'sal-uuid-1',
    responderUserId: 'user-owner-1',
    replyText: 'Thank you for your visit!',
    publishedAt: new Date(),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockHelpfulVote = {
    id: 'vote-uuid-1',
    reviewId: 'rev-uuid-1',
    userId: 'cust-uuid-2',
    isHelpful: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      review: {
        findFirst: jest.fn().mockResolvedValue(mockReview),
        findMany: jest.fn().mockResolvedValue([mockReview]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockReview),
        update: jest.fn().mockResolvedValue(mockReview),
      },
      reviewItemRating: {
        findUnique: jest.fn().mockResolvedValue(mockItemRating),
        findMany: jest.fn().mockResolvedValue([mockItemRating]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockItemRating),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(mockItemRating),
        delete: jest.fn().mockResolvedValue(mockItemRating),
      },
      reviewMediaAttachment: {
        findUnique: jest.fn().mockResolvedValue(mockMedia),
        findMany: jest.fn().mockResolvedValue([mockMedia]),
        create: jest.fn().mockResolvedValue(mockMedia),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue(mockMedia),
      },
      reviewReply: {
        findFirst: jest.fn().mockResolvedValue(mockReply),
        findMany: jest.fn().mockResolvedValue([mockReply]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockReply),
        update: jest.fn().mockResolvedValue(mockReply),
      },
      reviewHelpfulVote: {
        findUnique: jest.fn().mockResolvedValue(mockHelpfulVote),
        findMany: jest.fn().mockResolvedValue([mockHelpfulVote]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockHelpfulVote),
        delete: jest.fn().mockResolvedValue(mockHelpfulVote),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewRepository,
        ReviewItemRatingRepository,
        ReviewMediaAttachmentRepository,
        ReviewReplyRepository,
        ReviewHelpfulVoteRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    reviewRepo = module.get<ReviewRepository>(ReviewRepository);
    itemRatingRepo = module.get<ReviewItemRatingRepository>(ReviewItemRatingRepository);
    mediaAttachmentRepo = module.get<ReviewMediaAttachmentRepository>(
      ReviewMediaAttachmentRepository,
    );
    replyRepo = module.get<ReviewReplyRepository>(ReviewReplyRepository);
    helpfulVoteRepo = module.get<ReviewHelpfulVoteRepository>(ReviewHelpfulVoteRepository);
  });

  describe('ReviewRepository', () => {
    it('should find review by ID', async () => {
      const res = await reviewRepo.findById('rev-uuid-1');
      expect(res).toEqual(mockReview);
      expect(db.review.findFirst).toHaveBeenCalledWith({
        where: { id: 'rev-uuid-1', deletedAt: null },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      });
    });

    it('should find review by booking ID', async () => {
      const res = await reviewRepo.findByBooking('bk-uuid-1');
      expect(res).toEqual(mockReview);
      expect(db.review.findFirst).toHaveBeenCalledWith({
        where: { bookingId: 'bk-uuid-1', deletedAt: null },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      });
    });

    it('should find published reviews by salon', async () => {
      const res = await reviewRepo.findPublishedBySalon('sal-uuid-1', { page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(db.review.findMany).toHaveBeenCalled();
    });

    it('should search reviews with filters', async () => {
      const res = await reviewRepo.search({
        salonId: 'sal-uuid-1',
        minRating: 4,
        maxRating: 5,
        search: 'transformation',
      });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(db.review.findMany).toHaveBeenCalled();
    });

    it('should create review', async () => {
      const res = await reviewRepo.create({
        salonId: 'sal-uuid-1',
        branchId: 'br-uuid-1',
        customerId: 'cust-uuid-1',
        bookingId: 'bk-uuid-1',
        overallRating: 5,
        reviewTitle: 'Amazing hair transformation',
      });
      expect(res).toEqual(mockReview);
      expect(db.review.create).toHaveBeenCalled();
    });

    it('should update review with optimistic concurrency control', async () => {
      const res = await reviewRepo.update('rev-uuid-1', { reviewTitle: 'Updated Title' }, 1);
      expect(res).toEqual(mockReview);
      expect(db.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-uuid-1', deletedAt: null, version: 1 },
        data: expect.objectContaining({
          reviewTitle: 'Updated Title',
          version: { increment: 1 },
        }),
      });
    });

    it('should throw ConflictException on stale version update', async () => {
      db.review.update.mockRejectedValueOnce({ code: 'P2025' });
      await expect(
        reviewRepo.update('rev-uuid-1', { reviewTitle: 'Updated Title' }, 99),
      ).rejects.toThrow(ConflictException);
    });

    it('should calculate star distribution', async () => {
      db.review.findMany.mockResolvedValueOnce([
        { overallRating: 5 },
        { overallRating: 5 },
        { overallRating: 4 },
        { overallRating: 3 },
      ]);
      const res = await reviewRepo.calculateStarDistribution('sal-uuid-1');
      expect(res.total).toBe(4);
      expect(res.fiveStar).toBe(2);
      expect(res.fourStar).toBe(1);
      expect(res.threeStar).toBe(1);
      expect(res.average).toBe(4.25);
    });
  });

  describe('ReviewItemRatingRepository', () => {
    it('should create review item ratings', async () => {
      const res = await itemRatingRepo.create({
        reviewId: 'rev-uuid-1',
        serviceId: 'srv-uuid-1',
        staffId: 'stf-uuid-1',
        ratingStars: 5,
      });
      expect(res).toEqual(mockItemRating);
    });

    it('should create multiple review item ratings', async () => {
      const count = await itemRatingRepo.createMany([
        {
          reviewId: 'rev-uuid-1',
          serviceId: 'srv-uuid-1',
          staffId: 'stf-uuid-1',
          ratingStars: 5,
        },
      ]);
      expect(count).toBe(1);
    });
  });

  describe('ReviewMediaAttachmentRepository', () => {
    it('should create media attachment', async () => {
      const res = await mediaAttachmentRepo.create({
        reviewId: 'rev-uuid-1',
        mediaId: 'med-uuid-1',
        caption: 'Before and After Hair Cut',
      });
      expect(res).toEqual(mockMedia);
    });

    it('should find media attachments by review', async () => {
      const res = await mediaAttachmentRepo.findByReview('rev-uuid-1');
      expect(res).toHaveLength(1);
    });
  });

  describe('ReviewReplyRepository', () => {
    it('should create salon reply', async () => {
      const res = await replyRepo.create({
        reviewId: 'rev-uuid-1',
        salonId: 'sal-uuid-1',
        responderUserId: 'user-owner-1',
        replyText: 'Thank you for your visit!',
      });
      expect(res).toEqual(mockReply);
    });

    it('should find reply by review ID', async () => {
      const res = await replyRepo.findByReview('rev-uuid-1');
      expect(res).toEqual(mockReply);
    });
  });

  describe('ReviewHelpfulVoteRepository', () => {
    it('should create helpful vote', async () => {
      const res = await helpfulVoteRepo.create('rev-uuid-1', 'cust-uuid-2', true);
      expect(res).toEqual(mockHelpfulVote);
    });

    it('should find helpful vote by user and review', async () => {
      const res = await helpfulVoteRepo.findByUserAndReview('cust-uuid-2', 'rev-uuid-1');
      expect(res).toEqual(mockHelpfulVote);
    });

    it('should delete helpful vote', async () => {
      const res = await helpfulVoteRepo.delete('rev-uuid-1', 'cust-uuid-2');
      expect(res).toEqual(mockHelpfulVote);
    });
  });
});
