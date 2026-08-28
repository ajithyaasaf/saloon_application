import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { EventsModule } from '../../shared/events/events.module';
import { SharedNotificationModule } from '../../shared/notification/notification.module';
import { SharedQueueModule } from '../../shared/queue/queue.module';
import { TransactionModule } from '../../shared/transaction/transaction.module';

import {
  BrandRepository,
  ProductCategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  UnitOfMeasureRepository,
} from './repositories/product.repository';
import { SupplierContactRepository, SupplierRepository } from './repositories/supplier.repository';
import {
  GoodsReceivedItemRepository,
  GoodsReceivedNoteRepository,
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
} from './repositories/purchase-order.repository';
import { InventoryStockRepository, LowStockAlertRepository } from './repositories/inventory-stock.repository';
import { StockMovementRepository } from './repositories/stock-movement.repository';
import { StockTransferItemRepository, StockTransferRepository } from './repositories/stock-transfer.repository';
import { StockAdjustmentItemRepository, StockAdjustmentRepository } from './repositories/stock-adjustment.repository';
import { StockAuditItemRepository, StockAuditRepository } from './repositories/stock-audit.repository';
import { ProductUsageRepository } from './repositories/product-usage.repository';

import { ProductService } from './services/product.service';
import { SupplierService } from './services/supplier.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { GoodsReceivedService } from './services/goods-received.service';
import { InventoryService } from './services/inventory.service';
import { StockMovementService } from './services/stock-movement.service';
import { StockTransferService } from './services/stock-transfer.service';
import { StockAdjustmentService } from './services/stock-adjustment.service';
import { StockAuditService } from './services/stock-audit.service';
import { ProductUsageService } from './services/product-usage.service';
import { LowStockAlertService } from './services/low-stock-alert.service';

import { InventoryPublicController } from './controllers/inventory-public.controller';
import { InventoryOwnerController } from './controllers/inventory-owner.controller';
import { InventoryAdminController } from './controllers/inventory-admin.controller';

const REPOSITORIES = [
  ProductRepository,
  ProductVariantRepository,
  ProductCategoryRepository,
  BrandRepository,
  UnitOfMeasureRepository,
  SupplierRepository,
  SupplierContactRepository,
  PurchaseOrderRepository,
  PurchaseOrderItemRepository,
  GoodsReceivedNoteRepository,
  GoodsReceivedItemRepository,
  InventoryStockRepository,
  LowStockAlertRepository,
  StockMovementRepository,
  StockTransferRepository,
  StockTransferItemRepository,
  StockAdjustmentRepository,
  StockAdjustmentItemRepository,
  StockAuditRepository,
  StockAuditItemRepository,
  ProductUsageRepository,
];

const SERVICES = [
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
];

const CONTROLLERS = [
  InventoryPublicController,
  InventoryOwnerController,
  InventoryAdminController,
];

@Module({
  imports: [
    DatabaseModule,
    TransactionModule,
    AuditModule,
    SharedCacheModule,
    EventsModule,
    SharedNotificationModule,
    SharedQueueModule,
  ],
  controllers: [...CONTROLLERS],
  providers: [...REPOSITORIES, ...SERVICES],
  exports: [...REPOSITORIES, ...SERVICES],
})
export class InventoryModule {}
