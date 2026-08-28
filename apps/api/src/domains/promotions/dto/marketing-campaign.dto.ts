import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';

export interface CreateMarketingCampaignData {
  campaignCode: string;
  salonId: string;
  name: string;
  description?: string | null;
  campaignType?: MarketingCampaignType;
  couponId?: string | null;
  targetAudienceSegment?: string;
  channels?: string[];
  budgetLimit?: number;
  actualSpend?: number;
  status?: MarketingCampaignStatus;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
}

export interface UpdateMarketingCampaignData {
  name?: string;
  description?: string | null;
  campaignType?: MarketingCampaignType;
  couponId?: string | null;
  targetAudienceSegment?: string;
  channels?: string[];
  budgetLimit?: number;
  actualSpend?: number;
  status?: MarketingCampaignStatus;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
}

export interface SearchMarketingCampaignQueryDto {
  salonId?: string;
  campaignCode?: string;
  campaignType?: MarketingCampaignType;
  status?: MarketingCampaignStatus;
  targetAudienceSegment?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'scheduledStartAt' | 'budgetLimit' | 'revenueGenerated';
  sortOrder?: 'asc' | 'desc';
}

export interface IncrementCampaignMetricsData {
  impressionsCount?: number;
  clicksCount?: number;
  bookingsCount?: number;
  revenueGenerated?: number;
  actualSpend?: number;
}
