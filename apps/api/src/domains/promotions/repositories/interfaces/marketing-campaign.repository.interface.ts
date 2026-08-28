import { MarketingCampaign, MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import {
  CreateMarketingCampaignData,
  IncrementCampaignMetricsData,
  SearchMarketingCampaignQueryDto,
  UpdateMarketingCampaignData,
} from '../../dto/marketing-campaign.dto';

export interface IMarketingCampaignRepository {
  findById(id: string, salonId?: string): Promise<MarketingCampaign | null>;
  findByCode(campaignCode: string, salonId?: string): Promise<MarketingCampaign | null>;
  findBySalon(salonId: string, status?: MarketingCampaignStatus): Promise<MarketingCampaign[]>;
  findByType(campaignType: MarketingCampaignType, salonId?: string): Promise<MarketingCampaign[]>;
  findByStatus(status: MarketingCampaignStatus, salonId?: string): Promise<MarketingCampaign[]>;
  findScheduled(checkDate?: Date): Promise<MarketingCampaign[]>;
  findRunning(salonId?: string): Promise<MarketingCampaign[]>;
  search(query: SearchMarketingCampaignQueryDto): Promise<{ data: MarketingCampaign[]; total: number }>;
  count(salonId?: string, status?: MarketingCampaignStatus): Promise<number>;
  create(data: CreateMarketingCampaignData): Promise<MarketingCampaign>;
  update(id: string, data: UpdateMarketingCampaignData, expectedVersion?: number): Promise<MarketingCampaign>;
  updateStatus(id: string, status: MarketingCampaignStatus, expectedVersion?: number): Promise<MarketingCampaign>;
  schedule(id: string, startAt: Date, endAt: Date, expectedVersion?: number): Promise<MarketingCampaign>;
  start(id: string, expectedVersion?: number): Promise<MarketingCampaign>;
  complete(id: string, expectedVersion?: number): Promise<MarketingCampaign>;
  cancel(id: string, expectedVersion?: number): Promise<MarketingCampaign>;
  archive(id: string, expectedVersion?: number): Promise<MarketingCampaign>;
  incrementMetrics(id: string, metrics: IncrementCampaignMetricsData, expectedVersion?: number): Promise<MarketingCampaign>;
  softDelete(id: string, salonId?: string): Promise<MarketingCampaign>;
}
