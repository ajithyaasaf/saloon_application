import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateCustomerNoteDto {
  @ApiProperty({ description: 'Customer Profile ID' })
  @IsUUID()
  customerProfileId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Note content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note: string;

  @ApiPropertyOptional({ description: 'Pin note to top', default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Private note visible to managers only', default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateCustomerNoteDto {
  @ApiProperty({ description: 'Expected version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'Note content' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: 'Pin note to top' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Private note' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

@Exclude()
export class CustomerNoteDto {
  @Expose()
  @ApiProperty({ description: 'Customer Note ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Branch ID' })
  branchId: string;

  @Expose()
  @ApiProperty({ description: 'Note content' })
  note: string;

  @Expose()
  @ApiProperty({ description: 'Is Pinned' })
  isPinned: boolean;

  @Expose()
  @ApiProperty({ description: 'Is Private' })
  isPrivate: boolean;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Updated At' })
  updatedAt: Date;
}
