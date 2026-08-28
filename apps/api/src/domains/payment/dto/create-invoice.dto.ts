import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Payment ID' })
  @IsNotEmpty()
  @IsUUID()
  paymentId: string;

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

  @ApiProperty({ description: 'Subtotal in minor units' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Discount in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional({ description: 'CGST in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cgst?: number = 0;

  @ApiPropertyOptional({ description: 'SGST in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sgst?: number = 0;

  @ApiPropertyOptional({ description: 'IGST in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  igst?: number = 0;

  @ApiPropertyOptional({ description: 'Tax Total in minor units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxTotal?: number = 0;

  @ApiProperty({ description: 'Grand Total in minor units' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  grandTotal: number;

  @ApiPropertyOptional({ description: 'PDF Storage URL' })
  @IsOptional()
  @IsString()
  pdfStorageUrl?: string;

  @ApiPropertyOptional({ description: 'Invoice Status', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus = InvoiceStatus.DRAFT;
}
