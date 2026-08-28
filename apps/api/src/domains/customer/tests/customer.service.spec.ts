import { Test, TestingModule } from '@nestjs/testing';
import { BlacklistType, CustomerStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerBlockedEvent, CustomerCreatedEvent } from '../events/customer-events.event';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerService } from '../services/customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;
  let notificationService: any;

  const mockProfile = {
    id: 'cust_123',
    customerCode: 'CUST-SAL1-A1B2',
    salonId: 'sal_1',
    primaryBranchId: 'br_1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+919876543210',
    status: CustomerStatus.ACTIVE,
    isBlacklisted: false,
    version: 1,
    createdByUserId: 'usr_1',
  };

  beforeEach(async () => {
    customerRepo = {
      findById: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
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
    notificationService = {
      sendSms: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: CustomerProfileRepository, useValue: customerRepo },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('createCustomer', () => {
    it('should throw ConflictException if customer phone already exists in salon', async () => {
      customerRepo.findByPhone.mockResolvedValue(mockProfile);

      await expect(
        service.createCustomer({ salonId: 'sal_1', primaryBranchId: 'br_1', firstName: 'John', phone: '+919876543210' }, 'usr_1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should execute transaction -> audit log -> cache invalidate -> publish event', async () => {
      customerRepo.findByPhone.mockResolvedValue(null);
      customerRepo.create.mockResolvedValue(mockProfile);

      const entity = await service.createCustomer({ salonId: 'sal_1', primaryBranchId: 'br_1', firstName: 'John', phone: '+919876543210' }, 'usr_1');

      expect(entity.id).toBe('cust_123');
      expect(transactionService.run).toHaveBeenCalled();
      expect(auditService.logInTransaction).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.CUSTOMER_PROFILE('cust_123'));
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(CustomerCreatedEvent));
    });
  });

  describe('blockCustomer', () => {
    it('should block customer, update profile, audit log, invalidate cache, and publish event', async () => {
      customerRepo.findById.mockResolvedValue(mockProfile);
      customerRepo.update.mockResolvedValue({ ...mockProfile, status: CustomerStatus.BLOCKED, isBlacklisted: true });

      const entity = await service.blockCustomer('cust_123', BlacklistType.NO_SHOW, 'Repeated no shows', 'usr_1');

      expect(entity.isBlocked()).toBe(true);
      expect(auditService.logInTransaction).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.CUSTOMER_PROFILE('cust_123'));
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(CustomerBlockedEvent));
    });
  });
});
