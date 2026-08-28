import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from '../types/paginated.types';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class ResponseMetaDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  requestId: string;

  @ApiProperty({ example: '2026-08-05T11:44:49.000Z', format: 'date-time' })
  timestamp: string;

  @ApiProperty({ type: PaginationMetaDto, required: false })
  pagination?: PaginationMetaDto;
}
