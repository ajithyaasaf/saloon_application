import { ApiProperty } from '@nestjs/swagger';

/**
 * ErrorDetailDto — a single field-level validation error.
 */
export class ErrorDetailDto {
  @ApiProperty({ example: 'phone' })
  field: string;

  @ApiProperty({ example: 'phone must be a valid E.164 phone number' })
  message: string;
}

/**
 * ErrorBodyDto — the error object inside the API error envelope.
 */
export class ErrorBodyDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ type: [ErrorDetailDto], example: [] })
  details: ErrorDetailDto[];

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  requestId: string;

  @ApiProperty({ example: '2026-08-05T11:44:49.000Z', format: 'date-time' })
  timestamp: string;
}

/**
 * ErrorResponseDto — the top-level error response envelope.
 * Used by @ApiResponse decorators on all non-2xx responses.
 *
 * Architecture ref: Phase 5 §16.5
 */
export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}
