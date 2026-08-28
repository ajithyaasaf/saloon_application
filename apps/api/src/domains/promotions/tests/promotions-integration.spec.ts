import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
  CouponUsageStatus,
  FlashSaleStatus,
  GiftCardStatus,
  GiftCardTransactionType,
  MarketingCampaignStatus,
  MarketingCampaignType,
} from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';

import { CouponUsageEntity } from '../entities/coupon-usage.entity';
import { CouponEntity } from '../entities/coupon.entity';
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import { GiftCardEntity, GiftCardTransactionEntity } from '../entities/gift-card.entity';
import { MarketingCampaignEntity } from '../entities/marketing-campaign.entity';

import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponRepository,
  CouponServiceApplicabilityRepository,
} from '../repositories/coupon.repository';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';
import { FlashSaleRepository } from '../repositories/flash-sale.repository';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';
import { MarketingCampaignRepository } from '../repositories/marketing-campaign.repository';

import { CouponApplicabilityService } from '../services/coupon-applicability.service';
import { CouponUsageService } from '../services/coupon-usage.service';
import { CouponValidationService } from '../services/coupon-validation.service';
import { CouponService } from '../services/coupon.service';
import { FlashSaleService } from '../services/flash-sale.service';
import { GiftCardTransactionService } from '../services/gift-card-transaction.service';
import { GiftCardService } from '../services/gift-card.service';
import { MarketingCampaignService } from '../services/marketing-campaign.service';

describe('Promotions Domain E2E Integration & Security Hardening Tests', () => {
  let couponService: CouponService;
  let validationService: CouponValidationService;
  let applicabilityService: CouponApplicabilityService;
  let usageService: CouponUsageService;
  let giftCardService: GiftCardService;
  let giftCardTxService: GiftCardTransactionService;
  let flashSaleService: FlashSaleService;
  let campaignService: MarketingCampaignService;

  let auditService: AuditService;
  let cacheService: CacheService;
  let eventBus: EventBusService;

  // In-memory data store for stateful integration simulation
  let inMemoryCoupons: Map<string, any>;
  let inMemoryCouponUsages: Map<string, any>;
  let inMemoryServiceApps: Map<string, any[]>;
  let inMemoryCategoryApps: Map<string, any[]>;
  let inMemoryBranchApps: Map<string, any[]>;
  let inMemoryCustomerElig: Map<string, any[]>;
  let inMemoryGiftCards: Map<string, any>;
  let inMemoryGiftCardTxs: Map<string, any[]>;
  let inMemoryFlashSales: Map<string, any>;
  let inMemoryCampaigns: Map<string, any>;

  let auditLogs: any[];
  let dispatchedEvents: any[];
  let invalidatedCacheKeys: string[];

  beforeEach(async () => {
    inMemoryCoupons = new Map();
    inMemoryCouponUsages = new Map();
    inMemoryServiceApps = new Map();
    inMemoryCategoryApps = new Map();
    inMemoryBranchApps = new Map();
    inMemoryCustomerElig = new Map();
    inMemoryGiftCards = new Map();
    inMemoryGiftCardTxs = new Map();
    inMemoryFlashSales = new Map();
    inMemoryCampaigns = new Map();

    auditLogs = [];
    dispatchedEvents = [];
    invalidatedCacheKeys = [];

    const mockAuditService = {
      log: jest.fn().mockImplementation((entry) => {
        auditLogs.push(entry);
        return Promise.resolve();
      }),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockImplementation((key) => {
        invalidatedCacheKeys.push(key);
        return Promise.resolve();
      }),
      deletePattern: jest.fn().mockImplementation((pattern) => {
        invalidatedCacheKeys.push(pattern);
        return Promise.resolve();
      }),
    };

    const mockEventBus = {
      publish: jest.fn().mockImplementation((event) => {
        dispatchedEvents.push(event);
        return Promise.resolve();
      }),
    };

    const mockTransactionService = {
      execute: jest.fn().mockImplementation((cb) => cb({})),
      run: jest.fn().mockImplementation((cb) => cb({})),
    };

    // Concrete In-Memory Repositories
    const mockCouponRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `cpn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          currentUsageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, doc);
        return Promise.resolve(doc);
      }),
      checkCodeExists: jest.fn().mockImplementation((code, salonId) =>
        Promise.resolve(
          Array.from(inMemoryCoupons.values()).some(
            (c) =>
              !c.deletedAt &&
              c.code.toUpperCase() === code.toUpperCase() &&
              (!salonId || c.salonId === salonId),
          ),
        ),
      ),
      findById: jest.fn().mockImplementation((id, salonId) => {
        const doc = inMemoryCoupons.get(id);
        if (!doc || doc.deletedAt) return Promise.resolve(null);
        if (salonId && doc.salonId && doc.salonId !== salonId) return Promise.resolve(null);
        return Promise.resolve(doc);
      }),
      findByCode: jest.fn().mockImplementation((code, salonId) => {
        for (const doc of inMemoryCoupons.values()) {
          if (doc.code.toUpperCase() === code.toUpperCase() && !doc.deletedAt) {
            if (salonId && doc.salonId && doc.salonId !== salonId) continue;
            return Promise.resolve(doc);
          }
        }
        return Promise.resolve(null);
      }),
      findActiveByCode: jest.fn().mockImplementation((code, salonId, checkDate = new Date()) => {
        for (const doc of inMemoryCoupons.values()) {
          if (doc.code.toUpperCase() === code.toUpperCase() && !doc.deletedAt) {
            if (salonId && doc.salonId && doc.salonId !== salonId) continue;
            if (doc.status !== CouponStatus.ACTIVE) continue;
            if (doc.startDate && checkDate < doc.startDate) continue;
            if (doc.endDate && checkDate > doc.endDate) continue;
            return Promise.resolve(doc);
          }
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((id, data, expectedVersion) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          ...data,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      updateStatus: jest.fn().mockImplementation((id, status, expectedVersion) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      incrementUsage: jest.fn().mockImplementation((id, amount = 1, expectedVersion) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        if (existing.totalUsageLimit && existing.currentUsageCount + amount > existing.totalUsageLimit) {
          throw new ConflictException('Coupon usage limit reached');
        }
        const updated = {
          ...existing,
          currentUsageCount: existing.currentUsageCount + amount,
          status:
            existing.totalUsageLimit && existing.currentUsageCount + amount >= existing.totalUsageLimit
              ? CouponStatus.DEPLETED
              : existing.status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      decrementUsage: jest.fn().mockImplementation((id, amount = 1) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = {
          ...existing,
          currentUsageCount: Math.max(0, existing.currentUsageCount - amount),
          status: existing.status === CouponStatus.DEPLETED ? CouponStatus.ACTIVE : existing.status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      incrementUsageCount: jest.fn().mockImplementation((id) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing) return Promise.resolve(null);
        if (existing.totalUsageLimit && existing.currentUsageCount >= existing.totalUsageLimit) {
          throw new ConflictException('Coupon usage limit reached');
        }
        const updated = {
          ...existing,
          currentUsageCount: existing.currentUsageCount + 1,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      decrementUsageCount: jest.fn().mockImplementation((id) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = {
          ...existing,
          currentUsageCount: Math.max(0, existing.currentUsageCount - 1),
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      softDelete: jest.fn().mockImplementation((id) => {
        const existing = inMemoryCoupons.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, status: CouponStatus.ARCHIVED, deletedAt: new Date() };
        inMemoryCoupons.set(id, updated);
        return Promise.resolve(updated);
      }),
      search: jest.fn().mockImplementation((query) => {
        let results = Array.from(inMemoryCoupons.values()).filter((c) => !c.deletedAt);
        if (query.salonId) results = results.filter((c) => c.salonId === query.salonId);
        if (query.status) results = results.filter((c) => c.status === query.status);
        return Promise.resolve({ data: results, total: results.length });
      }),
      findActiveBySalon: jest.fn().mockImplementation((salonId, checkDate = new Date()) => {
        const results = Array.from(inMemoryCoupons.values()).filter(
          (c) =>
            !c.deletedAt &&
            c.status === CouponStatus.ACTIVE &&
            (!c.salonId || c.salonId === salonId) &&
            (!c.startDate || checkDate >= c.startDate) &&
            (!c.endDate || checkDate <= c.endDate),
        );
        return Promise.resolve(results);
      }),
      findAutoApplyCoupons: jest.fn().mockImplementation((salonId, checkDate = new Date()) => {
        const results = Array.from(inMemoryCoupons.values()).filter(
          (c) =>
            !c.deletedAt &&
            c.status === CouponStatus.ACTIVE &&
            c.isAutoApply &&
            (!c.salonId || c.salonId === salonId) &&
            (!c.startDate || checkDate >= c.startDate) &&
            (!c.endDate || checkDate <= c.endDate),
        );
        return Promise.resolve(results);
      }),
    };

    const mockUsageRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `usg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          status: CouponUsageStatus.APPLIED,
          appliedAt: new Date(),
          createdAt: new Date(),
        };
        inMemoryCouponUsages.set(id, doc);
        return Promise.resolve(doc);
      }),
      findById: jest.fn().mockImplementation((id) => Promise.resolve(inMemoryCouponUsages.get(id) ?? null)),
      findByBooking: jest.fn().mockImplementation((bookingId) => {
        for (const doc of inMemoryCouponUsages.values()) {
          if (doc.bookingId === bookingId && doc.status !== CouponUsageStatus.REVERSED) {
            return Promise.resolve(doc);
          }
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existing = inMemoryCouponUsages.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        inMemoryCouponUsages.set(id, updated);
        return Promise.resolve(updated);
      }),
      updateStatus: jest.fn().mockImplementation((id, status, extra) => {
        const existing = inMemoryCouponUsages.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, status, ...extra };
        inMemoryCouponUsages.set(id, updated);
        return Promise.resolve(updated);
      }),
      settle: jest.fn().mockImplementation((id) => {
        const existing = inMemoryCouponUsages.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = {
          ...existing,
          status: CouponUsageStatus.SETTLED,
          settledAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryCouponUsages.set(id, updated);
        return Promise.resolve(updated);
      }),
      reverse: jest.fn().mockImplementation((id, reversalReason) => {
        const existing = inMemoryCouponUsages.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = {
          ...existing,
          status: CouponUsageStatus.REVERSED,
          reversedAt: new Date(),
          reversalReason,
          updatedAt: new Date(),
        };
        inMemoryCouponUsages.set(id, updated);
        return Promise.resolve(updated);
      }),
      countCustomerUsage: jest.fn().mockImplementation((customerId, couponId) => {
        const count = Array.from(inMemoryCouponUsages.values()).filter(
          (u) =>
            u.customerId === customerId &&
            u.couponId === couponId &&
            u.status !== CouponUsageStatus.REVERSED,
        ).length;
        return Promise.resolve(count);
      }),
      search: jest.fn().mockImplementation((query) => {
        let results = Array.from(inMemoryCouponUsages.values());
        if (query.customerId) results = results.filter((u) => u.customerId === query.customerId);
        if (query.couponId) results = results.filter((u) => u.couponId === query.couponId);
        if (query.salonId) results = results.filter((u) => u.salonId === query.salonId);
        return Promise.resolve({ data: results, total: results.length });
      }),
      aggregateUsageByCoupon: jest.fn().mockImplementation((couponId) => {
        const filtered = Array.from(inMemoryCouponUsages.values()).filter(
          (u) => u.couponId === couponId && u.status !== CouponUsageStatus.REVERSED,
        );
        return Promise.resolve({
          totalUsages: filtered.length,
          totalDiscountGiven: filtered.reduce((acc, u) => acc + u.discountAmount, 0),
        });
      }),
    };

    const mockServiceAppRepo = {
      setForCoupon: jest.fn().mockImplementation((couponId, serviceIds) => {
        const mappings = serviceIds.map((sId: string) => ({
          id: `app-srv-${couponId}-${sId}`,
          couponId,
          serviceId: sId,
          createdAt: new Date(),
        }));
        inMemoryServiceApps.set(couponId, mappings);
        return Promise.resolve(mappings);
      }),
      findByCoupon: jest.fn().mockImplementation((couponId) =>
        Promise.resolve(inMemoryServiceApps.get(couponId) ?? []),
      ),
    };

    const mockCategoryAppRepo = {
      setForCoupon: jest.fn().mockImplementation((couponId, categoryIds) => {
        const mappings = categoryIds.map((cId: string) => ({
          id: `app-cat-${couponId}-${cId}`,
          couponId,
          categoryId: cId,
          createdAt: new Date(),
        }));
        inMemoryCategoryApps.set(couponId, mappings);
        return Promise.resolve(mappings);
      }),
      findByCoupon: jest.fn().mockImplementation((couponId) =>
        Promise.resolve(inMemoryCategoryApps.get(couponId) ?? []),
      ),
    };

    const mockBranchAppRepo = {
      setForCoupon: jest.fn().mockImplementation((couponId, branchIds) => {
        const mappings = branchIds.map((bId: string) => ({
          id: `app-br-${couponId}-${bId}`,
          couponId,
          branchId: bId,
          createdAt: new Date(),
        }));
        inMemoryBranchApps.set(couponId, mappings);
        return Promise.resolve(mappings);
      }),
      findByCoupon: jest.fn().mockImplementation((couponId) =>
        Promise.resolve(inMemoryBranchApps.get(couponId) ?? []),
      ),
    };

    const mockCustomerEligRepo = {
      setForCoupon: jest.fn().mockImplementation((couponId, customerIds) => {
        const mappings = customerIds.map((cId: string) => ({
          id: `elig-cust-${couponId}-${cId}`,
          couponId,
          customerId: cId,
          createdAt: new Date(),
        }));
        inMemoryCustomerElig.set(couponId, mappings);
        return Promise.resolve(mappings);
      }),
      findByCoupon: jest.fn().mockImplementation((couponId) =>
        Promise.resolve(inMemoryCustomerElig.get(couponId) ?? []),
      ),
      isEligible: jest.fn().mockImplementation((couponId, customerId) => {
        const list = inMemoryCustomerElig.get(couponId) ?? [];
        return Promise.resolve(list.some((it) => it.customerId === customerId));
      }),
    };

    const mockGiftCardRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `gc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          currentBalance: data.initialBalance,
          status: GiftCardStatus.ACTIVE,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, doc);
        return Promise.resolve(doc);
      }),
      findById: jest.fn().mockImplementation((id, salonId) => {
        const doc = inMemoryGiftCards.get(id);
        if (!doc || doc.deletedAt) return Promise.resolve(null);
        if (salonId && doc.salonId !== salonId) return Promise.resolve(null);
        return Promise.resolve(doc);
      }),
      findByCode: jest.fn().mockImplementation((code, salonId) => {
        for (const doc of inMemoryGiftCards.values()) {
          if (doc.giftCardCode === code && !doc.deletedAt) {
            if (salonId && doc.salonId !== salonId) continue;
            return Promise.resolve(doc);
          }
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((id, data, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          ...data,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      updateStatus: jest.fn().mockImplementation((id, status, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      debitBalance: jest.fn().mockImplementation((id, amount, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Lock conflict');
        }
        if (existing.currentBalance < amount) {
          throw new ConflictException('Insufficient balance');
        }
        const newBal = existing.currentBalance - amount;
        const updated = {
          ...existing,
          currentBalance: newBal,
          status: newBal === 0 ? GiftCardStatus.FULLY_REDEEMED : GiftCardStatus.PARTIALLY_REDEEMED,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      creditBalance: jest.fn().mockImplementation((id, amount, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Lock conflict');
        }
        const updated = {
          ...existing,
          currentBalance: existing.currentBalance + amount,
          status: GiftCardStatus.ACTIVE,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      freeze: jest.fn().mockImplementation((id, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Lock conflict');
        }
        const updated = {
          ...existing,
          status: GiftCardStatus.FROZEN,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      cancel: jest.fn().mockImplementation((id, expectedVersion) => {
        const existing = inMemoryGiftCards.get(id);
        if (!existing) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Lock conflict');
        }
        const updated = {
          ...existing,
          status: GiftCardStatus.CANCELLED,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryGiftCards.set(id, updated);
        return Promise.resolve(updated);
      }),
      search: jest.fn().mockImplementation((query) => {
        let results = Array.from(inMemoryGiftCards.values()).filter((g) => !g.deletedAt);
        if (query.salonId) results = results.filter((g) => g.salonId === query.salonId);
        if (query.purchasedByUserId) results = results.filter((g) => g.purchasedByUserId === query.purchasedByUserId);
        return Promise.resolve({ data: results, total: results.length });
      }),
    };

    const mockGiftCardTxRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `gtx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          createdAt: new Date(),
        };
        const list = inMemoryGiftCardTxs.get(data.giftCardId) ?? [];
        list.push(doc);
        inMemoryGiftCardTxs.set(data.giftCardId, list);
        return Promise.resolve(doc);
      }),
      findByGiftCard: jest.fn().mockImplementation((giftCardId) =>
        Promise.resolve(inMemoryGiftCardTxs.get(giftCardId) ?? []),
      ),
      getLedgerBalance: jest.fn().mockImplementation((giftCardId) => {
        const list = inMemoryGiftCardTxs.get(giftCardId) ?? [];
        let balance = 0;
        for (const tx of list) {
          if (tx.transactionType === GiftCardTransactionType.ISSUE || tx.transactionType === GiftCardTransactionType.REFUND_CREDIT) {
            balance += tx.amount;
          } else if (tx.transactionType === GiftCardTransactionType.REDEMPTION) {
            balance -= tx.amount;
          }
        }
        return Promise.resolve(balance);
      }),
      search: jest.fn().mockImplementation((query) => {
        let all: any[] = [];
        for (const txs of inMemoryGiftCardTxs.values()) {
          all.push(...txs);
        }
        return Promise.resolve({ data: all, total: all.length });
      }),
    };

    const mockFlashSaleRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `fs-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          bookedSlotCount: 0,
          status: FlashSaleStatus.SCHEDULED,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryFlashSales.set(id, doc);
        return Promise.resolve(doc);
      }),
      findById: jest.fn().mockImplementation((id, salonId) => {
        const doc = inMemoryFlashSales.get(id);
        if (!doc || doc.deletedAt) return Promise.resolve(null);
        if (salonId && doc.salonId !== salonId) return Promise.resolve(null);
        return Promise.resolve(doc);
      }),
      update: jest.fn().mockImplementation((id, data, expectedVersion) => {
        const existing = inMemoryFlashSales.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          ...data,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryFlashSales.set(id, updated);
        return Promise.resolve(updated);
      }),
      updateStatus: jest.fn().mockImplementation((id, status, expectedVersion) => {
        const existing = inMemoryFlashSales.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryFlashSales.set(id, updated);
        return Promise.resolve(updated);
      }),
      reserveSlot: jest.fn().mockImplementation((id) => {
        const existing = inMemoryFlashSales.get(id);
        if (!existing) return Promise.resolve(null);
        if (existing.bookedSlotCount >= existing.maxSlotQuota) {
          throw new ConflictException('Flash sale quota exhausted');
        }
        const updated = {
          ...existing,
          bookedSlotCount: existing.bookedSlotCount + 1,
          status: existing.bookedSlotCount + 1 >= existing.maxSlotQuota ? FlashSaleStatus.ENDED : existing.status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryFlashSales.set(id, updated);
        return Promise.resolve(updated);
      }),
      incrementBookedSlot: jest.fn().mockImplementation((id, expectedVersion) => {
        const existing = inMemoryFlashSales.get(id);
        if (!existing) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Lock conflict');
        }
        if (existing.bookedSlotCount >= existing.maxSlotQuota) {
          throw new ConflictException('Flash sale quota exhausted');
        }
        const newCount = existing.bookedSlotCount + 1;
        const updated = {
          ...existing,
          bookedSlotCount: newCount,
          status: newCount >= existing.maxSlotQuota ? FlashSaleStatus.ENDED : existing.status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryFlashSales.set(id, updated);
        return Promise.resolve(updated);
      }),
      search: jest.fn().mockImplementation((query) => {
        let results = Array.from(inMemoryFlashSales.values()).filter((f) => !f.deletedAt);
        if (query.salonId) results = results.filter((f) => f.salonId === query.salonId);
        if (query.status) results = results.filter((f) => f.status === query.status);
        return Promise.resolve({ data: results, total: results.length });
      }),
      findActiveByBranch: jest.fn().mockImplementation((branchId, checkDate = new Date()) => {
        const results = Array.from(inMemoryFlashSales.values()).filter(
          (f) =>
            !f.deletedAt &&
            f.status === FlashSaleStatus.ACTIVE &&
            (!branchId || f.branchId === branchId) &&
            checkDate >= f.startTime &&
            checkDate <= f.endTime &&
            f.bookedSlotCount < f.maxSlotQuota,
        );
        return Promise.resolve(results);
      }),
    };

    const mockCampaignRepo = {
      create: jest.fn().mockImplementation((data) => {
        const id = `cmp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const doc = {
          id,
          ...data,
          status: MarketingCampaignStatus.DRAFT,
          impressionsCount: 0,
          clicksCount: 0,
          bookingsCount: 0,
          revenueGenerated: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, doc);
        return Promise.resolve(doc);
      }),
      findByCode: jest.fn().mockImplementation((code, salonId) => {
        for (const doc of inMemoryCampaigns.values()) {
          if (doc.campaignCode === code && (!salonId || doc.salonId === salonId) && !doc.deletedAt) {
            return Promise.resolve(doc);
          }
        }
        return Promise.resolve(null);
      }),
      findById: jest.fn().mockImplementation((id, salonId) => {
        const doc = inMemoryCampaigns.get(id);
        if (!doc || doc.deletedAt) return Promise.resolve(null);
        if (salonId && doc.salonId !== salonId) return Promise.resolve(null);
        return Promise.resolve(doc);
      }),
      update: jest.fn().mockImplementation((id, data, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          ...data,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      schedule: jest.fn().mockImplementation((id, startAt, endAt, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          status: MarketingCampaignStatus.SCHEDULED,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      start: jest.fn().mockImplementation((id, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status: MarketingCampaignStatus.RUNNING,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      complete: jest.fn().mockImplementation((id, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status: MarketingCampaignStatus.COMPLETED,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      cancel: jest.fn().mockImplementation((id, reason, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status: MarketingCampaignStatus.CANCELLED,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      updateStatus: jest.fn().mockImplementation((id, status, expectedVersion) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing || existing.deletedAt) return Promise.resolve(null);
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict');
        }
        const updated = {
          ...existing,
          status,
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      incrementMetrics: jest.fn().mockImplementation((id, metrics) => {
        const existing = inMemoryCampaigns.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = {
          ...existing,
          impressionsCount: existing.impressionsCount + (metrics.impressionsCount ?? 0),
          clicksCount: existing.clicksCount + (metrics.clicksCount ?? 0),
          bookingsCount: existing.bookingsCount + (metrics.bookingsCount ?? 0),
          revenueGenerated: existing.revenueGenerated + (metrics.revenueGenerated ?? 0),
          version: existing.version + 1,
          updatedAt: new Date(),
        };
        inMemoryCampaigns.set(id, updated);
        return Promise.resolve(updated);
      }),
      search: jest.fn().mockImplementation((query) => {
        let results = Array.from(inMemoryCampaigns.values()).filter((c) => !c.deletedAt);
        if (query.salonId) results = results.filter((c) => c.salonId === query.salonId);
        return Promise.resolve({ data: results, total: results.length });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponValidationService,
        CouponService,
        CouponApplicabilityService,
        CouponUsageService,
        GiftCardService,
        GiftCardTransactionService,
        FlashSaleService,
        MarketingCampaignService,

        { provide: CouponRepository, useValue: mockCouponRepo },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
        { provide: CouponServiceApplicabilityRepository, useValue: mockServiceAppRepo },
        { provide: CouponCategoryApplicabilityRepository, useValue: mockCategoryAppRepo },
        { provide: CouponBranchApplicabilityRepository, useValue: mockBranchAppRepo },
        { provide: CouponCustomerEligibilityRepository, useValue: mockCustomerEligRepo },
        { provide: GiftCardRepository, useValue: mockGiftCardRepo },
        { provide: GiftCardTransactionRepository, useValue: mockGiftCardTxRepo },
        { provide: FlashSaleRepository, useValue: mockFlashSaleRepo },
        { provide: MarketingCampaignRepository, useValue: mockCampaignRepo },

        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    couponService = module.get(CouponService);
    validationService = module.get(CouponValidationService);
    applicabilityService = module.get(CouponApplicabilityService);
    usageService = module.get(CouponUsageService);
    giftCardService = module.get(GiftCardService);
    giftCardTxService = module.get(GiftCardTransactionService);
    flashSaleService = module.get(FlashSaleService);
    campaignService = module.get(MarketingCampaignService);

    auditService = module.get(AuditService);
    cacheService = module.get(CacheService);
    eventBus = module.get(EventBusService);
  });

  describe('1. Complete Business Pipeline Integration Workflow', () => {
    it('should execute full pipeline: coupon creation -> activation -> cart validation -> application -> settlement -> audit & event dispatching', async () => {
      // 1. Create 20% Percentage Coupon with Max Cap
      const coupon = await couponService.createCoupon(
        {
          salonId: 'sal-luxe-spa',
          code: 'SUMMER20',
          name: 'Summer 20% Off',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 20,
          maxDiscountAmount: 300, // Cap at ₹300
          minBookingAmount: 1000,
          minServicesCount: 1,
          totalUsageLimit: 50,
          perCustomerLimit: 1,
          status: CouponStatus.DRAFT,
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 86400000 * 30),
        },
        'owner-user-1',
      );

      expect(coupon.id).toBeDefined();
      expect(coupon.status).toBe(CouponStatus.DRAFT);

      // 2. Activate coupon
      const activated = await couponService.activateCoupon(coupon.id, 'sal-luxe-spa', 1, 'owner-user-1');
      expect(activated.status).toBe(CouponStatus.ACTIVE);
      expect(invalidatedCacheKeys).toContain('salon:sal-luxe-spa:coupons:active');

      // 3. Customer cart validation
      const cart = [
        { serviceId: 'srv-haircut', price: 1000 },
        { serviceId: 'srv-spa', price: 1000 },
      ]; // Total = 2000. 20% of 2000 = 400, capped at 300.
      const validation = await couponService.validateCouponForCheckout('SUMMER20', {
        salonId: 'sal-luxe-spa',
        branchId: 'br-downtown',
        customerId: 'cust-john-doe',
        cartItems: cart,
      });

      expect(validation.isValid).toBe(true);
      expect(validation.discountAmount).toBe(300); // Strict mathematical cap verified
      expect(validation.qualifyingAmount).toBe(2000);

      // 4. Atomic Coupon Application
      const usage = await usageService.applyCoupon(
        {
          couponId: coupon.id,
          salonId: 'sal-luxe-spa',
          branchId: 'br-downtown',
          customerId: 'cust-john-doe',
          bookingId: 'bk-booking-101',
          discountAmount: validation.discountAmount,
          bookingTotalBeforeDiscount: 2000,
          bookingTotalAfterDiscount: 1700,
        },
        'cust-john-doe',
      );

      expect(usage.id).toBeDefined();
      expect(usage.status).toBe(CouponUsageStatus.APPLIED);
      expect(usage.bookingTotalBeforeDiscount - usage.discountAmount).toBe(usage.bookingTotalAfterDiscount);

      // Verify coupon usage count incremented
      const refreshedCoupon = await couponService.getCouponById(coupon.id);
      expect(refreshedCoupon.currentUsageCount).toBe(1);

      // 5. Booking Settlement
      const settled = await usageService.settleCouponUsage(usage.id, 'inv-invoice-501', 'staff-pos-1');
      expect(settled.status).toBe(CouponUsageStatus.SETTLED);
      expect(settled.invoiceId).toBe('inv-invoice-501');

      // 6. Verify audit logs & domain events
      const usageAudit = auditLogs.find((a) => a.action === 'COUPON_APPLIED');
      expect(usageAudit).toBeDefined();
      expect(usageAudit.entityId).toBe(usage.id);

      const usageEvent = dispatchedEvents.find((e) => e.eventName === 'coupon.applied.v1');
      expect(usageEvent).toBeDefined();
      expect(usageEvent.payload.discountAmount).toBe(300);
    });

    it('should support usage reversal and restore coupon quota upon booking cancellation', async () => {
      const coupon = await couponService.createCoupon(
        {
          salonId: 'sal-1',
          code: 'REVERSE100',
          name: 'Flat 100 Off',
          discountType: CouponDiscountType.FIXED_AMOUNT,
          discountValue: 100,
          totalUsageLimit: 2,
          perCustomerLimit: 1,
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 86400000 * 5),
        },
        'owner-1',
      );
      await couponService.activateCoupon(coupon.id, 'sal-1', 1, 'owner-1');

      const usage = await usageService.applyCoupon(
        {
          couponId: coupon.id,
          salonId: 'sal-1',
          branchId: 'br-1',
          customerId: 'cust-1',
          bookingId: 'bk-1',
          discountAmount: 100,
          bookingTotalBeforeDiscount: 1000,
          bookingTotalAfterDiscount: 900,
        },
        'cust-1',
      );

      let current = await couponService.getCouponById(coupon.id);
      expect(current.currentUsageCount).toBe(1);

      // Reverse usage
      const reversed = await usageService.reverseCouponUsage(usage.id, 'Customer cancelled appointment', 'owner-1');
      expect(reversed.status).toBe(CouponUsageStatus.REVERSED);
      expect(reversed.reversalReason).toBe('Customer cancelled appointment');

      current = await couponService.getCouponById(coupon.id);
      expect(current.currentUsageCount).toBe(0); // Restored quota
    });
  });

  describe('2. Coupon Security & Anti-Fraud Attack Audit', () => {
    it('should reject coupon usage if customer attempts to use another salon coupon', async () => {
      await couponService.createCoupon(
        {
          salonId: 'sal-salon-A',
          code: 'SALON_A_OFFER',
          name: 'Salon A Special',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 86400000),
        },
        'owner-a',
      );
      await couponService.activateCoupon((await couponService.getCouponByCode('SALON_A_OFFER', 'sal-salon-A')).id, 'sal-salon-A', 1, 'owner-a');

      // Customer checkout at Salon B
      const validation = await couponService.validateCouponForCheckout('SALON_A_OFFER', {
        salonId: 'sal-salon-B',
        customerId: 'cust-attacker',
        cartItems: [{ serviceId: 'srv-1', price: 1000 }],
      });

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('invalid or has expired');
    });

    it('should reject coupon if total usage limit or per-customer limit is exceeded', async () => {
      const coupon = await couponService.createCoupon(
        {
          salonId: 'sal-1',
          code: 'SINGLE_USE',
          name: 'Single Use Promo',
          discountType: CouponDiscountType.FIXED_AMOUNT,
          discountValue: 50,
          totalUsageLimit: 2,
          perCustomerLimit: 1,
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 86400000),
        },
        'owner-1',
      );
      await couponService.activateCoupon(coupon.id, 'sal-1', 1, 'owner-1');

      // User 1 applies (1/2 used)
      await usageService.applyCoupon(
        {
          couponId: coupon.id,
          salonId: 'sal-1',
          branchId: 'br-1',
          customerId: 'cust-user-1',
          bookingId: 'bk-1',
          discountAmount: 50,
          bookingTotalBeforeDiscount: 500,
          bookingTotalAfterDiscount: 450,
        },
        'cust-user-1',
      );

      // User 1 tries duplicate application -> fails per customer limit
      const valDuplicate = await couponService.validateCouponForCheckout('SINGLE_USE', {
        salonId: 'sal-1',
        customerId: 'cust-user-1',
        cartItems: [{ serviceId: 'srv-1', price: 500 }],
      });
      expect(valDuplicate.isValid).toBe(false);
      expect(valDuplicate.reason).toContain('Customer limit reached');

      // User 2 applies (2/2 used -> depleted)
      await usageService.applyCoupon(
        {
          couponId: coupon.id,
          salonId: 'sal-1',
          branchId: 'br-1',
          customerId: 'cust-user-2',
          bookingId: 'bk-2',
          discountAmount: 50,
          bookingTotalBeforeDiscount: 500,
          bookingTotalAfterDiscount: 450,
        },
        'cust-user-2',
      );

      // User 3 tries when total quota is exhausted
      const valExhausted = await couponService.validateCouponForCheckout('SINGLE_USE', {
        salonId: 'sal-1',
        customerId: 'cust-user-3',
        cartItems: [{ serviceId: 'srv-1', price: 500 }],
      });
      expect(valExhausted.isValid).toBe(false);
      expect(valExhausted.reason).toContain('invalid or has expired');
    });

    it('should reject coupon outside valid happy hour or days of week', async () => {
      const coupon = await couponService.createCoupon(
        {
          salonId: 'sal-1',
          code: 'HAPPY_TUESDAY',
          name: 'Tuesday Happy Hour',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 15,
          isHappyHour: true,
          validDaysOfWeek: [2], // Tuesday only (0=Sun, 1=Mon, 2=Tue)
          validStartTime: '14:00',
          validEndTime: '17:00',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        },
        'owner-1',
      );
      await couponService.activateCoupon(coupon.id, 'sal-1', 1, 'owner-1');

      // Check on a Sunday at 15:00
      const sundayDate = new Date('2026-08-16T15:00:00Z');
      const valSunday = await couponService.validateCouponForCheckout('HAPPY_TUESDAY', {
        salonId: 'sal-1',
        customerId: 'cust-1',
        cartItems: [{ serviceId: 'srv-1', price: 1000 }],
        checkDate: sundayDate,
      });
      expect(valSunday.isValid).toBe(false);
      expect(valSunday.reason).toContain('not valid on this day of the week');
    });
  });

  describe('3. Gift Card Security, Double-Spend & Financial Invariant Audit', () => {
    it('should enforce financial invariant: currentBalance = totalCredits - totalDebits and 0 <= balance <= initialBalance', async () => {
      // 1. Issue Card
      const card = await giftCardService.issueGiftCard(
        {
          salonId: 'sal-spa-1',
          purchasedByUserId: 'cust-buyer',
          recipientEmail: 'friend@example.com',
          initialBalance: 5000,
          currency: 'INR',
          expiresAt: new Date(Date.now() + 86400000 * 365),
        },
        'cust-buyer',
      );

      expect(card.currentBalance).toBe(5000);
      expect(card.isRedeemable()).toBe(true);

      // Check ledger
      let ledger = await giftCardTxService.getLedgerBalance(card.id);
      expect(ledger).toBe(5000);

      // 2. Partial Redemption 1 (Debit ₹2000)
      const red1 = await giftCardService.redeemGiftCard(
        {
          giftCardCode: card.giftCardCode,
          salonId: 'sal-spa-1',
          amount: 2000,
          bookingId: 'bk-1',
        },
        'friend@example.com',
      );
      expect(red1.remainingBalance).toBe(3000);
      ledger = await giftCardTxService.getLedgerBalance(card.id);
      expect(ledger).toBe(3000);

      // 3. Partial Redemption 2 (Debit ₹1500)
      const red2 = await giftCardService.redeemGiftCard(
        {
          giftCardCode: card.giftCardCode,
          salonId: 'sal-spa-1',
          amount: 1500,
          bookingId: 'bk-2',
        },
        'friend@example.com',
      );
      expect(red2.remainingBalance).toBe(1500);
      ledger = await giftCardTxService.getLedgerBalance(card.id);
      expect(ledger).toBe(1500);

      // 4. Refund Credit (Credit ₹500 from cancelled booking 2)
      const refunded = await giftCardService.refundCredit(
        {
          giftCardId: card.id,
          salonId: 'sal-spa-1',
          amount: 500,
          bookingId: 'bk-2',
          notes: 'Partial service refund',
        },
        'staff-1',
      );
      expect(refunded.currentBalance).toBe(2000);
      ledger = await giftCardTxService.getLedgerBalance(card.id);
      expect(ledger).toBe(2000);

      // 5. Final Full Redemption (Debit ₹2000)
      const redFinal = await giftCardService.redeemGiftCard(
        {
          giftCardCode: card.giftCardCode,
          salonId: 'sal-spa-1',
          amount: 2000,
          bookingId: 'bk-3',
        },
        'friend@example.com',
      );
      expect(redFinal.remainingBalance).toBe(0);
      expect(redFinal.giftCard.status).toBe(GiftCardStatus.FULLY_REDEEMED);
      ledger = await giftCardTxService.getLedgerBalance(card.id);
      expect(ledger).toBe(0);
    });

    it('should reject gift card redemption exceeding current balance (Overdraft Protection)', async () => {
      const card = await giftCardService.issueGiftCard(
        {
          salonId: 'sal-spa-1',
          initialBalance: 1000,
          expiresAt: new Date(Date.now() + 86400000 * 30),
        },
        'staff-1',
      );

      await expect(
        giftCardService.redeemGiftCard(
          {
            giftCardCode: card.giftCardCode,
            salonId: 'sal-spa-1',
            amount: 1500, // Overdraft attempt
          },
          'cust-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject redemption on frozen, cancelled, or expired gift card', async () => {
      const card = await giftCardService.issueGiftCard(
        {
          salonId: 'sal-spa-1',
          initialBalance: 1000,
          expiresAt: new Date(Date.now() + 86400000 * 30),
        },
        'staff-1',
      );

      // Freeze Card
      await giftCardService.freezeGiftCard(card.id, 'sal-spa-1', 1, 'staff-1');

      await expect(
        giftCardService.redeemGiftCard(
          {
            giftCardCode: card.giftCardCode,
            salonId: 'sal-spa-1',
            amount: 500,
          },
          'cust-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('4. Flash Sale Concurrency & Quota Exhaustion Audit', () => {
    it('should prevent overbooking and exhaust flash sale slots atomically', async () => {
      const sale = await flashSaleService.createFlashSale(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          serviceId: 'srv-keratin',
          title: 'Keratin 50% Off Flash',
          discountPercentage: 50,
          specialPrice: 1500,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() + 3600000 * 2),
          maxSlotQuota: 2,
        },
        'owner-1',
      );

      await flashSaleService.activateFlashSale(sale.id, 'sal-1', 1, 'owner-1');

      // Slot 1 Reserved
      const slot1 = await flashSaleService.reserveSlot(sale.id, 'sal-1');
      expect(slot1.bookedSlotCount).toBe(1);
      expect(slot1.remainingSlots()).toBe(1);
      expect(slot1.isAvailable()).toBe(true);

      // Slot 2 Reserved (Quota exhausted)
      const slot2 = await flashSaleService.reserveSlot(sale.id, 'sal-1');
      expect(slot2.bookedSlotCount).toBe(2);
      expect(slot2.remainingSlots()).toBe(0);
      expect(slot2.status).toBe(FlashSaleStatus.ENDED);

      // Slot 3 Attempt (Must be rejected)
      await expect(flashSaleService.reserveSlot(sale.id, 'sal-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('5. Marketing Campaign Full Lifecycle & Metric Conversions', () => {
    it('should track full lifecycle and compute accurate conversion rate & revenue', async () => {
      const campaign = await campaignService.createCampaign(
        {
          salonId: 'sal-1',
          campaignCode: 'SUMMER_DIWALI_2026',
          name: 'Summer Diwali Gala',
          campaignType: MarketingCampaignType.FESTIVAL_SPECIAL,
          channels: ['SMS', 'WHATSAPP'],
          budgetLimit: 20000,
        },
        'owner-1',
      );

      expect(campaign.status).toBe(MarketingCampaignStatus.DRAFT);

      // Schedule campaign
      const scheduled = await campaignService.scheduleCampaign(
        campaign.id,
        new Date('2026-10-01'),
        new Date('2026-10-31'),
        'sal-1',
        1,
        'owner-1',
      );
      expect(scheduled.status).toBe(MarketingCampaignStatus.SCHEDULED);

      // Start campaign
      const started = await campaignService.startCampaign(campaign.id, 'sal-1', 2, 'owner-1');
      expect(started.status).toBe(MarketingCampaignStatus.RUNNING);

      // Record impressions, clicks, bookings, revenue
      const updatedMetrics = await campaignService.recordMetrics(
        campaign.id,
        {
          impressionsCount: 1000,
          clicksCount: 200,
          bookingsCount: 40,
          revenueGenerated: 80000,
        },
        3,
      );

      expect(updatedMetrics.impressionsCount).toBe(1000);
      expect(updatedMetrics.clicksCount).toBe(200);
      expect(updatedMetrics.bookingsCount).toBe(40);
      expect(updatedMetrics.revenueGenerated).toBe(80000);

      // Complete campaign
      const completed = await campaignService.completeCampaign(campaign.id, 'sal-1', 4, 'owner-1');
      expect(completed.status).toBe(MarketingCampaignStatus.COMPLETED);
    });
  });

  describe('6. Optimistic Concurrency Locking Audit', () => {
    it('should throw ConflictException on stale entity updates across root aggregates', async () => {
      // 1. Coupon Version Conflict
      const cpn = await couponService.createCoupon(
        {
          salonId: 'sal-1',
          code: 'OCC_COUPON',
          name: 'OCC Test',
          discountType: CouponDiscountType.FIXED_AMOUNT,
          discountValue: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        'owner-1',
      );

      // Mutation 1 with version 1 -> succeeds, version becomes 2
      await couponService.updateCoupon(cpn.id, { name: 'New Name 1' }, 'sal-1', 1, 'owner-1');

      // Stale Mutation 2 with version 1 -> throws ConflictException
      await expect(
        couponService.updateCoupon(cpn.id, { name: 'New Name 2' }, 'sal-1', 1, 'owner-1'),
      ).rejects.toThrow(ConflictException);

      // 2. Gift Card Version Conflict
      const gc = await giftCardService.issueGiftCard(
        {
          salonId: 'sal-1',
          initialBalance: 1000,
          expiresAt: new Date(Date.now() + 86400000),
        },
        'owner-1',
      );

      await giftCardService.freezeGiftCard(gc.id, 'sal-1', 1, 'owner-1');

      await expect(
        giftCardService.cancelGiftCard(gc.id, 'sal-1', 'Cancelled', 1, 'owner-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('7. Tenant Isolation & IDOR Audit', () => {
    it('should reject unauthorized cross-salon mutations and queries', async () => {
      const couponA = await couponService.createCoupon(
        {
          salonId: 'sal-alpha',
          code: 'ALPHA_EXCLUSIVE',
          name: 'Alpha Only',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 25,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        'owner-alpha',
      );

      // Owner Beta attempts to access/update Salon Alpha coupon
      await expect(
        couponService.getCouponById(couponA.id, 'sal-beta'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        couponService.updateCoupon(couponA.id, { name: 'Hacked' }, 'sal-beta', 1, 'owner-beta'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
