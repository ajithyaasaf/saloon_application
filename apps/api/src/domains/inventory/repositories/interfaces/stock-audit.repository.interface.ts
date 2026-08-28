import { StockAudit, StockAuditItem } from '@prisma/client';
import { CreateStockAuditDto } from '../../dto/stock-audit.dto';
import { SearchAuditQueryDto } from '../../dto/search-inventory.dto';

export interface IStockAuditRepository {
  findById(id: string): Promise<StockAudit | null>;
  findByCode(auditCode: string): Promise<StockAudit | null>;
  findByBranch(branchId: string): Promise<StockAudit[]>;
  search(query: SearchAuditQueryDto): Promise<{ data: StockAudit[]; total: number }>;
  create(dto: CreateStockAuditDto, auditCode: string, userId: string): Promise<StockAudit>;
  updateStatus(id: string, status: any, userId?: string): Promise<StockAudit>;
}

export interface IStockAuditItemRepository {
  findByAudit(stockAuditId: string): Promise<StockAuditItem[]>;
}
