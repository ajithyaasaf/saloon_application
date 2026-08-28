import { Test, TestingModule } from '@nestjs/testing';
import { CustomerProfileRepository } from '../../repositories/customer-profile.repository';
import { CustomerAdminController } from '../customer-admin.controller';

describe('CustomerAdminController', () => {
  let controller: CustomerAdminController;
  let profileRepo: any;

  beforeEach(async () => {
    profileRepo = {
      search: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAdminController],
      providers: [{ provide: CustomerProfileRepository, useValue: profileRepo }],
    }).compile();

    controller = module.get<CustomerAdminController>(CustomerAdminController);
  });

  describe('getStatistics', () => {
    it('should return platform wide customer CRM statistics', async () => {
      const response = await controller.getStatistics();
      expect(response.success).toBe(true);
      expect(response.data.totalCustomers).toBeDefined();
      expect(response.data.activeCustomers).toBeDefined();
    });
  });

  describe('search', () => {
    it('should perform platform wide search', async () => {
      const response = await controller.search({ page: 1, limit: 10 });
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });
});
