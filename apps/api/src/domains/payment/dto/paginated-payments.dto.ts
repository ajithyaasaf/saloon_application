import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaymentDto } from './payment.dto';

export class PaginatedPaymentsDto {
  @ApiProperty({ type: [PaymentDto], description: 'List of payments' })
  @Type(() => PaymentDto)
  data: PaymentDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: PaginationMeta;
}
