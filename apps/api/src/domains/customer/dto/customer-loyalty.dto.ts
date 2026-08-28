import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTransactionType } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CustomerLoyaltyDto {
  @Expose()
  @ApiProperty({ description: 'Loyalty Account ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Active Points Balance' })
  pointsBalance: number;

  @Expose()
  @ApiProperty({ description: 'Lifetime Points Earned' })
  lifetimePointsEarned: number;

  @Expose()
  @ApiProperty({ description: 'Current Loyalty Tier' })
  currentTier: string;

  @Expose()
  @ApiProperty({ description: 'Last Update Date' })
  updatedAt: Date;
}

@Exclude()
export class LoyaltyLedgerDto {
  @Expose()
  @ApiProperty({ description: 'Ledger Entry ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Transaction Type', enum: LoyaltyTransactionType })
  type: LoyaltyTransactionType;

  @Expose()
  @ApiProperty({ description: 'Points delta (+ or -)' })
  points: number;

  @Expose()
  @ApiProperty({ description: 'Previous Balance' })
  previousBalance: number;

  @Expose()
  @ApiProperty({ description: 'New Balance' })
  newBalance: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Reference Type' })
  referenceType?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Reference ID' })
  referenceId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
