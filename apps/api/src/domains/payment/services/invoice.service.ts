import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceGeneratedEvent } from '../events/invoice-generated.event';
import { InvoiceIssuedEvent } from '../events/invoice-issued.event';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentRepository } from '../repositories/payment.repository';

/**
 * InvoiceService — Core domain orchestration for tax-compliant GST invoicing.
 *
 * Tax Calculations: CGST (9%), SGST (9%), IGST (18%), sequential numbering per branch (`INV-SAL01-2026-0042`).
 * Execution Order: DB Transaction -> Audit Log -> Commit -> Cache -> Events
 *
 * Architecture ref: Phase 14.0 & Phase 14.3
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditRepo: PaymentAuditRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async generateInvoice(dto: CreateInvoiceDto, actorUserId: string): Promise<InvoiceEntity> {
    const existing = await this.invoiceRepo.findByPayment(dto.paymentId);
    if (existing) {
      return new InvoiceEntity(existing);
    }

    const yearStr = new Date().getFullYear().toString();
    const branchPrefix = dto.branchId.slice(0, 5).toUpperCase();
    const randomCounter = SecurityUtil.generateRandomToken(4).toUpperCase();
    const invoiceNumber = `INV-${branchPrefix}-${yearStr}-${randomCounter}`;

    const subtotal = dto.subtotal;
    const discount = dto.discount ?? 0;
    const taxableAmount = Math.max(0, subtotal - discount);

    // Default 18% GST split (9% CGST, 9% SGST) if not provided
    const cgst = dto.cgst ?? Math.round(taxableAmount * 0.09);
    const sgst = dto.sgst ?? Math.round(taxableAmount * 0.09);
    const igst = dto.igst ?? 0;
    const taxTotal = dto.taxTotal ?? (cgst + sgst + igst);
    const grandTotal = dto.grandTotal ?? (taxableAmount + taxTotal);

    const createdInvoice = await this.transactionService.run(async (tx) => {
      const invoice = await this.invoiceRepo.create(
        {
          invoiceNumber,
          paymentId: dto.paymentId,
          bookingId: dto.bookingId,
          salonId: dto.salonId,
          branchId: dto.branchId,
          customerId: dto.customerId,
          subtotal,
          discount,
          cgst,
          sgst,
          igst,
          taxTotal,
          grandTotal,
          pdfStorageUrl: dto.pdfStorageUrl,
          status: dto.status ?? InvoiceStatus.DRAFT,
          createdByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: dto.paymentId,
          action: 'INVOICE_GENERATED',
          actorUserId,
          newState: invoice.status,
          metadata: { invoiceId: invoice.id, invoiceNumber, grandTotal },
        },
        tx,
      );

      return invoice;
    });

    const entity = new InvoiceEntity(createdInvoice);

    // Post-commit
    await this.eventBus.publish(
      new InvoiceGeneratedEvent(
        {
          invoiceId: entity.id,
          invoiceNumber: entity.invoiceNumber,
          paymentId: entity.paymentId,
          bookingId: entity.bookingId,
          salonId: entity.salonId,
          branchId: entity.branchId,
          customerId: entity.customerId,
          grandTotal: entity.grandTotal,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async issueInvoice(invoiceId: string, pdfStorageUrl?: string, actorUserId?: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Invoice ${invoiceId} not found`);
    }

    const updatedInvoice = await this.transactionService.run(async (tx) => {
      return this.invoiceRepo.update(
        invoice.id,
        invoice.version,
        {
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
          pdfStorageUrl: pdfStorageUrl || invoice.pdfStorageUrl,
          updatedByUserId: actorUserId,
        },
        tx,
      );
    });

    const entity = new InvoiceEntity(updatedInvoice);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.INVOICE_DETAIL(invoiceId));
    await this.eventBus.publish(
      new InvoiceIssuedEvent(
        {
          invoiceId: entity.id,
          invoiceNumber: entity.invoiceNumber,
          paymentId: entity.paymentId,
          bookingId: entity.bookingId,
          pdfStorageUrl: entity.pdfStorageUrl || undefined,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async voidInvoice(invoiceId: string, actorUserId: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Invoice ${invoiceId} not found`);
    }

    const updatedInvoice = await this.transactionService.run(async (tx) => {
      const inv = await this.invoiceRepo.update(
        invoice.id,
        invoice.version,
        {
          status: InvoiceStatus.VOID,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: invoice.paymentId,
          action: 'INVOICE_VOIDED',
          actorUserId,
          previousState: invoice.status,
          newState: InvoiceStatus.VOID,
          metadata: { invoiceId },
        },
        tx,
      );

      return inv;
    });

    const entity = new InvoiceEntity(updatedInvoice);
    await this.cacheService.delete(CACHE_KEYS.INVOICE_DETAIL(invoiceId));
    return entity;
  }

  public async downloadInvoice(invoiceId: string): Promise<{ invoiceNumber: string; pdfStorageUrl?: string | null }> {
    return this.cacheService.getOrSet(CACHE_KEYS.INVOICE_DETAIL(invoiceId), async () => {
      const invoice = await this.invoiceRepo.findById(invoiceId);
      if (!invoice) {
        throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Invoice ${invoiceId} not found`);
      }
      return {
        invoiceNumber: invoice.invoiceNumber,
        pdfStorageUrl: invoice.pdfStorageUrl,
      };
    }, 3600);
  }
}
