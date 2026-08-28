import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRefundDto {
  @ApiProperty({ description: 'Expected version for optimistic locking' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'New refund status', enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: 'Gateway refund ID returned by provider' })
  @IsOptional()
  @IsString()
  gatewayRefundId?: string;

  @ApiPropertyOptional({ description: 'Reason or error note' })
  @IsOptional()
  @IsString()
  reason?: string;
}
