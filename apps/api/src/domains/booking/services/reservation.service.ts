import { Injectable, Logger } from '@nestjs/common';
import { SecurityUtil } from '../../../common/utils/security.util';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateReservationLockDto } from '../dto/create-reservation-lock.dto';
import { ReservationLockDto } from '../dto/reservation-lock.dto';
import { ReservationCreatedEvent } from '../events/reservation-created.event';
import { ReservationReleasedEvent } from '../events/reservation-released.event';
import { BookingReservationLockRepository } from '../repositories/booking-reservation-lock.repository';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly lockRepository: BookingReservationLockRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async acquireLock(dto: CreateReservationLockDto): Promise<ReservationLockDto> {
    const now = new Date();
    const existing = await this.lockRepository.findByLockKey(dto.lockKey);
    if (existing && !existing.isReleased && existing.expiresAt.getTime() > now.getTime()) {
      throw new ConflictException(
        ERROR_CODES.BOOKING.SLOT_TAKEN,
        `Slot is already reserved under lock key: ${dto.lockKey}`,
      );
    }

    const createdLock = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const lock = await this.lockRepository.create(
        {
          lockKey: dto.lockKey,
          branchId: dto.branchId,
          staffId: dto.staffId,
          customerId: dto.customerId,
          sessionId: dto.sessionId,
          bookingId: dto.bookingId,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          expiresAt: new Date(dto.expiresAt),
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: dto.customerId,
        actorRole: 'CUSTOMER',
        action: 'RESERVATION_CREATED',
        entityType: 'BookingReservationLock',
        entityId: lock.id,
        newState: lock,
      });

      return lock;
    });

    // Post-commit side effects outside transaction
    await this.eventBusService.publish(
      new ReservationCreatedEvent({
        lockId: createdLock.id,
        lockKey: createdLock.lockKey,
        branchId: createdLock.branchId,
        staffId: createdLock.staffId,
        customerId: createdLock.customerId,
        startTime: createdLock.startTime,
        endTime: createdLock.endTime,
        expiresAt: createdLock.expiresAt,
      }),
    );

    return this.toLockDto(createdLock);
  }

  public async extendLock(lockKey: string, customerId: string): Promise<ReservationLockDto> {
    const now = new Date();
    const existing = await this.lockRepository.findByLockKey(lockKey);
    if (!existing || existing.isReleased || existing.expiresAt.getTime() <= now.getTime()) {
      throw new ValidationException('Cannot extend lock: reservation lock does not exist or is expired');
    }

    if (existing.customerId !== customerId) {
      throw new ValidationException('Cannot extend lock: customerId does not match lock owner');
    }

    if (existing.refreshCount >= 1) {
      throw new ValidationException('Cannot extend lock: maximum refresh limit (1) exceeded');
    }

    const newExpiresAt = new Date(existing.expiresAt.getTime() + 5 * 60 * 1000); // +5 minutes

    const updatedLock = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const lock = await this.lockRepository.update(
        existing.id,
        {
          expiresAt: newExpiresAt,
          refreshCount: existing.refreshCount + 1,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'RESERVATION_EXTENDED',
        entityType: 'BookingReservationLock',
        entityId: lock.id,
        previousState: existing,
        newState: lock,
      });

      return lock;
    });

    return this.toLockDto(updatedLock);
  }

  public async releaseLock(lockKey: string, reason = 'Customer released lock'): Promise<void> {
    const existing = await this.lockRepository.findByLockKey(lockKey);
    if (!existing || existing.isReleased) {
      return; // Idempotent release
    }

    await this.transactionService.run(async (tx: PrismaTransaction) => {
      await this.lockRepository.release(lockKey, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: existing.customerId,
        actorRole: 'CUSTOMER',
        action: 'RESERVATION_RELEASED',
        entityType: 'BookingReservationLock',
        entityId: existing.id,
        newState: { isReleased: true, reason },
      });
    });

    await this.eventBusService.publish(
      new ReservationReleasedEvent({
        lockKey,
        releasedAt: new Date(),
        reason,
      }),
    );
  }

  public async cleanupExpiredLocks(now: Date = new Date()): Promise<number> {
    const expiredLocks = await this.lockRepository.findExpired(now);
    if (expiredLocks.length === 0) {
      return 0;
    }

    let count = 0;
    for (const lock of expiredLocks) {
      try {
        await this.releaseLock(lock.lockKey, 'System reservation lock expired');
        count++;
      } catch (error) {
        this.logger.error(`Failed to cleanup expired lock ${lock.lockKey}: ${error}`);
      }
    }

    return count;
  }

  public generateSecureLockToken(): string {
    return SecurityUtil.generateRandomToken(32);
  }

  private toLockDto(lock: any): ReservationLockDto {
    return {
      id: lock.id,
      lockKey: lock.lockKey,
      branchId: lock.branchId,
      staffId: lock.staffId,
      customerId: lock.customerId,
      sessionId: lock.sessionId ?? undefined,
      bookingId: lock.bookingId ?? undefined,
      startTime: lock.startTime,
      endTime: lock.endTime,
      expiresAt: lock.expiresAt,
      refreshCount: lock.refreshCount,
      isReleased: lock.isReleased,
      createdAt: lock.createdAt,
    };
  }
}
