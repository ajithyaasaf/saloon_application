import { Prisma, PrismaClient } from '@prisma/client';

/**
 * PrismaTransaction — Represents an active Prisma interactive transaction client.
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * TransactionOptions — Configuration options for database transactions.
 */
export interface TransactionOptions {
  /** Maximum transaction execution time in milliseconds (defaults to 10000ms) */
  timeoutMs?: number;
  /** Reserved transaction isolation level for high-concurrency modules */
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * ITransactionService — Public interface contract for database transaction runner.
 *
 * Architecture ref: Phase 9.2 §4.3
 */
export interface ITransactionService {
  run<T>(
    work: (tx: PrismaTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  runReadOnly<T>(
    work: (tx: PrismaTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
