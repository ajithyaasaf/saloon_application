import { StockMovement } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchMovementQueryDto } from '../../dto/search-inventory.dto';

export interface IStockMovementRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StockMovement | null>;
  create(
    data: {
      movementCode: string;
      salonId: string;
      branchId: string;
      productVariantId: string;
      batchNumber?: string;
      type: any;
      quantity: number;
      unitCostPrice?: number;
      totalValue?: number;
      previousQuantity: number;
      newQuantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      actorUserId: string;
    },
    tx?: PrismaTransaction,
  ): Promise<StockMovement>;
  findByReference(referenceType: string, referenceId: string, tx?: PrismaTransaction): Promise<StockMovement[]>;
  findByVariant(productVariantId: string, tx?: PrismaTransaction): Promise<StockMovement[]>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StockMovement[]>;
  search(query: SearchMovementQueryDto, tx?: PrismaTransaction): Promise<{ data: StockMovement[]; total: number }>;
}
