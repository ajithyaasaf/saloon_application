import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class RejectLeaveDto {
  @ApiProperty({ description: 'Expected current version for optimistic concurrency control', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @ApiProperty({ description: 'Reason for rejecting leave request', example: 'Branch fully booked' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason: string;
}
