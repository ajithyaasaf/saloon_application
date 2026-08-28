import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewItemRatingData } from '../dto/review.dto';
import { ReviewItemRatingEntity } from '../entities/review.entity';
import {
  ReviewItemRatingRepository,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  ServiceRatingService,
  StaffRatingService,
} from './reputation-summary.service';

@Injectable()
export class ReviewItemRatingService {
  private readonly logger = new Logger(ReviewItemRatingService.name);

  constructor(
    private readonly itemRatingRepo: ReviewItemRatingRepository,
    private readonly reviewRepo: ReviewRepository,
    private readonly serviceRatingService: ServiceRatingService,
    private readonly staffRatingService: StaffRatingService,
  ) {}

  public async getByReview(reviewId: string): Promise<ReviewItemRatingEntity[]> {
    const list = await this.itemRatingRepo.findByReview(reviewId);
    return list.map((item) => new ReviewItemRatingEntity(item as any));
  }

  public async createItemRating(
    data: CreateReviewItemRatingData,
    salonId: string,
    actorUserId?: string,
  ): Promise<ReviewItemRatingEntity> {
    if (data.ratingStars < 1 || data.ratingStars > 5) {
      throw new BadRequestException('Item rating must be between 1 and 5 stars.');
    }

    const review = await this.reviewRepo.findById(data.reviewId);
    if (!review) {
      throw new NotFoundException(`Review with id ${data.reviewId} not found.`);
    }

    const created = await this.itemRatingRepo.create(data);

    if (data.serviceId) {
      await this.serviceRatingService.recalculateSummary(data.serviceId, salonId, actorUserId);
    }
    if (data.staffId) {
      await this.staffRatingService.recalculateSummary(data.staffId, salonId, actorUserId);
    }

    return new ReviewItemRatingEntity(created as any);
  }

  public async updateItemRating(
    id: string,
    ratingStars: number,
    itemComment?: string,
    salonId?: string,
    actorUserId?: string,
  ): Promise<ReviewItemRatingEntity> {
    if (ratingStars < 1 || ratingStars > 5) {
      throw new BadRequestException('Item rating must be between 1 and 5 stars.');
    }

    const existing = await this.itemRatingRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Review item rating with id ${id} not found.`);
    }

    const updated = await this.itemRatingRepo.update(id, {
      ratingStars,
      itemComment,
    });

    if (salonId) {
      if (existing.serviceId) {
        await this.serviceRatingService.recalculateSummary(existing.serviceId, salonId, actorUserId);
      }
      if (existing.staffId) {
        await this.staffRatingService.recalculateSummary(existing.staffId, salonId, actorUserId);
      }
    }

    return new ReviewItemRatingEntity(updated as any);
  }

  public async deleteItemRating(
    id: string,
    salonId?: string,
    actorUserId?: string,
  ): Promise<ReviewItemRatingEntity> {
    const existing = await this.itemRatingRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Review item rating with id ${id} not found.`);
    }

    const deleted = await this.itemRatingRepo.delete(id);

    if (salonId) {
      if (existing.serviceId) {
        await this.serviceRatingService.recalculateSummary(existing.serviceId, salonId, actorUserId);
      }
      if (existing.staffId) {
        await this.staffRatingService.recalculateSummary(existing.staffId, salonId, actorUserId);
      }
    }

    return new ReviewItemRatingEntity(deleted as any);
  }
}
