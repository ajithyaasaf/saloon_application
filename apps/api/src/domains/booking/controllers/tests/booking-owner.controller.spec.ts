import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { BookingStatusService } from '../../services/booking-status.service';
import { BookingService } from '../../services/booking.service';
import { BookingOwnerController } from '../booking-owner.controller';

describe('BookingOwnerController', () => {
  let controller: BookingOwnerController;
  let bookingService: any;
  let bookingStatusService: any;

  const mockOwner = { userId: 'usr_owner_123' };

  const mockBookingDto = {
    id: 'bk_123',
    bookingCode: 'BK-20260807-A92F',
    sequenceNumber: '1042',
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_cust_123',
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    bookingService = {
      searchBookings: jest.fn(),
      getBooking: jest.fn(),
      confirmBooking: jest.fn(),
    };
    bookingStatusService = {
      checkIn: jest.fn(),
      startService: jest.fn(),
      completeBooking: jest.fn(),
      markNoShow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingOwnerController],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: BookingStatusService, useValue: bookingStatusService },
      ],
    }).compile();

    controller = module.get<BookingOwnerController>(BookingOwnerController);
  });

  describe('searchBookings', () => {
    it('should delegate search to bookingService', async () => {
      bookingService.searchBookings.mockResolvedValue({
        data: [mockBookingDto],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrevious: false },
      });
      const res = await controller.searchBookings({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
    });
  });

  describe('status transitions', () => {
    it('should delegate confirmBooking', async () => {
      bookingService.confirmBooking.mockResolvedValue(mockBookingDto);
      const res = await controller.confirmBooking('123e4567-e89b-12d3-a456-426614174000', 1, 'pay_123');
      expect(res.success).toBe(true);
    });

    it('should delegate checkIn to bookingStatusService', async () => {
      bookingStatusService.checkIn.mockResolvedValue({ ...mockBookingDto, status: BookingStatus.CHECKED_IN });
      const res = await controller.checkIn('123e4567-e89b-12d3-a456-426614174000', 1, mockOwner);
      expect(res.data.status).toBe(BookingStatus.CHECKED_IN);
    });

    it('should delegate startService to bookingStatusService', async () => {
      bookingStatusService.startService.mockResolvedValue({ ...mockBookingDto, status: BookingStatus.IN_PROGRESS });
      const res = await controller.startService('123e4567-e89b-12d3-a456-426614174000', 1, mockOwner);
      expect(res.data.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should delegate completeBooking to bookingStatusService', async () => {
      bookingStatusService.completeBooking.mockResolvedValue({ ...mockBookingDto, status: BookingStatus.COMPLETED });
      const res = await controller.completeBooking('123e4567-e89b-12d3-a456-426614174000', 1, mockOwner);
      expect(res.data.status).toBe(BookingStatus.COMPLETED);
    });

    it('should delegate markNoShow to bookingStatusService', async () => {
      bookingStatusService.markNoShow.mockResolvedValue({ ...mockBookingDto, status: BookingStatus.NO_SHOW });
      const res = await controller.markNoShow('123e4567-e89b-12d3-a456-426614174000', 1, 'Did not arrive', mockOwner);
      expect(res.data.status).toBe(BookingStatus.NO_SHOW);
    });
  });
});
