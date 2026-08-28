import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { SupplierContactRepository, SupplierRepository } from '../repositories/supplier.repository';
import { SupplierService } from '../services/supplier.service';

describe('SupplierService', () => {
  let service: SupplierService;
  let supplierRepo: any;
  let contactRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockSupplier = {
    id: 'sup-1',
    salonId: 'sal-1',
    code: 'SUP-001',
    name: 'Cosmetics Supplier Ltd',
    leadTimeDays: 7,
    status: 'ACTIVE',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    supplierRepo = {
      findById: jest.fn().mockResolvedValue(mockSupplier),
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockSupplier),
      update: jest.fn().mockResolvedValue({ ...mockSupplier, name: 'Updated Supplier' }),
      softDelete: jest.fn().mockResolvedValue({ ...mockSupplier, status: 'INACTIVE', deletedAt: new Date() }),
      search: jest.fn().mockResolvedValue({ data: [mockSupplier], total: 1 }),
    };

    contactRepo = {
      create: jest.fn().mockResolvedValue({ id: 'con-1', supplierId: 'sup-1', contactName: 'John Doe' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    txService = {
      run: jest.fn().mockImplementation((cb) => cb({})),
    };

    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: SupplierRepository, useValue: supplierRepo },
        { provide: SupplierContactRepository, useValue: contactRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
  });

  describe('createSupplier', () => {
    it('should create supplier and emit event', async () => {
      const res = await service.createSupplier(
        {
          salonId: 'sal-1',
          code: 'SUP-001',
          name: 'Cosmetics Supplier Ltd',
        },
        'user-1',
      );

      expect(res.id).toBe('sup-1');
      expect(supplierRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should fail if supplier code is duplicate', async () => {
      supplierRepo.findByCode.mockResolvedValueOnce(mockSupplier);
      await expect(
        service.createSupplier({ salonId: 'sal-1', code: 'SUP-001', name: 'Dup' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('archiveSupplier', () => {
    it('should soft delete supplier and invalidate cache', async () => {
      const res = await service.archiveSupplier('sup-1', 'sal-1', 'user-1');
      expect(supplierRepo.softDelete).toHaveBeenCalledWith('sup-1');
      expect(cacheService.delete).toHaveBeenCalledWith('supplier:sup-1:detail');
    });
  });
});
