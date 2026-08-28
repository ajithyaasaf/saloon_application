import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';
import { ReviewService, SubmitReviewInput } from '../services/review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepo: any;
  let itemRatingRepo: any;
  let mediaAttachmentRepo: any;
  let salonRatingService: any;
  let branchRatingService: any;
  let staffRatingService: any;
  let serviceRatingService: any;
  let prisma: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockBooking = {
    id: 'bk-123',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    status: BookingStatus.COMPLETED,
    items: [{ id: 'bki-1', serviceId: 'srv-1', staffId: 'stf-1' }],
  };

  const mockReview = {
    id: 'rev-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    bookingId: 'bk-123',
    overallRating: 5,
    reviewTitle: 'Top class styling',
    reviewComment: 'Loved it!',
    status: ReviewStatus.PUBLISHED,
    isVerifiedPurchase: true,
    isAnonymous: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    reviewRepo = {
      findById: jest.fn().mockResolvedValue(mockReview),
      findByBooking: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockReview),
      update: jest.fn().mockResolvedValue({ ...mockReview, overallRating: 4 }),
      updateStatus: jest.fn().mockResolvedValue(mockReview),
      publish: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.PUBLISHED }),
      hide: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.HIDDEN }),
      reject: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.REJECTED }),
      archive: jest.fn().mockResolvedValue({ ...mockReview, status: ReviewStatus.ARCHIVED }),
      softDelete: jest.fn().mockResolvedValue({ ...mockReview, deletedAt: new Date() }),
      search: jest.fn().mockResolvedValue({ data: [mockReview], total: 1 }),
    };

    itemRatingRepo = {
      createMany: jest.fn().mockResolvedValue(1),
    };

    mediaAttachmentRepo = {
      createMany: jest.fn().mockResolvedValue(1),
    };

    salonRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    branchRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    staffRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    serviceRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    prisma = {
      booking: {
        findUnique: jest.fn().mockResolvedValue(mockBooking),
      },
    };

    transactionService = {
      run: jest.fn().mockImplementation((cb) => cb()),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: ReviewItemRatingRepository, useValue: itemRatingRepo },
        { provide: ReviewMediaAttachmentRepository, useValue: mediaAttachmentRepo },
        { provide: SalonRatingService, useValue: salonRatingService },
        { provide: BranchRatingService, useValue: branchRatingService },
        { provide: StaffRatingService, useValue: staffRatingService },
        { provide: ServiceRatingService, useValue: serviceRatingService },
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should create valid verified review', async () => {
    const input: SubmitReviewInput = {
      salonId: 'sal-1',
      branchId: 'br-1',
      bookingId: 'bk-123',
      overallRating: 5,
      reviewTitle: 'Top class styling',
      reviewComment: 'Loved it!',
      itemRatings: [
        {
          serviceId: 'srv-1',
          staffId: 'stf-1',
          ratingStars: 5,
        },
      ],
    };

    const result = await service.createReview(input, 'cust-1');
    expect(result.id).toBe('rev-1');
    expect(reviewRepo.create).toHaveBeenCalled();
    expect(salonRatingService.recalculateSummary).toHaveBeenCalledWith('sal-1', 'cust-1');
    expect(branchRatingService.recalculateSummary).toHaveBeenCalledWith('br-1', 'sal-1', 'cust-1');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject review when overall rating is invalid (< 1 or > 5)', async () => {
    const input: SubmitReviewInput = {
      salonId: 'sal-1',
      branchId: 'br-1',
      overallRating: 6,
    };

    await expect(service.createReview(input, 'cust-1')).rejects.toThrow(BadRequestException);
  });

  it('should reject review for another customer booking', async () => {
    const input: SubmitReviewInput = {
      salonId: 'sal-1',
      branchId: 'br-1',
      bookingId: 'bk-123',
      overallRating: 5,
    };

    await expect(service.createReview(input, 'different-customer-id')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject review for uncompleted booking', async () => {
    prisma.booking.findUnique.mockResolvedValueOnce({
      ...mockBooking,
      status: BookingStatus.PENDING,
    });

    const input: SubmitReviewInput = {
      salonId: 'sal-1',
      branchId: 'br-1',
      bookingId: 'bk-123',
      overallRating: 5,
    };

    await expect(service.createReview(input, 'cust-1')).rejects.toThrow(BadRequestException);
  });

  it('should reject duplicate review for the same booking', async () => {
    reviewRepo.findByBooking.mockResolvedValueOnce(mockReview);

    const input: SubmitReviewInput = {
      salonId: 'sal-1',
      branchId: 'br-1',
      bookingId: 'bk-123',
      overallRating: 5,
    };

    await expect(service.createReview(input, 'cust-1')).rejects.toThrow(ConflictException);
  });

  it('should update review and recalculate rating summary if rating changed', async () => {
    const res = await service.updateReview('rev-1', { overallRating: 4 }, 'cust-1', 1);
    expect(res).toBeDefined();
    expect(reviewRepo.update).toHaveBeenCalledWith('rev-1', { overallRating: 4 }, 1);
    expect(salonRatingService.recalculateSummary).toHaveBeenCalled();
  });

  it('should publish review and recalculate summary', async () => {
    const res = await service.publishReview('rev-1', 'admin-1', 1);
    expect(res).toBeDefined();
    expect(reviewRepo.publish).toHaveBeenCalledWith('rev-1', 1);
    expect(salonRatingService.recalculateSummary).toHaveBeenCalled();
  });

  it('should hide review and recalculate summary', async () => {
    const res = await service.hideReview('rev-1', 'Spam detected', 'admin-1', 1);
    expect(res).toBeDefined();
    expect(reviewRepo.hide).toHaveBeenCalledWith('rev-1', 1);
    expect(salonRatingService.recalculateSummary).toHaveBeenCalled();
  });
});
