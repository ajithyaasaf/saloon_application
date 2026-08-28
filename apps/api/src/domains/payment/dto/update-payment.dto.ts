import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class UpdatePaymentDto {
  @ApiProperty({ description: 'Expected version for optimistic locking' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'New payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment provider', enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ description: 'Confirmed paid amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({ description: 'Refunded amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountRefunded?: number;

  @ApiPropertyOptional({ description: 'Outstanding due amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountDue?: number;
}
