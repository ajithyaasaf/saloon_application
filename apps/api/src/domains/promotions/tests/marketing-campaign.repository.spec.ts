import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MarketingCampaignRepository } from '../repositories/marketing-campaign.repository';

describe('MarketingCampaignRepository', () => {
  let campaignRepo: MarketingCampaignRepository;
  let mockPrisma: any;

  const mockCampaign = {
    id: 'cmp-1',
    campaignCode: 'DIWALI2026',
    salonId: 'sal-1',
    name: 'Diwali Festival Grand Campaign',
    description: 'Festive festive beauty makeover',
    campaignType: MarketingCampaignType.FESTIVAL_SPECIAL,
    couponId: 'cpn-1',
    targetAudienceSegment: 'VIP',
    channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    budgetLimit: 50000,
    actualSpend: 12000,
    status: MarketingCampaignStatus.RUNNING,
    scheduledStartAt: new Date('2026-10-20T00:00:00Z'),
    scheduledEndAt: new Date('2026-11-05T23:59:59Z'),
    impressionsCount: 15000,
    clicksCount: 3200,
    bookingsCount: 450,
    revenueGenerated: 675000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      marketingCampaign: {
        findFirst: jest.fn().mockResolvedValue(mockCampaign),
        findMany: jest.fn().mockResolvedValue([mockCampaign]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockCampaign),
        update: jest.fn().mockResolvedValue({ ...mockCampaign, version: 2 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCampaignRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    campaignRepo = module.get<MarketingCampaignRepository>(MarketingCampaignRepository);
  });

  it('should find campaign by code with salon isolation', async () => {
    const res = await campaignRepo.findByCode('DIWALI2026', 'sal-1');
    expect(res).toEqual(mockCampaign);
    expect(mockPrisma.marketingCampaign.findFirst).toHaveBeenCalledWith({
      where: { campaignCode: 'DIWALI2026', salonId: 'sal-1', deletedAt: null },
      include: expect.any(Object),
    });
  });

  it('should find scheduled campaigns ready to launch', async () => {
    const checkDate = new Date('2026-10-20T10:00:00Z');
    await campaignRepo.findScheduled(checkDate);
    expect(mockPrisma.marketingCampaign.findMany).toHaveBeenCalledWith({
      where: {
        status: MarketingCampaignStatus.SCHEDULED,
        scheduledStartAt: { lte: checkDate },
        deletedAt: null,
      },
      orderBy: { scheduledStartAt: 'asc' },
    });
  });

  it('should increment metrics safely with optimistic concurrency', async () => {
    await campaignRepo.incrementMetrics(
      'cmp-1',
      {
        impressionsCount: 100,
        clicksCount: 20,
        bookingsCount: 2,
        revenueGenerated: 3000,
      },
      1,
    );

    expect(mockPrisma.marketingCampaign.update).toHaveBeenCalledWith({
      where: { id: 'cmp-1', version: 1 },
      data: {
        impressionsCount: { increment: 100 },
        clicksCount: { increment: 20 },
        bookingsCount: { increment: 2 },
        revenueGenerated: { increment: 3000 },
        version: { increment: 1 },
      },
    });
  });

  it('should throw ConflictException when optimistic concurrency fails on incrementMetrics', async () => {
    mockPrisma.marketingCampaign.update.mockRejectedValueOnce({ code: 'P2025' });
    await expect(
      campaignRepo.incrementMetrics('cmp-1', { clicksCount: 1 }, 1),
    ).rejects.toThrow(ConflictException);
  });

  it('should complete campaign', async () => {
    await campaignRepo.complete('cmp-1', 1);
    expect(mockPrisma.marketingCampaign.update).toHaveBeenCalledWith({
      where: { id: 'cmp-1', version: 1 },
      data: expect.objectContaining({
        status: MarketingCampaignStatus.COMPLETED,
        version: { increment: 1 },
      }),
      include: expect.any(Object),
    });
  });

  it('should soft delete campaign', async () => {
    await campaignRepo.softDelete('cmp-1', 'sal-1');
    expect(mockPrisma.marketingCampaign.update).toHaveBeenCalledWith({
      where: { id: 'cmp-1' },
      data: expect.objectContaining({
        status: MarketingCampaignStatus.ARCHIVED,
        deletedAt: expect.any(Date),
      }),
    });
  });
});
