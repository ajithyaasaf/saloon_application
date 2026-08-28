import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { BookingItemDto } from './booking-item.dto';
import { BookingStatusHistoryDto } from './booking-status-history.dto';
import { BookingDto } from './booking.dto';

@Exclude()
export class BookingDetailDto extends BookingDto {
  @ApiProperty({ type: [BookingItemDto], description: 'Detailed service items in booking' })
  @Expose()
  @Type(() => BookingItemDto)
  items: BookingItemDto[];

  @ApiPropertyOptional({ type: [BookingStatusHistoryDto], description: 'Audit history of status transitions' })
  @Expose()
  @Type(() => BookingStatusHistoryDto)
  statusHistories?: BookingStatusHistoryDto[];
}
