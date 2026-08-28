import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider, RefundStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RefundDto {
  @Expose()
  @ApiProperty({ description: 'Refund ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Refund Code' })
  refundCode: string;

  @Expose()
  @ApiProperty({ description: 'Payment ID' })
  paymentId: string;

  @Expose()
  @ApiProperty({ description: 'Booking ID' })
  bookingId: string;

  @Expose()
  @ApiProperty({ description: 'Refund Amount in minor units' })
  amount: number;

  @Expose()
  @ApiProperty({ description: 'Currency Code' })
  currency: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Refund Reason' })
  reason?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Gateway Refund ID' })
  gatewayRefundId?: string;

  @Expose()
  @ApiProperty({ description: 'Payment Provider', enum: PaymentProvider })
  provider: PaymentProvider;

  @Expose()
  @ApiProperty({ description: 'Refund Status', enum: RefundStatus })
  status: RefundStatus;

  @Expose()
  @ApiProperty({ description: 'Processed By User ID' })
  processedByUserId: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Processed Timestamp' })
  processedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;
}
