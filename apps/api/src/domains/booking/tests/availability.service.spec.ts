import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingItemRepository } from '../repositories/booking-item.repository';
import { BookingReservationLockRepository } from '../repositories/booking-reservation-lock.repository';
import { AvailabilityService } from '../services/availability.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;
  let bookingItemRepository: any;
  let lockRepository: any;

  const mockStaff = {
    id: 'stf_123',
    displayName: 'Stylist One',
    employmentStatus: EmploymentStatus.ACTIVE,
  };

  beforeEach(async () => {
    prisma = {
      staff: {
        findMany: jest.fn(),
      },
      branchSpecialHoliday: {
        findFirst: jest.fn(),
      },
      branchTempClosure: {
        findFirst: jest.fn(),
      },
      staffLeave: {
        findFirst: jest.fn(),
      },
      staffWorkingHours: {
        findFirst: jest.fn(),
      },
      branchBusinessHours: {
        findFirst: jest.fn(),
      },
      branchService: {
        findMany: jest.fn(),
      },
    };
    bookingItemRepository = {
      findByStaff: jest.fn(),
    };
    lockRepository = {
      findActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookingItemRepository, useValue: bookingItemRepository },
        { provide: BookingReservationLockRepository, useValue: lockRepository },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('findAvailableStaff', () => {
    it('should return available staff when no holiday, leave, or booking overlap exists', async () => {
      prisma.branchSpecialHoliday.findFirst.mockResolvedValue(null);
      prisma.branchTempClosure.findFirst.mockResolvedValue(null);
      prisma.staff.findMany.mockResolvedValue([mockStaff]);
      prisma.staffLeave.findFirst.mockResolvedValue(null);
      prisma.staffWorkingHours.findFirst.mockResolvedValue(null);
      bookingItemRepository.findByStaff.mockResolvedValue([]);
      lockRepository.findActive.mockResolvedValue([]);

      const start = new Date('2026-08-08T10:00:00.000Z');
      const end = new Date('2026-08-08T11:00:00.000Z');

      const result = await service.findAvailableStaff('br_123', new Date('2026-08-08'), start, end);
      expect(result).toEqual([mockStaff]);
    });

    it('should return empty list if branch has special holiday', async () => {
      prisma.branchSpecialHoliday.findFirst.mockResolvedValue({ id: 'hol_1' });

      const start = new Date('2026-08-08T10:00:00.000Z');
      const end = new Date('2026-08-08T11:00:00.000Z');

      const result = await service.findAvailableStaff('br_123', new Date('2026-08-08'), start, end);
      expect(result).toEqual([]);
    });

    it('should return empty list if booking overlap is detected', async () => {
      prisma.branchSpecialHoliday.findFirst.mockResolvedValue(null);
      prisma.branchTempClosure.findFirst.mockResolvedValue(null);
      prisma.staff.findMany.mockResolvedValue([mockStaff]);
      prisma.staffLeave.findFirst.mockResolvedValue(null);
      prisma.staffWorkingHours.findFirst.mockResolvedValue(null);
      bookingItemRepository.findByStaff.mockResolvedValue([{ status: 'CONFIRMED' }]);
      lockRepository.findActive.mockResolvedValue([]);

      const start = new Date('2026-08-08T10:00:00.000Z');
      const end = new Date('2026-08-08T11:00:00.000Z');

      const result = await service.findAvailableStaff('br_123', new Date('2026-08-08'), start, end);
      expect(result).toEqual([]);
    });
  });
});
