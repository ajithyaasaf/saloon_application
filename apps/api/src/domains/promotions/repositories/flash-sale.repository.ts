import { ConflictException, Injectable } from '@nestjs/common';
import { FlashSale, FlashSaleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateFlashSaleData,
  SearchFlashSaleQueryDto,
  UpdateFlashSaleData,
} from '../dto/flash-sale.dto';
import { IFlashSaleRepository } from './interfaces/flash-sale.repository.interface';

@Injectable()
export class FlashSaleRepository implements IFlashSaleRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string): Promise<FlashSale | null> {
    const where: Prisma.FlashSaleWhereInput = { id, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return this.db.flashSale.findFirst({
      where,
      include: {
        service: true,
        branch: true,
      },
    });
  }

  public async findBySalon(salonId: string, status?: FlashSaleStatus): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = { salonId, deletedAt: null };
    if (status) where.status = status;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        service: true,
        branch: true,
      },
    });
  }

  public async findByBranch(branchId: string, status?: FlashSaleStatus): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = { branchId, deletedAt: null };
    if (status) where.status = status;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        service: true,
      },
    });
  }

  public async findByService(serviceId: string, branchId?: string): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = { serviceId, deletedAt: null };
    if (branchId) where.branchId = branchId;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  public async findByStatus(status: FlashSaleStatus, salonId?: string): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = { status, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  public async findActive(salonId?: string, branchId?: string): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = {
      status: FlashSaleStatus.ACTIVE,
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;
    if (branchId) where.branchId = branchId;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { service: true },
    });
  }

  public async findScheduled(salonId?: string, branchId?: string): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = {
      status: FlashSaleStatus.SCHEDULED,
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;
    if (branchId) where.branchId = branchId;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { service: true },
    });
  }

  public async findCurrentlyActive(
    branchId?: string,
    checkTime = new Date(),
  ): Promise<FlashSale[]> {
    const where: Prisma.FlashSaleWhereInput = {
      status: FlashSaleStatus.ACTIVE,
      startTime: { lte: checkTime },
      endTime: { gte: checkTime },
      deletedAt: null,
    };
    if (branchId) where.branchId = branchId;

    return this.db.flashSale.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { service: true, branch: true },
    });
  }

  public async search(
    query: SearchFlashSaleQueryDto,
  ): Promise<{ data: FlashSale[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FlashSaleWhereInput = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.status) where.status = query.status;
    if (query.isActiveNow) {
      const now = new Date();
      where.status = FlashSaleStatus.ACTIVE;
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    }

    const orderByField = query.sortBy ?? 'startTime';
    const orderDirection = query.sortOrder ?? 'asc';

    const [data, total] = await Promise.all([
      this.db.flashSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          service: true,
          branch: true,
        },
      }),
      this.db.flashSale.count({ where }),
    ]);

    return { data, total };
  }

  public async count(
    salonId?: string,
    branchId?: string,
    status?: FlashSaleStatus,
  ): Promise<number> {
    const where: Prisma.FlashSaleWhereInput = { deletedAt: null };
    if (salonId) where.salonId = salonId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    return this.db.flashSale.count({ where });
  }

  public async create(data: CreateFlashSaleData): Promise<FlashSale> {
    return this.db.flashSale.create({
      data: {
        salonId: data.salonId,
        branchId: data.branchId,
        serviceId: data.serviceId,
        title: data.title,
        discountPercentage: new Prisma.Decimal(data.discountPercentage),
        specialPrice: data.specialPrice,
        startTime: data.startTime,
        endTime: data.endTime,
        maxSlotQuota: data.maxSlotQuota,
        bookedSlotCount: data.bookedSlotCount ?? 0,
        status: data.status ?? FlashSaleStatus.SCHEDULED,
      },
      include: {
        service: true,
        branch: true,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateFlashSaleData,
    expectedVersion?: number,
  ): Promise<FlashSale> {
    const updateData: Prisma.FlashSaleUpdateInput = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.discountPercentage !== undefined && {
        discountPercentage: new Prisma.Decimal(data.discountPercentage),
      }),
      ...(data.specialPrice !== undefined && { specialPrice: data.specialPrice }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.maxSlotQuota !== undefined && { maxSlotQuota: data.maxSlotQuota }),
      ...(data.status !== undefined && { status: data.status }),
      version: { increment: 1 },
    };

    try {
      const where: Prisma.FlashSaleWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await this.db.flashSale.update({
        where,
        data: updateData,
        include: { service: true, branch: true },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: FlashSale with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async updateStatus(
    id: string,
    status: FlashSaleStatus,
    expectedVersion?: number,
  ): Promise<FlashSale> {
    return this.update(id, { status }, expectedVersion);
  }

  public async incrementBookedSlot(id: string, expectedVersion?: number): Promise<FlashSale> {
    try {
      const where: Prisma.FlashSaleWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await this.db.flashSale.update({
        where,
        data: {
          bookedSlotCount: { increment: 1 },
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: FlashSale with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async decrementBookedSlot(id: string, expectedVersion?: number): Promise<FlashSale> {
    try {
      const where: Prisma.FlashSaleWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await this.db.flashSale.update({
        where,
        data: {
          bookedSlotCount: { decrement: 1 },
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: FlashSale with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async end(id: string, expectedVersion?: number): Promise<FlashSale> {
    return this.update(id, { status: FlashSaleStatus.ENDED }, expectedVersion);
  }

  public async cancel(id: string, expectedVersion?: number): Promise<FlashSale> {
    return this.update(id, { status: FlashSaleStatus.CANCELLED }, expectedVersion);
  }

  public async softDelete(id: string, salonId?: string): Promise<FlashSale> {
    const where: Prisma.FlashSaleWhereInput = { id };
    if (salonId) where.salonId = salonId;

    const existing = await this.db.flashSale.findFirst({ where });
    if (!existing) {
      throw new ConflictException(`FlashSale with id ${id} not found.`);
    }

    return this.db.flashSale.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: FlashSaleStatus.CANCELLED,
        version: { increment: 1 },
      },
    });
  }
}
