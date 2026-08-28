import { Test, TestingModule } from '@nestjs/testing';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffLeaveRepository } from '../repositories/staff-leave.repository';

describe('StaffLeaveRepository', () => {
  let repository: StaffLeaveRepository;
  let prisma: any;

  const mockLeave = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    staffId: '123e4567-e89b-12d3-a456-426614174001',
    leaveType: LeaveType.CASUAL,
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-12'),
    halfDayPeriod: null,
    reason: 'Personal',
    status: LeaveStatus.PENDING,
    approvedById: null,
    approvedAt: null,
    rejectionReason: null,
    isBookingBlocked: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      staffLeave: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffLeaveRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffLeaveRepository>(StaffLeaveRepository);
  });

  describe('findById', () => {
    it('should find leave request by id', async () => {
      prisma.staffLeave.findFirst.mockResolvedValue(mockLeave);
      const result = await repository.findById(mockLeave.id);
      expect(result).toEqual(mockLeave);
    });
  });

  describe('findPending', () => {
    it('should query for PENDING leaves', async () => {
      prisma.staffLeave.findMany.mockResolvedValue([mockLeave]);
      const result = await repository.findPending(mockLeave.staffId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findApproved', () => {
    it('should query for APPROVED leaves overlapping date range', async () => {
      const approvedLeave = { ...mockLeave, status: LeaveStatus.APPROVED, isBookingBlocked: true };
      prisma.staffLeave.findMany.mockResolvedValue([approvedLeave]);

      const result = await repository.findApproved(mockLeave.staffId, mockLeave.startDate, mockLeave.endDate);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.APPROVED);
    });
  });

  describe('create', () => {
    it('should create new leave request', async () => {
      prisma.staffLeave.create.mockResolvedValue(mockLeave);
      const result = await repository.create({
        staffId: mockLeave.staffId,
        leaveType: mockLeave.leaveType,
        startDate: mockLeave.startDate,
        endDate: mockLeave.endDate,
      });
      expect(result).toEqual(mockLeave);
    });
  });

  describe('update', () => {
    it('should update leave request when version matches', async () => {
      prisma.staffLeave.findFirst.mockResolvedValue(mockLeave);
      prisma.staffLeave.update.mockResolvedValue({ ...mockLeave, version: 2, status: LeaveStatus.APPROVED });

      const result = await repository.update(mockLeave.id, 1, { status: LeaveStatus.APPROVED });
      expect(result.version).toBe(2);
    });

    it('should throw ConflictException on version mismatch', async () => {
      prisma.staffLeave.findFirst.mockResolvedValue(mockLeave);

      await expect(repository.update(mockLeave.id, 999, { status: LeaveStatus.APPROVED })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
