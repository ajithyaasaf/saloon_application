import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';
import { BookingStatusService } from '../services/booking-status.service';

describe('BookingStatusService', () => {
  let service: BookingStatusService;
  let bookingRepository: any;
  let statusHistoryRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockBooking = {
    id: 'bk_123',
    bookingCode: 'BK-20260807-A92F',
    sequenceNumber: BigInt(1042),
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_123',
    walkInType: WalkInType.NONE,
    isWalkIn: false,
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    rescheduleCount: 0,
    bookingDate: new Date('2026-08-08'),
    startTime: new Date('2026-08-08T10:00:00.000Z'),
    endTime: new Date('2026-08-08T11:00:00.000Z'),
    totalDurationMinutes: 60,
    subtotalAmount: 150000,
    taxAmount: 27000,
    discountAmount: 0,
    totalAmount: 177000,
    currency: 'INR',
    version: 1,
    createdByUserId: 'usr_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    bookingRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    statusHistoryRepository = {
      create: jest.fn(),
    };
    transactionService = {
      run: jest.fn((cb) => cb({})),
    };
    auditService = {
      logInTransaction: jest.fn(),
    };
    cacheService = {
      delete: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingStatusService,
        { provide: BookingRepository, useValue: bookingRepository },
        { provide: BookingStatusHistoryRepository, useValue: statusHistoryRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<BookingStatusService>(BookingStatusService);
  });

  describe('checkIn', () => {
    it('should transition status from CONFIRMED to CHECKED_IN', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CHECKED_IN, version: 2 });

      const result = await service.checkIn('bk_123', 1, 'usr_staff', 'STAFF');
      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException on illegal status transition', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, status: BookingStatus.PENDING });

      await expect(service.checkIn('bk_123', 1, 'usr_staff', 'STAFF')).rejects.toThrow(ValidationException);
    });
  });

  describe('startService', () => {
    it('should transition status from CHECKED_IN to IN_PROGRESS', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, status: BookingStatus.CHECKED_IN });
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.IN_PROGRESS, version: 2 });

      const result = await service.startService('bk_123', 1, 'usr_staff', 'STAFF');
      expect(result.status).toBe(BookingStatus.IN_PROGRESS);
    });
  });

  describe('completeBooking', () => {
    it('should transition status from IN_PROGRESS to COMPLETED', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, status: BookingStatus.IN_PROGRESS });
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.COMPLETED, version: 2 });

      const result = await service.completeBooking('bk_123', 1, 'usr_staff', 'STAFF');
      expect(result.status).toBe(BookingStatus.COMPLETED);
    });
  });

  describe('markNoShow', () => {
    it('should transition status from CONFIRMED to NO_SHOW', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.NO_SHOW, version: 2 });

      const result = await service.markNoShow('bk_123', 1, 'usr_owner', 'SALON_OWNER', 'Customer did not show up');
      expect(result.status).toBe(BookingStatus.NO_SHOW);
    });
  });
});
