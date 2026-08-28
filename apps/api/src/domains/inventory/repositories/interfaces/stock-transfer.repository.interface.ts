import { StockTransfer, StockTransferItem } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateStockTransferDto } from '../../dto/stock-transfer.dto';
import { SearchTransferQueryDto } from '../../dto/search-inventory.dto';

export interface IStockTransferRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StockTransfer | null>;
  findByCode(transferCode: string, tx?: PrismaTransaction): Promise<StockTransfer | null>;
  findPending(branchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]>;
  findBySourceBranch(sourceBranchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]>;
  findByDestinationBranch(destinationBranchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]>;
  search(query: SearchTransferQueryDto, tx?: PrismaTransaction): Promise<{ data: StockTransfer[]; total: number }>;
  create(dto: CreateStockTransferDto, transferCode: string, tx?: PrismaTransaction): Promise<StockTransfer>;
  updateStatus(id: string, status: any, userId?: string, tx?: PrismaTransaction): Promise<StockTransfer>;
}

export interface IStockTransferItemRepository {
  findByTransfer(stockTransferId: string, tx?: PrismaTransaction): Promise<StockTransferItem[]>;
}
