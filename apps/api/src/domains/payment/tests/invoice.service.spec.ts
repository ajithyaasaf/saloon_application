import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceService } from '../services/invoice.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: any;
  let paymentRepo: any;
  let auditRepo: any;

  const mockInvoice = {
    id: 'inv_123',
    invoiceNumber: 'INV-BR123-2026-0042',
    paymentId: 'pay_123',
    bookingId: 'bk_123',
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_123',
    subtotal: 150000,
    discount: 0,
    cgst: 13500,
    sgst: 13500,
    igst: 0,
    taxTotal: 27000,
    grandTotal: 177000,
    status: InvoiceStatus.DRAFT,
    version: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    invoiceRepo = {
      findById: jest.fn(),
      findByPayment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    paymentRepo = { findById: jest.fn() };
    auditRepo = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: InvoiceRepository, useValue: invoiceRepo },
        { provide: PaymentRepository, useValue: paymentRepo },
        { provide: PaymentAuditRepository, useValue: auditRepo },
        { provide: TransactionService, useValue: { run: jest.fn((cb) => cb({})) } },
        { provide: AuditService, useValue: {} },
        { provide: CacheService, useValue: { delete: jest.fn(), getOrSet: jest.fn((k, ttl, fn) => fn()) } },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('generateInvoice', () => {
    it('should generate invoice with calculated 18% GST split', async () => {
      invoiceRepo.findByPayment.mockResolvedValue(null);
      invoiceRepo.create.mockResolvedValue(mockInvoice);

      const res = await service.generateInvoice(
        {
          paymentId: 'pay_123',
          bookingId: 'bk_123',
          salonId: 'sal_123',
          branchId: 'br_123',
          customerId: 'usr_123',
          subtotal: 150000,
          grandTotal: 177000,
        },
        'usr_123',
      );

      expect(res.id).toBe(mockInvoice.id);
      expect(invoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cgst: 13500,
          sgst: 13500,
          grandTotal: 177000,
        }),
        expect.any(Object),
      );
    });
  });

  describe('issueInvoice', () => {
    it('should update invoice status to ISSUED', async () => {
      invoiceRepo.findById.mockResolvedValue(mockInvoice);
      invoiceRepo.update.mockResolvedValue({ ...mockInvoice, status: InvoiceStatus.ISSUED, issuedAt: new Date() });

      const res = await service.issueInvoice('inv_123', 'https://storage.com/inv.pdf', 'usr_123');
      expect(res.status).toBe(InvoiceStatus.ISSUED);
      expect(invoiceRepo.update).toHaveBeenCalled();
    });
  });
});
