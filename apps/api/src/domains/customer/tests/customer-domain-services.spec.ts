import { Test, TestingModule } from '@nestjs/testing';
import { CustomerStatus, MembershipStatus, ReferralStatus, WalletTransactionType } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerLoyaltyRepository } from '../repositories/customer-loyalty.repository';
import { CustomerMembershipRepository } from '../repositories/customer-membership.repository';
import { CustomerMergeHistoryRepository } from '../repositories/customer-merge-history.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerReferralRepository } from '../repositories/customer-referral.repository';
import { CustomerTagAssignmentRepository } from '../repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from '../repositories/customer-tag.repository';
import { CustomerVisitHistoryRepository } from '../repositories/customer-visit-history.repository';
import { CustomerWalletLedgerRepository } from '../repositories/customer-wallet-ledger.repository';
import { LoyaltyLedgerRepository } from '../repositories/loyalty-ledger.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import { ReferralRewardRepository } from '../repositories/referral-reward.repository';
import { CustomerLoyaltyService } from '../services/customer-loyalty.service';
import { CustomerMergeService } from '../services/customer-merge.service';
import { CustomerTagService } from '../services/customer-tag.service';
import { CustomerVisitService } from '../services/customer-visit.service';
import { CustomerWalletService } from '../services/customer-wallet.service';
import { MembershipService } from '../services/membership.service';
import { ReferralService } from '../services/referral.service';

describe('Customer Domain Services Integration & Business Rules', () => {
  let loyaltyService: CustomerLoyaltyService;
  let walletService: CustomerWalletService;
  let membershipService: MembershipService;
  let referralService: ReferralService;
  let mergeService: CustomerMergeService;
  let tagService: CustomerTagService;
  let visitService: CustomerVisitService;

  let customerRepo: any;
  let loyaltyRepo: any;
  let ledgerRepo: any;
  let walletLedgerRepo: any;
  let planRepo: any;
  let membershipRepo: any;
  let referralRepo: any;
  let rewardRepo: any;
  let tagRepo: any;
  let assignmentRepo: any;
  let visitRepo: any;
  let mergeRepo: any;

  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockCustomer = {
    id: 'cust_source',
    customerCode: 'CUST-SRC-001',
    salonId: 'sal_1',
    phone: '+919876543210',
    walletBalance: 10000,
    status: CustomerStatus.ACTIVE,
    version: 1,
  };

  const mockTarget = {
    id: 'cust_target',
    customerCode: 'CUST-TGT-002',
    salonId: 'sal_1',
    phone: '+919876543211',
    walletBalance: 5000,
    status: CustomerStatus.ACTIVE,
    version: 1,
  };

  beforeEach(async () => {
    customerRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'cust_source') return Promise.resolve(mockCustomer);
        if (id === 'cust_target') return Promise.resolve(mockTarget);
        return Promise.resolve(null);
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    loyaltyRepo = {
      findByCustomer: jest.fn().mockImplementation((id: string) => {
        if (id === 'cust_source') return Promise.resolve({ id: 'loy_src', pointsBalance: 200, lifetimePointsEarned: 1400, currentTier: 'SILVER', version: 1 });
        if (id === 'cust_target') return Promise.resolve({ id: 'loy_tgt', pointsBalance: 100, lifetimePointsEarned: 500, currentTier: 'SILVER', version: 1 });
        return Promise.resolve(null);
      }),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'loy_1', pointsBalance: 200, lifetimePointsEarned: 1500, currentTier: 'GOLD', version: 2 }),
    };
    ledgerRepo = {
      create: jest.fn().mockResolvedValue({}),
      findByCustomer: jest.fn().mockResolvedValue([]),
    };
    walletLedgerRepo = {
      create: jest.fn().mockImplementation((custProfileId, type, amount, prev, next) =>
        Promise.resolve({
          id: 'wled_123',
          customerProfileId: custProfileId,
          type,
          amount,
          previousBalance: prev,
          newBalance: next,
        }),
      ),
      findByCustomer: jest.fn().mockResolvedValue([]),
    };
    planRepo = {
      findById: jest.fn(),
      create: jest.fn(),
    };
    membershipRepo = {
      findActiveMembership: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    referralRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    rewardRepo = {
      create: jest.fn(),
    };
    tagRepo = {
      findById: jest.fn(),
      create: jest.fn(),
    };
    assignmentRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
    };
    visitRepo = {
      create: jest.fn().mockResolvedValue({ id: 'vis_1' }),
      findByCustomer: jest.fn().mockResolvedValue([]),
    };
    mergeRepo = {
      create: jest.fn().mockResolvedValue({ id: 'merge_1' }),
    };

    transactionService = {
      run: jest.fn().mockImplementation((cb) => cb({})),
    };
    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };
    cacheService = {
      getOrSet: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerLoyaltyService,
        CustomerWalletService,
        MembershipService,
        ReferralService,
        CustomerMergeService,
        CustomerTagService,
        CustomerVisitService,
        { provide: CustomerProfileRepository, useValue: customerRepo },
        { provide: CustomerLoyaltyRepository, useValue: loyaltyRepo },
        { provide: LoyaltyLedgerRepository, useValue: ledgerRepo },
        { provide: CustomerWalletLedgerRepository, useValue: walletLedgerRepo },
        { provide: MembershipPlanRepository, useValue: planRepo },
        { provide: CustomerMembershipRepository, useValue: membershipRepo },
        { provide: CustomerReferralRepository, useValue: referralRepo },
        { provide: ReferralRewardRepository, useValue: rewardRepo },
        { provide: CustomerTagRepository, useValue: tagRepo },
        { provide: CustomerTagAssignmentRepository, useValue: assignmentRepo },
        { provide: CustomerVisitHistoryRepository, useValue: visitRepo },
        { provide: CustomerMergeHistoryRepository, useValue: mergeRepo },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    loyaltyService = module.get<CustomerLoyaltyService>(CustomerLoyaltyService);
    walletService = module.get<CustomerWalletService>(CustomerWalletService);
    membershipService = module.get<MembershipService>(MembershipService);
    referralService = module.get<ReferralService>(ReferralService);
    mergeService = module.get<CustomerMergeService>(CustomerMergeService);
    tagService = module.get<CustomerTagService>(CustomerTagService);
    visitService = module.get<CustomerVisitService>(CustomerVisitService);
  });

  describe('CustomerLoyaltyService', () => {
    it('should earn points, recalculate tier, append ledger, and publish event', async () => {
      const entity = await loyaltyService.earnPoints('cust_source', 100, 'BOOKING', 'bk_1', 'usr_1');

      expect(entity.currentTier).toBe('GOLD');
      expect(ledgerRepo.create).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException when redeeming more points than balance', async () => {
      loyaltyRepo.findByCustomer.mockResolvedValueOnce({ id: 'loy_1', pointsBalance: 50, version: 1 });

      await expect(loyaltyService.redeemPoints('cust_source', 100, undefined, undefined, 'usr_1')).rejects.toThrow(ConflictException);
    });
  });

  describe('CustomerWalletService', () => {
    it('should credit wallet via double-entry transaction and append ledger', async () => {
      const ledger = await walletService.credit('cust_source', 2000, 'TOPUP', 'pay_1', 'Wallet top-up', 'usr_1');

      expect(ledger.isCredit()).toBe(true);
      expect(walletLedgerRepo.create).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException on insufficient balance debit', async () => {
      customerRepo.findById.mockResolvedValueOnce({ ...mockCustomer, walletBalance: 100 });

      await expect(walletService.debit('cust_source', 500, undefined, undefined, undefined, 'usr_1')).rejects.toThrow(ConflictException);
    });
  });

  describe('MembershipService', () => {
    it('should prevent assigning membership if active membership already exists', async () => {
      membershipRepo.findActiveMembership.mockResolvedValue({ id: 'mem_active' });

      await expect(
        membershipService.assignMembership(
          {
            customerProfileId: 'cust_source',
            membershipPlanId: 'plan_1',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            pricePaid: 1000,
          },
          'usr_1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ReferralService', () => {
    it('should prevent self-referral', async () => {
      await expect(
        referralService.createReferral({ referrerCustomerProfileId: 'cust_source', referredPhone: '+919876543210' }, 'usr_1'),
      ).rejects.toThrow(ValidationException);
    });

    it('should reward referral only once', async () => {
      referralRepo.findById.mockResolvedValue({ id: 'ref_1', status: ReferralStatus.REWARDED, version: 1 });

      await expect(referralService.rewardReferral('ref_1', 'usr_1')).rejects.toThrow(ConflictException);
    });
  });

  describe('CustomerMergeService', () => {
    it('should archive source, write merge history, transfer wallet/loyalty, and publish event', async () => {
      const record = await mergeService.mergeCustomers('cust_source', 'cust_target', 'Duplicate customer profile', 'usr_1');

      expect(record.id).toBe('merge_1');
      expect(mergeRepo.create).toHaveBeenCalled();
      expect(customerRepo.update).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
