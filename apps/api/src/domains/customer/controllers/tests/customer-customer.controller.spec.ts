import { Test, TestingModule } from '@nestjs/testing';
import { CustomerProfileEntity } from '../../entities/customer-profile.entity';
import { CustomerMembershipRepository } from '../../repositories/customer-membership.repository';
import { CustomerNoteRepository } from '../../repositories/customer-note.repository';
import { CustomerProfileRepository } from '../../repositories/customer-profile.repository';
import { CustomerReferralRepository } from '../../repositories/customer-referral.repository';
import { CustomerLoyaltyService } from '../../services/customer-loyalty.service';
import { CustomerPreferenceService } from '../../services/customer-preference.service';
import { CustomerService } from '../../services/customer.service';
import { CustomerVisitService } from '../../services/customer-visit.service';
import { CustomerWalletService } from '../../services/customer-wallet.service';
import { MembershipService } from '../../services/membership.service';
import { ReferralService } from '../../services/referral.service';
import { CustomerCustomerController } from '../customer-customer.controller';

describe('CustomerCustomerController', () => {
  let controller: CustomerCustomerController;
  let customerService: any;
  let preferenceService: any;
  let loyaltyService: any;
  let walletService: any;
  let membershipService: any;
  let visitService: any;
  let referralService: any;
  let profileRepo: any;
  let membershipRepo: any;
  let referralRepo: any;
  let noteRepo: any;

  const mockUser = { id: '123e4567-e89b-12d3-a456-426614174000', role: 'CUSTOMER' };
  const mockCustomer = new CustomerProfileEntity({
    id: '123e4567-e89b-12d3-a456-426614174000',
    customerCode: 'CUST-SAL1-0001',
    salonId: 'sal_1',
    primaryBranchId: 'br_1',
    firstName: 'Alice',
    phone: '+919876543210',
    status: 'ACTIVE' as any,
    walletBalance: 2000,
    version: 1,
    createdByUserId: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    customerService = {
      getCustomer: jest.fn().mockResolvedValue(mockCustomer),
    };
    preferenceService = {
      updatePreferences: jest.fn(),
    };
    loyaltyService = {
      getLedger: jest.fn().mockResolvedValue([]),
    };
    walletService = {
      getLedger: jest.fn().mockResolvedValue([]),
    };
    membershipService = {};
    visitService = {
      getVisitHistory: jest.fn().mockResolvedValue([]),
    };
    referralService = {};
    profileRepo = {};
    membershipRepo = {
      findActiveMembership: jest.fn().mockResolvedValue(null),
    };
    referralRepo = {
      findByCustomer: jest.fn().mockResolvedValue([]),
    };
    noteRepo = {
      findByCustomer: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerCustomerController],
      providers: [
        { provide: CustomerService, useValue: customerService },
        { provide: CustomerPreferenceService, useValue: preferenceService },
        { provide: CustomerLoyaltyService, useValue: loyaltyService },
        { provide: CustomerWalletService, useValue: walletService },
        { provide: MembershipService, useValue: membershipService },
        { provide: CustomerVisitService, useValue: visitService },
        { provide: ReferralService, useValue: referralService },
        { provide: CustomerProfileRepository, useValue: profileRepo },
        { provide: CustomerMembershipRepository, useValue: membershipRepo },
        { provide: CustomerReferralRepository, useValue: referralRepo },
        { provide: CustomerNoteRepository, useValue: noteRepo },
      ],
    }).compile();

    controller = module.get<CustomerCustomerController>(CustomerCustomerController);
  });

  describe('getProfile', () => {
    it('should return logged in customer profile', async () => {
      const response = await controller.getProfile(mockUser);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(mockUser.id);
    });
  });

  describe('getWalletLedger', () => {
    it('should return wallet transaction ledger', async () => {
      const response = await controller.getWalletLedger(mockUser);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });
});
