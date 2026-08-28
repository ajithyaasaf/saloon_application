import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';

export class MarketingCampaignResponseDto {
  id: string;
  campaignCode: string;
  salonId: string;
  name: string;
  description?: string | null;
  campaignType: MarketingCampaignType;
  couponId?: string | null;
  targetAudienceSegment?: string | null;
  channels: string[];
  budgetLimit?: number | null;
  actualSpend: number;
  status: MarketingCampaignStatus;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
  impressionsCount: number;
  clicksCount: number;
  bookingsCount: number;
  revenueGenerated: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CampaignMetricsResponseDto {
  campaignId: string;
  impressionsCount: number;
  clicksCount: number;
  bookingsCount: number;
  revenueGenerated: number;
  conversionRate: number;
}
