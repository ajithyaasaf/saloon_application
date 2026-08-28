import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  ReviewHelpfulVoteRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import { ReviewHelpfulVoteService } from '../services/review-helpful-vote.service';

describe('ReviewHelpfulVoteService', () => {
  let service: ReviewHelpfulVoteService;
  let helpfulVoteRepo: any;
  let reviewRepo: any;
  let prisma: any;
  let eventBus: any;

  const mockReview = {
    id: 'rev-1',
    customerId: 'cust-author',
  };

  const mockVote = {
    id: 'vote-1',
    reviewId: 'rev-1',
    userId: 'cust-voter',
    isHelpful: true,
  };

  beforeEach(async () => {
    helpfulVoteRepo = {
      findByUserAndReview: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockVote),
      delete: jest.fn().mockResolvedValue(mockVote),
      countByReview: jest.fn().mockResolvedValue(1),
    };

    reviewRepo = {
      findById: jest.fn().mockResolvedValue(mockReview),
    };

    prisma = {
      review: {
        update: jest.fn().mockResolvedValue(mockReview),
      },
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewHelpfulVoteService,
        { provide: ReviewHelpfulVoteRepository, useValue: helpfulVoteRepo },
        { provide: ReviewRepository, useValue: reviewRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewHelpfulVoteService>(ReviewHelpfulVoteService);
  });

  it('should add helpful vote', async () => {
    const res = await service.toggleVote('rev-1', 'cust-voter');
    expect(res.isVoted).toBe(true);
    expect(res.helpfulVotesCount).toBe(1);
    expect(helpfulVoteRepo.create).toHaveBeenCalledWith('rev-1', 'cust-voter', true);
  });

  it('should remove helpful vote when already voted', async () => {
    helpfulVoteRepo.findByUserAndReview.mockResolvedValueOnce(mockVote);
    helpfulVoteRepo.countByReview.mockResolvedValueOnce(0);

    const res = await service.toggleVote('rev-1', 'cust-voter');
    expect(res.isVoted).toBe(false);
    expect(res.helpfulVotesCount).toBe(0);
    expect(helpfulVoteRepo.delete).toHaveBeenCalledWith('rev-1', 'cust-voter');
  });

  it('should prevent author from voting on own review', async () => {
    await expect(service.toggleVote('rev-1', 'cust-author')).rejects.toThrow(
      BadRequestException,
    );
  });
});
