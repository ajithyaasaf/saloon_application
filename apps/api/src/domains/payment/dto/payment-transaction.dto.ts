import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentTransactionDto {
  @Expose()
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Parent Payment ID' })
  paymentId: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Provider Transaction ID' })
  providerTransactionId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Gateway Reference' })
  gatewayReference?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Authorization Reference' })
  authorizationReference?: string;

  @Expose()
  @ApiProperty({ description: 'Payment Method', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Expose()
  @ApiProperty({ description: 'Payment Provider', enum: PaymentProvider })
  provider: PaymentProvider;

  @Expose()
  @ApiProperty({ description: 'Amount in minor units' })
  amount: number;

  @Expose()
  @ApiProperty({ description: 'Currency Code' })
  currency: string;

  @Expose()
  @ApiProperty({ description: 'Transaction Status', enum: PaymentStatus })
  status: PaymentStatus;

  @Expose()
  @ApiPropertyOptional({ description: 'Processing Timestamp' })
  processedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;
}
