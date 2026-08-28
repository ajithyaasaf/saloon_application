import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { BookingAdminController } from './controllers/booking-admin.controller';
import { BookingCustomerController } from './controllers/booking-customer.controller';
import { BookingOwnerController } from './controllers/booking-owner.controller';
import { BookingPublicController } from './controllers/booking-public.controller';
import { BookingItemRepository } from './repositories/booking-item.repository';
import { BookingRepository } from './repositories/booking.repository';
import { BookingReservationLockRepository } from './repositories/booking-reservation-lock.repository';
import { BookingStatusHistoryRepository } from './repositories/booking-status-history.repository';
import { AvailabilityService } from './services/availability.service';
import { BookingStatusService } from './services/booking-status.service';
import { BookingService } from './services/booking.service';
import { ReservationService } from './services/reservation.service';

/**
 * BookingModule — NestJS module for Booking Engine domain.
 *
 * Encapsulates public, customer, owner, and admin controllers, domain services, and repository data layers.
 * Depends on SharedModule for transaction, audit, cache, events, storage, and notification services.
 *
 * Architecture ref: Phase 13.0 & Phase 13.5
 */
@Module({
  imports: [SharedModule],
  controllers: [
    BookingPublicController,
    BookingCustomerController,
    BookingOwnerController,
    BookingAdminController,
  ],
  providers: [
    BookingRepository,
    BookingItemRepository,
    BookingStatusHistoryRepository,
    BookingReservationLockRepository,
    BookingService,
    ReservationService,
    AvailabilityService,
    BookingStatusService,
  ],
  exports: [
    BookingRepository,
    BookingItemRepository,
    BookingStatusHistoryRepository,
    BookingReservationLockRepository,
    BookingService,
    ReservationService,
    AvailabilityService,
    BookingStatusService,
  ],
})
export class BookingModule {}
