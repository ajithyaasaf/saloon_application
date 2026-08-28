import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from '../../services/availability.service';
import { BookingPublicController } from '../booking-public.controller';

describe('BookingPublicController', () => {
  let controller: BookingPublicController;
  let availabilityService: any;

  beforeEach(async () => {
    availabilityService = {
      checkAvailability: jest.fn(),
      findAvailableSlots: jest.fn(),
      findAvailableStaff: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingPublicController],
      providers: [
        { provide: AvailabilityService, useValue: availabilityService },
      ],
    }).compile();

    controller = module.get<BookingPublicController>(BookingPublicController);
  });

  describe('checkAvailability', () => {
    it('should delegate checkAvailability call to service and return envelope', async () => {
      availabilityService.checkAvailability.mockResolvedValue(true);
      const res = await controller.checkAvailability(
        '123e4567-e89b-12d3-a456-426614174000',
        '2026-08-08',
        '123e4567-e89b-12d3-a456-426614174001',
      );
      expect(res.success).toBe(true);
      expect(res.data.isAvailable).toBe(true);
      expect(availabilityService.checkAvailability).toHaveBeenCalled();
    });
  });

  describe('findAvailableSlots', () => {
    it('should delegate slot search to availabilityService', async () => {
      availabilityService.findAvailableSlots.mockResolvedValue([]);
      const res = await controller.findAvailableSlots(
        '123e4567-e89b-12d3-a456-426614174000',
        '2026-08-08',
        '123e4567-e89b-12d3-a456-426614174001',
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
    });
  });

  describe('getAvailableStaff', () => {
    it('should delegate available staff lookup to service', async () => {
      availabilityService.findAvailableStaff.mockResolvedValue([]);
      const res = await controller.getAvailableStaff(
        '123e4567-e89b-12d3-a456-426614174000',
        '2026-08-08',
        '2026-08-08T10:00:00.000Z',
        '2026-08-08T11:00:00.000Z',
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
    });
  });
});
