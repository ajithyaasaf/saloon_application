import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Review,
  ReviewHelpfulVote,
  ReviewItemRating,
  ReviewMediaAttachment,
  ReviewReply,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateReviewData,
  CreateReviewItemRatingData,
  CreateReviewMediaAttachmentData,
  CreateReviewReplyData,
  UpdateReviewData,
  UpdateReviewReplyData,
} from '../dto/review.dto';
import { SearchReviewQueryDto } from '../dto/search-review.dto';
import {
  IReviewHelpfulVoteRepository,
  IReviewItemRatingRepository,
  IReviewMediaAttachmentRepository,
  IReviewReplyRepository,
  IReviewRepository,
} from './interfaces/review.repository.interface';

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Review | null> {
    const client = tx ?? this.db;
    return client.review.findFirst({
      where: { id, deletedAt: null },
      include: {
        itemRatings: true,
        mediaAttachments: true,
        reply: { where: { deletedAt: null } },
      },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Review | null> {
    const client = tx ?? this.db;
    return client.review.findFirst({
      where: { bookingId, deletedAt: null },
      include: {
        itemRatings: true,
        mediaAttachments: true,
        reply: { where: { deletedAt: null } },
      },
    });
  }

  public async findByAppointment(appointmentId: string, tx?: PrismaTransaction): Promise<Review | null> {
    const client = tx ?? this.db;
    return client.review.findFirst({
      where: { appointmentId, deletedAt: null },
      include: {
        itemRatings: true,
        mediaAttachments: true,
        reply: { where: { deletedAt: null } },
      },
    });
  }

  public async findByCustomer(
    customerId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.review.findMany({
        where: { customerId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({ where: { customerId, deletedAt: null } }),
    ]);

    return { data, total };
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.review.findMany({
        where: { salonId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({ where: { salonId, deletedAt: null } }),
    ]);

    return { data, total };
  }

  public async findByBranch(
    branchId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.review.findMany({
        where: { branchId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({ where: { branchId, deletedAt: null } }),
    ]);

    return { data, total };
  }

  public async findPublishedBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.review.findMany({
        where: { salonId, status: ReviewStatus.PUBLISHED, deletedAt: null },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({
        where: { salonId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  public async findPublishedByBranch(
    branchId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.review.findMany({
        where: { branchId, status: ReviewStatus.PUBLISHED, deletedAt: null },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({
        where: { branchId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  public async findPendingApproval(salonId?: string, tx?: PrismaTransaction): Promise<Review[]> {
    const client = tx ?? this.db;
    const where: any = { status: ReviewStatus.PENDING_APPROVAL, deletedAt: null };
    if (salonId) where.salonId = salonId;
    return client.review.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  public async findFlagged(salonId?: string, tx?: PrismaTransaction): Promise<Review[]> {
    const client = tx ?? this.db;
    const where: any = { status: ReviewStatus.FLAGGED, deletedAt: null };
    if (salonId) where.salonId = salonId;
    return client.review.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  public async findByStatus(status: ReviewStatus, salonId?: string, tx?: PrismaTransaction): Promise<Review[]> {
    const client = tx ?? this.db;
    const where: any = { status, deletedAt: null };
    if (salonId) where.salonId = salonId;
    return client.review.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  public async search(query: SearchReviewQueryDto, tx?: PrismaTransaction): Promise<{ data: Review[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    if (query.overallRating) where.overallRating = query.overallRating;
    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.overallRating = {};
      if (query.minRating !== undefined) where.overallRating.gte = query.minRating;
      if (query.maxRating !== undefined) where.overallRating.lte = query.maxRating;
    }
    if (query.isVerifiedPurchase !== undefined) {
      where.isVerifiedPurchase = query.isVerifiedPurchase;
    }
    if (query.hasPhotos) {
      where.mediaAttachments = { some: {} };
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = query.startDate;
      if (query.endDate) where.createdAt.lte = query.endDate;
    }
    if (query.search) {
      where.OR = [
        { reviewTitle: { contains: query.search, mode: 'insensitive' } },
        { reviewComment: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.staffId || query.serviceId) {
      where.itemRatings = {
        some: {
          ...(query.staffId ? { staffId: query.staffId } : {}),
          ...(query.serviceId ? { serviceId: query.serviceId } : {}),
        },
      };
    }

    const orderByField = query.sortBy ?? 'createdAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      client.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          itemRatings: true,
          mediaAttachments: true,
          reply: { where: { deletedAt: null } },
        },
      }),
      client.review.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId: string, status?: ReviewStatus, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const where: any = { salonId, deletedAt: null };
    if (status) where.status = status;
    return client.review.count({ where });
  }

  public async create(data: CreateReviewData, tx?: PrismaTransaction): Promise<Review> {
    const client = tx ?? this.db;
    return client.review.create({
      data: {
        salonId: data.salonId,
        branchId: data.branchId,
        customerId: data.customerId,
        bookingId: data.bookingId,
        appointmentId: data.appointmentId,
        overallRating: data.overallRating,
        reviewTitle: data.reviewTitle,
        reviewComment: data.reviewComment,
        cleanlinessRating: data.cleanlinessRating,
        hospitalityRating: data.hospitalityRating,
        valueRating: data.valueRating,
        ambienceRating: data.ambienceRating,
        status: data.status ?? ReviewStatus.PUBLISHED,
        isVerifiedPurchase: data.isVerifiedPurchase ?? true,
        isAnonymous: data.isAnonymous ?? false,
        publishedAt: data.publishedAt ?? new Date(),
      },
    });
  }

  public async update(id: string, data: UpdateReviewData, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    const client = tx ?? this.db;
    const where: any = { id, deletedAt: null };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    try {
      return await client.review.update({
        where,
        data: {
          ...data,
          editedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Review with id ${id} has been modified concurrently (expected version ${expectedVersion}).`,
        );
      }
      throw error;
    }
  }

  public async updateStatus(
    id: string,
    status: ReviewStatus,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<Review> {
    const client = tx ?? this.db;
    const where: any = { id, deletedAt: null };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    const data: any = { status, version: { increment: 1 } };
    if (status === ReviewStatus.PUBLISHED) {
      data.publishedAt = new Date();
    }

    try {
      return await client.review.update({
        where,
        data,
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Review with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async publish(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    return this.updateStatus(id, ReviewStatus.PUBLISHED, expectedVersion, tx);
  }

  public async hide(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    return this.updateStatus(id, ReviewStatus.HIDDEN, expectedVersion, tx);
  }

  public async reject(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    return this.updateStatus(id, ReviewStatus.REJECTED, expectedVersion, tx);
  }

  public async archive(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    return this.updateStatus(id, ReviewStatus.ARCHIVED, expectedVersion, tx);
  }

  public async softDelete(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<Review> {
    const client = tx ?? this.db;
    const where: any = { id, deletedAt: null };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    try {
      return await client.review.update({
        where,
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Review with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async calculateStarDistribution(
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
  }> {
    const client = tx ?? this.db;
    const where: any = {
      salonId,
      status: ReviewStatus.PUBLISHED,
      deletedAt: null,
    };
    if (branchId) where.branchId = branchId;

    const reviews = await client.review.findMany({
      where,
      select: { overallRating: true },
    });

    let oneStar = 0;
    let twoStar = 0;
    let threeStar = 0;
    let fourStar = 0;
    let fiveStar = 0;
    let sum = 0;

    for (const r of reviews) {
      sum += r.overallRating;
      if (r.overallRating === 1) oneStar++;
      else if (r.overallRating === 2) twoStar++;
      else if (r.overallRating === 3) threeStar++;
      else if (r.overallRating === 4) fourStar++;
      else if (r.overallRating === 5) fiveStar++;
    }

    const total = reviews.length;
    const average = total > 0 ? Number((sum / total).toFixed(2)) : 0;

    return {
      oneStar,
      twoStar,
      threeStar,
      fourStar,
      fiveStar,
      total,
      average,
    };
  }
}

@Injectable()
export class ReviewItemRatingRepository implements IReviewItemRatingRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<ReviewItemRating | null> {
    const client = tx ?? this.db;
    return client.reviewItemRating.findUnique({ where: { id } });
  }

  public async findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewItemRating[]> {
    const client = tx ?? this.db;
    return client.reviewItemRating.findMany({ where: { reviewId } });
  }

  public async findByService(
    serviceId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewItemRating[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.reviewItemRating.findMany({
        where: { serviceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.reviewItemRating.count({ where: { serviceId } }),
    ]);

    return { data, total };
  }

  public async findByStaff(
    staffId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewItemRating[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.reviewItemRating.findMany({
        where: { staffId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.reviewItemRating.count({ where: { staffId } }),
    ]);

    return { data, total };
  }

  public async create(data: CreateReviewItemRatingData, tx?: PrismaTransaction): Promise<ReviewItemRating> {
    const client = tx ?? this.db;
    return client.reviewItemRating.create({
      data: {
        reviewId: data.reviewId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        bookingItemId: data.bookingItemId,
        ratingStars: data.ratingStars,
        itemComment: data.itemComment,
      },
    });
  }

  public async createMany(data: CreateReviewItemRatingData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.reviewItemRating.createMany({
      data: data.map((d) => ({
        reviewId: d.reviewId,
        serviceId: d.serviceId,
        staffId: d.staffId,
        bookingItemId: d.bookingItemId,
        ratingStars: d.ratingStars,
        itemComment: d.itemComment,
      })),
    });
    return res.count;
  }

  public async update(
    id: string,
    data: Partial<CreateReviewItemRatingData>,
    tx?: PrismaTransaction,
  ): Promise<ReviewItemRating> {
    const client = tx ?? this.db;
    return client.reviewItemRating.update({
      where: { id },
      data,
    });
  }

  public async delete(id: string, tx?: PrismaTransaction): Promise<ReviewItemRating> {
    const client = tx ?? this.db;
    return client.reviewItemRating.delete({ where: { id } });
  }
}

@Injectable()
export class ReviewMediaAttachmentRepository implements IReviewMediaAttachmentRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment | null> {
    const client = tx ?? this.db;
    return client.reviewMediaAttachment.findUnique({ where: { id } });
  }

  public async findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment[]> {
    const client = tx ?? this.db;
    return client.reviewMediaAttachment.findMany({
      where: { reviewId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  public async create(data: CreateReviewMediaAttachmentData, tx?: PrismaTransaction): Promise<ReviewMediaAttachment> {
    const client = tx ?? this.db;
    return client.reviewMediaAttachment.create({
      data: {
        reviewId: data.reviewId,
        mediaId: data.mediaId,
        caption: data.caption,
        isBeforePhoto: data.isBeforePhoto ?? false,
        isAfterPhoto: data.isAfterPhoto ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  public async createMany(data: CreateReviewMediaAttachmentData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.reviewMediaAttachment.createMany({
      data: data.map((d) => ({
        reviewId: d.reviewId,
        mediaId: d.mediaId,
        caption: d.caption,
        isBeforePhoto: d.isBeforePhoto ?? false,
        isAfterPhoto: d.isAfterPhoto ?? false,
        displayOrder: d.displayOrder ?? 0,
      })),
    });
    return res.count;
  }

  public async delete(id: string, tx?: PrismaTransaction): Promise<ReviewMediaAttachment> {
    const client = tx ?? this.db;
    return client.reviewMediaAttachment.delete({ where: { id } });
  }
}

@Injectable()
export class ReviewReplyRepository implements IReviewReplyRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<ReviewReply | null> {
    const client = tx ?? this.db;
    return client.reviewReply.findFirst({
      where: { id, deletedAt: null },
    });
  }

  public async findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewReply | null> {
    const client = tx ?? this.db;
    return client.reviewReply.findFirst({
      where: { reviewId, deletedAt: null },
    });
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
    tx?: PrismaTransaction,
  ): Promise<{ data: ReviewReply[]; total: number }> {
    const client = tx ?? this.db;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.reviewReply.findMany({
        where: { salonId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.reviewReply.count({ where: { salonId, deletedAt: null } }),
    ]);

    return { data, total };
  }

  public async create(data: CreateReviewReplyData, tx?: PrismaTransaction): Promise<ReviewReply> {
    const client = tx ?? this.db;
    return client.reviewReply.create({
      data: {
        reviewId: data.reviewId,
        salonId: data.salonId,
        responderUserId: data.responderUserId,
        replyText: data.replyText,
        publishedAt: data.publishedAt ?? new Date(),
      },
    });
  }

  public async update(
    id: string,
    data: UpdateReviewReplyData,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<ReviewReply> {
    const client = tx ?? this.db;
    const where: any = { id, deletedAt: null };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    try {
      return await client.reviewReply.update({
        where,
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: ReviewReply with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async softDelete(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<ReviewReply> {
    const client = tx ?? this.db;
    const where: any = { id, deletedAt: null };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    try {
      return await client.reviewReply.update({
        where,
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: ReviewReply with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }
}

@Injectable()
export class ReviewHelpfulVoteRepository implements IReviewHelpfulVoteRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote | null> {
    const client = tx ?? this.db;
    return client.reviewHelpfulVote.findUnique({ where: { id } });
  }

  public async findByReview(reviewId: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote[]> {
    const client = tx ?? this.db;
    return client.reviewHelpfulVote.findMany({ where: { reviewId } });
  }

  public async findByUserAndReview(
    userId: string,
    reviewId: string,
    tx?: PrismaTransaction,
  ): Promise<ReviewHelpfulVote | null> {
    const client = tx ?? this.db;
    return client.reviewHelpfulVote.findUnique({
      where: {
        reviewId_userId: { reviewId, userId },
      },
    });
  }

  public async countByReview(reviewId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    return client.reviewHelpfulVote.count({ where: { reviewId } });
  }

  public async create(
    reviewId: string,
    userId: string,
    isHelpful = true,
    tx?: PrismaTransaction,
  ): Promise<ReviewHelpfulVote> {
    const client = tx ?? this.db;
    return client.reviewHelpfulVote.create({
      data: {
        reviewId,
        userId,
        isHelpful,
      },
    });
  }

  public async delete(reviewId: string, userId: string, tx?: PrismaTransaction): Promise<ReviewHelpfulVote | null> {
    const client = tx ?? this.db;
    try {
      return await client.reviewHelpfulVote.delete({
        where: {
          reviewId_userId: { reviewId, userId },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }
}
