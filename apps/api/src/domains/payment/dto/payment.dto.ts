import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentDto {
  @Expose()
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Unique Payment Code' })
  paymentCode: string;

  @Expose()
  @ApiProperty({ description: 'Booking ID' })
  bookingId: string;

  @Expose()
  @ApiProperty({ description: 'Salon ID' })
  salonId: string;

  @Expose()
  @ApiProperty({ description: 'Branch ID' })
  branchId: string;

  @Expose()
  @ApiProperty({ description: 'Customer User ID' })
  customerId: string;

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
  @ApiProperty({ description: 'Currency Code' })
  currency: string;

  @Expose()
  @ApiProperty({ description: 'Total payable amount in minor units' })
  amountTotal: number;

  @Expose()
  @ApiProperty({ description: 'Confirmed paid amount in minor units' })
  amountPaid: number;

  @Expose()
  @ApiProperty({ description: 'Refunded amount in minor units' })
  amountRefunded: number;

  @Expose()
  @ApiProperty({ description: 'Outstanding due amount in minor units' })
  amountDue: number;

  @Expose()
  @ApiProperty({ description: 'Whether partial payments are allowed' })
  isPartialAllowed: boolean;

  @Expose()
  @ApiProperty({ description: 'Idempotency Key' })
  idempotencyKey: string;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Update Timestamp' })
  updatedAt: Date;
}
