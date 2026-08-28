import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { SecurityUtil } from '../../../common/utils/security.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { BookingDetailDto } from '../dto/booking-detail.dto';
import { BookingDto } from '../dto/booking.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { PaginatedBookingsDto } from '../dto/paginated-bookings.dto';
import { SearchBookingQueryDto } from '../dto/search-booking-query.dto';
import { BookingEntity } from '../entities/booking.entity';
import { BookingCancelledEvent } from '../events/booking-cancelled.event';
import { BookingConfirmedEvent } from '../events/booking-confirmed.event';
import { BookingCreatedEvent } from '../events/booking-created.event';
import { BookingExpiredEvent } from '../events/booking-expired.event';
import { BookingItemRepository } from '../repositories/booking-item.repository';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';
import { AvailabilityService } from './availability.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingRepository: BookingRepository,
    private readonly bookingItemRepository: BookingItemRepository,
    private readonly statusHistoryRepository: BookingStatusHistoryRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
  ) {}

  public async createBooking(dto: CreateBookingDto): Promise<BookingDto> {
    const bookingDate = new Date(dto.bookingDate);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // 1. Check availability / overlaps for items
    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const itemStart = new Date(item.startTime);
        const itemEnd = new Date(item.endTime);

        const availableStaff = await this.availabilityService.findAvailableStaff(
          dto.branchId,
          bookingDate,
          itemStart,
          itemEnd,
          item.branchServiceId,
        );

        const isAssignedStaffAvailable = availableStaff.some((s) => s.id === item.staffId);
        if (!isAssignedStaffAvailable) {
          throw new ConflictException(
            ERROR_CODES.BOOKING.SLOT_TAKEN,
            `Selected staff ${item.staffId} is not available for slot ${itemStart.toISOString()} - ${itemEnd.toISOString()}`,
          );
        }
      }
    }

    // 2. Generate code and sequence
    const bookingCode = dto.bookingCode || this.generateBookingCode(bookingDate);
    const sequenceNumber = dto.sequenceNumber ? BigInt(dto.sequenceNumber) : await this.getNextSequenceNumber(dto.salonId);

    // 3. Execute atomic transaction
    const createdBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const booking = await this.bookingRepository.create(
        {
          bookingCode,
          sequenceNumber,
          salonId: dto.salonId,
          branchId: dto.branchId,
          customerId: dto.customerId,
          walkInType: dto.walkInType,
          isWalkIn: dto.isWalkIn,
          status: dto.status || BookingStatus.PENDING,
          paymentStatus: dto.paymentStatus || PaymentStatus.UNPAID,
          bookingDate,
          startTime,
          endTime,
          totalDurationMinutes: dto.totalDurationMinutes,
          subtotalAmount: dto.subtotalAmount,
          taxAmount: dto.taxAmount,
          discountAmount: dto.discountAmount,
          totalAmount: dto.totalAmount,
          currency: dto.currency || 'INR',
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          clientIp: dto.clientIp,
          userAgent: dto.userAgent,
          createdByUserId: dto.createdByUserId,
        },
        tx,
      );

      if (dto.items && dto.items.length > 0) {
        for (const itemDto of dto.items) {
          await this.bookingItemRepository.create(
            {
              bookingId: booking.id,
              branchServiceId: itemDto.branchServiceId,
              staffId: itemDto.staffId,
              sequenceOrder: itemDto.sequenceOrder || 1,
              startTime: new Date(itemDto.startTime),
              endTime: new Date(itemDto.endTime),
              serviceDurationMinutes: itemDto.serviceDurationMinutes,
              prepTimeMinutes: itemDto.prepTimeMinutes || 0,
              cleanupTimeMinutes: itemDto.cleanupTimeMinutes || 0,
              bufferTimeMinutes: itemDto.bufferTimeMinutes || 0,
              unitPrice: itemDto.unitPrice,
              discountAmount: itemDto.discountAmount || 0,
              finalPrice: itemDto.finalPrice,
              status: itemDto.status || BookingStatus.PENDING,
              createdByUserId: itemDto.createdByUserId,
            },
            tx,
          );
        }
      }

      await this.statusHistoryRepository.create(
        {
          bookingId: booking.id,
          toStatus: booking.status,
          reason: 'Initial booking creation',
          performedByUserId: dto.createdByUserId,
          actorRole: dto.isWalkIn ? 'STAFF' : 'CUSTOMER',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: dto.createdByUserId,
        actorRole: dto.isWalkIn ? 'STAFF' : 'CUSTOMER',
        action: 'BOOKING_CREATED',
        entityType: 'Booking',
        entityId: booking.id,
        newState: booking,
      });

      return booking;
    });

    // 4. Post-commit side effects outside transaction
    await this.invalidateCache(createdBooking);

    await this.eventBusService.publish(
      new BookingCreatedEvent(
        {
          bookingId: createdBooking.id,
          bookingCode: createdBooking.bookingCode,
          salonId: createdBooking.salonId,
          branchId: createdBooking.branchId,
          customerId: createdBooking.customerId,
          totalAmount: createdBooking.totalAmount,
          currency: createdBooking.currency,
          bookingDate: createdBooking.bookingDate,
          startTime: createdBooking.startTime,
          endTime: createdBooking.endTime,
        },
        dto.createdByUserId,
        dto.isWalkIn ? 'STAFF' : 'CUSTOMER',
      ),
    );

    return this.toBookingDto(createdBooking);
  }

  public async confirmBooking(id: string, expectedVersion: number, paymentId?: string): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.isPending()) {
      throw new ValidationException(`Cannot confirm booking ${id}: current status is ${booking.status}, expected PENDING`);
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          ...(paymentId ? { paymentId } : {}),
        },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CONFIRMED,
          performedByUserId: booking.customerId,
          actorRole: 'SYSTEM',
          reason: 'Booking payment confirmed',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: booking.customerId,
        actorRole: 'SYSTEM',
        action: 'BOOKING_CONFIRMED',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.CONFIRMED, paymentId },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);

    await this.eventBusService.publish(
      new BookingConfirmedEvent({
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        salonId: updatedBooking.salonId,
        branchId: updatedBooking.branchId,
        customerId: updatedBooking.customerId,
        paymentId: updatedBooking.paymentId,
      }),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async cancelBooking(
    id: string,
    expectedVersion: number,
    cancelledByUserId?: string,
    reason?: string,
  ): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.canCancel()) {
      throw new ValidationException(`Cannot cancel booking ${id}: current status is ${booking.status}`);
    }

    const actorId = cancelledByUserId || booking.customerId;

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        expectedVersion,
        {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledByUserId: actorId,
          cancelledAt: new Date(),
        },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          performedByUserId: actorId,
          actorRole: 'CUSTOMER',
          reason: reason || 'User requested cancellation',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId,
        actorRole: 'CUSTOMER',
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.CANCELLED, reason },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);

    await this.eventBusService.publish(
      new BookingCancelledEvent(
        {
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.bookingCode,
          salonId: updatedBooking.salonId,
          branchId: updatedBooking.branchId,
          customerId: updatedBooking.customerId,
          reason,
          cancelledByUserId: actorId,
        },
        actorId,
        'CUSTOMER',
      ),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async expireBooking(id: string): Promise<BookingDto> {
    const booking = await this.getExistingBooking(id);
    const entity = new BookingEntity(booking);

    if (!entity.isPending()) {
      return this.toBookingDto(booking); // Already processed
    }

    const updatedBooking = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.bookingRepository.update(
        id,
        booking.version,
        {
          status: BookingStatus.EXPIRED,
        },
        tx,
      );

      await this.statusHistoryRepository.create(
        {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.EXPIRED,
          performedByUserId: '00000000-0000-0000-0000-000000000000',
          actorRole: 'SYSTEM',
          reason: '10-minute reservation payment timer expired',
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: '00000000-0000-0000-0000-000000000000',
        actorRole: 'SYSTEM',
        action: 'BOOKING_EXPIRED',
        entityType: 'Booking',
        entityId: id,
        previousState: { status: booking.status },
        newState: { status: BookingStatus.EXPIRED },
      });

      return updated;
    });

    await this.invalidateCache(updatedBooking);

    await this.eventBusService.publish(
      new BookingExpiredEvent({
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        salonId: updatedBooking.salonId,
        branchId: updatedBooking.branchId,
        customerId: updatedBooking.customerId,
        expiredAt: new Date(),
      }),
    );

    return this.toBookingDto(updatedBooking);
  }

  public async getBooking(id: string): Promise<BookingDetailDto> {
    return this.cacheService.getOrSet(`booking:${id}:detail`, async () => {
      const booking = await this.bookingRepository.findById(id);
      if (!booking) {
        throw new ValidationException(`Booking with ID ${id} not found`);
      }
      return this.toBookingDetailDto(booking);
    }, 600);
  }

  public async searchBookings(query: SearchBookingQueryDto): Promise<PaginatedBookingsDto> {
    const result = await this.bookingRepository.search(query);
    return {
      data: result.data.map((b) => this.toBookingDto(b)),
      meta: result.meta,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private generateBookingCode(date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = SecurityUtil.generateRandomToken(4).toUpperCase();
    return `BK-${dateStr}-${rand}`;
  }

  private async getNextSequenceNumber(salonId: string): Promise<bigint> {
    const maxBooking = await this.prisma.booking.findFirst({
      where: { salonId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    return maxBooking ? maxBooking.sequenceNumber + BigInt(1) : BigInt(1);
  }

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

  private toBookingDetailDto(b: any): BookingDetailDto {
    const dto = this.toBookingDto(b) as BookingDetailDto;
    dto.items = (b.items || []).map((item: any) => ({
      id: item.id,
      bookingId: item.bookingId,
      branchServiceId: item.branchServiceId,
      staffId: item.staffId,
      sequenceOrder: item.sequenceOrder,
      startTime: item.startTime,
      endTime: item.endTime,
      serviceDurationMinutes: item.serviceDurationMinutes,
      prepTimeMinutes: item.prepTimeMinutes,
      cleanupTimeMinutes: item.cleanupTimeMinutes,
      bufferTimeMinutes: item.bufferTimeMinutes,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      finalPrice: item.finalPrice,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    dto.statusHistories = (b.statusHistories || []).map((h: any) => ({
      id: h.id,
      bookingId: h.bookingId,
      fromStatus: h.fromStatus ?? undefined,
      toStatus: h.toStatus,
      reason: h.reason ?? undefined,
      performedByUserId: h.performedByUserId,
      actorRole: h.actorRole,
      metadata: h.metadata ?? undefined,
      createdAt: h.createdAt,
    }));
    return dto;
  }
}
