import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  ReviewReplyRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import { ReviewReplyService } from '../services/review-reply.service';

describe('ReviewReplyService', () => {
  let service: ReviewReplyService;
  let replyRepo: any;
  let reviewRepo: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
  };

  const mockReply = {
    id: 'rep-1',
    reviewId: 'rev-1',
    salonId: 'sal-1',
    responderUserId: 'owner-1',
    replyText: 'Thanks for coming!',
    version: 1,
  };

  beforeEach(async () => {
    replyRepo = {
      findById: jest.fn().mockResolvedValue(mockReply),
      findByReview: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockReply),
      update: jest.fn().mockResolvedValue({ ...mockReply, replyText: 'Updated reply' }),
      softDelete: jest.fn().mockResolvedValue({ ...mockReply, deletedAt: new Date() }),
    };

    reviewRepo = {
      findById: jest.fn().mockResolvedValue(mockReview),
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
        ReviewReplyService,
        { provide: ReviewReplyRepository, useValue: replyRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewReplyService>(ReviewReplyService);
  });

  it('should create valid salon owner reply', async () => {
    const res = await service.createReply('rev-1', 'sal-1', 'owner-1', 'Thanks for coming!');
    expect(res.id).toBe('rep-1');
    expect(replyRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject cross-salon reply', async () => {
    await expect(
      service.createReply('rev-1', 'different-salon-id', 'owner-1', 'Thanks!'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject duplicate reply for the same review', async () => {
    replyRepo.findByReview.mockResolvedValueOnce(mockReply);
    await expect(
      service.createReply('rev-1', 'sal-1', 'owner-1', 'Thanks!'),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject empty reply text', async () => {
    await expect(
      service.createReply('rev-1', 'sal-1', 'owner-1', '   '),
    ).rejects.toThrow(BadRequestException);
  });
});
