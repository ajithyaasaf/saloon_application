import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleStatus } from '@prisma/client';
import { FlashSaleEntity } from '../../entities/flash-sale.entity';
import { FlashSaleService } from '../../services/flash-sale.service';
import { FlashSaleOwnerController } from '../flash-sale-owner.controller';

describe('FlashSaleOwnerController', () => {
  let controller: FlashSaleOwnerController;
  let flashSaleService: jest.Mocked<FlashSaleService>;

  const mockOwnerUser = { id: 'owner-1', salonId: 'sal-1', roles: ['SALON_OWNER'] };

  const mockSale = new FlashSaleEntity({
    id: 'fs-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    serviceId: 'srv-1',
    title: 'Weekend Flash Sale',
    discountPercentage: 40,
    specialPrice: 600,
    startTime: new Date(Date.now() + 10000),
    endTime: new Date(Date.now() + 100000),
    maxSlotQuota: 5,
    bookedSlotCount: 0,
    status: FlashSaleStatus.SCHEDULED,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockService = {
      createFlashSale: jest.fn().mockResolvedValue(mockSale),
      searchFlashSales: jest.fn().mockResolvedValue({ data: [mockSale], total: 1 }),
      getFlashSaleById: jest.fn().mockResolvedValue(mockSale),
      updateFlashSale: jest.fn().mockResolvedValue(new FlashSaleEntity({ ...mockSale, title: 'Updated Sale' })),
      activateFlashSale: jest.fn().mockResolvedValue(new FlashSaleEntity({ ...mockSale, status: FlashSaleStatus.ACTIVE })),
      endFlashSale: jest.fn().mockResolvedValue(new FlashSaleEntity({ ...mockSale, status: FlashSaleStatus.ENDED })),
      cancelFlashSale: jest.fn().mockResolvedValue(new FlashSaleEntity({ ...mockSale, status: FlashSaleStatus.CANCELLED })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashSaleOwnerController],
      providers: [{ provide: FlashSaleService, useValue: mockService }],
    }).compile();

    controller = module.get<FlashSaleOwnerController>(FlashSaleOwnerController);
    flashSaleService = module.get(FlashSaleService);
  });

  it('should create flash sale with authenticated salonId', async () => {
    const res = await controller.createFlashSale(mockOwnerUser, {
      branchId: 'br-1',
      serviceId: 'srv-1',
      title: 'Weekend Flash Sale',
      discountPercentage: 40,
      specialPrice: 600,
      startTime: new Date(Date.now() + 10000),
      endTime: new Date(Date.now() + 100000),
      maxSlotQuota: 5,
    });

    expect(res.data.id).toBe('fs-1');
    expect(flashSaleService.createFlashSale).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1' }),
      'owner-1',
    );
  });

  it('should activate and end flash sale', async () => {
    const act = await controller.activateFlashSale(mockOwnerUser, 'fs-1', 1);
    expect(act.data.status).toBe(FlashSaleStatus.ACTIVE);

    const end = await controller.endFlashSale(mockOwnerUser, 'fs-1', 1);
    expect(end.data.status).toBe(FlashSaleStatus.ENDED);
  });

  it('should cancel flash sale', async () => {
    const res = await controller.cancelFlashSale(mockOwnerUser, 'fs-1', { reason: 'Early finish' });
    expect(res.data.status).toBe(FlashSaleStatus.CANCELLED);
  });
});
