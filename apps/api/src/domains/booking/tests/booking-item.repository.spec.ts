import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingItemRepository } from '../repositories/booking-item.repository';

describe('BookingItemRepository', () => {
  let repository: BookingItemRepository;
  let prisma: any;

  const mockItem = {
    id: 'bki_123e4567-e89b-12d3-a456-426614174000',
    bookingId: 'bk_123e4567-e89b-12d3-a456-426614174001',
    branchServiceId: 'srv_123e4567-e89b-12d3-a456-426614174002',
    staffId: 'stf_123e4567-e89b-12d3-a456-426614174003',
    sequenceOrder: 1,
    startTime: new Date('2026-08-08T10:00:00.000Z'),
    endTime: new Date('2026-08-08T11:00:00.000Z'),
    serviceDurationMinutes: 60,
    prepTimeMinutes: 0,
    cleanupTimeMinutes: 0,
    bufferTimeMinutes: 0,
    unitPrice: 150000,
    discountAmount: 0,
    finalPrice: 150000,
    status: BookingStatus.PENDING,
    version: 1,
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      bookingItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingItemRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<BookingItemRepository>(BookingItemRepository);
  });

  describe('findById', () => {
    it('should return item when found', async () => {
      prisma.bookingItem.findFirst.mockResolvedValue(mockItem);
      const result = await repository.findById(mockItem.id);
      expect(result).toEqual(mockItem);
    });
  });

  describe('findByBooking', () => {
    it('should find items by booking id', async () => {
      prisma.bookingItem.findMany.mockResolvedValue([mockItem]);
      const result = await repository.findByBooking(mockItem.bookingId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findByStaff', () => {
    it('should find items by staff id and time overlap window', async () => {
      prisma.bookingItem.findMany.mockResolvedValue([mockItem]);
      const start = new Date('2026-08-08T09:00:00.000Z');
      const end = new Date('2026-08-08T12:00:00.000Z');
      const result = await repository.findByStaff(mockItem.staffId, start, end);
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create new booking item', async () => {
      prisma.bookingItem.create.mockResolvedValue(mockItem);
      const result = await repository.create({
        bookingId: mockItem.bookingId,
        branchServiceId: mockItem.branchServiceId,
        staffId: mockItem.staffId,
        startTime: mockItem.startTime,
        endTime: mockItem.endTime,
        serviceDurationMinutes: 60,
        createdByUserId: mockItem.createdByUserId,
      });
      expect(result).toEqual(mockItem);
    });
  });

  describe('update', () => {
    it('should update item when version matches', async () => {
      prisma.bookingItem.findFirst.mockResolvedValue(mockItem);
      prisma.bookingItem.update.mockResolvedValue({ ...mockItem, version: 2 });

      const result = await repository.update(mockItem.id, 1, { status: BookingStatus.CONFIRMED });
      expect(result.version).toBe(2);
    });

    it('should throw ConflictException on version mismatch', async () => {
      prisma.bookingItem.findFirst.mockResolvedValue(mockItem);

      await expect(repository.update(mockItem.id, 999, { status: BookingStatus.CONFIRMED })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete item by setting deletedAt', async () => {
      prisma.bookingItem.findFirst.mockResolvedValue(mockItem);
      prisma.bookingItem.update.mockResolvedValue({ ...mockItem, deletedAt: new Date() });

      await repository.softDelete(mockItem.id, 1);
      expect(prisma.bookingItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItem.id },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
