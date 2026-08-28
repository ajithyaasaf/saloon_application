import {
  ReviewDispute,
  ReviewDisputeStatus,
  ReviewFlag,
  ReviewFlagStatus,
} from '@prisma/client';
import {
  CreateReviewDisputeData,
  CreateReviewFlagData,
  UpdateReviewDisputeData,
} from '../../dto/review.dto';
import {
  SearchReviewDisputeQueryDto,
  SearchReviewFlagQueryDto,
} from '../../dto/search-review.dto';

export interface IReviewFlagRepository {
  findById(id: string): Promise<ReviewFlag | null>;
  findByReview(reviewId: string): Promise<ReviewFlag[]>;
  findPending(options?: { page?: number; limit?: number }): Promise<{ data: ReviewFlag[]; total: number }>;
  findByStatus(
    status: ReviewFlagStatus,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewFlag[]; total: number }>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewFlag[]; total: number }>;
  search(query: SearchReviewFlagQueryDto): Promise<{ data: ReviewFlag[]; total: number }>;
  create(data: CreateReviewFlagData): Promise<ReviewFlag>;
  updateStatus(
    id: string,
    status: ReviewFlagStatus,
    resolutionNotes?: string,
    resolvedByUserId?: string,
  ): Promise<ReviewFlag>;
  resolve(
    id: string,
    status: ReviewFlagStatus,
    resolutionNotes: string,
    resolvedByUserId: string,
  ): Promise<ReviewFlag>;
}

export interface IReviewDisputeRepository {
  findById(id: string): Promise<ReviewDispute | null>;
  findByCode(disputeCode: string): Promise<ReviewDispute | null>;
  findByReview(reviewId: string): Promise<ReviewDispute | null>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewDispute[]; total: number }>;
  findPending(options?: { page?: number; limit?: number }): Promise<{ data: ReviewDispute[]; total: number }>;
  findByStatus(
    status: ReviewDisputeStatus,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewDispute[]; total: number }>;
  search(query: SearchReviewDisputeQueryDto): Promise<{ data: ReviewDispute[]; total: number }>;
  create(data: CreateReviewDisputeData): Promise<ReviewDispute>;
  update(id: string, data: UpdateReviewDisputeData, expectedVersion?: number): Promise<ReviewDispute>;
  updateStatus(
    id: string,
    status: ReviewDisputeStatus,
    adminDecisionNotes?: string,
    reviewedByUserId?: string,
    expectedVersion?: number,
  ): Promise<ReviewDispute>;
}
