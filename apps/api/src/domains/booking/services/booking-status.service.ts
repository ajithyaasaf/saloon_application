import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { BookingDto } from '../dto/booking.dto';
import { BookingEntity } from '../entities/booking.entity';
import { BookingCheckedInEvent } from '../events/booking-checked-in.event';
import { BookingCompletedEvent } from '../events/booking-completed.event';
import { BookingInProgressEvent } from '../events/booking-in-progress.event';
import { BookingNoShowEvent } from '../events/booking-no-show.event';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';

@Injectable()
export class BookingStatusService {
  private readonly logger = new Logger(BookingStatusService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly statusHistoryRepository: BookingStatusHistoryRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async checkIn(
    id: string,
    expectedVersion: number,
    performedByUserId: string,
    actorRole: string,
  ): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.canCheckIn()) {
      throw new ValidationException(`Cannot check in booking ${id}: current status is ${booking.status}, expected CONFIRMED`);
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        { status: BookingStatus.CHECKED_IN, updatedByUserId: performedByUserId },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CHECKED_IN,
          performedByUserId,
          actorRole,
          reason: 'Customer checked in at salon branch',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: performedByUserId,
        actorRole,
        action: 'BOOKING_CHECKED_IN',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.CHECKED_IN },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);
    await this.eventBusService.publish(
      new BookingCheckedInEvent(
        {
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.bookingCode,
          salonId: updatedBooking.salonId,
          branchId: updatedBooking.branchId,
          customerId: updatedBooking.customerId,
          checkedInAt: new Date(),
        },
        performedByUserId,
        actorRole,
      ),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async startService(
    id: string,
    expectedVersion: number,
    performedByUserId: string,
    actorRole: string,
  ): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.canStart()) {
      throw new ValidationException(`Cannot start booking ${id}: current status is ${booking.status}, expected CHECKED_IN`);
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        { status: BookingStatus.IN_PROGRESS, updatedByUserId: performedByUserId },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.IN_PROGRESS,
          performedByUserId,
          actorRole,
          reason: 'Service execution started',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: performedByUserId,
        actorRole,
        action: 'BOOKING_IN_PROGRESS',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.IN_PROGRESS },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);
    await this.eventBusService.publish(
      new BookingInProgressEvent(
        {
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.bookingCode,
          salonId: updatedBooking.salonId,
          branchId: updatedBooking.branchId,
          customerId: updatedBooking.customerId,
          startedAt: new Date(),
        },
        performedByUserId,
        actorRole,
      ),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async completeBooking(
    id: string,
    expectedVersion: number,
    performedByUserId: string,
    actorRole: string,
  ): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.canComplete()) {
      throw new ValidationException(`Cannot complete booking ${id}: current status is ${booking.status}, expected IN_PROGRESS`);
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        { status: BookingStatus.COMPLETED, updatedByUserId: performedByUserId },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.COMPLETED,
          performedByUserId,
          actorRole,
          reason: 'All services finished successfully',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: performedByUserId,
        actorRole,
        action: 'BOOKING_COMPLETED',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.COMPLETED },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);
    await this.eventBusService.publish(
      new BookingCompletedEvent(
        {
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.bookingCode,
          salonId: updatedBooking.salonId,
          branchId: updatedBooking.branchId,
          customerId: updatedBooking.customerId,
          completedAt: new Date(),
        },
        performedByUserId,
        actorRole,
      ),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async markNoShow(
    id: string,
    expectedVersion: number,
    performedByUserId: string,
    actorRole: string,
    reason?: string,
  ): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new ValidationException(`Cannot mark no-show for booking ${id}: status is ${booking.status}`);
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        { status: BookingStatus.NO_SHOW, updatedByUserId: performedByUserId, cancellationReason: reason },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.NO_SHOW,
          performedByUserId,
          actorRole,
          reason: reason || 'Customer failed to arrive at branch',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: performedByUserId,
        actorRole,
        action: 'BOOKING_NO_SHOW',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.NO_SHOW, reason },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);
    await this.eventBusService.publish(
      new BookingNoShowEvent(
        {
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.bookingCode,
          salonId: updatedBooking.salonId,
          branchId: updatedBooking.branchId,
          customerId: updatedBooking.customerId,
          reason,
        },
        performedByUserId,
        actorRole,
      ),
    );

    return this.toBookingDto(updatedBooking);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async getExistingBooking(id: string) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new ValidationException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  private async invalidateCache(booking: any): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`booking:${booking.id}:detail`),
      this.cacheService.delete(`customer:${booking.customerId}:active_bookings`),
      this.cacheService.delete(`branch:${booking.branchId}:bookings`),
    ]);
  }

  private toBookingDto(b: any): BookingDto {
    return {
      id: b.id,
      bookingCode: b.bookingCode,
      sequenceNumber: typeof b.sequenceNumber === 'bigint' ? b.sequenceNumber.toString() : String(b.sequenceNumber),
      salonId: b.salonId,
      branchId: b.branchId,
      customerId: b.customerId,
      walkInType: b.walkInType,
      isWalkIn: b.isWalkIn,
      status: b.status,
      paymentStatus: b.paymentStatus,
      cancellationReason: b.cancellationReason ?? undefined,
      cancelledByUserId: b.cancelledByUserId ?? undefined,
      cancelledAt: b.cancelledAt ?? undefined,
      rescheduleCount: b.rescheduleCount,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      totalDurationMinutes: b.totalDurationMinutes,
      subtotalAmount: b.subtotalAmount,
      taxAmount: b.taxAmount,
      discountAmount: b.discountAmount,
      totalAmount: b.totalAmount,
      currency: b.currency,
      paymentId: b.paymentId ?? undefined,
      couponId: b.couponId ?? undefined,
      reviewId: b.reviewId ?? undefined,
      notes: b.notes ?? undefined,
      internalNotes: b.internalNotes ?? undefined,
      clientIp: b.clientIp ?? undefined,
      userAgent: b.userAgent ?? undefined,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }
}
