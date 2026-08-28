import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — the single database connection point for the entire application.
 *
 * Design rules (from Phase 5 architecture):
 *  - Extends PrismaClient with NestJS lifecycle hooks.
 *  - Calls $connect() on init and $disconnect() on destroy.
 *  - Registers soft-delete middleware: automatically appends
 *    `deletedAt IS NULL` to findMany/findFirst queries on soft-deletable models.
 *  - Registers query-logging middleware in development mode.
 *  - No raw `new PrismaClient()` is ever permitted outside this service.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
    this.registerMiddleware();
    this.registerQueryLogging();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Soft-delete middleware.
   * Intercepts findMany and findFirst queries on models that have a `deletedAt`
   * column and automatically appends `deletedAt: null` to the WHERE clause.
   * This ensures soft-deleted records are never returned by default queries.
   */
  private registerMiddleware(): void {
    // Soft-deletable model names (must match Prisma model names exactly)
    const softDeletableModels = new Set([
      'User',
      'Salon',
      'Branch',
      'Staff',
    ]);

    this.$use(async (params, next) => {
      if (
        params.model &&
        softDeletableModels.has(params.model) &&
        (params.action === 'findFirst' || params.action === 'findMany')
      ) {
        // Ensure we don't override an explicit deletedAt filter set by the caller
        const where = params.args?.where ?? {};
        if (where.deletedAt === undefined) {
          params.args = {
            ...params.args,
            where: { ...where, deletedAt: null },
          };
        }
      }
      return next(params);
    });
  }

  /**
   * Query logging middleware — development only.
   * Logs query text and duration. Slow queries (>500ms) are flagged.
   */
  private registerQueryLogging(): void {
    if (process.env.NODE_ENV !== 'development') return;

    // @ts-expect-error — Prisma event typing requires cast
    this.$on('query', (event: { query: string; duration: number }) => {
      if (event.duration > 500) {
        this.logger.warn(
          `SLOW QUERY (${event.duration}ms): ${event.query.substring(0, 200)}`,
        );
      } else {
        this.logger.debug(`Query (${event.duration}ms)`);
      }
    });
  }

  /**
   * Health check helper used by the /health/readiness endpoint.
   * Runs a lightweight query to verify database connectivity.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
