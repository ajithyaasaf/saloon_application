import { Test, TestingModule } from '@nestjs/testing';
import {
  ReviewDisputeStatus,
  ReviewFlagReason,
  ReviewFlagStatus,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ReviewDisputeRepository,
  ReviewFlagRepository,
} from '../repositories/review-moderation.repository';

describe('ReviewModerationRepository Suite', () => {
  let flagRepo: ReviewFlagRepository;
  let disputeRepo: ReviewDisputeRepository;
  let db: any;

  const mockFlag = {
    id: 'flg-uuid-1',
    reviewId: 'rev-uuid-1',
    reportedByUserId: 'usr-reporter-1',
    reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
    explanation: 'Promotional content detected',
    status: ReviewFlagStatus.PENDING,
    resolutionNotes: null,
    resolvedByUserId: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDispute = {
    id: 'dsp-uuid-1',
    disputeCode: 'DSP-202608-0001',
    reviewId: 'rev-uuid-1',
    salonId: 'sal-uuid-1',
    submittedByUserId: 'usr-owner-1',
    disputeReason: 'Reviewer never attended appointment',
    evidenceDetails: 'CCTV footage confirms no show',
    status: ReviewDisputeStatus.SUBMITTED,
    adminDecisionNotes: null,
    reviewedByUserId: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      reviewFlag: {
        findUnique: jest.fn().mockResolvedValue(mockFlag),
        findMany: jest.fn().mockResolvedValue([mockFlag]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockFlag),
        update: jest.fn().mockResolvedValue(mockFlag),
      },
      reviewDispute: {
        findUnique: jest.fn().mockResolvedValue(mockDispute),
        findMany: jest.fn().mockResolvedValue([mockDispute]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockDispute),
        update: jest.fn().mockResolvedValue(mockDispute),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewFlagRepository,
        ReviewDisputeRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    flagRepo = module.get<ReviewFlagRepository>(ReviewFlagRepository);
    disputeRepo = module.get<ReviewDisputeRepository>(ReviewDisputeRepository);
  });

  describe('ReviewFlagRepository', () => {
    it('should find flag by ID', async () => {
      const res = await flagRepo.findById('flg-uuid-1');
      expect(res).toEqual(mockFlag);
      expect(db.reviewFlag.findUnique).toHaveBeenCalledWith({
        where: { id: 'flg-uuid-1' },
        include: { review: true },
      });
    });

    it('should find flags by review', async () => {
      const res = await flagRepo.findByReview('rev-uuid-1');
      expect(res).toHaveLength(1);
    });

    it('should find pending flags', async () => {
      const res = await flagRepo.findPending();
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should create flag', async () => {
      const res = await flagRepo.create({
        reviewId: 'rev-uuid-1',
        reportedByUserId: 'usr-reporter-1',
        reasonCategory: ReviewFlagReason.SPAM_OR_FAKE,
        explanation: 'Promotional content detected',
      });
      expect(res).toEqual(mockFlag);
    });

    it('should resolve flag', async () => {
      const res = await flagRepo.resolve(
        'flg-uuid-1',
        ReviewFlagStatus.UPHELD,
        'Review removed for spam',
        'admin-usr-1',
      );
      expect(res).toEqual(mockFlag);
      expect(db.reviewFlag.update).toHaveBeenCalled();
    });
  });

  describe('ReviewDisputeRepository', () => {
    it('should find dispute by code', async () => {
      const res = await disputeRepo.findByCode('DSP-202608-0001');
      expect(res).toEqual(mockDispute);
      expect(db.reviewDispute.findUnique).toHaveBeenCalledWith({
        where: { disputeCode: 'DSP-202608-0001' },
        include: { review: true },
      });
    });

    it('should find dispute by review ID', async () => {
      const res = await disputeRepo.findByReview('rev-uuid-1');
      expect(res).toEqual(mockDispute);
    });

    it('should create dispute', async () => {
      const res = await disputeRepo.create({
        disputeCode: 'DSP-202608-0001',
        reviewId: 'rev-uuid-1',
        salonId: 'sal-uuid-1',
        submittedByUserId: 'usr-owner-1',
        disputeReason: 'Reviewer never attended appointment',
      });
      expect(res).toEqual(mockDispute);
    });

    it('should update dispute status', async () => {
      const res = await disputeRepo.updateStatus(
        'dsp-uuid-1',
        ReviewDisputeStatus.RESOLVED_REMOVED,
        'Evidence accepted',
        'admin-usr-1',
      );
      expect(res).toEqual(mockDispute);
      expect(db.reviewDispute.update).toHaveBeenCalled();
    });
  });
});
