import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * RejectSalonRequestDto — Request body for rejecting a pending salon approval.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
export class RejectSalonRequestDto {
  @ApiProperty({ example: 'Invalid GSTIN document provided. Please re-upload.', description: 'Rejection reason provided to salon owner' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
