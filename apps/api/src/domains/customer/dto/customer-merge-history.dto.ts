import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CustomerMergeHistoryDto {
  @Expose()
  @ApiProperty({ description: 'Merge History ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Source Customer Profile ID' })
  sourceCustomerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Target Customer Profile ID' })
  targetCustomerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Source Snapshot JSON' })
  sourceSnapshot: Record<string, any>;

  @Expose()
  @ApiPropertyOptional({ description: 'Merge Reason' })
  mergeReason?: string;

  @Expose()
  @ApiProperty({ description: 'Merged By User ID' })
  mergedByUserId: string;

  @Expose()
  @ApiProperty({ description: 'Merged At Date' })
  mergedAt: Date;
}
