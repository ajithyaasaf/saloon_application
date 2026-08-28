import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsNotEmpty()
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: 'Booking ID' })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ description: 'Refund amount in minor units' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Gateway refund ID' })
  @IsOptional()
  @IsString()
  gatewayRefundId?: string;

  @ApiProperty({ description: 'Payment Provider used for refund', enum: PaymentProvider })
  @IsNotEmpty()
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
