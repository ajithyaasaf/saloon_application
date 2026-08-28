import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FlashSaleRepository } from '../repositories/flash-sale.repository';

describe('FlashSaleRepository', () => {
  let flashRepo: FlashSaleRepository;
  let mockPrisma: any;

  const mockFlashSale = {
    id: 'fs-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    serviceId: 'srv-1',
    title: 'Flash 50% Off Hair Spa',
    discountPercentage: 50,
    specialPrice: 500,
    startTime: new Date('2026-06-01T12:00:00Z'),
    endTime: new Date('2026-06-01T15:00:00Z'),
    maxSlotQuota: 10,
    bookedSlotCount: 2,
    status: FlashSaleStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      flashSale: {
        findFirst: jest.fn().mockResolvedValue(mockFlashSale),
        findMany: jest.fn().mockResolvedValue([mockFlashSale]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockFlashSale),
        update: jest.fn().mockResolvedValue({ ...mockFlashSale, version: 2 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashSaleRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    flashRepo = module.get<FlashSaleRepository>(FlashSaleRepository);
  });

  it('should find flash sale by id with salon isolation', async () => {
    const res = await flashRepo.findById('fs-1', 'sal-1');
    expect(res).toEqual(mockFlashSale);
    expect(mockPrisma.flashSale.findFirst).toHaveBeenCalledWith({
      where: { id: 'fs-1', salonId: 'sal-1', deletedAt: null },
      include: expect.any(Object),
    });
  });

  it('should find currently active flash sales by branch and time window', async () => {
    const checkTime = new Date('2026-06-01T13:00:00Z');
    const res = await flashRepo.findCurrentlyActive('br-1', checkTime);
    expect(res).toHaveLength(1);
    expect(mockPrisma.flashSale.findMany).toHaveBeenCalledWith({
      where: {
        branchId: 'br-1',
        status: FlashSaleStatus.ACTIVE,
        startTime: { lte: checkTime },
        endTime: { gte: checkTime },
        deletedAt: null,
      },
      orderBy: { startTime: 'asc' },
      include: expect.any(Object),
    });
  });

  it('should increment booked slot count atomically with version increment', async () => {
    await flashRepo.incrementBookedSlot('fs-1', 1);
    expect(mockPrisma.flashSale.update).toHaveBeenCalledWith({
      where: { id: 'fs-1', version: 1 },
      data: {
        bookedSlotCount: { increment: 1 },
        version: { increment: 1 },
      },
    });
  });

  it('should throw ConflictException when optimistic concurrency fails on increment', async () => {
    mockPrisma.flashSale.update.mockRejectedValueOnce({ code: 'P2025' });
    await expect(flashRepo.incrementBookedSlot('fs-1', 1)).rejects.toThrow(ConflictException);
  });

  it('should end flash sale', async () => {
    await flashRepo.end('fs-1', 1);
    expect(mockPrisma.flashSale.update).toHaveBeenCalledWith({
      where: { id: 'fs-1', version: 1 },
      data: expect.objectContaining({
        status: FlashSaleStatus.ENDED,
        version: { increment: 1 },
      }),
      include: expect.any(Object),
    });
  });

  it('should soft delete flash sale', async () => {
    await flashRepo.softDelete('fs-1', 'sal-1');
    expect(mockPrisma.flashSale.update).toHaveBeenCalledWith({
      where: { id: 'fs-1' },
      data: expect.objectContaining({
        status: FlashSaleStatus.CANCELLED,
        deletedAt: expect.any(Date),
      }),
    });
  });
});
