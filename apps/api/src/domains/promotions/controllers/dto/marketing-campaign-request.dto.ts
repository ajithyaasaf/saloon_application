import { MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMarketingCampaignRequestDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Campaign code must contain only alphanumeric characters, dashes, or underscores',
  })
  campaignCode: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(MarketingCampaignType)
  campaignType?: MarketingCampaignType = MarketingCampaignType.CUSTOM;

  @IsOptional()
  @IsUUID()
  couponId?: string;

  @IsOptional()
  @IsString()
  targetAudienceSegment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsPositive()
  @IsNumber()
  budgetLimit?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledStartAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledEndAt?: Date;
}

export class UpdateMarketingCampaignRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(MarketingCampaignType)
  campaignType?: MarketingCampaignType;

  @IsOptional()
  @IsUUID()
  couponId?: string;

  @IsOptional()
  @IsString()
  targetAudienceSegment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsPositive()
  @IsNumber()
  budgetLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualSpend?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledStartAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledEndAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class ScheduleCampaignRequestDto {
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class CancelCampaignRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class IncrementCampaignMetricsRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  impressionsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  clicksCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bookingsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueGenerated?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class MarketingCampaignSearchRequestDto {
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsString()
  campaignCode?: string;

  @IsOptional()
  @IsEnum(MarketingCampaignType)
  campaignType?: MarketingCampaignType;

  @IsOptional()
  @IsEnum(MarketingCampaignStatus)
  status?: MarketingCampaignStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
