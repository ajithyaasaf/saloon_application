import { Injectable } from '@nestjs/common';
import { ReviewInvitation, ReviewInvitationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateReviewInvitationData } from '../dto/review.dto';
import { SearchReviewInvitationQueryDto } from '../dto/search-review.dto';
import { IReviewInvitationRepository } from './interfaces/review-invitation.repository.interface';

@Injectable()
export class ReviewInvitationRepository implements IReviewInvitationRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ReviewInvitation | null> {
    return this.db.reviewInvitation.findUnique({
      where: { id },
      include: { booking: true },
    });
  }

  public async findByBooking(bookingId: string): Promise<ReviewInvitation | null> {
    return this.db.reviewInvitation.findUnique({
      where: { bookingId },
      include: { booking: true },
    });
  }

  public async findByToken(invitationToken: string): Promise<ReviewInvitation | null> {
    return this.db.reviewInvitation.findUnique({
      where: { invitationToken },
      include: { booking: true, salon: true, branch: true },
    });
  }

  public async findByCustomer(
    customerId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewInvitation[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewInvitation.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { booking: true },
      }),
      this.db.reviewInvitation.count({ where: { customerId } }),
    ]);

    return { data, total };
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewInvitation[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.reviewInvitation.findMany({
        where: { salonId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { booking: true },
      }),
      this.db.reviewInvitation.count({ where: { salonId } }),
    ]);

    return { data, total };
  }

  public async findPending(salonId?: string): Promise<ReviewInvitation[]> {
    const where: any = { status: ReviewInvitationStatus.PENDING };
    if (salonId) where.salonId = salonId;
    return this.db.reviewInvitation.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  public async findExpired(): Promise<ReviewInvitation[]> {
    return this.db.reviewInvitation.findMany({
      where: {
        status: { in: [ReviewInvitationStatus.PENDING, ReviewInvitationStatus.SENT] },
        expiresAt: { lte: new Date() },
      },
    });
  }

  public async search(
    query: SearchReviewInvitationQueryDto,
  ): Promise<{ data: ReviewInvitation[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.db.reviewInvitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        include: { booking: true },
      }),
      this.db.reviewInvitation.count({ where }),
    ]);

    return { data, total };
  }

  public async create(data: CreateReviewInvitationData): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.create({
      data: {
        bookingId: data.bookingId,
        salonId: data.salonId,
        branchId: data.branchId,
        customerId: data.customerId,
        channel: data.channel,
        invitationToken: data.invitationToken,
        status: data.status ?? ReviewInvitationStatus.PENDING,
        expiresAt: data.expiresAt,
        sentAt: data.sentAt,
      },
    });
  }

  public async updateStatus(
    id: string,
    status: ReviewInvitationStatus,
  ): Promise<ReviewInvitation> {
    const data: any = { status };
    if (status === ReviewInvitationStatus.SENT) data.sentAt = new Date();
    if (status === ReviewInvitationStatus.COMPLETED) data.completedAt = new Date();

    return this.db.reviewInvitation.update({
      where: { id },
      data,
    });
  }

  public async markSent(id: string): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.update({
      where: { id },
      data: {
        status: ReviewInvitationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  public async markOpened(id: string): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.update({
      where: { id },
      data: {
        status: ReviewInvitationStatus.OPENED,
      },
    });
  }

  public async markCompleted(id: string): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.update({
      where: { id },
      data: {
        status: ReviewInvitationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  public async markExpired(id: string): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.update({
      where: { id },
      data: {
        status: ReviewInvitationStatus.EXPIRED,
      },
    });
  }

  public async markFailed(id: string): Promise<ReviewInvitation> {
    return this.db.reviewInvitation.update({
      where: { id },
      data: {
        status: ReviewInvitationStatus.FAILED,
      },
    });
  }
}
