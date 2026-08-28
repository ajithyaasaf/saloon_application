import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { BookingService } from '../../services/booking.service';
import { ReservationService } from '../../services/reservation.service';
import { BookingCustomerController } from '../booking-customer.controller';

describe('BookingCustomerController', () => {
  let controller: BookingCustomerController;
  let bookingService: any;
  let reservationService: any;

  const mockUser = { userId: 'usr_cust_123' };

  const mockBookingDto = {
    id: 'bk_123',
    bookingCode: 'BK-20260807-A92F',
    sequenceNumber: '1042',
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_cust_123',
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    bookingService = {
      createBooking: jest.fn(),
      searchBookings: jest.fn(),
      getBooking: jest.fn(),
      cancelBooking: jest.fn(),
    };
    reservationService = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingCustomerController],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: ReservationService, useValue: reservationService },
      ],
    }).compile();

    controller = module.get<BookingCustomerController>(BookingCustomerController);
  });

  describe('createBooking', () => {
    it('should delegate createBooking to service and return 201 envelope', async () => {
      bookingService.createBooking.mockResolvedValue(mockBookingDto);
      const res = await controller.createBooking(
        {
          bookingCode: 'BK-20260807-A92F',
          sequenceNumber: 1042,
          salonId: 'sal_123',
          branchId: 'br_123',
          customerId: 'usr_cust_123',
          bookingDate: new Date('2026-08-08'),
          startTime: new Date('2026-08-08T10:00:00.000Z'),
          endTime: new Date('2026-08-08T11:00:00.000Z'),
          totalDurationMinutes: 60,
          totalAmount: 177000,
          createdByUserId: 'usr_cust_123',
        },
        'usr_cust_123',
      );
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('bk_123');
    });
  });

  describe('getCustomerBookings', () => {
    it('should delegate search with customerId filter', async () => {
      bookingService.searchBookings.mockResolvedValue({
        data: [mockBookingDto],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrevious: false },
      });
      const res = await controller.getCustomerBookings({ page: 1, limit: 10 }, 'usr_cust_123');
      expect(res.data).toHaveLength(1);
      expect(bookingService.searchBookings).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'usr_cust_123' }),
      );
    });
  });

  describe('getBookingById', () => {
    it('should return detailed booking if owned by customer', async () => {
      bookingService.getBooking.mockResolvedValue(mockBookingDto);
      const res = await controller.getBookingById('123e4567-e89b-12d3-a456-426614174000', 'usr_cust_123');
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('bk_123');
    });

    it('should throw ForbiddenOperationException if booking belongs to another customer', async () => {
      bookingService.getBooking.mockResolvedValue(mockBookingDto);
      await expect(
        controller.getBookingById('123e4567-e89b-12d3-a456-426614174000', 'other_attacker_id'),
      ).rejects.toThrow('You are not authorized to view this booking');
    });
  });

  describe('cancelBooking', () => {
    it('should delegate cancelBooking to service if owned by customer', async () => {
      bookingService.getBooking.mockResolvedValue(mockBookingDto);
      bookingService.cancelBooking.mockResolvedValue({ ...mockBookingDto, status: BookingStatus.CANCELLED });
      const res = await controller.cancelBooking('123e4567-e89b-12d3-a456-426614174000', 1, 'usr_cust_123', 'Changed plans');
      expect(res.data.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw ForbiddenOperationException if attempting to cancel another customer booking', async () => {
      bookingService.getBooking.mockResolvedValue(mockBookingDto);
      await expect(
        controller.cancelBooking('123e4567-e89b-12d3-a456-426614174000', 1, 'other_attacker_id', 'Malicious cancel'),
      ).rejects.toThrow('You are not authorized to cancel this booking');
    });
  });

  describe('acquireLock & releaseLock', () => {
    it('should delegate acquireLock to reservationService', async () => {
      const lockRes = { id: 'lck_1', lockKey: 'k1' };
      reservationService.acquireLock.mockResolvedValue(lockRes);
      const res = await controller.acquireLock(
        {
          lockKey: 'k1',
          branchId: 'br_123',
          staffId: 'stf_123',
          customerId: 'usr_cust_123',
          startTime: new Date(),
          endTime: new Date(),
          expiresAt: new Date(),
        },
        'usr_cust_123',
      );
      expect(res.success).toBe(true);
    });

    it('should delegate releaseLock to reservationService and return noContent', async () => {
      reservationService.releaseLock.mockResolvedValue(undefined);
      const res = await controller.releaseLock('k1');
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });
  });
});
