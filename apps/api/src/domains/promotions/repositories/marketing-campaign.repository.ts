import { ConflictException, Injectable } from '@nestjs/common';
import {
  MarketingCampaign,
  MarketingCampaignStatus,
  MarketingCampaignType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateMarketingCampaignData,
  IncrementCampaignMetricsData,
  SearchMarketingCampaignQueryDto,
  UpdateMarketingCampaignData,
} from '../dto/marketing-campaign.dto';
import { IMarketingCampaignRepository } from './interfaces/marketing-campaign.repository.interface';

@Injectable()
export class MarketingCampaignRepository implements IMarketingCampaignRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string): Promise<MarketingCampaign | null> {
    const where: Prisma.MarketingCampaignWhereInput = { id, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return this.db.marketingCampaign.findFirst({
      where,
      include: { coupon: true },
    });
  }

  public async findByCode(
    campaignCode: string,
    salonId?: string,
  ): Promise<MarketingCampaign | null> {
    const where: Prisma.MarketingCampaignWhereInput = {
      campaignCode: campaignCode.toUpperCase().trim(),
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;

    return this.db.marketingCampaign.findFirst({
      where,
      include: { coupon: true },
    });
  }

  public async findBySalon(
    salonId: string,
    status?: MarketingCampaignStatus,
  ): Promise<MarketingCampaign[]> {
    const where: Prisma.MarketingCampaignWhereInput = { salonId, deletedAt: null };
    if (status) where.status = status;

    return this.db.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { coupon: true },
    });
  }

  public async findByType(
    campaignType: MarketingCampaignType,
    salonId?: string,
  ): Promise<MarketingCampaign[]> {
    const where: Prisma.MarketingCampaignWhereInput = { campaignType, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return this.db.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { coupon: true },
    });
  }

  public async findByStatus(
    status: MarketingCampaignStatus,
    salonId?: string,
  ): Promise<MarketingCampaign[]> {
    const where: Prisma.MarketingCampaignWhereInput = { status, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return this.db.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findScheduled(checkDate = new Date()): Promise<MarketingCampaign[]> {
    return this.db.marketingCampaign.findMany({
      where: {
        status: MarketingCampaignStatus.SCHEDULED,
        scheduledStartAt: { lte: checkDate },
        deletedAt: null,
      },
      orderBy: { scheduledStartAt: 'asc' },
    });
  }

  public async findRunning(salonId?: string): Promise<MarketingCampaign[]> {
    const where: Prisma.MarketingCampaignWhereInput = {
      status: MarketingCampaignStatus.RUNNING,
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;

    return this.db.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { coupon: true },
    });
  }

  public async search(
    query: SearchMarketingCampaignQueryDto,
  ): Promise<{ data: MarketingCampaign[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MarketingCampaignWhereInput = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.campaignCode) {
      where.campaignCode = { contains: query.campaignCode.toUpperCase(), mode: 'insensitive' };
    }
    if (query.campaignType) where.campaignType = query.campaignType;
    if (query.status) where.status = query.status;
    if (query.targetAudienceSegment) {
      where.targetAudienceSegment = query.targetAudienceSegment;
    }

    const orderByField = query.sortBy ?? 'createdAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.db.marketingCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: { coupon: true },
      }),
      this.db.marketingCampaign.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId?: string, status?: MarketingCampaignStatus): Promise<number> {
    const where: Prisma.MarketingCampaignWhereInput = { deletedAt: null };
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return this.db.marketingCampaign.count({ where });
  }

  public async create(data: CreateMarketingCampaignData): Promise<MarketingCampaign> {
    return this.db.marketingCampaign.create({
      data: {
        campaignCode: data.campaignCode.toUpperCase().trim(),
        salonId: data.salonId,
        name: data.name,
        description: data.description ?? null,
        campaignType: data.campaignType ?? MarketingCampaignType.SEASONAL,
        couponId: data.couponId ?? null,
        targetAudienceSegment: data.targetAudienceSegment ?? 'ALL',
        channels: data.channels ?? [],
        budgetLimit: data.budgetLimit ?? 0,
        actualSpend: data.actualSpend ?? 0,
        status: data.status ?? MarketingCampaignStatus.DRAFT,
        scheduledStartAt: data.scheduledStartAt ?? null,
        scheduledEndAt: data.scheduledEndAt ?? null,
      },
      include: { coupon: true },
    });
  }

  public async update(
    id: string,
    data: UpdateMarketingCampaignData,
    expectedVersion?: number,
  ): Promise<MarketingCampaign> {
    const updateData: Prisma.MarketingCampaignUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.campaignType !== undefined && { campaignType: data.campaignType }),
      ...(data.couponId !== undefined && {
        coupon: data.couponId ? { connect: { id: data.couponId } } : { disconnect: true },
      }),
      ...(data.targetAudienceSegment !== undefined && {
        targetAudienceSegment: data.targetAudienceSegment,
      }),
      ...(data.channels !== undefined && { channels: data.channels }),
      ...(data.budgetLimit !== undefined && { budgetLimit: data.budgetLimit }),
      ...(data.actualSpend !== undefined && { actualSpend: data.actualSpend }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.scheduledStartAt !== undefined && { scheduledStartAt: data.scheduledStartAt }),
      ...(data.scheduledEndAt !== undefined && { scheduledEndAt: data.scheduledEndAt }),
      version: { increment: 1 },
    };

    try {
      const where: Prisma.MarketingCampaignWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await this.db.marketingCampaign.update({
        where,
        data: updateData,
        include: { coupon: true },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: MarketingCampaign with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async updateStatus(
    id: string,
    status: MarketingCampaignStatus,
    expectedVersion?: number,
  ): Promise<MarketingCampaign> {
    return this.update(id, { status }, expectedVersion);
  }

  public async schedule(
    id: string,
    startAt: Date,
    endAt: Date,
    expectedVersion?: number,
  ): Promise<MarketingCampaign> {
    return this.update(
      id,
      {
        status: MarketingCampaignStatus.SCHEDULED,
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
      },
      expectedVersion,
    );
  }

  public async start(id: string, expectedVersion?: number): Promise<MarketingCampaign> {
    return this.update(id, { status: MarketingCampaignStatus.RUNNING }, expectedVersion);
  }

  public async complete(id: string, expectedVersion?: number): Promise<MarketingCampaign> {
    return this.update(id, { status: MarketingCampaignStatus.COMPLETED }, expectedVersion);
  }

  public async cancel(id: string, expectedVersion?: number): Promise<MarketingCampaign> {
    return this.update(id, { status: MarketingCampaignStatus.CANCELLED }, expectedVersion);
  }

  public async archive(id: string, expectedVersion?: number): Promise<MarketingCampaign> {
    return this.update(id, { status: MarketingCampaignStatus.ARCHIVED }, expectedVersion);
  }

  public async incrementMetrics(
    id: string,
    metrics: IncrementCampaignMetricsData,
    expectedVersion?: number,
  ): Promise<MarketingCampaign> {
    try {
      const where: Prisma.MarketingCampaignWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await this.db.marketingCampaign.update({
        where,
        data: {
          ...(metrics.impressionsCount && {
            impressionsCount: { increment: metrics.impressionsCount },
          }),
          ...(metrics.clicksCount && { clicksCount: { increment: metrics.clicksCount } }),
          ...(metrics.bookingsCount && { bookingsCount: { increment: metrics.bookingsCount } }),
          ...(metrics.revenueGenerated && {
            revenueGenerated: { increment: metrics.revenueGenerated },
          }),
          ...(metrics.actualSpend && { actualSpend: { increment: metrics.actualSpend } }),
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: MarketingCampaign with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async softDelete(id: string, salonId?: string): Promise<MarketingCampaign> {
    const where: Prisma.MarketingCampaignWhereInput = { id };
    if (salonId) where.salonId = salonId;

    const existing = await this.db.marketingCampaign.findFirst({ where });
    if (!existing) {
      throw new ConflictException(`MarketingCampaign with id ${id} not found.`);
    }

    return this.db.marketingCampaign.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: MarketingCampaignStatus.ARCHIVED,
        version: { increment: 1 },
      },
    });
  }
}
