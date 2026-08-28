import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { ReviewHelpfulVoteEntity } from '../entities/review.entity';
import {
  ReviewHelpfulVoteAddedEvent,
  ReviewHelpfulVoteRemovedEvent,
} from '../events/reviews-events.event';
import {
  ReviewHelpfulVoteRepository,
  ReviewRepository,
} from '../repositories/review.repository';

@Injectable()
export class ReviewHelpfulVoteService {
  private readonly logger = new Logger(ReviewHelpfulVoteService.name);

  constructor(
    private readonly helpfulVoteRepo: ReviewHelpfulVoteRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  public async toggleVote(
    reviewId: string,
    userId: string,
  ): Promise<{ isVoted: boolean; helpfulVotesCount: number }> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found.`);
    }

    if (review.customerId === userId) {
      throw new BadRequestException('You cannot vote on your own review.');
    }

    const existingVote = await this.helpfulVoteRepo.findByUserAndReview(userId, reviewId);

    if (existingVote) {
      // Remove vote
      await this.helpfulVoteRepo.delete(reviewId, userId);
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulVotesCount: { decrement: 1 } },
      });

      this.eventBus.publish(
        new ReviewHelpfulVoteRemovedEvent({ reviewId, userId }, userId),
      );

      const count = await this.helpfulVoteRepo.countByReview(reviewId);
      return { isVoted: false, helpfulVotesCount: count };
    } else {
      // Add vote
      const vote = await this.helpfulVoteRepo.create(reviewId, userId, true);
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulVotesCount: { increment: 1 } },
      });

      this.eventBus.publish(
        new ReviewHelpfulVoteAddedEvent({ voteId: vote.id, reviewId, userId }, userId),
      );

      const count = await this.helpfulVoteRepo.countByReview(reviewId);
      return { isVoted: true, helpfulVotesCount: count };
    }
  }

  public async hasVoted(reviewId: string, userId: string): Promise<boolean> {
    const vote = await this.helpfulVoteRepo.findByUserAndReview(userId, reviewId);
    return !!vote;
  }
}
