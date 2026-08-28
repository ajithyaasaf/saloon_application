import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCustomerPreferenceDto {
  @ApiProperty({ description: 'Customer Profile ID' })
  @IsUUID()
  customerProfileId: string;

  @ApiPropertyOptional({ description: 'Preferred Staff IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  preferredStaffIds?: string[];

  @ApiPropertyOptional({ description: 'Preferred Service Catalog IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  preferredServiceIds?: string[];

  @ApiPropertyOptional({ description: 'Marketing Email Consent', default: true })
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;

  @ApiPropertyOptional({ description: 'Marketing SMS Consent', default: true })
  @IsOptional()
  @IsBoolean()
  marketingSms?: boolean;

  @ApiPropertyOptional({ description: 'Marketing WhatsApp Consent', default: true })
  @IsOptional()
  @IsBoolean()
  marketingWhatsapp?: boolean;

  @ApiPropertyOptional({ description: 'Patch Test Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patchTestNotes?: string;

  @ApiPropertyOptional({ description: 'Beverage Preference' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  beveragePreference?: string;
}

export class UpdateCustomerPreferenceDto {
  @ApiPropertyOptional({ description: 'Preferred Staff IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  preferredStaffIds?: string[];

  @ApiPropertyOptional({ description: 'Preferred Service Catalog IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  preferredServiceIds?: string[];

  @ApiPropertyOptional({ description: 'Marketing Email Consent' })
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;

  @ApiPropertyOptional({ description: 'Marketing SMS Consent' })
  @IsOptional()
  @IsBoolean()
  marketingSms?: boolean;

  @ApiPropertyOptional({ description: 'Marketing WhatsApp Consent' })
  @IsOptional()
  @IsBoolean()
  marketingWhatsapp?: boolean;

  @ApiPropertyOptional({ description: 'Patch Test Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patchTestNotes?: string;

  @ApiPropertyOptional({ description: 'Beverage Preference' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  beveragePreference?: string;
}

@Exclude()
export class CustomerPreferenceDto {
  @Expose()
  @ApiProperty({ description: 'Customer Preference ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Preferred Staff IDs', type: [String] })
  preferredStaffIds: string[];

  @Expose()
  @ApiProperty({ description: 'Preferred Service Catalog IDs', type: [String] })
  preferredServiceIds: string[];

  @Expose()
  @ApiProperty({ description: 'Marketing Email Consent' })
  marketingEmail: boolean;

  @Expose()
  @ApiProperty({ description: 'Marketing SMS Consent' })
  marketingSms: boolean;

  @Expose()
  @ApiProperty({ description: 'Marketing WhatsApp Consent' })
  marketingWhatsapp: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Patch Test Notes' })
  patchTestNotes?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Beverage Preference' })
  beveragePreference?: string;

  @Expose()
  @ApiProperty({ description: 'Last Update Date' })
  updatedAt: Date;
}
