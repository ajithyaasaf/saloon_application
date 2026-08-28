import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class InvoiceDto {
  @Expose()
  @ApiProperty({ description: 'Invoice ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Sequential Invoice Number' })
  invoiceNumber: string;

  @Expose()
  @ApiProperty({ description: 'Payment ID' })
  paymentId: string;

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
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @Expose()
  @ApiProperty({ description: 'Subtotal in minor units' })
  subtotal: number;

  @Expose()
  @ApiProperty({ description: 'Discount in minor units' })
  discount: number;

  @Expose()
  @ApiProperty({ description: 'CGST in minor units' })
  cgst: number;

  @Expose()
  @ApiProperty({ description: 'SGST in minor units' })
  sgst: number;

  @Expose()
  @ApiProperty({ description: 'IGST in minor units' })
  igst: number;

  @Expose()
  @ApiProperty({ description: 'Tax Total in minor units' })
  taxTotal: number;

  @Expose()
  @ApiProperty({ description: 'Grand Total in minor units' })
  grandTotal: number;

  @Expose()
  @ApiPropertyOptional({ description: 'PDF Cloud Storage URL' })
  pdfStorageUrl?: string;

  @Expose()
  @ApiProperty({ description: 'Invoice Status', enum: InvoiceStatus })
  status: InvoiceStatus;

  @Expose()
  @ApiPropertyOptional({ description: 'Issued Timestamp' })
  issuedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;
}
