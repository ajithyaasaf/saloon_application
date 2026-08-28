import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { BookingSummaryDto } from './booking-summary.dto';

export class PaginatedBookingsDto {
  @ApiProperty({ type: [BookingSummaryDto] })
  @Type(() => BookingSummaryDto)
  data: BookingSummaryDto[];

  @ApiProperty()
  meta: PaginationMeta;
}
