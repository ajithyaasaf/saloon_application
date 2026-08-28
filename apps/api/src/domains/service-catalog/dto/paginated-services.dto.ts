import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { ServiceDto } from './service.dto';

/**
 * PaginatedServicesDto — Envelope for paginated master service listings.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class PaginatedServicesDto {
  @ApiProperty({ type: [ServiceDto] })
  data: ServiceDto[];

  @ApiProperty({
    example: {
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasNext: true,
      hasPrevious: false,
    },
  })
  meta: PaginationMeta;
}
