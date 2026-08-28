import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CustomerVisitHistoryDto {
  @Expose()
  @ApiProperty({ description: 'Visit History ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Booking ID' })
  bookingId: string;

  @Expose()
  @ApiProperty({ description: 'Branch ID' })
  branchId: string;

  @Expose()
  @ApiProperty({ description: 'Staff IDs', type: [String] })
  staffIds: string[];

  @Expose()
  @ApiProperty({ description: 'Service IDs', type: [String] })
  serviceIds: string[];

  @Expose()
  @ApiProperty({ description: 'Total Amount in minor units' })
  totalAmount: number;

  @Expose()
  @ApiProperty({ description: 'Visit Date' })
  visitDate: Date;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
