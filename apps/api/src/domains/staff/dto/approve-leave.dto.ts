import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class ApproveLeaveDto {
  @ApiProperty({ description: 'Expected current version for optimistic concurrency control', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  version: number;
}
