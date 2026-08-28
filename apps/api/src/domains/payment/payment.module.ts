import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PaymentAdminController } from './controllers/payment-admin.controller';
import { PaymentCustomerController } from './controllers/payment-customer.controller';
import { PaymentOwnerController } from './controllers/payment-owner.controller';
import { PaymentPublicController } from './controllers/payment-public.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PaymentAuditRepository } from './repositories/payment-audit.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';
import { PaymentWebhookRepository } from './repositories/payment-webhook.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { RefundRepository } from './repositories/refund.repository';
import { InvoiceService } from './services/invoice.service';
import { PaymentStatusService } from './services/payment-status.service';
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { WebhookService } from './services/webhook.service';

/**
 * PaymentModule — NestJS module for Payment Domain.
 *
 * Encapsulates public, customer, owner, and admin endpoints, payment orchestration, and ledger management.
 */
@Module({
  imports: [SharedModule],
  controllers: [
    PaymentPublicController,
    PaymentCustomerController,
    PaymentOwnerController,
    PaymentAdminController,
  ],
  providers: [
    PaymentRepository,
    PaymentTransactionRepository,
    PaymentAuditRepository,
    PaymentWebhookRepository,
    RefundRepository,
    InvoiceRepository,
    PaymentStatusService,
    PaymentService,
    RefundService,
    WebhookService,
    InvoiceService,
  ],
  exports: [
    PaymentRepository,
    PaymentTransactionRepository,
    PaymentAuditRepository,
    PaymentWebhookRepository,
    RefundRepository,
    InvoiceRepository,
    PaymentStatusService,
    PaymentService,
    RefundService,
    WebhookService,
    InvoiceService,
  ],
})
export class PaymentModule {}
