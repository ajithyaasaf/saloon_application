import { Test, TestingModule } from '@nestjs/testing';
import { CustomerProfileEntity } from '../../entities/customer-profile.entity';
import { CustomerNoteRepository } from '../../repositories/customer-note.repository';
import { CustomerTagRepository } from '../../repositories/customer-tag.repository';
import { MembershipPlanRepository } from '../../repositories/membership-plan.repository';
import { CustomerLoyaltyService } from '../../services/customer-loyalty.service';
import { CustomerMergeService } from '../../services/customer-merge.service';
import { CustomerPreferenceService } from '../../services/customer-preference.service';
import { CustomerTagService } from '../../services/customer-tag.service';
import { CustomerService } from '../../services/customer.service';
import { CustomerWalletService } from '../../services/customer-wallet.service';
import { MembershipService } from '../../services/membership.service';
import { ReferralService } from '../../services/referral.service';
import { CustomerOwnerController } from '../customer-owner.controller';

describe('CustomerOwnerController', () => {
  let controller: CustomerOwnerController;
  let customerService: any;
  let preferenceService: any;
  let tagService: any;
  let loyaltyService: any;
  let membershipService: any;
  let walletService: any;
  let referralService: any;
  let mergeService: any;
  let noteRepo: any;
  let tagRepo: any;
  let planRepo: any;

  const mockUser = { id: '123e4567-e89b-12d3-a456-426614174000', role: 'SALON_OWNER' };
  const mockCustomer = new CustomerProfileEntity({
    id: '123e4567-e89b-12d3-a456-426614174001',
    customerCode: 'CUST-SAL1-0042',
    salonId: 'sal_1',
    primaryBranchId: 'br_1',
    firstName: 'Bob',
    phone: '+919876543210',
    status: 'ACTIVE' as any,
    walletBalance: 5000,
    version: 1,
    createdByUserId: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    customerService = {
      createCustomer: jest.fn().mockResolvedValue(mockCustomer),
      searchCustomers: jest.fn().mockResolvedValue({
        data: [mockCustomer],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      }),
      getCustomer: jest.fn().mockResolvedValue(mockCustomer),
      updateCustomer: jest.fn().mockResolvedValue(mockCustomer),
      blockCustomer: jest.fn().mockResolvedValue({ ...mockCustomer, status: 'BLOCKED', isBlacklisted: true }),
      unblockCustomer: jest.fn().mockResolvedValue(mockCustomer),
      archiveCustomer: jest.fn().mockResolvedValue({ ...mockCustomer, status: 'ARCHIVED' }),
      restoreCustomer: jest.fn().mockResolvedValue(mockCustomer),
    };
    preferenceService = { updatePreferences: jest.fn() };
    tagService = { createTag: jest.fn(), updateTag: jest.fn(), assignTag: jest.fn(), removeTag: jest.fn() };
    loyaltyService = { earnPoints: jest.fn(), redeemPoints: jest.fn() };
    membershipService = { createPlan: jest.fn(), assignMembership: jest.fn() };
    walletService = { credit: jest.fn(), debit: jest.fn(), refund: jest.fn(), adjust: jest.fn() };
    referralService = { createReferral: jest.fn(), rewardReferral: jest.fn() };
    mergeService = { mergeCustomers: jest.fn() };
    noteRepo = { create: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
    tagRepo = { softDelete: jest.fn() };
    planRepo = { softDelete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOwnerController],
      providers: [
        { provide: CustomerService, useValue: customerService },
        { provide: CustomerPreferenceService, useValue: preferenceService },
        { provide: CustomerTagService, useValue: tagService },
        { provide: CustomerLoyaltyService, useValue: loyaltyService },
        { provide: MembershipService, useValue: membershipService },
        { provide: CustomerWalletService, useValue: walletService },
        { provide: ReferralService, useValue: referralService },
        { provide: CustomerMergeService, useValue: mergeService },
        { provide: CustomerNoteRepository, useValue: noteRepo },
        { provide: CustomerTagRepository, useValue: tagRepo },
        { provide: MembershipPlanRepository, useValue: planRepo },
      ],
    }).compile();

    controller = module.get<CustomerOwnerController>(CustomerOwnerController);
  });

  describe('createCustomer', () => {
    it('should create customer profile and return 201 response', async () => {
      const response = await controller.createCustomer(
        { salonId: 'sal_1', primaryBranchId: 'br_1', firstName: 'Bob', phone: '+919876543210' },
        mockUser,
      );
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(mockCustomer.id);
    });
  });

  describe('blockCustomer', () => {
    it('should block customer profile and return updated customer', async () => {
      const response = await controller.blockCustomer('123e4567-e89b-12d3-a456-426614174001', 'NO_SHOW' as any, 'Repeated no shows', mockUser);
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('BLOCKED');
    });
  });
});
