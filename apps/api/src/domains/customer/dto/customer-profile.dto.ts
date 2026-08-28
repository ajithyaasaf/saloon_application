import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlacklistType, CustomerStatus, Gender } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationMeta } from '../../../common/types/pagination.type';

export class CreateCustomerProfileDto {
  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Primary Branch ID' })
  @IsUUID()
  primaryBranchId: string;

  @ApiPropertyOptional({ description: 'Associated User ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'First Name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'Last Name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Birth Date' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Anniversary Date' })
  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;

  @ApiPropertyOptional({ description: 'Is Blacklisted', default: false })
  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ description: 'Blacklist Type', enum: BlacklistType })
  @IsOptional()
  @IsEnum(BlacklistType)
  blacklistType?: BlacklistType;

  @ApiPropertyOptional({ description: 'Blacklist Reason' })
  @IsOptional()
  @IsString()
  blacklistReason?: string;
}

export class UpdateCustomerProfileDto {
  @ApiProperty({ description: 'Expected aggregate version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'First Name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last Name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Birth Date' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Anniversary Date' })
  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;

  @ApiPropertyOptional({ description: 'Customer Status', enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ description: 'Is Blacklisted' })
  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ description: 'Blacklist Type', enum: BlacklistType })
  @IsOptional()
  @IsEnum(BlacklistType)
  blacklistType?: BlacklistType;

  @ApiPropertyOptional({ description: 'Blacklist Reason' })
  @IsOptional()
  @IsString()
  blacklistReason?: string;

  @ApiPropertyOptional({ description: 'Primary Branch ID' })
  @IsOptional()
  @IsUUID()
  primaryBranchId?: string;
}

@Exclude()
export class CustomerSummaryDto {
  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Unique Customer Code' })
  customerCode: string;

  @Expose()
  @ApiProperty({ description: 'First Name' })
  firstName: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Last Name' })
  lastName?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string;

  @Expose()
  @ApiProperty({ description: 'Phone' })
  phone: string;

  @Expose()
  @ApiProperty({ description: 'Customer Status', enum: CustomerStatus })
  status: CustomerStatus;

  @Expose()
  @ApiProperty({ description: 'Lifetime spend in minor units' })
  lifetimeSpend: number;

  @Expose()
  @ApiProperty({ description: 'Total visits count' })
  totalVisits: number;

  @Expose()
  @ApiProperty({ description: 'Is Blacklisted' })
  isBlacklisted: boolean;
}

@Exclude()
export class CustomerProfileDto {
  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Unique Customer Code' })
  customerCode: string;

  @Expose()
  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @Expose()
  @ApiProperty({ description: 'Salon ID' })
  salonId: string;

  @Expose()
  @ApiProperty({ description: 'Primary Branch ID' })
  primaryBranchId: string;

  @Expose()
  @ApiProperty({ description: 'First Name' })
  firstName: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Last Name' })
  lastName?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @Expose()
  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  gender?: Gender;

  @Expose()
  @ApiPropertyOptional({ description: 'Birth Date' })
  birthDate?: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Anniversary Date' })
  anniversaryDate?: Date;

  @Expose()
  @ApiProperty({ description: 'Customer Status', enum: CustomerStatus })
  status: CustomerStatus;

  @Expose()
  @ApiProperty({ description: 'Store credit wallet balance in minor units' })
  walletBalance: number;

  @Expose()
  @ApiProperty({ description: 'Lifetime spend in minor units' })
  lifetimeSpend: number;

  @Expose()
  @ApiProperty({ description: 'Total visits count' })
  totalVisits: number;

  @Expose()
  @ApiProperty({ description: 'No-show count' })
  noShowCount: number;

  @Expose()
  @ApiProperty({ description: 'Cancellation count' })
  cancellationCount: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Last Visit Date' })
  lastVisitAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Is Blacklisted' })
  isBlacklisted: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Blacklist Type', enum: BlacklistType })
  blacklistType?: BlacklistType;

  @Expose()
  @ApiPropertyOptional({ description: 'Blacklist Reason' })
  blacklistReason?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Blacklisted At Date' })
  blacklistedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Creation Date' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last Update Date' })
  updatedAt: Date;
}

export class PaginatedCustomersDto {
  @ApiProperty({ type: [CustomerSummaryDto] })
  @Type(() => CustomerSummaryDto)
  data: CustomerSummaryDto[];

  @ApiProperty()
  meta: PaginationMeta;
}
