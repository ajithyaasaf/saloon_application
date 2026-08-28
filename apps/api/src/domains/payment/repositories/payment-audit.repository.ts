import { Injectable } from '@nestjs/common';
import { PaymentAudit, Prisma } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IPaymentAuditRepository } from './interfaces/payment-audit.repository.interface';

/**
 * PaymentAuditRepository — Prisma data access for PaymentAudit append-only model.
 *
 * Uses Indexes: `idx_payment_audits_payment`, `idx_payment_audits_created_at`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class PaymentAuditRepository implements IPaymentAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<PaymentAudit[]> {
    const client = tx ?? this.prisma;
    return client.paymentAudit.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(data: Prisma.PaymentAuditUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentAudit> {
    const client = tx ?? this.prisma;
    try {
      return await client.paymentAudit.create({ data });
    } catch (error) {
      throw new DatabaseException('Failed to create payment audit log');
    }
  }
}
