import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import { FlashSaleRepository } from '../repositories/flash-sale.repository';
import { FlashSaleService } from '../services/flash-sale.service';

describe('FlashSaleService', () => {
  let service: FlashSaleService;
  let flashRepo: jest.Mocked<FlashSaleRepository>;
  let auditService: jest.Mocked<AuditService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockSale: any = {
    id: 'fs-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    serviceId: 'srv-1',
    title: 'Flash Sale',
    discountPercentage: new Prisma.Decimal(50),
    specialPrice: 500,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() + 3600000),
    maxSlotQuota: 5,
    bookedSlotCount: 2,
    status: FlashSaleStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockResolvedValue(mockSale),
      findById: jest.fn().mockResolvedValue(mockSale),
      update: jest.fn().mockResolvedValue({ ...mockSale, title: 'Updated' }),
      updateStatus: jest.fn().mockResolvedValue({ ...mockSale, status: FlashSaleStatus.ACTIVE }),
      end: jest.fn().mockResolvedValue({ ...mockSale, status: FlashSaleStatus.ENDED }),
      cancel: jest.fn().mockResolvedValue({ ...mockSale, status: FlashSaleStatus.CANCELLED }),
      incrementBookedSlot: jest.fn().mockResolvedValue({ ...mockSale, bookedSlotCount: 3 }),
      decrementBookedSlot: jest.fn().mockResolvedValue({ ...mockSale, bookedSlotCount: 2 }),
      findCurrentlyActive: jest.fn().mockResolvedValue([mockSale]),
      search: jest.fn().mockResolvedValue({ data: [mockSale], total: 1 }),
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };
    const mockEvent = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashSaleService,
        { provide: FlashSaleRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
        { provide: EventBusService, useValue: mockEvent },
      ],
    }).compile();

    service = module.get(FlashSaleService);
    flashRepo = module.get(FlashSaleRepository);
    auditService = module.get(AuditService);
    cacheService = module.get(CacheService);
    eventBus = module.get(EventBusService);
  });

  it('should create flash sale and emit event', async () => {
    const res = await service.createFlashSale({
      salonId: 'sal-1',
      branchId: 'br-1',
      serviceId: 'srv-1',
      title: 'Flash Sale',
      discountPercentage: 50,
      specialPrice: 500,
      startTime: new Date(Date.now() + 10000),
      endTime: new Date(Date.now() + 100000),
      maxSlotQuota: 5,
    });

    expect(res).toBeInstanceOf(FlashSaleEntity);
    expect(flashRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reserve slot atomically and invalidate cache', async () => {
    const res = await service.reserveSlot('fs-1', 'br-1');
    expect(res.bookedSlotCount).toBe(3);
    expect(flashRepo.incrementBookedSlot).toHaveBeenCalledWith('fs-1', 1);
    expect(cacheService.delete).toHaveBeenCalled();
  });

  it('should reject reserveSlot when sale is fully booked', async () => {
    flashRepo.findById.mockResolvedValueOnce({ ...mockSale, bookedSlotCount: 5 }); // 5/5
    await expect(service.reserveSlot('fs-1')).rejects.toThrow(ConflictException);
  });

  it('should release slot when booking cancelled', async () => {
    const res = await service.releaseSlot('fs-1');
    expect(res.bookedSlotCount).toBe(2);
    expect(flashRepo.decrementBookedSlot).toHaveBeenCalledWith('fs-1');
  });

  it('should end and cancel flash sale', async () => {
    const ended = await service.endFlashSale('fs-1', 'sal-1', 1);
    expect(ended.status).toBe(FlashSaleStatus.ENDED);

    const cancelled = await service.cancelFlashSale('fs-1', 'sal-1', 'Closed early', 1);
    expect(cancelled.status).toBe(FlashSaleStatus.CANCELLED);
  });
});
