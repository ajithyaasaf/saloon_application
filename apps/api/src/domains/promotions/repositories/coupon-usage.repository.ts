import { Injectable } from '@nestjs/common';
import { CouponUsage, CouponUsageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CouponUsageAggregationResult,
  CreateCouponUsageData,
  SearchCouponUsageQueryDto,
  UpdateCouponUsageData,
} from '../dto/coupon-usage.dto';
import { ICouponUsageRepository } from './interfaces/coupon-usage.repository.interface';

@Injectable()
export class CouponUsageRepository implements ICouponUsageRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsage | null> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = { id };
    if (salonId) where.salonId = salonId;

    return client.couponUsage.findFirst({
      where,
      include: {
        coupon: true,
        customer: true,
        booking: true,
        invoice: true,
        branch: true,
      },
    });
  }

  public async findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    return client.couponUsage.findMany({
      where: { couponId },
      orderBy: { appliedAt: 'desc' },
      include: {
        customer: true,
        booking: true,
      },
    });
  }

  public async findByCustomer(customerId: string, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = { customerId };
    if (salonId) where.salonId = salonId;

    return client.couponUsage.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        coupon: true,
        booking: true,
      },
    });
  }

  public async findByCustomerAndCoupon(
    customerId: string,
    couponId: string,
    tx?: PrismaTransaction,
  ): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    return client.couponUsage.findMany({
      where: { customerId, couponId },
      orderBy: { appliedAt: 'desc' },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<CouponUsage | null> {
    const client = tx ?? this.db;
    return client.couponUsage.findFirst({
      where: { bookingId },
      include: { coupon: true },
    });
  }

  public async findByAppointment(appointmentId: string, tx?: PrismaTransaction): Promise<CouponUsage | null> {
    const client = tx ?? this.db;
    return client.couponUsage.findUnique({
      where: { appointmentId },
      include: { coupon: true },
    });
  }

  public async findByInvoice(invoiceId: string, tx?: PrismaTransaction): Promise<CouponUsage | null> {
    const client = tx ?? this.db;
    return client.couponUsage.findFirst({
      where: { invoiceId },
      include: { coupon: true },
    });
  }

  public async findBySalon(salonId: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = { salonId };
    if (status) where.status = status;

    return client.couponUsage.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        coupon: true,
        customer: true,
        branch: true,
      },
    });
  }

  public async findByBranch(branchId: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = { branchId };
    if (status) where.status = status;

    return client.couponUsage.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        coupon: true,
        customer: true,
      },
    });
  }

  public async findByStatus(
    status: CouponUsageStatus,
    salonId?: string,
    tx?: PrismaTransaction,
  ): Promise<CouponUsage[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = { status };
    if (salonId) where.salonId = salonId;

    return client.couponUsage.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
    });
  }

  public async search(
    query: SearchCouponUsageQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: CouponUsage[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponUsageWhereInput = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.couponId) where.couponId = query.couponId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.appointmentId) where.appointmentId = query.appointmentId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.appliedAt = {};
      if (query.startDate) where.appliedAt.gte = query.startDate;
      if (query.endDate) where.appliedAt.lte = query.endDate;
    }

    const orderByField = query.sortBy ?? 'appliedAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      client.couponUsage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          coupon: true,
          customer: true,
          branch: true,
        },
      }),
      client.couponUsage.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId?: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = {};
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return client.couponUsage.count({ where });
  }

  public async countCustomerUsage(
    customerId: string,
    couponId: string,
    statuses: CouponUsageStatus[] = [CouponUsageStatus.APPLIED, CouponUsageStatus.SETTLED],
    tx?: PrismaTransaction,
  ): Promise<number> {
    const client = tx ?? this.db;
    return client.couponUsage.count({
      where: {
        customerId,
        couponId,
        status: { in: statuses },
      },
    });
  }

  public async countCouponUsage(
    couponId: string,
    statuses: CouponUsageStatus[] = [CouponUsageStatus.APPLIED, CouponUsageStatus.SETTLED],
    tx?: PrismaTransaction,
  ): Promise<number> {
    const client = tx ?? this.db;
    return client.couponUsage.count({
      where: {
        couponId,
        status: { in: statuses },
      },
    });
  }

  public async create(data: CreateCouponUsageData, tx?: PrismaTransaction): Promise<CouponUsage> {
    const client = tx ?? this.db;
    return client.couponUsage.create({
      data: {
        couponId: data.couponId,
        salonId: data.salonId,
        branchId: data.branchId,
        customerId: data.customerId,
        bookingId: data.bookingId ?? null,
        appointmentId: data.appointmentId ?? null,
        invoiceId: data.invoiceId ?? null,
        discountAmount: data.discountAmount,
        bookingTotalBeforeDiscount: data.bookingTotalBeforeDiscount,
        bookingTotalAfterDiscount: data.bookingTotalAfterDiscount,
        status: data.status ?? CouponUsageStatus.APPLIED,
        appliedAt: data.appliedAt ?? new Date(),
        settledAt: data.settledAt ?? null,
        reversedAt: data.reversedAt ?? null,
        reversalReason: data.reversalReason ?? null,
      },
      include: {
        coupon: true,
      },
    });
  }

  public async update(id: string, data: UpdateCouponUsageData, tx?: PrismaTransaction): Promise<CouponUsage> {
    const client = tx ?? this.db;
    return client.couponUsage.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.settledAt !== undefined && { settledAt: data.settledAt }),
        ...(data.reversedAt !== undefined && { reversedAt: data.reversedAt }),
        ...(data.reversalReason !== undefined && { reversalReason: data.reversalReason }),
      },
    });
  }

  public async updateStatus(
    id: string,
    status: CouponUsageStatus,
    notes?: string,
    tx?: PrismaTransaction,
  ): Promise<CouponUsage> {
    const client = tx ?? this.db;
    const data: Prisma.CouponUsageUpdateInput = { status };
    if (status === CouponUsageStatus.SETTLED) {
      data.settledAt = new Date();
    } else if (status === CouponUsageStatus.REVERSED) {
      data.reversedAt = new Date();
      if (notes) data.reversalReason = notes;
    }

    return client.couponUsage.update({
      where: { id },
      data,
    });
  }

  public async settle(id: string, settledAt = new Date(), tx?: PrismaTransaction): Promise<CouponUsage> {
    const client = tx ?? this.db;
    return client.couponUsage.update({
      where: { id },
      data: {
        status: CouponUsageStatus.SETTLED,
        settledAt,
      },
    });
  }

  public async reverse(
    id: string,
    reversalReason: string,
    reversedAt = new Date(),
    tx?: PrismaTransaction,
  ): Promise<CouponUsage> {
    const client = tx ?? this.db;
    return client.couponUsage.update({
      where: { id },
      data: {
        status: CouponUsageStatus.REVERSED,
        reversedAt,
        reversalReason,
      },
    });
  }

  public async expire(id: string, tx?: PrismaTransaction): Promise<CouponUsage> {
    const client = tx ?? this.db;
    return client.couponUsage.update({
      where: { id },
      data: {
        status: CouponUsageStatus.EXPIRED,
      },
    });
  }

  public async aggregateUsage(
    couponId: string,
    salonId?: string,
    tx?: PrismaTransaction,
  ): Promise<CouponUsageAggregationResult> {
    const client = tx ?? this.db;
    const where: Prisma.CouponUsageWhereInput = {
      couponId,
      status: { in: [CouponUsageStatus.APPLIED, CouponUsageStatus.SETTLED] },
    };
    if (salonId) where.salonId = salonId;

    const [count, aggregate] = await Promise.all([
      client.couponUsage.count({ where }),
      client.couponUsage.aggregate({
        where,
        _sum: { discountAmount: true },
      }),
    ]);

    return {
      totalUsages: count,
      totalDiscountGiven: aggregate._sum.discountAmount ?? 0,
    };
  }
}
