import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { SearchPaymentQueryDto } from '../dto/search-payment-query.dto';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentAuthorizedEvent } from '../events/payment-authorized.event';
import { PaymentCancelledEvent } from '../events/payment-cancelled.event';
import { PaymentCompletedEvent } from '../events/payment-completed.event';
import { PaymentCreatedEvent } from '../events/payment-created.event';
import { PaymentExpiredEvent } from '../events/payment-expired.event';
import { IPaymentProviderGateway } from '../interfaces/payment-provider-gateway.interface';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatusService } from './payment-status.service';

/**
 * PaymentService — Core domain orchestration for Payment aggregate root.
 *
 * Execution Order: DB Transaction -> Audit Log -> Commit -> Cache -> Events -> Notifications -> Queue
 *
 * Architecture ref: Phase 14.0 & Phase 14.3
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly transactionRepo: PaymentTransactionRepository,
    private readonly auditRepo: PaymentAuditRepository,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly queueService: QueueService,
  ) {}

  public async createPayment(dto: CreatePaymentDto, actorUserId: string): Promise<PaymentEntity> {
    const existing = await this.paymentRepo.findByIdempotencyKey(dto.idempotencyKey);
    if (existing) {
      return new PaymentEntity(existing);
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = SecurityUtil.generateRandomToken(4).toUpperCase();
    const paymentCode = `PAY-${dateStr}-${randomSuffix}`;
    const amountDue = dto.amountDue ?? (dto.amountTotal - (dto.amountPaid ?? 0));

    const createdPayment = await this.transactionService.run(async (tx) => {
      const payment = await this.paymentRepo.create(
        {
          paymentCode,
          bookingId: dto.bookingId,
          salonId: dto.salonId,
          branchId: dto.branchId,
          customerId: dto.customerId,
          status: PaymentStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          provider: dto.provider,
          currency: dto.currency || 'INR',
          amountTotal: dto.amountTotal,
          amountPaid: dto.amountPaid ?? 0,
          amountRefunded: 0,
          amountDue,
          isPartialAllowed: dto.isPartialAllowed ?? false,
          idempotencyKey: dto.idempotencyKey,
          createdByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_CREATED',
          actorUserId,
          newState: PaymentStatus.PENDING,
          metadata: { amountTotal: dto.amountTotal, provider: dto.provider },
        },
        tx,
      );

      return payment;
    });

    const entity = new PaymentEntity(createdPayment);

    // Post-commit side effects
    await this.eventBus.publish(
      new PaymentCreatedEvent(
        {
          paymentId: entity.id,
          paymentCode: entity.paymentCode,
          bookingId: entity.bookingId,
          salonId: entity.salonId,
          branchId: entity.branchId,
          customerId: entity.customerId,
          amountTotal: entity.amountTotal,
          currency: entity.currency,
          idempotencyKey: entity.idempotencyKey,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async authorizePayment(
    paymentId: string,
    amount: number,
    providerTransactionId: string,
    actorUserId: string,
    txGateway?: IPaymentProviderGateway,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${paymentId} not found`);
    }

    const currentEntity = new PaymentEntity(payment);
    this.paymentStatusService.validateTransition(currentEntity.status, PaymentStatus.AUTHORIZED);

    const updatedPayment = await this.transactionService.run(async (tx) => {
      const updated = await this.paymentRepo.update(
        payment.id,
        payment.version,
        {
          status: PaymentStatus.AUTHORIZED,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.transactionRepo.create(
        {
          paymentId: payment.id,
          providerTransactionId,
          paymentMethod: payment.paymentMethod,
          provider: payment.provider,
          amount,
          currency: payment.currency,
          status: PaymentStatus.AUTHORIZED,
          createdByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_AUTHORIZED',
          actorUserId,
          previousState: payment.status,
          newState: PaymentStatus.AUTHORIZED,
          metadata: { providerTransactionId, amount },
        },
        tx,
      );

      return updated;
    });

    const entity = new PaymentEntity(updatedPayment);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.PAYMENT_DETAIL(paymentId));
    await this.eventBus.publish(
      new PaymentAuthorizedEvent(
        {
          paymentId: entity.id,
          paymentCode: entity.paymentCode,
          bookingId: entity.bookingId,
          amount,
          providerTransactionId,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async capturePayment(
    paymentId: string,
    amount: number,
    providerTransactionId: string,
    actorUserId: string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${paymentId} not found`);
    }

    const currentEntity = new PaymentEntity(payment);
    const newPaidAmount = payment.amountPaid + amount;
    const newAmountDue = Math.max(0, payment.amountTotal - newPaidAmount);
    const isFullyPaid = newAmountDue === 0;
    const targetStatus = isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING;

    this.paymentStatusService.validateTransition(currentEntity.status, targetStatus);

    const updatedPayment = await this.transactionService.run(async (tx) => {
      const updated = await this.paymentRepo.update(
        payment.id,
        payment.version,
        {
          status: targetStatus,
          amountPaid: newPaidAmount,
          amountDue: newAmountDue,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.transactionRepo.create(
        {
          paymentId: payment.id,
          providerTransactionId,
          paymentMethod: payment.paymentMethod,
          provider: payment.provider,
          amount,
          currency: payment.currency,
          status: PaymentStatus.PAID,
          processedAt: new Date(),
          createdByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_CAPTURED',
          actorUserId,
          previousState: payment.status,
          newState: targetStatus,
          metadata: { amount, newPaidAmount, providerTransactionId },
        },
        tx,
      );

      return updated;
    });

    const entity = new PaymentEntity(updatedPayment);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.PAYMENT_DETAIL(paymentId));
    await this.eventBus.publish(
      new PaymentCompletedEvent(
        {
          paymentId: entity.id,
          paymentCode: entity.paymentCode,
          bookingId: entity.bookingId,
          salonId: entity.salonId,
          branchId: entity.branchId,
          customerId: entity.customerId,
          amountPaid: entity.amountPaid,
          currency: entity.currency,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async cancelPayment(paymentId: string, reason: string, actorUserId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${paymentId} not found`);
    }

    const currentEntity = new PaymentEntity(payment);
    if (!currentEntity.canCancel()) {
      throw new ValidationException(
        `Payment ${paymentId} in status ${payment.status} cannot be cancelled`,
      );
    }

    this.paymentStatusService.validateTransition(currentEntity.status, PaymentStatus.CANCELLED);

    const updatedPayment = await this.transactionService.run(async (tx) => {
      const updated = await this.paymentRepo.update(
        payment.id,
        payment.version,
        {
          status: PaymentStatus.CANCELLED,
          updatedByUserId: actorUserId,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_CANCELLED',
          actorUserId,
          previousState: payment.status,
          newState: PaymentStatus.CANCELLED,
          metadata: { reason },
        },
        tx,
      );

      return updated;
    });

    const entity = new PaymentEntity(updatedPayment);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.PAYMENT_DETAIL(paymentId));
    await this.eventBus.publish(
      new PaymentCancelledEvent(
        {
          paymentId: entity.id,
          paymentCode: entity.paymentCode,
          bookingId: entity.bookingId,
          reason,
        },
        actorUserId,
      ),
    );

    return entity;
  }

  public async expirePayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${paymentId} not found`);
    }

    const currentEntity = new PaymentEntity(payment);
    this.paymentStatusService.validateTransition(currentEntity.status, PaymentStatus.EXPIRED);

    const updatedPayment = await this.transactionService.run(async (tx) => {
      const updated = await this.paymentRepo.update(
        payment.id,
        payment.version,
        {
          status: PaymentStatus.EXPIRED,
        },
        tx,
      );

      await this.auditRepo.create(
        {
          paymentId: payment.id,
          action: 'PAYMENT_EXPIRED',
          actorUserId: 'SYSTEM',
          previousState: payment.status,
          newState: PaymentStatus.EXPIRED,
        },
        tx,
      );

      return updated;
    });

    const entity = new PaymentEntity(updatedPayment);

    // Post-commit
    await this.cacheService.delete(CACHE_KEYS.PAYMENT_DETAIL(paymentId));
    await this.eventBus.publish(
      new PaymentExpiredEvent({
        paymentId: entity.id,
        paymentCode: entity.paymentCode,
        bookingId: entity.bookingId,
      }),
    );

    return entity;
  }

  public async getPayment(paymentId: string): Promise<PaymentEntity> {
    return this.cacheService.getOrSet(CACHE_KEYS.PAYMENT_DETAIL(paymentId), async () => {
      const payment = await this.paymentRepo.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Payment ${paymentId} not found`);
      }
      return new PaymentEntity(payment);
    }, 600);
  }

  public async searchPayments(query: SearchPaymentQueryDto): Promise<{ data: PaymentEntity[]; meta: PaginationMeta }> {
    const { data, meta } = await this.paymentRepo.search(query);
    return {
      data: data.map((p) => new PaymentEntity(p)),
      meta,
    };
  }
}
