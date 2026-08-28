import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { MarketingCampaignEntity } from '../../entities/marketing-campaign.entity';
import { MarketingCampaignService } from '../../services/marketing-campaign.service';
import { MarketingCampaignOwnerController } from '../marketing-campaign-owner.controller';

describe('MarketingCampaignOwnerController', () => {
  let controller: MarketingCampaignOwnerController;
  let campaignService: jest.Mocked<MarketingCampaignService>;

  const mockOwnerUser = { id: 'owner-1', salonId: 'sal-1', roles: ['SALON_OWNER'] };

  const mockCampaign = new MarketingCampaignEntity({
    id: 'cmp-1',
    campaignCode: 'SPRING_BLAST',
    salonId: 'sal-1',
    name: 'Spring Blast',
    campaignType: MarketingCampaignType.SEASONAL,
    channels: ['SMS', 'EMAIL'],
    budgetLimit: 50000,
    actualSpend: 10000,
    status: MarketingCampaignStatus.DRAFT,
    impressionsCount: 200,
    clicksCount: 50,
    bookingsCount: 10,
    revenueGenerated: 25000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockService = {
      createCampaign: jest.fn().mockResolvedValue(mockCampaign),
      searchCampaigns: jest.fn().mockResolvedValue({ data: [mockCampaign], total: 1 }),
      getCampaignById: jest.fn().mockResolvedValue(mockCampaign),
      updateCampaign: jest.fn().mockResolvedValue({ ...mockCampaign, name: 'Updated Campaign' }),
      scheduleCampaign: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.SCHEDULED }),
      startCampaign: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.RUNNING }),
      completeCampaign: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.COMPLETED }),
      cancelCampaign: jest.fn().mockResolvedValue({ ...mockCampaign, status: MarketingCampaignStatus.CANCELLED }),
      recordMetrics: jest.fn().mockResolvedValue({
        ...mockCampaign,
        clicksCount: 60,
        bookingsCount: 15,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingCampaignOwnerController],
      providers: [{ provide: MarketingCampaignService, useValue: mockService }],
    }).compile();

    controller = module.get<MarketingCampaignOwnerController>(MarketingCampaignOwnerController);
    campaignService = module.get(MarketingCampaignService);
  });

  it('should create campaign with authenticated salonId', async () => {
    const res = await controller.createCampaign(mockOwnerUser, {
      campaignCode: 'SPRING_BLAST',
      name: 'Spring Blast',
    });

    expect(res.data.id).toBe('cmp-1');
    expect(campaignService.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1' }),
      'owner-1',
    );
  });

  it('should schedule and start campaign', async () => {
    const schedule = await controller.scheduleCampaign(mockOwnerUser, 'cmp-1', {
      startAt: new Date('2026-06-01'),
      endAt: new Date('2026-06-30'),
    });
    expect(schedule.data.status).toBe(MarketingCampaignStatus.SCHEDULED);

    const start = await controller.startCampaign(mockOwnerUser, 'cmp-1', 1);
    expect(start.data.status).toBe(MarketingCampaignStatus.RUNNING);
  });

  it('should record metrics and compute conversion rate', async () => {
    const res = await controller.recordMetrics(mockOwnerUser, 'cmp-1', {
      clicksCount: 10,
      bookingsCount: 5,
    });

    expect(res.data.campaignId).toBe('cmp-1');
    expect(res.data.conversionRate).toBe(25); // (15 / 60) * 100 = 25%
  });
});
