import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { MarketingCampaignEntity } from '../entities/marketing-campaign.entity';
import { CouponRepository } from '../repositories/coupon.repository';
import { MarketingCampaignRepository } from '../repositories/marketing-campaign.repository';
import { MarketingCampaignService } from '../services/marketing-campaign.service';

describe('MarketingCampaignService', () => {
  let service: MarketingCampaignService;
  let campaignRepo: jest.Mocked<MarketingCampaignRepository>;
  let couponRepo: jest.Mocked<CouponRepository>;
  let auditService: jest.Mocked<AuditService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockCampaign: any = {
    id: 'cmp-1',
    campaignCode: 'SUMMER_BLAST',
    salonId: 'sal-1',
    name: 'Summer Blast',
    description: 'Summer season discounts',
    campaignType: MarketingCampaignType.SEASONAL,
    couponId: 'cpn-1',
    targetAudienceSegment: 'ALL',
    channels: ['SMS'],
    budgetLimit: 20000,
    actualSpend: 5000,
    status: MarketingCampaignStatus.DRAFT,
    scheduledStartAt: null,
    scheduledEndAt: null,
    impressionsCount: 100,
    clicksCount: 20,
    bookingsCount: 5,
    revenueGenerated: 10000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockCampaignRepo = {
      findByCode: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockCampaign),
      create: jest.fn().mockResolvedValue(mockCampaign),
      update: jest.fn().mockResolvedValue({ ...mockCampaign, name: 'Updated Campaign' }),
      schedule: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.SCHEDULED }),
      start: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.RUNNING }),
      complete: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.COMPLETED }),
      cancel: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.CANCELLED }),
      incrementMetrics: jest.fn().mockResolvedValue({
        ...mockCampaign,
        clicksCount: 25,
        revenueGenerated: 12000,
      }),
      search: jest.fn().mockResolvedValue({ data: [mockCampaign], total: 1 }),
    };

    const mockCouponRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'cpn-1', salonId: 'sal-1' }),
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };
    const mockEvent = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCampaignService,
        { provide: MarketingCampaignRepository, useValue: mockCampaignRepo },
        { provide: CouponRepository, useValue: mockCouponRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
        { provide: EventBusService, useValue: mockEvent },
      ],
    }).compile();

    service = module.get(MarketingCampaignService);
    campaignRepo = module.get(MarketingCampaignRepository);
    couponRepo = module.get(CouponRepository);
    auditService = module.get(AuditService);
    cacheService = module.get(CacheService);
    eventBus = module.get(EventBusService);
  });

  it('should create campaign, validate coupon existence, and emit event', async () => {
    const res = await service.createCampaign({
      campaignCode: 'summer_blast',
      salonId: 'sal-1',
      name: 'Summer Blast',
      couponId: 'cpn-1',
    });

    expect(res).toBeInstanceOf(MarketingCampaignEntity);
    expect(res.campaignCode).toBe('SUMMER_BLAST');
    expect(campaignRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should schedule campaign with start and end dates', async () => {
    const startAt = new Date('2026-06-01');
    const endAt = new Date('2026-06-30');

    const res = await service.scheduleCampaign('cmp-1', startAt, endAt, 'sal-1', 1);
    expect(res.status).toBe(MarketingCampaignStatus.SCHEDULED);
    expect(campaignRepo.schedule).toHaveBeenCalledWith('cmp-1', startAt, endAt, 1);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should start and complete campaign', async () => {
    const started = await service.startCampaign('cmp-1', 'sal-1', 1);
    expect(started.status).toBe(MarketingCampaignStatus.RUNNING);

    const completed = await service.completeCampaign('cmp-1', 'sal-1', 1);
    expect(completed.status).toBe(MarketingCampaignStatus.COMPLETED);
  });

  it('should cancel campaign and emit event', async () => {
    const cancelled = await service.cancelCampaign('cmp-1', 'sal-1', 'Budget exhausted', 1);
    expect(cancelled.status).toBe(MarketingCampaignStatus.CANCELLED);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should record metrics safely and invalidate cache', async () => {
    const res = await service.recordMetrics('cmp-1', { clicksCount: 5, revenueGenerated: 2000 }, 1);
    expect(res.clicksCount).toBe(25);
    expect(campaignRepo.incrementMetrics).toHaveBeenCalledWith(
      'cmp-1',
      { clicksCount: 5, revenueGenerated: 2000 },
      1,
    );
    expect(cacheService.delete).toHaveBeenCalled();
  });
});
