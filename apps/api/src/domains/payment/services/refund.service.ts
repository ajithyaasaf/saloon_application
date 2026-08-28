import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import { PaymentRefundedEvent } from '../events/payment-refunded.event';
import { RefundCompletedEvent } from '../events/refund-completed.event';
import { RefundCreatedEvent } from '../events/refund-created.event';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentStatusService } from './payment-status.service';

/**
 * RefundService — Core domain orchestration for Refund processing.
 *
 * Enforces: Maximum refundable amount, non-negative bounds, status transitions.
 * Execution Order: DB Transaction -> Audit Log -> Commit -> Cache -> Events
 *
 * Architecture ref: Phase 14.0 & Phase 14.3
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly refundRepo: RefundRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditRepo: PaymentAuditRepository,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createRefund(dto: CreateRefundDto, actorUserId: string): Promise<RefundEntity> {
    const payment = await this.paymentRepo.findById(dto.paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${dto.paymentId} not found`);
    }

    const paymentEntity = new PaymentEntity(payment);
    if (!paymentEntity.canRefund()) {
      throw new ValidationException(
        `Payment ${dto.paymentId} in status ${payment.status} cannot be refunded or has 0 remaining balance`,
      );
    }

    const maxRefundable = paymentEntity.remainingAmount();
    if (dto.amount > maxRefundable) {
      throw new ValidationException(
        `Requested refund amount ${dto.amount} exceeds max refundable balance ${maxRefundable}`,
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = SecurityUtil.generateRandomToken(4).toUpperCase();
    const refundCode = `RFD-${dateStr}-${randomSuffix}`;

    const createdRefund = await this.transactionService.run(async (tx) => {
      const refund = await this.refundRepo.create(
        {
          refundCode,
          paymentId: dto.paymentId,
          bookingId: dto.bookingId,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          reason: dto.reason,
          gatewayRefundId: dto.gatewayRefundId,
          provider: dto.provider,
          status: RefundStatus.PENDING,
          processedByUserId: actorUserId,
          createdByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: dto.paymentId,
          action: 'REFUND_CREATED',
          actorUserId,
          newState: RefundStatus.PENDING,
          metadata: { refundId: refund.id, amount: dto.amount, reason: dto.reason },
        },
        tx,
      );

      return refund;
    });

    const entity = new RefundEntity(createdRefund);

    // Post-commit
    await this.eventBus.publish(
      new RefundCreatedEvent(
        {
          refundId: entity.id,
          refundCode: entity.refundCode,
          paymentId: entity.paymentId,
          bookingId: entity.bookingId,
          amount: entity.amount,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async approveRefund(refundId: string, actorUserId: string): Promise<RefundEntity> {
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new ValidationException(
        `Refund ${refundId} in status ${refund.status} cannot be approved`,
      );
    }

    const updatedRefund = await this.transactionService.run(async (tx) => {
      return this.refundRepo.update(
        refund.id,
        refund.version,
        {
          status: RefundStatus.PROCESSING,
          updatedByUserId: actorUserId,
        },
        tx,
      );
    });

    return new RefundEntity(updatedRefund);
  }

  public async processRefund(refundId: string, gatewayRefundId: string, actorUserId: string): Promise<RefundEntity> {
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Refund ${refundId} not found`);
    }

    const payment = await this.paymentRepo.findById(refund.paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Associated payment ${refund.paymentId} not found`);
    }

    const newAmountRefunded = payment.amountRefunded + refund.amount;
    const isFullyRefunded = newAmountRefunded >= payment.amountPaid;
    const targetPaymentStatus = isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

    const [updatedRefund, updatedPayment] = await this.transactionService.run(async (tx) => {
      const rfd = await this.refundRepo.update(
        refund.id,
        refund.version,
        {
          status: RefundStatus.SUCCESS,
          gatewayRefundId,
          processedAt: new Date(),
          updatedByUserId: actorUserId,
        },
        tx,
      );

      const pay = await this.paymentRepo.update(
        payment.id,
        payment.version,
        {
          status: targetPaymentStatus,
          amountRefunded: newAmountRefunded,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_REFUNDED',
          actorUserId,
          previousState: payment.status,
          newState: targetPaymentStatus,
          metadata: { refundId: refund.id, amountRefunded: refund.amount, gatewayRefundId },
        },
        tx,
      );

      return [rfd, pay] as const;
    });

    const refundEntity = new RefundEntity(updatedRefund);
    const paymentEntity = new PaymentEntity(updatedPayment);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.PAYMENT_DETAIL(payment.id));
    await this.eventBus.publish(
      new RefundCompletedEvent(
        {
          refundId: refundEntity.id,
          refundCode: refundEntity.refundCode,
          paymentId: refundEntity.paymentId,
          bookingId: refundEntity.bookingId,
          amount: refundEntity.amount,
          gatewayRefundId,
        },
        actorUserId,
      ),
    );

    await this.eventBus.publish(
      new PaymentRefundedEvent(
        {
          paymentId: paymentEntity.id,
          paymentCode: paymentEntity.paymentCode,
          bookingId: paymentEntity.bookingId,
          amountRefunded: refundEntity.amount,
          isFullyRefunded,
        },
        actorUserId,
      ),
    );

    return refundEntity;
  }

  public async cancelRefund(refundId: string, reason: string, actorUserId: string): Promise<RefundEntity> {
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Refund ${refundId} not found`);
    }

    if (refund.status === RefundStatus.SUCCESS) {
      throw new ValidationException(
        `Cannot cancel completed refund ${refundId}`,
      );
    }

    const updatedRefund = await this.transactionService.run(async (tx) => {
      const rfd = await this.refundRepo.update(
        refund.id,
        refund.version,
        {
          status: RefundStatus.CANCELLED,
          reason,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: refund.paymentId,
          action: 'REFUND_CANCELLED',
          actorUserId,
          previousState: refund.status,
          newState: RefundStatus.CANCELLED,
          metadata: { refundId, reason },
        },
        tx,
      );

      return rfd;
    });

    return new RefundEntity(updatedRefund);
  }

  public async getRefundHistory(paymentId: string): Promise<RefundEntity[]> {
    const refunds = await this.refundRepo.findByPayment(paymentId);
    return refunds.map((r) => new RefundEntity(r));
  }
}
