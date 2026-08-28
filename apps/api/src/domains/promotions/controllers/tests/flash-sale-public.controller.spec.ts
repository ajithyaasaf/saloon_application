import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleStatus } from '@prisma/client';
import { FlashSaleEntity } from '../../entities/flash-sale.entity';
import { FlashSaleService } from '../../services/flash-sale.service';
import { FlashSalePublicController } from '../flash-sale-public.controller';

describe('FlashSalePublicController', () => {
  let controller: FlashSalePublicController;
  let flashSaleService: jest.Mocked<FlashSaleService>;

  const mockSale = new FlashSaleEntity({
    id: 'fs-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    serviceId: 'srv-1',
    title: '50% Flash Sale',
    discountPercentage: 50,
    specialPrice: 500,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() + 3600000),
    maxSlotQuota: 10,
    bookedSlotCount: 2,
    status: FlashSaleStatus.ACTIVE,
  });

  beforeEach(async () => {
    const mockService = {
      searchFlashSales: jest.fn().mockResolvedValue({ data: [mockSale], total: 1 }),
      getCurrentlyActiveFlashSales: jest.fn().mockResolvedValue([mockSale]),
      getFlashSaleById: jest.fn().mockResolvedValue(mockSale),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashSalePublicController],
      providers: [{ provide: FlashSaleService, useValue: mockService }],
    }).compile();

    controller = module.get<FlashSalePublicController>(FlashSalePublicController);
    flashSaleService = module.get(FlashSaleService);
  });

  it('should search public active flash sales', async () => {
    const res = await controller.searchFlashSales({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].title).toBe('50% Flash Sale');
    expect(res.data[0].remainingSlots).toBe(8);
  });

  it('should get active flash sales for branch', async () => {
    const res = await controller.getActiveFlashSales('br-1');
    expect(res.data).toHaveLength(1);
    expect(flashSaleService.getCurrentlyActiveFlashSales).toHaveBeenCalledWith('br-1');
  });

  it('should get flash sale by ID', async () => {
    const res = await controller.getFlashSaleById('fs-1');
    expect(res.data.id).toBe('fs-1');
  });
});
