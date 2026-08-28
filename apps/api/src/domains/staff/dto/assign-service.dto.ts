import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignServiceDto {
  @ApiProperty({ description: 'ID of staff member', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ description: 'ID of branch service offering', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID()
  @IsNotEmpty()
  branchServiceId: string;
}
