import { Test, TestingModule } from '@nestjs/testing';
import { BranchService } from '../../services/branch.service';
import { SalonService } from '../../services/salon.service';
import { SalonPublicController } from '../salon-public.controller';

describe('SalonPublicController', () => {
  let controller: SalonPublicController;
  let salonServiceMock: { searchSalons: jest.Mock; getSalonById: jest.Mock; getSalonBySlug: jest.Mock };
  let branchServiceMock: { findNearbyBranches: jest.Mock };

  beforeEach(async () => {
    salonServiceMock = {
      searchSalons: jest.fn(),
      getSalonById: jest.fn(),
      getSalonBySlug: jest.fn(),
    };
    branchServiceMock = { findNearbyBranches: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonPublicController],
      providers: [
        { provide: SalonService, useValue: salonServiceMock },
        { provide: BranchService, useValue: branchServiceMock },
      ],
    }).compile();

    controller = module.get<SalonPublicController>(SalonPublicController);
  });

  const mockSalon = { id: 'sal_100', brandName: 'Royal Salon', slug: 'royal-salon' };

  describe('searchSalons()', () => {
    it('should return paginated envelope of approved salons', async () => {
      salonServiceMock.searchSalons.mockResolvedValue({
        data: [mockSalon],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrevious: false },
      });

      const response = await controller.searchSalons({});
      expect(response.success).toBe(true);
      expect(response.data).toEqual([mockSalon]);
    });
  });

  describe('getSalonById()', () => {
    it('should return salon profile envelope', async () => {
      salonServiceMock.getSalonById.mockResolvedValue(mockSalon);

      const response = await controller.getSalonById('sal_100');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockSalon);
    });
  });
});
