import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ReviewItemRatingRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';
import { ReviewItemRatingService } from '../services/review-item-rating.service';

describe('ReviewItemRatingService', () => {
  let service: ReviewItemRatingService;
  let itemRatingRepo: any;
  let reviewRepo: any;
  let serviceRatingService: any;
  let staffRatingService: any;

  const mockItemRating = {
    id: 'item-1',
    reviewId: 'rev-1',
    serviceId: 'srv-1',
    staffId: 'stf-1',
    ratingStars: 5,
    itemComment: 'Great service',
  };

  beforeEach(async () => {
    itemRatingRepo = {
      findById: jest.fn().mockResolvedValue(mockItemRating),
      findByReview: jest.fn().mockResolvedValue([mockItemRating]),
      create: jest.fn().mockResolvedValue(mockItemRating),
      update: jest.fn().mockResolvedValue(mockItemRating),
      delete: jest.fn().mockResolvedValue(mockItemRating),
    };

    reviewRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'rev-1', salonId: 'sal-1' }),
    };

    serviceRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    staffRatingService = {
      recalculateSummary: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewItemRatingService,
        { provide: ReviewItemRatingRepository, useValue: itemRatingRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: ServiceRatingService, useValue: serviceRatingService },
        { provide: StaffRatingService, useValue: staffRatingService },
      ],
    }).compile();

    service = module.get<ReviewItemRatingService>(ReviewItemRatingService);
  });

  it('should create item rating and recalculate service & staff summaries', async () => {
    const res = await service.createItemRating(
      {
        reviewId: 'rev-1',
        serviceId: 'srv-1',
        staffId: 'stf-1',
        ratingStars: 5,
      },
      'sal-1',
      'user-1',
    );
    expect(res.id).toBe('item-1');
    expect(serviceRatingService.recalculateSummary).toHaveBeenCalledWith('srv-1', 'sal-1', 'user-1');
    expect(staffRatingService.recalculateSummary).toHaveBeenCalledWith('stf-1', 'sal-1', 'user-1');
  });

  it('should reject invalid item rating (< 1 or > 5)', async () => {
    await expect(
      service.createItemRating(
        {
          reviewId: 'rev-1',
          serviceId: 'srv-1',
          ratingStars: 0,
        },
        'sal-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
