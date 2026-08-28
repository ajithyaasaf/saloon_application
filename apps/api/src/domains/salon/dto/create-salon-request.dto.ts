import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory, SalonPlanType } from '@prisma/client';
import { IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * CreateSalonRequestDto — HTTP Request DTO for creating a new Salon.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
export class CreateSalonRequestDto {
  @ApiProperty({ example: 'Glamour Cuts & Spa', description: 'Brand name of the salon' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  brandName: string;

  @ApiPropertyOptional({ example: 'Luxury hair and beauty salon in Indiranagar', description: 'Salon description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5', description: 'GSTIN tax registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({ enum: SalonPlanType, default: SalonPlanType.FREE_COMMISSION, description: 'Salon platform plan type' })
  @IsOptional()
  @IsEnum(SalonPlanType)
  planType?: SalonPlanType;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Media ID for salon logo' })
  @IsOptional()
  @IsUUID()
  logoMediaId?: string;

  @ApiProperty({ example: 'Indiranagar Flagship', description: 'Name of the primary branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  primaryBranchName: string;

  @ApiProperty({ example: '100 Feet Road, Indiranagar', description: 'Primary street address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Metro Station', description: 'Secondary street address / landmark' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Bangalore', description: 'City name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Karnataka', description: 'State / Province' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '560038', description: 'Postal PIN code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  pincode: string;

  @ApiProperty({ example: 12.9784, description: 'Latitude coordinate' })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 77.6408, description: 'Longitude coordinate' })
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: '+919876543210', description: 'Primary phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ enum: BranchGenderCategory, default: BranchGenderCategory.UNISEX, description: 'Target gender demographic' })
  @IsOptional()
  @IsEnum(BranchGenderCategory)
  genderCategory?: BranchGenderCategory;
}
