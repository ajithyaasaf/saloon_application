import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingRepository } from '../repositories/booking.repository';

describe('BookingRepository', () => {
  let repository: BookingRepository;
  let prisma: any;

  const mockBooking = {
    id: 'bk_123e4567-e89b-12d3-a456-426614174000',
    bookingCode: 'BK-20260807-A92F',
    sequenceNumber: BigInt(1042),
    salonId: 'sal_123e4567-e89b-12d3-a456-426614174001',
    branchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    customerId: 'usr_123e4567-e89b-12d3-a456-426614174003',
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
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [],
    statusHistories: [],
  };

  beforeEach(async () => {
    prisma = {
      booking: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<BookingRepository>(BookingRepository);
  });

  describe('findById', () => {
    it('should return booking when found', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      const result = await repository.findById(mockBooking.id);
      expect(result).toEqual(mockBooking);
      expect(prisma.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockBooking.id, deletedAt: null },
        }),
      );
    });
  });

  describe('findByBookingCode', () => {
    it('should find booking by booking code', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      const result = await repository.findByBookingCode('BK-20260807-A92F');
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findBySequenceNumber', () => {
    it('should find booking by salon and sequence number', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      const result = await repository.findBySequenceNumber(mockBooking.salonId, 1042);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('create', () => {
    it('should create new booking with version 1', async () => {
      prisma.booking.create.mockResolvedValue(mockBooking);
      const result = await repository.create({
        bookingCode: mockBooking.bookingCode,
        sequenceNumber: mockBooking.sequenceNumber,
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
      expect(result).toEqual(mockBooking);
    });
  });

  describe('update', () => {
    it('should update booking when version matches', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.booking.update.mockResolvedValue({ ...mockBooking, version: 2, status: BookingStatus.CONFIRMED });

      const result = await repository.update(mockBooking.id, 1, { status: BookingStatus.CONFIRMED });
      expect(result.version).toBe(2);
    });

    it('should throw ConflictException on optimistic concurrency mismatch', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);

      await expect(repository.update(mockBooking.id, 999, { status: BookingStatus.CONFIRMED })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and CANCELLED status', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.booking.update.mockResolvedValue({ ...mockBooking, deletedAt: new Date(), status: BookingStatus.CANCELLED });

      await repository.softDelete(mockBooking.id, 1);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockBooking.id },
          data: expect.objectContaining({
            status: BookingStatus.CANCELLED,
          }),
        }),
      );
    });
  });

  describe('search & pagination', () => {
    it('should return paginated booking list', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await repository.search({ page: 1, limit: 10, search: 'BK-20260807' });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('PrismaTransaction parameter support', () => {
    it('should use transaction client when provided', async () => {
      const mockTx: any = {
        booking: {
          findFirst: jest.fn().mockResolvedValue(mockBooking),
        },
      };

      const result = await repository.findById(mockBooking.id, mockTx);
      expect(result).toEqual(mockBooking);
      expect(mockTx.booking.findFirst).toHaveBeenCalled();
      expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    });
  });
});
