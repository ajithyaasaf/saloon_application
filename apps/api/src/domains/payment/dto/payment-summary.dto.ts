import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentSummaryDto {
  @Expose()
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Payment Code' })
  paymentCode: string;

  @Expose()
  @ApiProperty({ description: 'Booking ID' })
  bookingId: string;

  @Expose()
  @ApiProperty({ description: 'Payment Status', enum: PaymentStatus })
  status: PaymentStatus;

  @Expose()
  @ApiProperty({ description: 'Payment Method', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Expose()
  @ApiProperty({ description: 'Payment Provider', enum: PaymentProvider })
  provider: PaymentProvider;

  @Expose()
  @ApiProperty({ description: 'Amount Total in minor units' })
  amountTotal: number;

  @Expose()
  @ApiProperty({ description: 'Amount Paid in minor units' })
  amountPaid: number;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;
}
