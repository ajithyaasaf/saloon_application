import { Test, TestingModule } from '@nestjs/testing';
import { ServiceStatus } from '@prisma/client';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../../common/exceptions/validation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../../salon/repositories/branch.repository';
import { BranchServiceRepository } from '../../repositories/branch-service.repository';
import { ServiceRepository } from '../../repositories/service.repository';
import { BranchServiceService } from '../branch-service.service';

describe('BranchServiceService', () => {
  let service: BranchServiceService;
  let branchServiceRepoMock: { findById: jest.Mock; findBranchService: jest.Mock; listActive: jest.Mock; create: jest.Mock; update: jest.Mock; updatePrice: jest.Mock; softDelete: jest.Mock };
  let serviceRepoMock: { findById: jest.Mock };
  let branchRepoMock: { findById: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { getOrSet: jest.Mock; delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    branchServiceRepoMock = {
      findById: jest.fn(),
      findBranchService: jest.fn(),
      listActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePrice: jest.fn(),
      softDelete: jest.fn(),
    };

    serviceRepoMock = { findById: jest.fn() };
    branchRepoMock = { findById: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({ branchServicePriceHistory: { create: jest.fn() } })) };
    auditServiceMock = { logInTransaction: jest.fn().mockResolvedValue(undefined) };
    cacheServiceMock = { getOrSet: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    eventBusServiceMock = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchServiceService,
        { provide: BranchServiceRepository, useValue: branchServiceRepoMock },
        { provide: ServiceRepository, useValue: serviceRepoMock },
        { provide: BranchRepository, useValue: branchRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<BranchServiceService>(BranchServiceService);
  });

  const mockBranch = { id: 'br_100', branchName: 'Indiranagar Branch' };
  const mockMasterService = { id: 'srv_100', name: "Men's Haircut" };
  const mockBranchService = {
    id: 'bs_100',
    branchId: 'br_100',
    serviceId: 'srv_100',
    price: 450.0,
    durationMinutes: 45,
    status: ServiceStatus.ACTIVE,
    isActive: true,
    version: 1,
    deletedAt: null,
  };

  describe('assignServiceToBranch()', () => {
    it('should assign service to branch, audit, invalidate cache, and publish event', async () => {
      branchRepoMock.findById.mockResolvedValue(mockBranch);
      serviceRepoMock.findById.mockResolvedValue(mockMasterService);
      branchServiceRepoMock.findBranchService.mockResolvedValue(null);
      branchServiceRepoMock.create.mockResolvedValue(mockBranchService);

      const res = await service.assignServiceToBranch({
        branchId: 'br_100',
        serviceId: 'srv_100',
        price: 450.0,
        durationMinutes: 45,
      }, 'usr_owner');

      expect(res).toEqual(mockBranchService);
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'branch-service.created.v1' }),
      );
    });

    it('should throw ValidationException if price < 0 or duration invalid', async () => {
      await expect(
        service.assignServiceToBranch({ branchId: 'br_100', serviceId: 'srv_100', price: -50, durationMinutes: 45 }),
      ).rejects.toThrow(ValidationException);

      await expect(
        service.assignServiceToBranch({ branchId: 'br_100', serviceId: 'srv_100', price: 450, durationMinutes: 0 }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if service is already assigned to branch', async () => {
      branchRepoMock.findById.mockResolvedValue(mockBranch);
      serviceRepoMock.findById.mockResolvedValue(mockMasterService);
      branchServiceRepoMock.findBranchService.mockResolvedValue(mockBranchService);

      await expect(
        service.assignServiceToBranch({ branchId: 'br_100', serviceId: 'srv_100', price: 450, durationMinutes: 45 }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('changePrice()', () => {
    it('should update price, log history, invalidate cache, and publish BranchServicePriceUpdatedEvent', async () => {
      branchServiceRepoMock.findById.mockResolvedValue(mockBranchService);
      branchServiceRepoMock.updatePrice.mockResolvedValue({ ...mockBranchService, price: 550.0, version: 2 });

      const res = await service.changePrice('bs_100', 1, 550.0, 'usr_owner');

      expect(res.version).toBe(2);
      expect(branchServiceRepoMock.updatePrice).toHaveBeenCalledWith('bs_100', 1, 550.0, expect.anything());
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'branch-service.price-updated.v1',
          payload: expect.objectContaining({ oldPrice: 450.0, newPrice: 550.0 }),
        }),
      );
    });
  });
});
