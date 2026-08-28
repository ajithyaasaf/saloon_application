import { Test, TestingModule } from '@nestjs/testing';
import { CustomerProfileEntity } from '../../entities/customer-profile.entity';
import { MembershipPlanRepository } from '../../repositories/membership-plan.repository';
import { CustomerLoyaltyService } from '../../services/customer-loyalty.service';
import { CustomerService } from '../../services/customer.service';
import { MembershipService } from '../../services/membership.service';
import { CustomerPublicController } from '../customer-public.controller';

describe('CustomerPublicController', () => {
  let controller: CustomerPublicController;
  let customerService: any;
  let loyaltyService: any;
  let membershipService: any;
  let planRepo: any;

  const mockCustomer = new CustomerProfileEntity({
    id: '123e4567-e89b-12d3-a456-426614174000',
    customerCode: 'CUST-SAL1-0001',
    salonId: '123e4567-e89b-12d3-a456-426614174001',
    primaryBranchId: '123e4567-e89b-12d3-a456-426614174002',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+919876543210',
    status: 'ACTIVE' as any,
    walletBalance: 1000,
    version: 1,
    createdByUserId: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    customerService = {
      searchCustomers: jest.fn().mockResolvedValue({
        data: [mockCustomer],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      }),
      getCustomer: jest.fn().mockResolvedValue(mockCustomer),
    };
    loyaltyService = {
      getLedger: jest.fn().mockResolvedValue([]),
    };
    membershipService = {
      createPlan: jest.fn(),
    };
    planRepo = {
      findBySalon: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerPublicController],
      providers: [
        { provide: CustomerService, useValue: customerService },
        { provide: CustomerLoyaltyService, useValue: loyaltyService },
        { provide: MembershipService, useValue: membershipService },
        { provide: MembershipPlanRepository, useValue: planRepo },
      ],
    }).compile();

    controller = module.get<CustomerPublicController>(CustomerPublicController);
  });

  describe('search', () => {
    it('should return paginated customer profiles', async () => {
      const response = await controller.search({ page: 1, limit: 10 });
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('getCustomer', () => {
    it('should return customer profile by ID', async () => {
      const response = await controller.getCustomer('123e4567-e89b-12d3-a456-426614174000');
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
