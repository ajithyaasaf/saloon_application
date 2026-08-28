import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider } from '@prisma/client';
import { InvoiceService } from '../../services/invoice.service';
import { PaymentPublicController } from '../payment-public.controller';

describe('PaymentPublicController', () => {
  let controller: PaymentPublicController;
  let invoiceService: any;

  beforeEach(async () => {
    invoiceService = {
      downloadInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentPublicController],
      providers: [{ provide: InvoiceService, useValue: invoiceService }],
    }).compile();

    controller = module.get<PaymentPublicController>(PaymentPublicController);
  });

  describe('getProviders', () => {
    it('should return list of supported payment providers', async () => {
      const res = await controller.getProviders();
      expect(res.data.providers).toContain(PaymentProvider.CASHFREE);
    });
  });

  describe('getMethods', () => {
    it('should return list of supported payment methods', async () => {
      const res = await controller.getMethods();
      expect(res.data.methods).toContain(PaymentMethod.UPI);
    });
  });

  describe('getInvoiceByNumber', () => {
    it('should return invoice details', async () => {
      invoiceService.downloadInvoice.mockResolvedValue({
        invoiceNumber: 'INV-BR123-2026-0042',
        pdfStorageUrl: 'https://storage.com/inv.pdf',
      });

      const res = await controller.getInvoiceByNumber('INV-BR123-2026-0042');
      expect(res.data.invoiceNumber).toBe('INV-BR123-2026-0042');
    });
  });
});
