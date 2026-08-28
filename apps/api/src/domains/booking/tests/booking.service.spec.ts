import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BookingItemRepository } from '../repositories/booking-item.repository';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: any;
  let bookingRepository: any;
  let bookingItemRepository: any;
  let statusHistoryRepository: any;
  let availabilityService: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;
  let notificationService: any;

  const mockBooking = {
    id: 'bk_123',
    bookingCode: 'BK-20260807-A92F',
    sequenceNumber: BigInt(1042),
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_123',
    walkInType: WalkInType.NONE,
    isWalkIn: false,
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.UNPAID,
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
    items: [],
    statusHistories: [],
  };

  beforeEach(async () => {
    prisma = {
      booking: {
        findFirst: jest.fn(),
      },
    };
    bookingRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };
    bookingItemRepository = {
      create: jest.fn(),
    };
    statusHistoryRepository = {
      create: jest.fn(),
    };
    availabilityService = {
      findAvailableStaff: jest.fn(),
    };
    transactionService = {
      run: jest.fn((cb) => cb({})),
    };
    auditService = {
      logInTransaction: jest.fn(),
    };
    cacheService = {
      getOrSet: jest.fn((key, cb) => cb()),
      delete: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn(),
    };
    notificationService = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookingRepository, useValue: bookingRepository },
        { provide: BookingItemRepository, useValue: bookingItemRepository },
        { provide: BookingStatusHistoryRepository, useValue: statusHistoryRepository },
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('createBooking', () => {
    it('should create booking atomically inside transaction', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      bookingRepository.create.mockResolvedValue(mockBooking);

      const result = await service.createBooking({
        bookingCode: mockBooking.bookingCode,
        sequenceNumber: 1042,
        salonId: mockBooking.salonId,
        branchId: mockBooking.branchId,
        customerId: mockBooking.customerId,
        bookingDate: mockBooking.bookingDate,
        startTime: mockBooking.startTime,
        endTime: mockBooking.endTime,
        totalDurationMinutes: 60,
        totalAmount: 177000,
        createdByUserId: mockBooking.createdByUserId,
      });

      expect(result.bookingCode).toBe(mockBooking.bookingCode);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException if assigned staff in items is unavailable', async () => {
      availabilityService.findAvailableStaff.mockResolvedValue([]); // Staff unavailable

      await expect(
        service.createBooking({
          bookingCode: mockBooking.bookingCode,
          sequenceNumber: 1042,
          salonId: mockBooking.salonId,
          branchId: mockBooking.branchId,
          customerId: mockBooking.customerId,
          bookingDate: mockBooking.bookingDate,
          startTime: mockBooking.startTime,
          endTime: mockBooking.endTime,
          totalDurationMinutes: 60,
          totalAmount: 177000,
          createdByUserId: mockBooking.createdByUserId,
          items: [
            {
              branchServiceId: 'srv_1',
              staffId: 'stf_1',
              startTime: mockBooking.startTime,
              endTime: mockBooking.endTime,
              serviceDurationMinutes: 60,
              unitPrice: 150000,
              finalPrice: 150000,
              createdByUserId: 'usr_123',
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm PENDING booking', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED, version: 2 });

      const result = await service.confirmBooking('bk_123', 1, 'pay_123');
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw ValidationException if booking is not PENDING', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });

      await expect(service.confirmBooking('bk_123', 1)).rejects.toThrow(ValidationException);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel PENDING or CONFIRMED booking', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CANCELLED, version: 2 });

      const result = await service.cancelBooking('bk_123', 1, 'usr_123', 'User change of plans');
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('expireBooking', () => {
    it('should expire PENDING booking', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.EXPIRED, version: 2 });

      const result = await service.expireBooking('bk_123');
      expect(result.status).toBe(BookingStatus.EXPIRED);
    });
  });

  describe('getBooking', () => {
    it('should return booking details via cache', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);

      const result = await service.getBooking('bk_123');
      expect(result.id).toBe('bk_123');
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });
  });
});
