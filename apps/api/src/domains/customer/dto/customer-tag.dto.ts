import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCustomerTagDto {
  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Tag Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Color hex code', default: '#6B7280' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCustomerTagDto {
  @ApiProperty({ description: 'Expected version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'Tag Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignCustomerTagDto {
  @ApiProperty({ description: 'Customer Profile ID' })
  @IsUUID()
  customerProfileId: string;

  @ApiProperty({ description: 'Tag ID' })
  @IsUUID()
  tagId: string;
}

@Exclude()
export class CustomerTagDto {
  @Expose()
  @ApiProperty({ description: 'Tag ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Salon ID' })
  salonId: string;

  @Expose()
  @ApiProperty({ description: 'Tag Name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Color hex code' })
  color: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
