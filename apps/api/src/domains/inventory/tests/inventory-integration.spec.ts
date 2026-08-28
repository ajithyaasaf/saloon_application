import { Test, TestingModule } from '@nestjs/testing';
import {
  AdjustmentReason,
  AuditStatus,
  GRNStatus,
  ProductType,
  ProductUsageType,
  PurchaseOrderStatus,
  StockMovementType,
  TransferStatus,
} from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';

import {
  BrandRepository,
  ProductCategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  UnitOfMeasureRepository,
} from '../repositories/product.repository';
import { SupplierContactRepository, SupplierRepository } from '../repositories/supplier.repository';
import {
  GoodsReceivedItemRepository,
  GoodsReceivedNoteRepository,
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
} from '../repositories/purchase-order.repository';
import { InventoryStockRepository, LowStockAlertRepository } from '../repositories/inventory-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockTransferItemRepository, StockTransferRepository } from '../repositories/stock-transfer.repository';
import { StockAdjustmentItemRepository, StockAdjustmentRepository } from '../repositories/stock-adjustment.repository';
import { StockAuditItemRepository, StockAuditRepository } from '../repositories/stock-audit.repository';
import { ProductUsageRepository } from '../repositories/product-usage.repository';

import { ProductService } from '../services/product.service';
import { SupplierService } from '../services/supplier.service';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { GoodsReceivedService } from '../services/goods-received.service';
import { InventoryService } from '../services/inventory.service';
import { StockMovementService } from '../services/stock-movement.service';
import { StockTransferService } from '../services/stock-transfer.service';
import { StockAdjustmentService } from '../services/stock-adjustment.service';
import { StockAuditService } from '../services/stock-audit.service';
import { ProductUsageService } from '../services/product-usage.service';
import { LowStockAlertService } from '../services/low-stock-alert.service';

describe('Phase 16.5 — Inventory Integration & Security Audit Tests', () => {
  let productService: ProductService;
  let supplierService: SupplierService;
  let poService: PurchaseOrderService;
  let grnService: GoodsReceivedService;
  let inventoryService: InventoryService;
  let transferService: StockTransferService;
  let adjustmentService: StockAdjustmentService;
  let auditService: StockAuditService;
  let usageService: ProductUsageService;
  let alertService: LowStockAlertService;

  let productRepo: any;
  let variantRepo: any;
  let categoryRepo: any;
  let brandRepo: any;
  let uomRepo: any;
  let supplierRepo: any;
  let poRepo: any;
  let poItemRepo: any;
  let grnRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let transferRepo: any;
  let itemTransferRepo: any;
  let adjustmentRepo: any;
  let itemAdjustmentRepo: any;
  let auditRepo: any;
  let itemAuditRepo: any;
  let usageRepo: any;
  let alertRepo: any;

  let txService: any;
  let auditLogger: any;
  let cacheService: any;
  let eventBus: any;

  const salonA = '11111111-1111-1111-1111-111111111111';
  const salonB = '22222222-2222-2222-2222-222222222222';
  const branchA1 = '33333333-3333-3333-3333-333333333333';
  const branchA2 = '44444444-4444-4444-4444-444444444444';
  const branchB1 = '55555555-5555-5555-5555-555555555555';

  beforeEach(async () => {
    productRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      search: jest.fn(),
    };
    variantRepo = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      findByBarcode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categoryRepo = { findById: jest.fn() };
    brandRepo = { findById: jest.fn() };
    uomRepo = { findById: jest.fn() };
    supplierRepo = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      search: jest.fn(),
    };
    poRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };
    poItemRepo = {
      findByPurchaseOrder: jest.fn(),
      updateReceivedQuantity: jest.fn(),
    };
    grnRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      findByPurchaseOrder: jest.fn(),
    };
    stockRepo = {
      findById: jest.fn(),
      findByVariant: jest.fn(),
      findByBranch: jest.fn(),
      findLowStock: jest.fn(),
      findExpiring: jest.fn(),
      search: jest.fn(),
      upsertStock: jest.fn(),
      updateStock: jest.fn(),
      reserve: jest.fn(),
      releaseReservation: jest.fn(),
    };
    movementRepo = {
      create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
      findById: jest.fn(),
      findByVariant: jest.fn(),
      findByBranch: jest.fn(),
      findByReference: jest.fn(),
      search: jest.fn(),
    };
    transferRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      search: jest.fn(),
    };
    itemTransferRepo = { findByTransfer: jest.fn() };
    adjustmentRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      findByBranch: jest.fn(),
    };
    itemAdjustmentRepo = { findByAdjustment: jest.fn() };
    auditRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      search: jest.fn(),
    };
    itemAuditRepo = { findByAudit: jest.fn() };
    usageRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      findByProduct: jest.fn(),
      findByBranch: jest.fn(),
      findByReference: jest.fn(),
    };
    alertRepo = {
      findById: jest.fn(),
      findActive: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      acknowledge: jest.fn(),
      resolve: jest.fn(),
    };

    txService = {
      run: jest.fn().mockImplementation((cb) => cb({})),
    };
    auditLogger = {
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
        ProductService,
        SupplierService,
        PurchaseOrderService,
        GoodsReceivedService,
        InventoryService,
        StockMovementService,
        StockTransferService,
        StockAdjustmentService,
        StockAuditService,
        ProductUsageService,
        LowStockAlertService,
        { provide: ProductRepository, useValue: productRepo },
        { provide: ProductVariantRepository, useValue: variantRepo },
        { provide: ProductCategoryRepository, useValue: categoryRepo },
        { provide: BrandRepository, useValue: brandRepo },
        { provide: UnitOfMeasureRepository, useValue: uomRepo },
        { provide: SupplierRepository, useValue: supplierRepo },
        { provide: SupplierContactRepository, useValue: {} },
        { provide: PurchaseOrderRepository, useValue: poRepo },
        { provide: PurchaseOrderItemRepository, useValue: poItemRepo },
        { provide: GoodsReceivedNoteRepository, useValue: grnRepo },
        { provide: GoodsReceivedItemRepository, useValue: {} },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: LowStockAlertRepository, useValue: alertRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: StockTransferRepository, useValue: transferRepo },
        { provide: StockTransferItemRepository, useValue: itemTransferRepo },
        { provide: StockAdjustmentRepository, useValue: adjustmentRepo },
        { provide: StockAdjustmentItemRepository, useValue: itemAdjustmentRepo },
        { provide: StockAuditRepository, useValue: auditRepo },
        { provide: StockAuditItemRepository, useValue: itemAuditRepo },
        { provide: ProductUsageRepository, useValue: usageRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditLogger },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    productService = module.get<ProductService>(ProductService);
    supplierService = module.get<SupplierService>(SupplierService);
    poService = module.get<PurchaseOrderService>(PurchaseOrderService);
    grnService = module.get<GoodsReceivedService>(GoodsReceivedService);
    inventoryService = module.get<InventoryService>(InventoryService);
    transferService = module.get<StockTransferService>(StockTransferService);
    adjustmentService = module.get<StockAdjustmentService>(StockAdjustmentService);
    auditService = module.get<StockAuditService>(StockAuditService);
    usageService = module.get<ProductUsageService>(ProductUsageService);
    alertService = module.get<LowStockAlertService>(LowStockAlertService);
  });

  describe('1. Tenant Isolation Verification', () => {
    it('Salon A owner cannot access Salon B product', async () => {
      productRepo.findById.mockResolvedValueOnce({
        id: 'prod-b',
        salonId: salonB,
        name: 'Salon B Product',
      });

      await expect(productService.getProduct('prod-b', salonA)).rejects.toThrow(ResourceNotFoundException);
    });

    it('Salon A owner cannot access Salon B supplier', async () => {
      supplierRepo.findById.mockResolvedValueOnce({
        id: 'sup-b',
        salonId: salonB,
        name: 'Salon B Supplier',
      });

      await expect(supplierService.getSupplier('sup-b', salonA)).rejects.toThrow(ResourceNotFoundException);
    });

    it('Salon A owner cannot access Salon B purchase order', async () => {
      poRepo.findById.mockResolvedValueOnce({
        id: 'po-b',
        salonId: salonB,
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(poService.getPurchaseOrder('po-b', salonA)).rejects.toThrow(ResourceNotFoundException);
    });

    it('Salon A owner cannot access Salon B stock transfer', async () => {
      transferRepo.findById.mockResolvedValueOnce({
        id: 'trf-b',
        salonId: salonB,
        status: TransferStatus.DRAFT,
      });

      await expect(transferService.getTransfer('trf-b', salonA)).rejects.toThrow(ResourceNotFoundException);
    });

    it('Salon A cannot create transfer between identical branches', async () => {
      await expect(
        transferService.createTransfer(
          {
            salonId: salonA,
            sourceBranchId: branchA1,
            destinationBranchId: branchA1,
            items: [{ productVariantId: 'var-1', dispatchedQuantity: 5 }],
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('2. Inventory Accounting & Ledger Verification', () => {
    it('prevents decreasing stock below available quantity', async () => {
      stockRepo.findByVariant.mockResolvedValueOnce({
        id: 'stock-1',
        quantityOnHand: 10,
        quantityReserved: 5,
        version: 1,
      });

      await expect(
        inventoryService.decreaseStock(salonA, branchA1, 'var-1', 'DEFAULT_BATCH', 10, StockMovementType.SALE, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('records immutable StockMovement with in-transaction audit on increase', async () => {
      stockRepo.upsertStock.mockResolvedValueOnce({
        id: 'stock-1',
        productVariantId: 'var-1',
        quantityOnHand: 20,
      });

      await inventoryService.increaseStock(
        salonA,
        branchA1,
        'var-1',
        'DEFAULT_BATCH',
        10,
        100,
        StockMovementType.PURCHASE_RECEIPT,
        'user-1',
      );

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.PURCHASE_RECEIPT,
          quantity: 10,
        }),
        expect.anything(),
      );
      expect(auditLogger.logInTransaction).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('3. Purchase Order -> GRN -> Stock Integration Flow', () => {
    it('rejects over-receiving goods beyond pending PO item quantity', async () => {
      poRepo.findById.mockResolvedValueOnce({
        id: 'po-1',
        salonId: salonA,
        status: PurchaseOrderStatus.APPROVED,
      });
      poItemRepo.findByPurchaseOrder.mockResolvedValueOnce([
        {
          id: 'poi-1',
          purchaseOrderId: 'po-1',
          productVariantId: 'var-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
        },
      ]);

      await expect(
        grnService.receiveGoods(
          {
            salonId: salonA,
            branchId: branchA1,
            purchaseOrderId: 'po-1',
            supplierId: 'sup-1',
            items: [
              {
                purchaseOrderItemId: 'poi-1',
                productVariantId: 'var-1',
                receivedQuantity: 5,
                acceptedQuantity: 5, // 8 + 5 = 13 > 10
                unitCostPrice: 100,
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('updates PO status to FULLY_RECEIVED when all items are completely received', async () => {
      poRepo.findById.mockResolvedValueOnce({
        id: 'po-1',
        salonId: salonA,
        status: PurchaseOrderStatus.APPROVED,
      });
      poItemRepo.findByPurchaseOrder
        .mockResolvedValueOnce([
          {
            id: 'poi-1',
            purchaseOrderId: 'po-1',
            productVariantId: 'var-1',
            orderedQuantity: 10,
            receivedQuantity: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'poi-1',
            purchaseOrderId: 'po-1',
            productVariantId: 'var-1',
            orderedQuantity: 10,
            receivedQuantity: 10,
          },
        ]);

      grnRepo.create.mockResolvedValueOnce({
        id: 'grn-1',
        grnCode: 'GRN-SAL1-0001',
        purchaseOrderId: 'po-1',
        salonId: salonA,
        branchId: branchA1,
      });

      stockRepo.upsertStock.mockResolvedValueOnce({
        id: 'stock-1',
        productVariantId: 'var-1',
        quantityOnHand: 10,
      });

      await grnService.receiveGoods(
        {
          salonId: salonA,
          branchId: branchA1,
          purchaseOrderId: 'po-1',
          supplierId: 'sup-1',
          items: [
            {
              purchaseOrderItemId: 'poi-1',
              productVariantId: 'var-1',
              receivedQuantity: 10,
              acceptedQuantity: 10,
              unitCostPrice: 100,
            },
          ],
        },
        'user-1',
      );

      expect(poRepo.update).toHaveBeenCalledWith('po-1', { status: PurchaseOrderStatus.FULLY_RECEIVED });
    });
  });

  describe('4. Stock Transfer & Multi-Branch Flow', () => {
    it('correctly manages dispatch (TRANSFER_OUT) and receive (TRANSFER_IN)', async () => {
      transferRepo.findById.mockResolvedValue({
        id: 'trf-1',
        salonId: salonA,
        sourceBranchId: branchA1,
        destinationBranchId: branchA2,
        status: TransferStatus.DRAFT,
      });

      itemTransferRepo.findByTransfer.mockResolvedValue([
        {
          id: 'item-1',
          productVariantId: 'var-1',
          batchNumber: 'DEFAULT_BATCH',
          dispatchedQuantity: 5,
        },
      ]);

      stockRepo.findByVariant.mockResolvedValue({
        id: 'stock-src',
        quantityOnHand: 20,
        version: 1,
      });

      transferRepo.updateStatus.mockResolvedValue({
        id: 'trf-1',
        status: TransferStatus.DISPATCHED,
      });

      const dispatched = await transferService.dispatchTransfer('trf-1', salonA, 'user-1');
      expect(dispatched.status).toBe(TransferStatus.DISPATCHED);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.TRANSFER_OUT,
          quantity: -5,
        }),
        expect.anything(),
      );

      // Now receive transfer at destination branch
      transferRepo.findById.mockResolvedValueOnce({
        id: 'trf-1',
        salonId: salonA,
        sourceBranchId: branchA1,
        destinationBranchId: branchA2,
        status: TransferStatus.DISPATCHED,
      });
      transferRepo.updateStatus.mockResolvedValueOnce({
        id: 'trf-1',
        status: TransferStatus.FULLY_RECEIVED,
      });

      const received = await transferService.receiveTransfer('trf-1', salonA, 'user-1');
      expect(received.status).toBe(TransferStatus.FULLY_RECEIVED);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.TRANSFER_IN,
          quantity: 5,
        }),
        expect.anything(),
      );
    });
  });

  describe('5. Stock Adjustment & Stock Audit Reconciliations', () => {
    it('approved adjustment creates correct movement and updates inventory', async () => {
      adjustmentRepo.findById.mockResolvedValueOnce({
        id: 'adj-1',
        salonId: salonA,
        branchId: branchA1,
        reason: AdjustmentReason.DAMAGE,
        status: 'PENDING_APPROVAL',
      });

      itemAdjustmentRepo.findByAdjustment.mockResolvedValueOnce([
        {
          id: 'adj-item-1',
          productVariantId: 'var-1',
          batchNumber: 'DEFAULT_BATCH',
          systemQuantity: 10,
          actualQuantity: 8,
          adjustmentQuantity: -2,
          unitCostPrice: 50,
        },
      ]);

      stockRepo.findByVariant.mockResolvedValueOnce({
        id: 'stock-1',
        quantityOnHand: 10,
        version: 1,
      });

      adjustmentRepo.approve.mockResolvedValueOnce({
        id: 'adj-1',
        status: 'APPROVED',
      });

      const approved = await adjustmentService.approveAdjustment('adj-1', salonA, 'user-1');
      expect(approved.status).toBe('APPROVED');
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.DAMAGE_WRITE_OFF,
          quantity: -2,
        }),
        expect.anything(),
      );
    });

    it('rejected adjustment does NOT mutate stock or create movements', async () => {
      adjustmentRepo.findById.mockResolvedValueOnce({
        id: 'adj-1',
        salonId: salonA,
        branchId: branchA1,
        reason: AdjustmentReason.SHRINKAGE_THEFT,
        status: 'PENDING_APPROVAL',
      });

      adjustmentRepo.reject.mockResolvedValueOnce({
        id: 'adj-1',
        status: 'REJECTED',
      });

      const rejected = await adjustmentService.rejectAdjustment('adj-1', salonA, 'Unverified', 'user-1');
      expect(rejected.status).toBe('REJECTED');
      expect(stockRepo.updateStock).not.toHaveBeenCalled();
      expect(movementRepo.create).not.toHaveBeenCalled();
    });

    it('completed audit reconciles non-zero variances via AUDIT_CORRECTION', async () => {
      auditRepo.findById.mockResolvedValueOnce({
        id: 'aud-1',
        salonId: salonA,
        branchId: branchA1,
        status: AuditStatus.IN_PROGRESS,
      });

      itemAuditRepo.findByAudit.mockResolvedValueOnce([
        {
          id: 'aud-item-1',
          productVariantId: 'var-1',
          batchNumber: 'DEFAULT_BATCH',
          expectedQuantity: 20,
          countedQuantity: 25,
          unitCostPrice: 100,
        },
      ]);

      stockRepo.findByVariant.mockResolvedValueOnce({
        id: 'stock-1',
        quantityOnHand: 20,
        version: 1,
      });

      auditRepo.updateStatus.mockResolvedValueOnce({
        id: 'aud-1',
        status: AuditStatus.COMPLETED,
      });

      const completed = await auditService.completeAudit('aud-1', salonA, 'user-1');
      expect(completed.status).toBe(AuditStatus.COMPLETED);
      expect(stockRepo.updateStock).toHaveBeenCalledWith('stock-1', 5, 1);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.AUDIT_CORRECTION,
          quantity: 5,
        }),
      );
    });
  });

  describe('6. Product Usage & Salon Backbar Tracking', () => {
    it('deducts inventory and records SERVICE_CONSUMPTION movement on usage', async () => {
      stockRepo.findByVariant.mockResolvedValueOnce({
        id: 'stock-1',
        quantityOnHand: 50,
        quantityReserved: 0,
        version: 1,
      });

      usageRepo.create.mockResolvedValueOnce({
        id: 'usg-1',
        salonId: salonA,
        branchId: branchA1,
        productVariantId: 'var-1',
        quantity: 2,
        usageType: ProductUsageType.SERVICE_CONSUMPTION,
      });

      const usage = await usageService.recordUsage(
        {
          salonId: salonA,
          branchId: branchA1,
          productVariantId: 'var-1',
          quantity: 2,
          usageType: ProductUsageType.SERVICE_CONSUMPTION,
        },
        'user-1',
      );

      expect(usage.id).toBe('usg-1');
      expect(stockRepo.updateStock).toHaveBeenCalledWith('stock-1', -2, 1);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.SERVICE_CONSUMPTION,
          quantity: -2,
        }),
      );
    });
  });
});
