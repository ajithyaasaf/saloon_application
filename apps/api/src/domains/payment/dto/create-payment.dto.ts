import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ description: 'Salon ID' })
  @IsNotEmpty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Customer User ID' })
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Primary payment method', enum: PaymentMethod })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment provider', enum: PaymentProvider })
  @IsNotEmpty()
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiPropertyOptional({ description: 'ISO 4217 Currency Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiProperty({ description: 'Total payable amount in minor units (Paise/Cents)' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  amountTotal: number;

  @ApiPropertyOptional({ description: 'Initial paid amount in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaid?: number = 0;

  @ApiPropertyOptional({ description: 'Outstanding due amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountDue?: number;

  @ApiPropertyOptional({ description: 'Whether partial payments are permitted', default: false })
  @IsOptional()
  @IsBoolean()
  isPartialAllowed?: boolean = false;

  @ApiProperty({ description: 'Unique Idempotency key' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;
}
