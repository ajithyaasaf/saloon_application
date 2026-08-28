import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';

export class MarketingCampaignEntity {
  id: string;
  campaignCode: string;
  salonId: string;
  name: string;
  description?: string | null;
  campaignType: MarketingCampaignType;
  couponId?: string | null;
  targetAudienceSegment: string;
  channels: string[];
  budgetLimit: number;
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
  deletedAt?: Date | null;

  constructor(partial: Partial<MarketingCampaignEntity>) {
    Object.assign(this, partial);
  }

  public isRunning(): boolean {
    return this.status === MarketingCampaignStatus.RUNNING && !this.deletedAt;
  }

  public hasRemainingBudget(): boolean {
    if (this.budgetLimit <= 0) return true;
    return this.actualSpend < this.budgetLimit;
  }

  public canStart(checkDate = new Date()): boolean {
    if (this.status !== MarketingCampaignStatus.SCHEDULED && this.status !== MarketingCampaignStatus.DRAFT) {
      return false;
    }
    if (this.deletedAt) return false;
    if (this.scheduledStartAt && checkDate < this.scheduledStartAt) return false;
    return true;
  }
}
