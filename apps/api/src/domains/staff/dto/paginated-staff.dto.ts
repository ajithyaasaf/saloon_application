import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { StaffDto } from './staff.dto';

export class PaginatedStaffDto {
  @ApiProperty({ type: [StaffDto] })
  @Type(() => StaffDto)
  data: StaffDto[];

  @ApiProperty({ type: PaginationMetaDto })
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
