import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentWebhookDto {
  @Expose()
  @ApiProperty({ description: 'Webhook Log ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Payment Provider', enum: PaymentProvider })
  provider: PaymentProvider;

  @Expose()
  @ApiPropertyOptional({ description: 'Provider Event ID' })
  eventId?: string;

  @Expose()
  @ApiProperty({ description: 'Webhook Signature' })
  signature: string;

  @Expose()
  @ApiProperty({ description: 'Processing Status' })
  isProcessed: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Processing Error if failed' })
  processingError?: string;

  @Expose()
  @ApiProperty({ description: 'Received Timestamp' })
  receivedAt: Date;
}
