import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingReservationLockRepository } from '../repositories/booking-reservation-lock.repository';

describe('BookingReservationLockRepository', () => {
  let repository: BookingReservationLockRepository;
  let prisma: any;

  const mockLock = {
    id: 'lck_123e4567-e89b-12d3-a456-426614174000',
    lockKey: 'branch:br1:staff:stf1:date:2026-08-08:slot:10:00',
    branchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    staffId: 'stf_123e4567-e89b-12d3-a456-426614174003',
    customerId: 'usr_123e4567-e89b-12d3-a456-426614174004',
    sessionId: 'sess_123',
    bookingId: null,
    startTime: new Date('2026-08-08T10:00:00.000Z'),
    endTime: new Date('2026-08-08T11:00:00.000Z'),
    expiresAt: new Date(Date.now() + 600000), // 10 mins in future
    refreshCount: 0,
    isReleased: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      bookingReservationLock: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingReservationLockRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<BookingReservationLockRepository>(BookingReservationLockRepository);
  });

  describe('findById', () => {
    it('should return lock when found', async () => {
      prisma.bookingReservationLock.findUnique.mockResolvedValue(mockLock);
      const result = await repository.findById(mockLock.id);
      expect(result).toEqual(mockLock);
    });
  });

  describe('findByLockKey', () => {
    it('should find lock by unique key', async () => {
      prisma.bookingReservationLock.findUnique.mockResolvedValue(mockLock);
      const result = await repository.findByLockKey(mockLock.lockKey);
      expect(result).toEqual(mockLock);
    });
  });

  describe('findExpired', () => {
    it('should find active locks with expiresAt in past', async () => {
      const expiredLock = { ...mockLock, expiresAt: new Date(Date.now() - 1000) };
      prisma.bookingReservationLock.findMany.mockResolvedValue([expiredLock]);

      const result = await repository.findExpired();
      expect(result).toEqual([expiredLock]);
    });
  });

  describe('findActive', () => {
    it('should find active locks for branch and staff', async () => {
      prisma.bookingReservationLock.findMany.mockResolvedValue([mockLock]);

      const result = await repository.findActive(mockLock.branchId, mockLock.staffId);
      expect(result).toEqual([mockLock]);
    });
  });

  describe('create & update', () => {
    it('should create new lock', async () => {
      prisma.bookingReservationLock.create.mockResolvedValue(mockLock);
      const result = await repository.create({
        lockKey: mockLock.lockKey,
        branchId: mockLock.branchId,
        staffId: mockLock.staffId,
        customerId: mockLock.customerId,
        startTime: mockLock.startTime,
        endTime: mockLock.endTime,
        expiresAt: mockLock.expiresAt,
      });
      expect(result).toEqual(mockLock);
    });

    it('should update lock data', async () => {
      prisma.bookingReservationLock.update.mockResolvedValue({ ...mockLock, refreshCount: 1 });
      const result = await repository.update(mockLock.id, { refreshCount: 1 });
      expect(result.refreshCount).toBe(1);
    });
  });

  describe('release & delete', () => {
    it('should release lock by setting isReleased to true', async () => {
      prisma.bookingReservationLock.updateMany.mockResolvedValue({ count: 1 });
      await repository.release(mockLock.lockKey);
      expect(prisma.bookingReservationLock.updateMany).toHaveBeenCalledWith({
        where: { lockKey: mockLock.lockKey },
        data: { isReleased: true },
      });
    });

    it('should hard delete lock by id', async () => {
      prisma.bookingReservationLock.delete.mockResolvedValue(mockLock);
      await repository.delete(mockLock.id);
      expect(prisma.bookingReservationLock.delete).toHaveBeenCalledWith({
        where: { id: mockLock.id },
      });
    });
  });
});
