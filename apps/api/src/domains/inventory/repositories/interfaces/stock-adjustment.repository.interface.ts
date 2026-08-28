import { StockAdjustment, StockAdjustmentItem } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateStockAdjustmentDto } from '../../dto/stock-adjustment.dto';

export interface IStockAdjustmentRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StockAdjustment | null>;
  findByCode(adjustmentCode: string, tx?: PrismaTransaction): Promise<StockAdjustment | null>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StockAdjustment[]>;
  create(dto: CreateStockAdjustmentDto, adjustmentCode: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment>;
  approve(id: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment>;
  reject(id: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment>;
}

export interface IStockAdjustmentItemRepository {
  findByAdjustment(stockAdjustmentId: string, tx?: PrismaTransaction): Promise<StockAdjustmentItem[]>;
}
