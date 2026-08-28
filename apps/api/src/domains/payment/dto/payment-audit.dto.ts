import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentAuditDto {
  @Expose()
  @ApiProperty({ description: 'Audit Log ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Payment ID' })
  paymentId: string;

  @Expose()
  @ApiProperty({ description: 'Action performed' })
  action: string;

  @Expose()
  @ApiProperty({ description: 'Actor User ID' })
  actorUserId: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Previous state string' })
  previousState?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'New state string' })
  newState?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;
}
