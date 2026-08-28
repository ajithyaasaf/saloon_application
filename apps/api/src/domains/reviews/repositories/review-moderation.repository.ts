import { ConflictException, Injectable } from '@nestjs/common';
import {
  ReviewDispute,
  ReviewDisputeStatus,
  ReviewFlag,
  ReviewFlagStatus,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateReviewDisputeData,
  CreateReviewFlagData,
  UpdateReviewDisputeData,
} from '../dto/review.dto';
import {
  SearchReviewDisputeQueryDto,
  SearchReviewFlagQueryDto,
} from '../dto/search-review.dto';
import {
  IReviewDisputeRepository,
  IReviewFlagRepository,
} from './interfaces/review-moderation.repository.interface';

@Injectable()
export class ReviewFlagRepository implements IReviewFlagRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ReviewFlag | null> {
    return this.db.reviewFlag.findUnique({
      where: { id },
      include: { review: true },
    });
  }

  public async findByReview(reviewId: string): Promise<ReviewFlag[]> {
    return this.db.reviewFlag.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findPending(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: ReviewFlag[]; total: number }> {
    return this.findByStatus(ReviewFlagStatus.PENDING, options);
  }

  public async findByStatus(
    status: ReviewFlagStatus,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewFlag[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewFlag.findMany({
        where: { status },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { review: true },
      }),
      this.db.reviewFlag.count({ where: { status } }),
    ]);

    return { data, total };
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewFlag[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewFlag.findMany({
        where: { review: { salonId } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { review: true },
      }),
      this.db.reviewFlag.count({ where: { review: { salonId } } }),
    ]);

    return { data, total };
  }

  public async search(
    query: SearchReviewFlagQueryDto,
  ): Promise<{ data: ReviewFlag[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.review = { salonId: query.salonId };
    if (query.reviewId) where.reviewId = query.reviewId;
    if (query.reportedByUserId) where.reportedByUserId = query.reportedByUserId;
    if (query.reasonCategory) where.reasonCategory = query.reasonCategory;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.db.reviewFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        include: { review: true },
      }),
      this.db.reviewFlag.count({ where }),
    ]);

    return { data, total };
  }

  public async create(data: CreateReviewFlagData): Promise<ReviewFlag> {
    return this.db.reviewFlag.create({
      data: {
        reviewId: data.reviewId,
        reportedByUserId: data.reportedByUserId,
        reasonCategory: data.reasonCategory,
        explanation: data.explanation,
        status: data.status ?? ReviewFlagStatus.PENDING,
      },
    });
  }

  public async updateStatus(
    id: string,
    status: ReviewFlagStatus,
    resolutionNotes?: string,
    resolvedByUserId?: string,
  ): Promise<ReviewFlag> {
    const data: any = { status };
    if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes;
    if (resolvedByUserId !== undefined) {
      data.resolvedByUserId = resolvedByUserId;
      data.resolvedAt = new Date();
    }

    return this.db.reviewFlag.update({
      where: { id },
      data,
    });
  }

  public async resolve(
    id: string,
    status: ReviewFlagStatus,
    resolutionNotes: string,
    resolvedByUserId: string,
  ): Promise<ReviewFlag> {
    return this.db.reviewFlag.update({
      where: { id },
      data: {
        status,
        resolutionNotes,
        resolvedByUserId,
        resolvedAt: new Date(),
      },
    });
  }
}

@Injectable()
export class ReviewDisputeRepository implements IReviewDisputeRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ReviewDispute | null> {
    return this.db.reviewDispute.findUnique({
      where: { id },
      include: { review: true },
    });
  }

  public async findByCode(disputeCode: string): Promise<ReviewDispute | null> {
    return this.db.reviewDispute.findUnique({
      where: { disputeCode },
      include: { review: true },
    });
  }

  public async findByReview(reviewId: string): Promise<ReviewDispute | null> {
    return this.db.reviewDispute.findUnique({
      where: { reviewId },
      include: { review: true },
    });
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewDispute[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewDispute.findMany({
        where: { salonId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { review: true },
      }),
      this.db.reviewDispute.count({ where: { salonId } }),
    ]);

    return { data, total };
  }

  public async findPending(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: ReviewDispute[]; total: number }> {
    return this.findByStatus(ReviewDisputeStatus.SUBMITTED, options);
  }

  public async findByStatus(
    status: ReviewDisputeStatus,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewDispute[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewDispute.findMany({
        where: { status },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { review: true },
      }),
      this.db.reviewDispute.count({ where: { status } }),
    ]);

    return { data, total };
  }

  public async search(
    query: SearchReviewDisputeQueryDto,
  ): Promise<{ data: ReviewDispute[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.reviewId) where.reviewId = query.reviewId;
    if (query.disputeCode) where.disputeCode = query.disputeCode;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.db.reviewDispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        include: { review: true },
      }),
      this.db.reviewDispute.count({ where }),
    ]);

    return { data, total };
  }

  public async create(data: CreateReviewDisputeData): Promise<ReviewDispute> {
    return this.db.reviewDispute.create({
      data: {
        disputeCode: data.disputeCode,
        reviewId: data.reviewId,
        salonId: data.salonId,
        submittedByUserId: data.submittedByUserId,
        disputeReason: data.disputeReason,
        evidenceDetails: data.evidenceDetails,
        status: data.status ?? ReviewDisputeStatus.SUBMITTED,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateReviewDisputeData,
    expectedVersion?: number,
  ): Promise<ReviewDispute> {
    return this.db.reviewDispute.update({
      where: { id },
      data,
    });
  }

  public async updateStatus(
    id: string,
    status: ReviewDisputeStatus,
    adminDecisionNotes?: string,
    reviewedByUserId?: string,
    expectedVersion?: number,
  ): Promise<ReviewDispute> {
    const data: any = { status };
    if (adminDecisionNotes !== undefined) data.adminDecisionNotes = adminDecisionNotes;
    if (reviewedByUserId !== undefined) {
      data.reviewedByUserId = reviewedByUserId;
      data.reviewedAt = new Date();
    }

    return this.db.reviewDispute.update({
      where: { id },
      data,
    });
  }
}
