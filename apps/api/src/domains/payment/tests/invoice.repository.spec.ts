import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { InvoiceRepository } from '../repositories/invoice.repository';

describe('InvoiceRepository', () => {
  let repository: InvoiceRepository;
  let prisma: any;

  const mockInvoice = {
    id: 'inv_123e4567-e89b-12d3-a456-426614174000',
    invoiceNumber: 'INV-SAL01-2026-0042',
    paymentId: 'pay_123e4567-e89b-12d3-a456-426614174000',
    bookingId: 'bk_123e4567-e89b-12d3-a456-426614174000',
    salonId: 'sal_123e4567-e89b-12d3-a456-426614174001',
    branchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    customerId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    subtotal: 150000,
    discount: 0,
    cgst: 13500,
    sgst: 13500,
    igst: 0,
    taxTotal: 27000,
    grandTotal: 177000,
    pdfStorageUrl: null,
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date(),
    version: 1,
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<InvoiceRepository>(InvoiceRepository);
  });

  describe('findByInvoiceNumber', () => {
    it('should return invoice by invoice number', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      const res = await repository.findByInvoiceNumber(mockInvoice.invoiceNumber);
      expect(res).toEqual(mockInvoice);
    });
  });

  describe('create', () => {
    it('should create invoice', async () => {
      prisma.invoice.create.mockResolvedValue(mockInvoice);
      const res = await repository.create({
        invoiceNumber: mockInvoice.invoiceNumber,
        paymentId: mockInvoice.paymentId,
        bookingId: mockInvoice.bookingId,
        salonId: mockInvoice.salonId,
        branchId: mockInvoice.branchId,
        customerId: mockInvoice.customerId,
        subtotal: 150000,
        grandTotal: 177000,
        createdByUserId: mockInvoice.createdByUserId,
      });
      expect(res).toEqual(mockInvoice);
    });
  });
});
