import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';

describe('BookingStatusHistoryRepository', () => {
  let repository: BookingStatusHistoryRepository;
  let prisma: any;

  const mockHistory = {
    id: 'bsh_123e4567-e89b-12d3-a456-426614174000',
    bookingId: 'bk_123e4567-e89b-12d3-a456-426614174001',
    fromStatus: null,
    toStatus: BookingStatus.PENDING,
    reason: 'Initial booking created',
    performedByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    actorRole: 'CUSTOMER',
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      bookingStatusHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingStatusHistoryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<BookingStatusHistoryRepository>(BookingStatusHistoryRepository);
  });

  describe('findByBooking', () => {
    it('should return status histories for booking ordered by createdAt DESC', async () => {
      prisma.bookingStatusHistory.findMany.mockResolvedValue([mockHistory]);
      const result = await repository.findByBooking(mockHistory.bookingId);
      expect(result).toEqual([mockHistory]);
      expect(prisma.bookingStatusHistory.findMany).toHaveBeenCalledWith({
        where: { bookingId: mockHistory.bookingId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create new status history record', async () => {
      prisma.bookingStatusHistory.create.mockResolvedValue(mockHistory);
      const result = await repository.create({
        bookingId: mockHistory.bookingId,
        toStatus: BookingStatus.PENDING,
        performedByUserId: mockHistory.performedByUserId,
        actorRole: 'CUSTOMER',
      });
      expect(result).toEqual(mockHistory);
    });
  });
});
