import { Test, TestingModule } from '@nestjs/testing';
import { BookingRepository } from '../../repositories/booking.repository';
import { BookingService } from '../../services/booking.service';
import { ReservationService } from '../../services/reservation.service';
import { BookingAdminController } from '../booking-admin.controller';

describe('BookingAdminController', () => {
  let controller: BookingAdminController;
  let bookingService: any;
  let bookingRepository: any;
  let reservationService: any;

  beforeEach(async () => {
    bookingService = {
      searchBookings: jest.fn(),
    };
    bookingRepository = {
      count: jest.fn(),
    };
    reservationService = {
      cleanupExpiredLocks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingAdminController],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: BookingRepository, useValue: bookingRepository },
        { provide: ReservationService, useValue: reservationService },
      ],
    }).compile();

    controller = module.get<BookingAdminController>(BookingAdminController);
  });

  describe('globalSearch', () => {
    it('should delegate search to bookingService', async () => {
      bookingService.searchBookings.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
      });
      const res = await controller.globalSearch({ page: 1, limit: 10 });
      expect(res.success).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should query bookingRepository count and return total metric envelope', async () => {
      bookingRepository.count.mockResolvedValue(42);
      const res = await controller.getStatistics('sal_123');
      expect(res.success).toBe(true);
      expect(res.data.totalBookings).toBe(42);
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should trigger reservationService cleanupExpiredLocks', async () => {
      reservationService.cleanupExpiredLocks.mockResolvedValue(5);
      const res = await controller.cleanupExpiredLocks();
      expect(res.success).toBe(true);
      expect(res.data.cleanedCount).toBe(5);
    });
  });
});
