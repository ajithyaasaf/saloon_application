import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MarketingCampaignStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  CreateMarketingCampaignData,
  IncrementCampaignMetricsData,
  SearchMarketingCampaignQueryDto,
  UpdateMarketingCampaignData,
} from '../dto/marketing-campaign.dto';
import { MarketingCampaignEntity } from '../entities/marketing-campaign.entity';
import {
  MarketingCampaignCancelledEvent,
  MarketingCampaignCompletedEvent,
  MarketingCampaignCreatedEvent,
  MarketingCampaignScheduledEvent,
  MarketingCampaignStartedEvent,
} from '../events/promotions.events';
import { CouponRepository } from '../repositories/coupon.repository';
import { MarketingCampaignRepository } from '../repositories/marketing-campaign.repository';

@Injectable()
export class MarketingCampaignService {
  private readonly logger = new Logger(MarketingCampaignService.name);

  constructor(
    private readonly campaignRepo: MarketingCampaignRepository,
    private readonly couponRepo: CouponRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createCampaign(
    data: CreateMarketingCampaignData,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    const campaignCode = data.campaignCode.toUpperCase().trim();

    const existing = await this.campaignRepo.findByCode(campaignCode, data.salonId);
    if (existing) {
      throw new ConflictException(`Campaign with code "${campaignCode}" already exists.`);
    }

    if (data.couponId) {
      const coupon = await this.couponRepo.findById(data.couponId, data.salonId);
      if (!coupon) {
        throw new NotFoundException(`Associated coupon with id ${data.couponId} not found.`);
      }
    }

    if (data.scheduledStartAt && data.scheduledEndAt && data.scheduledStartAt >= data.scheduledEndAt) {
      throw new BadRequestException('Campaign scheduledStartAt must be strictly before scheduledEndAt.');
    }

    const created = await this.campaignRepo.create({
      ...data,
      campaignCode,
    });

    const entity = new MarketingCampaignEntity(created);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_CREATED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: {
        campaignCode: entity.campaignCode,
        name: entity.name,
        campaignType: entity.campaignType,
        budgetLimit: entity.budgetLimit,
      },
    });

    await this.eventBus.publish(
      new MarketingCampaignCreatedEvent(
        {
          campaignId: entity.id,
          campaignCode: entity.campaignCode,
          salonId: entity.salonId,
          name: entity.name,
          couponId: entity.couponId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async updateCampaign(
    id: string,
    data: UpdateMarketingCampaignData,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    const existing = await this.campaignRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Campaign with id ${id} not found.`);
    }

    if (data.couponId) {
      const coupon = await this.couponRepo.findById(data.couponId, salonId);
      if (!coupon) {
        throw new NotFoundException(`Associated coupon with id ${data.couponId} not found.`);
      }
    }

    const updated = await this.campaignRepo.update(id, data, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_UPDATED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { ...data },
      entityVersion: entity.version,
    });

    return entity;
  }

  public async scheduleCampaign(
    id: string,
    startAt: Date,
    endAt: Date,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    if (startAt >= endAt) {
      throw new BadRequestException('Schedule start date must be before end date.');
    }

    const updated = await this.campaignRepo.schedule(id, startAt, endAt, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_SCHEDULED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: {
        status: MarketingCampaignStatus.SCHEDULED,
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
      },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new MarketingCampaignScheduledEvent(
        {
          campaignId: entity.id,
          salonId: entity.salonId,
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async startCampaign(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    const updated = await this.campaignRepo.start(id, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_STARTED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { status: MarketingCampaignStatus.RUNNING },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new MarketingCampaignStartedEvent(
        {
          campaignId: entity.id,
          salonId: entity.salonId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async completeCampaign(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    const updated = await this.campaignRepo.complete(id, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_COMPLETED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { status: MarketingCampaignStatus.COMPLETED },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new MarketingCampaignCompletedEvent(
        {
          campaignId: entity.id,
          salonId: entity.salonId,
          impressionsCount: entity.impressionsCount,
          clicksCount: entity.clicksCount,
          bookingsCount: entity.bookingsCount,
          revenueGenerated: entity.revenueGenerated,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async cancelCampaign(
    id: string,
    salonId?: string,
    reason?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<MarketingCampaignEntity> {
    const updated = await this.campaignRepo.cancel(id, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'MARKETING_CAMPAIGN_CANCELLED',
      entityType: 'MarketingCampaign',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { status: MarketingCampaignStatus.CANCELLED, reason },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new MarketingCampaignCancelledEvent(
        {
          campaignId: entity.id,
          salonId: entity.salonId,
          reason,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async recordMetrics(
    id: string,
    metrics: IncrementCampaignMetricsData,
    expectedVersion?: number,
  ): Promise<MarketingCampaignEntity> {
    const updated = await this.campaignRepo.incrementMetrics(id, metrics, expectedVersion);
    const entity = new MarketingCampaignEntity(updated);

    await this.invalidateCampaignCache(entity.salonId, entity.id);
    return entity;
  }

  public async getCampaignById(id: string, salonId?: string): Promise<MarketingCampaignEntity> {
    const campaign = await this.campaignRepo.findById(id, salonId);
    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${id} not found.`);
    }
    return new MarketingCampaignEntity(campaign);
  }

  public async searchCampaigns(
    query: SearchMarketingCampaignQueryDto,
  ): Promise<{ data: MarketingCampaignEntity[]; total: number }> {
    const res = await this.campaignRepo.search(query);
    return {
      data: res.data.map((c) => new MarketingCampaignEntity(c)),
      total: res.total,
    };
  }

  private async invalidateCampaignCache(salonId: string, campaignId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`campaign:${campaignId}`),
      this.cacheService.delete(`salon:${salonId}:campaigns:active`),
    ]);
  }
}
