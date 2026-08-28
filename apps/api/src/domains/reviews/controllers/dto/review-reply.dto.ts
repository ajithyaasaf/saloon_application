import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReviewReplyRequestDto {
  @ApiProperty({ description: 'Official reply text', maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  replyText: string;
}

export class UpdateReviewReplyRequestDto {
  @ApiProperty({ description: 'Updated reply text', maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  replyText: string;

  @ApiPropertyOptional({ description: 'Optimistic concurrency version' })
  @IsInt()
  @IsOptional()
  version?: number;
}
