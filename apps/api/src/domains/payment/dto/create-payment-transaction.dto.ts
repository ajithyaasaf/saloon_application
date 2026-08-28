import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentTransactionDto {
  @ApiProperty({ description: 'Parent Payment ID' })
  @IsNotEmpty()
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({ description: 'Provider Transaction/Order ID' })
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @ApiPropertyOptional({ description: 'Gateway reference string' })
  @IsOptional()
  @IsString()
  gatewayReference?: string;

  @ApiPropertyOptional({ description: 'Authorization reference string' })
  @IsOptional()
  @IsString()
  authorizationReference?: string;

  @ApiProperty({ description: 'Payment Method used', enum: PaymentMethod })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment Provider used', enum: PaymentProvider })
  @IsNotEmpty()
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ description: 'Transaction amount in minor units' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({ description: 'Raw gateway request payload' })
  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Raw gateway response payload' })
  @IsOptional()
  @IsObject()
  responsePayload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Transaction status', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus = PaymentStatus.PENDING;
}
