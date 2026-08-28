import { Injectable, Logger } from '@nestjs/common';
import { DatabaseException } from '../../common/exceptions/database.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  ITransactionService,
  PrismaTransaction,
  TransactionOptions,
} from './interfaces/transaction-service.interface';

export const DEFAULT_TRANSACTION_TIMEOUT_MS = 10000; // 10 seconds default

/**
 * TransactionService — Runs database operations inside a Prisma interactive transaction block.
 *
 * Thread Safety: 100% Thread-Safe.
 * Dependencies: PrismaService only.
 * Error Handling: Preserves original cause internally while throwing typed DatabaseException.
 *
 * TRANSACTION BOUNDARY GOVERNANCE RULES:
 * Transactions MAY include:
 *   ✓ Database entity writes
 *   ✓ Database entity reads
 *   ✓ Audit log writes
 *
 * Transactions MUST NEVER include:
 *   ✗ Redis cache operations
 *   ✗ Queue dispatches (BullMQ)
 *   ✗ Email dispatches (SendGrid)
 *   ✗ SMS dispatches (Twilio)
 *   ✗ Cloud storage uploads (Cloudinary/S3)
 *   ✗ External HTTP requests
 *   ✗ Event Bus dispatches
 *
 * Architecture ref: Phase 9.2 §4.3 (TransactionService)
 */
@Injectable()
export class TransactionService implements ITransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes a callback within a Prisma interactive transaction.
   */
  public async run<T>(
    work: (tx: PrismaTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const timeout = options?.timeoutMs ?? DEFAULT_TRANSACTION_TIMEOUT_MS;
    const isolationLevel = options?.isolationLevel;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          return await work(tx as PrismaTransaction);
        },
        {
          timeout,
          ...(isolationLevel ? { isolationLevel } : {}),
        },
      );
    } catch (error: unknown) {
      if (error instanceof DatabaseException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Database transaction failed';
      this.logger.error(`Transaction execution error: ${message}`, error instanceof Error ? error.stack : undefined);
      const dbException = new DatabaseException(message);
      (dbException as any).cause = error;
      throw dbException;
    }
  }

  /**
   * Executes a read-only database query callback within transaction abstraction.
   */
  public async runReadOnly<T>(
    work: (tx: PrismaTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.run(work, options);
  }
}
