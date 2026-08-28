import { PrismaTransaction } from '../../transaction/interfaces/transaction-service.interface';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';

/**
 * IAuditService — Public interface contract for audit log writing.
 *
 * Architecture ref: Phase 9.2 §4.1
 */
export interface IAuditService {
  log(entry: CreateAuditLogDto): Promise<void>;
  logInTransaction(tx: PrismaTransaction, entry: CreateAuditLogDto): Promise<void>;
  logMany(entries: CreateAuditLogDto[]): Promise<void>;
}
