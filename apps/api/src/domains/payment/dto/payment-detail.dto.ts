import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { InvoiceDto } from './invoice.dto';

import { PaymentTransactionDto } from './payment-transaction.dto';
import { PaymentDto } from './payment.dto';
import { RefundDto } from './refund.dto';

@Exclude()
export class PaymentDetailDto extends PaymentDto {
  @Expose()
  @Type(() => PaymentTransactionDto)
  @ApiPropertyOptional({ type: [PaymentTransactionDto], description: 'Payment Transactions' })
  transactions?: PaymentTransactionDto[];

  @Expose()
  @Type(() => RefundDto)
  @ApiPropertyOptional({ type: [RefundDto], description: 'Refunds associated with payment' })
  refunds?: RefundDto[];

  @Expose()
  @Type(() => InvoiceDto)
  @ApiPropertyOptional({ type: [InvoiceDto], description: 'Invoices associated with payment' })
  invoices?: InvoiceDto[];
}
