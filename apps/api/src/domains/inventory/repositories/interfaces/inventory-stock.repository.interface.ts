import { InventoryStock, LowStockAlert } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchInventoryQueryDto } from '../../dto/search-inventory.dto';

export interface IInventoryStockRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<InventoryStock | null>;
  findByVariant(branchId: string, productVariantId: string, batchNumber?: string, tx?: PrismaTransaction): Promise<InventoryStock | null>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<InventoryStock[]>;
  findByBatch(productVariantId: string, batchNumber: string, tx?: PrismaTransaction): Promise<InventoryStock[]>;
  findLowStock(branchId: string, tx?: PrismaTransaction): Promise<InventoryStock[]>;
  findExpiring(branchId: string, thresholdDate: Date, tx?: PrismaTransaction): Promise<InventoryStock[]>;
  search(query: SearchInventoryQueryDto, tx?: PrismaTransaction): Promise<{ data: InventoryStock[]; total: number }>;
  reserve(id: string, quantity: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock>;
  releaseReservation(id: string, quantity: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock>;
  updateStock(id: string, quantityDelta: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock>;
  upsertStock(data: { salonId: string; branchId: string; productVariantId: string; batchNumber?: string; expiryDate?: Date; quantityOnHand: number }, tx?: PrismaTransaction): Promise<InventoryStock>;
}

export interface ILowStockAlertRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<LowStockAlert | null>;
  findActive(branchId: string, tx?: PrismaTransaction): Promise<LowStockAlert[]>;
  create(data: { salonId: string; branchId: string; productVariantId: string; currentQuantity: number; reorderPoint: number }, tx?: PrismaTransaction): Promise<LowStockAlert>;
  acknowledge(id: string, userId: string, tx?: PrismaTransaction): Promise<LowStockAlert>;
  resolve(id: string, tx?: PrismaTransaction): Promise<LowStockAlert>;
}
