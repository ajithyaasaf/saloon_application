import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReferralDto {
  @ApiProperty({ description: 'Referrer Customer Profile ID' })
  @IsUUID()
  referrerCustomerProfileId: string;

  @ApiProperty({ description: 'Referred Phone Number' })
  @IsString()
  @IsNotEmpty()
  referredPhone: string;

  @ApiPropertyOptional({ description: 'Referred Email' })
  @IsOptional()
  @IsString()
  referredEmail?: string;

  @ApiPropertyOptional({ description: 'Reward Points', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rewardPoints?: number;

  @ApiPropertyOptional({ description: 'Reward Amount in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rewardAmount?: number;
}

@Exclude()
export class CustomerReferralDto {
  @Expose()
  @ApiProperty({ description: 'Referral ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Referrer Customer Profile ID' })
  referrerCustomerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Referred Phone' })
  referredPhone: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Referred Email' })
  referredEmail?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Referred Customer Profile ID' })
  referredCustomerProfileId?: string;

  @Expose()
  @ApiProperty({ description: 'Referral Status', enum: ReferralStatus })
  status: ReferralStatus;

  @Expose()
  @ApiProperty({ description: 'Reward Points' })
  rewardPoints: number;

  @Expose()
  @ApiProperty({ description: 'Reward Amount in minor units' })
  rewardAmount: number;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}

@Exclude()
export class ReferralRewardDto {
  @Expose()
  @ApiProperty({ description: 'Reward ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Referral ID' })
  customerReferralId: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Reward Type' })
  rewardType: string;

  @Expose()
  @ApiProperty({ description: 'Amount in minor units or points' })
  amount: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Claimed At Date' })
  claimedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
