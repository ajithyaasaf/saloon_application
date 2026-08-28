import { ConflictException, Injectable } from '@nestjs/common';
import {
  Coupon,
  CouponBranchApplicability,
  CouponCategoryApplicability,
  CouponCustomerEligibility,
  CouponServiceApplicability,
  CouponStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateCouponBranchApplicabilityData,
  CreateCouponCategoryApplicabilityData,
  CreateCouponCustomerEligibilityData,
  CreateCouponData,
  CreateCouponServiceApplicabilityData,
  SearchCouponQueryDto,
  UpdateCouponData,
} from '../dto/coupon.dto';
import {
  ICouponBranchApplicabilityRepository,
  ICouponCategoryApplicabilityRepository,
  ICouponCustomerEligibilityRepository,
  ICouponRepository,
  ICouponServiceApplicabilityRepository,
} from './interfaces/coupon.repository.interface';

@Injectable()
export class CouponRepository implements ICouponRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon | null> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = { id, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return client.coupon.findFirst({
      where,
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findByCode(code: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon | null> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = {
      code: code.toUpperCase(),
      deletedAt: null,
    };
    if (salonId) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return client.coupon.findFirst({
      where,
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findBySalon(salonId: string, status?: CouponStatus, tx?: PrismaTransaction): Promise<Coupon[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = { salonId, deletedAt: null };
    if (status) where.status = status;

    return client.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findActiveByCode(
    code: string,
    salonId?: string,
    checkDate = new Date(),
    tx?: PrismaTransaction,
  ): Promise<Coupon | null> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = {
      code: code.toUpperCase(),
      status: CouponStatus.ACTIVE,
      startDate: { lte: checkDate },
      endDate: { gte: checkDate },
      deletedAt: null,
    };

    if (salonId) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return client.coupon.findFirst({
      where,
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findActiveBySalon(salonId?: string, checkDate = new Date(), tx?: PrismaTransaction): Promise<Coupon[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = {
      status: CouponStatus.ACTIVE,
      startDate: { lte: checkDate },
      endDate: { gte: checkDate },
      deletedAt: null,
    };

    if (salonId) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return client.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findAutoApplyCoupons(salonId?: string, checkDate = new Date(), tx?: PrismaTransaction): Promise<Coupon[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = {
      status: CouponStatus.ACTIVE,
      isAutoApply: true,
      startDate: { lte: checkDate },
      endDate: { gte: checkDate },
      deletedAt: null,
    };

    if (salonId) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return client.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async findByStatus(status: CouponStatus, salonId?: string, tx?: PrismaTransaction): Promise<Coupon[]> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = { status, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return client.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(query: SearchCouponQueryDto, tx?: PrismaTransaction): Promise<{ data: Coupon[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = { deletedAt: null };

    if (query.salonId) {
      where.OR = [{ salonId: query.salonId }, { salonId: null }];
    }
    if (query.status) where.status = query.status;
    if (query.discountType) where.discountType = query.discountType;
    if (query.isAutoApply !== undefined) where.isAutoApply = query.isAutoApply;
    if (query.isHappyHour !== undefined) where.isHappyHour = query.isHappyHour;
    if (query.code) where.code = { contains: query.code.toUpperCase(), mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.validOnDate) {
      where.startDate = { lte: query.validOnDate };
      where.endDate = { gte: query.validOnDate };
    }

    const orderByField = query.sortBy ?? 'createdAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      client.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          serviceApplicabilities: true,
          categoryApplicabilities: true,
          branchApplicabilities: true,
          customerEligibilities: true,
        },
      }),
      client.coupon.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId?: string, status?: CouponStatus, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = { deletedAt: null };
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return client.coupon.count({ where });
  }

  public async create(data: CreateCouponData, tx?: PrismaTransaction): Promise<Coupon> {
    const client = tx ?? this.db;
    return client.coupon.create({
      data: {
        salonId: data.salonId ?? null,
        code: data.code.toUpperCase().trim(),
        name: data.name,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: new Prisma.Decimal(data.discountValue),
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        minBookingAmount: data.minBookingAmount ?? 0,
        minServicesCount: data.minServicesCount ?? 1,
        applicabilityType: data.applicabilityType,
        customerEligibility: data.customerEligibility,
        totalUsageLimit: data.totalUsageLimit ?? null,
        perCustomerLimit: data.perCustomerLimit ?? 1,
        isAutoApply: data.isAutoApply ?? false,
        isCombinableWithOtherOffers: data.isCombinableWithOtherOffers ?? false,
        isHappyHour: data.isHappyHour ?? false,
        validDaysOfWeek: data.validDaysOfWeek ?? [],
        validStartTime: data.validStartTime ?? null,
        validEndTime: data.validEndTime ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status ?? CouponStatus.DRAFT,
      },
      include: {
        serviceApplicabilities: true,
        categoryApplicabilities: true,
        branchApplicabilities: true,
        customerEligibilities: true,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateCouponData,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<Coupon> {
    const client = tx ?? this.db;
    const updateData: Prisma.CouponUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && {
        discountValue: new Prisma.Decimal(data.discountValue),
      }),
      ...(data.maxDiscountAmount !== undefined && { maxDiscountAmount: data.maxDiscountAmount }),
      ...(data.minBookingAmount !== undefined && { minBookingAmount: data.minBookingAmount }),
      ...(data.minServicesCount !== undefined && { minServicesCount: data.minServicesCount }),
      ...(data.applicabilityType !== undefined && { applicabilityType: data.applicabilityType }),
      ...(data.customerEligibility !== undefined && {
        customerEligibility: data.customerEligibility,
      }),
      ...(data.totalUsageLimit !== undefined && { totalUsageLimit: data.totalUsageLimit }),
      ...(data.perCustomerLimit !== undefined && { perCustomerLimit: data.perCustomerLimit }),
      ...(data.isAutoApply !== undefined && { isAutoApply: data.isAutoApply }),
      ...(data.isCombinableWithOtherOffers !== undefined && {
        isCombinableWithOtherOffers: data.isCombinableWithOtherOffers,
      }),
      ...(data.isHappyHour !== undefined && { isHappyHour: data.isHappyHour }),
      ...(data.validDaysOfWeek !== undefined && { validDaysOfWeek: data.validDaysOfWeek }),
      ...(data.validStartTime !== undefined && { validStartTime: data.validStartTime }),
      ...(data.validEndTime !== undefined && { validEndTime: data.validEndTime }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.status !== undefined && { status: data.status }),
      version: { increment: 1 },
    };

    try {
      const where: Prisma.CouponWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.coupon.update({
        where,
        data: updateData,
        include: {
          serviceApplicabilities: true,
          categoryApplicabilities: true,
          branchApplicabilities: true,
          customerEligibilities: true,
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Coupon with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async updateStatus(
    id: string,
    status: CouponStatus,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<Coupon> {
    return this.update(id, { status }, expectedVersion, tx);
  }

  public async incrementUsage(
    id: string,
    amount = 1,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<Coupon> {
    const client = tx ?? this.db;
    try {
      const where: Prisma.CouponWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.coupon.update({
        where,
        data: {
          currentUsageCount: { increment: amount },
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Coupon with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async decrementUsage(
    id: string,
    amount = 1,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<Coupon> {
    const client = tx ?? this.db;
    try {
      const where: Prisma.CouponWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.coupon.update({
        where,
        data: {
          currentUsageCount: { decrement: amount },
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: Coupon with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async softDelete(id: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = { id };
    if (salonId) where.salonId = salonId;

    const existing = await client.coupon.findFirst({ where });
    if (!existing) {
      throw new ConflictException(`Coupon with id ${id} not found.`);
    }

    return client.coupon.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: CouponStatus.ARCHIVED,
        version: { increment: 1 },
      },
    });
  }

  public async checkCodeExists(
    code: string,
    salonId?: string,
    excludeCouponId?: string,
    tx?: PrismaTransaction,
  ): Promise<boolean> {
    const client = tx ?? this.db;
    const where: Prisma.CouponWhereInput = {
      code: code.toUpperCase().trim(),
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;
    if (excludeCouponId) where.id = { not: excludeCouponId };

    const count = await client.coupon.count({ where });
    return count > 0;
  }
}

@Injectable()
export class CouponServiceApplicabilityRepository
  implements ICouponServiceApplicabilityRepository
{
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability | null> {
    const client = tx ?? this.db;
    return client.couponServiceApplicability.findUnique({
      where: { id },
      include: { service: true },
    });
  }

  public async findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability[]> {
    const client = tx ?? this.db;
    return client.couponServiceApplicability.findMany({
      where: { couponId },
      include: { service: true },
    });
  }

  public async findByService(serviceId: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability[]> {
    const client = tx ?? this.db;
    return client.couponServiceApplicability.findMany({
      where: { serviceId },
      include: { coupon: true },
    });
  }

  public async create(
    data: CreateCouponServiceApplicabilityData,
    tx?: PrismaTransaction,
  ): Promise<CouponServiceApplicability> {
    const client = tx ?? this.db;
    return client.couponServiceApplicability.create({
      data: {
        couponId: data.couponId,
        serviceId: data.serviceId,
      },
    });
  }

  public async createMany(data: CreateCouponServiceApplicabilityData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponServiceApplicability.createMany({
      data,
      skipDuplicates: true,
    });
    return res.count;
  }

  public async delete(
    couponId: string,
    serviceId: string,
    tx?: PrismaTransaction,
  ): Promise<CouponServiceApplicability | null> {
    const client = tx ?? this.db;
    try {
      return await client.couponServiceApplicability.delete({
        where: {
          couponId_serviceId: { couponId, serviceId },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  public async deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponServiceApplicability.deleteMany({
      where: { couponId },
    });
    return res.count;
  }
}

@Injectable()
export class CouponCategoryApplicabilityRepository
  implements ICouponCategoryApplicabilityRepository
{
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability | null> {
    const client = tx ?? this.db;
    return client.couponCategoryApplicability.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  public async findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability[]> {
    const client = tx ?? this.db;
    return client.couponCategoryApplicability.findMany({
      where: { couponId },
      include: { category: true },
    });
  }

  public async findByCategory(categoryId: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability[]> {
    const client = tx ?? this.db;
    return client.couponCategoryApplicability.findMany({
      where: { categoryId },
      include: { coupon: true },
    });
  }

  public async create(
    data: CreateCouponCategoryApplicabilityData,
    tx?: PrismaTransaction,
  ): Promise<CouponCategoryApplicability> {
    const client = tx ?? this.db;
    return client.couponCategoryApplicability.create({
      data: {
        couponId: data.couponId,
        categoryId: data.categoryId,
      },
    });
  }

  public async createMany(data: CreateCouponCategoryApplicabilityData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponCategoryApplicability.createMany({
      data,
      skipDuplicates: true,
    });
    return res.count;
  }

  public async delete(
    couponId: string,
    categoryId: string,
    tx?: PrismaTransaction,
  ): Promise<CouponCategoryApplicability | null> {
    const client = tx ?? this.db;
    try {
      return await client.couponCategoryApplicability.delete({
        where: {
          couponId_categoryId: { couponId, categoryId },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  public async deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponCategoryApplicability.deleteMany({
      where: { couponId },
    });
    return res.count;
  }
}

@Injectable()
export class CouponBranchApplicabilityRepository
  implements ICouponBranchApplicabilityRepository
{
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability | null> {
    const client = tx ?? this.db;
    return client.couponBranchApplicability.findUnique({
      where: { id },
      include: { branch: true },
    });
  }

  public async findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability[]> {
    const client = tx ?? this.db;
    return client.couponBranchApplicability.findMany({
      where: { couponId },
      include: { branch: true },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability[]> {
    const client = tx ?? this.db;
    return client.couponBranchApplicability.findMany({
      where: { branchId },
      include: { coupon: true },
    });
  }

  public async create(
    data: CreateCouponBranchApplicabilityData,
    tx?: PrismaTransaction,
  ): Promise<CouponBranchApplicability> {
    const client = tx ?? this.db;
    return client.couponBranchApplicability.create({
      data: {
        couponId: data.couponId,
        branchId: data.branchId,
      },
    });
  }

  public async createMany(data: CreateCouponBranchApplicabilityData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponBranchApplicability.createMany({
      data,
      skipDuplicates: true,
    });
    return res.count;
  }

  public async delete(
    couponId: string,
    branchId: string,
    tx?: PrismaTransaction,
  ): Promise<CouponBranchApplicability | null> {
    const client = tx ?? this.db;
    try {
      return await client.couponBranchApplicability.delete({
        where: {
          couponId_branchId: { couponId, branchId },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  public async deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponBranchApplicability.deleteMany({
      where: { couponId },
    });
    return res.count;
  }
}

@Injectable()
export class CouponCustomerEligibilityRepository
  implements ICouponCustomerEligibilityRepository
{
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility | null> {
    const client = tx ?? this.db;
    return client.couponCustomerEligibility.findUnique({
      where: { id },
      include: { customer: true },
    });
  }

  public async findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility[]> {
    const client = tx ?? this.db;
    return client.couponCustomerEligibility.findMany({
      where: { couponId },
      include: { customer: true },
    });
  }

  public async findByCustomer(customerId: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility[]> {
    const client = tx ?? this.db;
    return client.couponCustomerEligibility.findMany({
      where: { customerId },
      include: { coupon: true },
    });
  }

  public async exists(couponId: string, customerId: string, tx?: PrismaTransaction): Promise<boolean> {
    const client = tx ?? this.db;
    const count = await client.couponCustomerEligibility.count({
      where: { couponId, customerId },
    });
    return count > 0;
  }

  public async create(
    data: CreateCouponCustomerEligibilityData,
    tx?: PrismaTransaction,
  ): Promise<CouponCustomerEligibility> {
    const client = tx ?? this.db;
    return client.couponCustomerEligibility.create({
      data: {
        couponId: data.couponId,
        customerId: data.customerId,
      },
    });
  }

  public async createMany(data: CreateCouponCustomerEligibilityData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponCustomerEligibility.createMany({
      data,
      skipDuplicates: true,
    });
    return res.count;
  }

  public async delete(
    couponId: string,
    customerId: string,
    tx?: PrismaTransaction,
  ): Promise<CouponCustomerEligibility | null> {
    const client = tx ?? this.db;
    try {
      return await client.couponCustomerEligibility.delete({
        where: {
          couponId_customerId: { couponId, customerId },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  public async deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.couponCustomerEligibility.deleteMany({
      where: { couponId },
    });
    return res.count;
  }
}
