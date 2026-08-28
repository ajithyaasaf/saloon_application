import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateCustomerMembershipDto {
  @ApiProperty({ description: 'Customer Profile ID' })
  @IsUUID()
  customerProfileId: string;

  @ApiProperty({ description: 'Membership Plan ID' })
  @IsUUID()
  membershipPlanId: string;

  @ApiProperty({ description: 'Start Date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End Date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Price Paid in minor units' })
  @IsInt()
  @Min(0)
  pricePaid: number;

  @ApiPropertyOptional({ description: 'Discount Percentage', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Auto Renew', default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class UpdateCustomerMembershipDto {
  @ApiProperty({ description: 'Expected version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'Membership Status', enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'End Date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Auto Renew' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

@Exclude()
export class CustomerMembershipDto {
  @Expose()
  @ApiProperty({ description: 'Subscription ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Membership Plan ID' })
  membershipPlanId: string;

  @Expose()
  @ApiProperty({ description: 'Membership Status', enum: MembershipStatus })
  status: MembershipStatus;

  @Expose()
  @ApiProperty({ description: 'Start Date' })
  startDate: Date;

  @Expose()
  @ApiProperty({ description: 'End Date' })
  endDate: Date;

  @Expose()
  @ApiProperty({ description: 'Price Paid in minor units' })
  pricePaid: number;

  @Expose()
  @ApiProperty({ description: 'Discount Percentage' })
  discountPercentage: number;

  @Expose()
  @ApiProperty({ description: 'Auto Renew' })
  autoRenew: boolean;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
