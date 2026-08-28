import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import { DatabaseException } from '../../common/exceptions/database.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../transaction/interfaces/transaction-service.interface';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { IAuditService } from './interfaces/audit-service.interface';

const SYSTEM_ACTOR_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * AuditService — Writes immutable audit log records to database.
 *
 * Thread Safety: 100% Thread-Safe.
 * Dependencies: PrismaService.
 * Error Handling: Wraps failures in DatabaseException (Phase 9.1).
 *
 * PERMANENT ARCHITECTURAL RULE:
 * Audit logging is strictly APPEND-ONLY.
 * Existing audit records MUST NEVER be updated or deleted.
 *
 * Architecture ref: Phase 9.2 §4.1 (AuditService)
 */
@Injectable()
export class AuditService implements IAuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes a single audit log entry directly to database.
   */
  public async log(entry: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: this.toPrismaInput(entry),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to write audit log';
      this.logger.error(`Audit log creation failed: ${message}`, error instanceof Error ? error.stack : undefined);
      const dbException = new DatabaseException(message);
      (dbException as any).cause = error;
      throw dbException;
    }
  }

  /**
   * Writes an audit log entry within an active database transaction.
   */
  public async logInTransaction(tx: PrismaTransaction, entry: CreateAuditLogDto): Promise<void> {
    try {
      await tx.auditLog.create({
        data: this.toPrismaInput(entry),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to write transactional audit log';
      this.logger.error(`Transactional audit log failed: ${message}`, error instanceof Error ? error.stack : undefined);
      const dbException = new DatabaseException(message);
      (dbException as any).cause = error;
      throw dbException;
    }
  }

  /**
   * Writes multiple audit log entries in a single batch operation.
   */
  public async logMany(entries: CreateAuditLogDto[]): Promise<void> {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    try {
      await this.prisma.auditLog.createMany({
        data: entries.map((e) => this.toPrismaInput(e)),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to batch write audit logs';
      this.logger.error(`Batch audit logging failed: ${message}`, error instanceof Error ? error.stack : undefined);
      const dbException = new DatabaseException(message);
      (dbException as any).cause = error;
      throw dbException;
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private toPrismaInput(entry: CreateAuditLogDto): Prisma.AuditLogUncheckedCreateInput {
    let actionEnum: AuditAction = AuditAction.UPDATE;
    if (Object.values(AuditAction).includes(entry.action as AuditAction)) {
      actionEnum = entry.action as AuditAction;
    } else if (entry.action.toLowerCase().includes('create')) {
      actionEnum = AuditAction.CREATE;
    } else if (entry.action.toLowerCase().includes('delete')) {
      actionEnum = AuditAction.DELETE;
    }

    let roleEnum: UserRole = UserRole.CUSTOMER;
    if (entry.actorRole && Object.values(UserRole).includes(entry.actorRole as UserRole)) {
      roleEnum = entry.actorRole as UserRole;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const whoId = entry.actorId && isUuid.test(entry.actorId) ? entry.actorId : SYSTEM_ACTOR_UUID;

    return {
      whoId,
      role: roleEnum,
      action: actionEnum,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValueJson: entry.previousState ? (entry.previousState as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValueJson: entry.newState ? (entry.newState as Prisma.InputJsonValue) : Prisma.JsonNull,
    };
  }
}
