import {
  Review,
  ReviewHelpfulVote,
  ReviewItemRating,
  ReviewMediaAttachment,
  ReviewReply,
  ReviewStatus,
} from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateReviewData,
  CreateReviewItemRatingData,
  CreateReviewMediaAttachmentData,
  CreateReviewReplyData,
  UpdateReviewData,
  UpdateReviewReplyData,
} from '../../dto/review.dto';
import { SearchReviewQueryDto } from '../../dto/search-review.dto';

export interface IReviewRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Review | null>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Review | null>;
  findByAppointment(appointmentId: string, tx?: PrismaTransaction): Promise<Review | null>;
  findByCustomer(
    customerId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }>;
  findByBranch(
    branchId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }>;
  findPublishedBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }>;
  findPublishedByBranch(
    branchId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }>;
  findPendingApproval(salonId?: string, tx?: PrismaTransaction): Promise<Review[]>;
  findFlagged(salonId?: string, tx?: PrismaTransaction): Promise<Review[]>;
  findByStatus(status: ReviewStatus, salonId?: string, tx?: PrismaTransaction): Promise<Review[]>;
  search(query: SearchReviewQueryDto, tx?: PrismaTransaction): Promise<{ data: Review[]; total: number }>;
  count(salonId: string, status?: ReviewStatus, tx?: PrismaTransaction): Promise<number>;
  create(data: CreateReviewData, tx?: PrismaTransaction): Promise<Review>;
  update(id: string, data: UpdateReviewData, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  updateStatus(id: string, status: ReviewStatus, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  publish(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  hide(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  reject(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  archive(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  softDelete(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review>;
  calculateStarDistribution(
    salonId: string,
    branchId?: string,
    tx?: PrismaTransaction,
  ): Promise<{
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
    total: number;
    average: number;
  }>;
}

export interface IReviewItemRatingRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<ReviewItemRating | null>;
  findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewItemRating[]>;
  findByService(
    serviceId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewItemRating[]; total: number }>;
  findByStaff(
    staffId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewItemRating[]; total: number }>;
  create(data: CreateReviewItemRatingData, tx?: PrismaTransaction): Promise<ReviewItemRating>;
  createMany(data: CreateReviewItemRatingData[], tx?: PrismaTransaction): Promise<number>;
  update(id: string, data: Partial<CreateReviewItemRatingData>, tx?: PrismaTransaction): Promise<ReviewItemRating>;
  delete(id: string, tx?: PrismaTransaction): Promise<ReviewItemRating>;
}

export interface IReviewMediaAttachmentRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment | null>;
  findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment[]>;
  create(data: CreateReviewMediaAttachmentData, tx?: PrismaTransaction): Promise<ReviewMediaAttachment>;
  createMany(data: CreateReviewMediaAttachmentData[], tx?: PrismaTransaction): Promise<number>;
  delete(id: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment>;
}

export interface IReviewReplyRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<ReviewReply | null>;
  findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewReply | null>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewReply[]; total: number }>;
  create(data: CreateReviewReplyData, tx?: PrismaTransaction): Promise<ReviewReply>;
  update(id: string, data: UpdateReviewReplyData, expectedVersion?: number, tx?: PrismaTransaction): Promise<ReviewReply>;
  softDelete(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<ReviewReply>;
}

export interface IReviewHelpfulVoteRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote | null>;
  findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote[]>;
  findByUserAndReview(userId: string, reviewId: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote | null>;
  countByReview(reviewId: string, tx?: PrismaTransaction): Promise<number>;
  create(reviewId: string, userId: string, isHelpful?: boolean, tx?: PrismaTransaction): Promise<ReviewHelpfulVote>;
  delete(reviewId: string, userId: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote | null>;
}
