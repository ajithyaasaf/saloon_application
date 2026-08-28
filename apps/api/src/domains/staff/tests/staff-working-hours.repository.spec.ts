import { Test, TestingModule } from '@nestjs/testing';
import { DayOfWeek } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffWorkingHoursRepository } from '../repositories/staff-working-hours.repository';

describe('StaffWorkingHoursRepository', () => {
  let repository: StaffWorkingHoursRepository;
  let prisma: any;

  const mockHours = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    staffId: '123e4567-e89b-12d3-a456-426614174001',
    branchId: '123e4567-e89b-12d3-a456-426614174002',
    dayOfWeek: DayOfWeek.MON,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T18:00:00Z'),
    isActive: true,
    effectiveFrom: new Date('2026-08-01'),
    effectiveUntil: null,
    breaks: [{ start: '13:00', end: '14:00' }],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      staffWorkingHours: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffWorkingHoursRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffWorkingHoursRepository>(StaffWorkingHoursRepository);
  });

  describe('findHours', () => {
    it('should return working hours for staff', async () => {
      prisma.staffWorkingHours.findMany.mockResolvedValue([mockHours]);
      const result = await repository.findHours(mockHours.staffId, mockHours.branchId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findEffectiveOnDate', () => {
    it('should return working hours effective on a specific date', async () => {
      prisma.staffWorkingHours.findMany.mockResolvedValue([mockHours]);
      const result = await repository.findEffectiveOnDate(mockHours.staffId, mockHours.branchId, new Date('2026-08-15'));
      expect(result).toHaveLength(1);
    });
  });

  describe('upsertHours', () => {
    it('should create schedule entry with version 1', async () => {
      prisma.staffWorkingHours.create.mockResolvedValue(mockHours);
      const result = await repository.upsertHours({
        staffId: mockHours.staffId,
        branchId: mockHours.branchId,
        dayOfWeek: mockHours.dayOfWeek,
        startTime: mockHours.startTime,
        endTime: mockHours.endTime,
        effectiveFrom: mockHours.effectiveFrom,
      });
      expect(result).toEqual(mockHours);
    });
  });

  describe('update', () => {
    it('should throw ConflictException on version mismatch', async () => {
      prisma.staffWorkingHours.findFirst.mockResolvedValue(mockHours);

      await expect(repository.update(mockHours.id, 999, { isActive: false })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
