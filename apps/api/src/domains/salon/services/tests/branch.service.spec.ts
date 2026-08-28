import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenOperationException } from '../../../../common/exceptions/forbidden-operation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../repositories/branch.repository';
import { BusinessHoursRepository } from '../../repositories/business-hours.repository';
import { SalonRepository } from '../../repositories/salon.repository';
import { BranchService } from '../branch.service';

describe('BranchService', () => {
  let service: BranchService;
  let salonRepoMock: { findById: jest.Mock };
  let branchRepoMock: { findById: jest.Mock; create: jest.Mock; setPrimaryBranch: jest.Mock; findNearby: jest.Mock };
  let businessHoursRepoMock: { upsertHours: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    salonRepoMock = { findById: jest.fn() };
    branchRepoMock = { findById: jest.fn(), create: jest.fn(), setPrimaryBranch: jest.fn(), findNearby: jest.fn() };
    businessHoursRepoMock = { upsertHours: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({})) };
    auditServiceMock = { logInTransaction: jest.fn() };
    cacheServiceMock = { delete: jest.fn() };
    eventBusServiceMock = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: SalonRepository, useValue: salonRepoMock },
        { provide: BranchRepository, useValue: branchRepoMock },
        { provide: BusinessHoursRepository, useValue: businessHoursRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
  });

  const mockSalon = { id: 'sal_100', ownerId: 'usr_owner', brandName: 'Royal Salon' };
  const mockBranch = { id: 'br_100', salonId: 'sal_100', branchName: 'Branch 1', isPrimary: false };

  describe('createBranch()', () => {
    it('should transactionally create branch with default 7-day business hours and audit', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);
      branchRepoMock.create.mockResolvedValue(mockBranch);

      const created = await service.createBranch('sal_100', 'usr_owner', {
        branchName: 'Secondary Branch',
        addressLine1: '456 Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560038',
        latitude: 12.9784,
        longitude: 77.6408,
        phone: '+919876543211',
      });

      expect(created).toEqual(mockBranch);
      expect(businessHoursRepoMock.upsertHours).toHaveBeenCalled();
      expect(auditServiceMock.logInTransaction).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'branch.created.v1' }),
      );
    });

    it('should throw ForbiddenOperationException if user is not salon owner', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);

      await expect(
        service.createBranch('sal_100', 'usr_stranger', {
          branchName: 'Hacked',
          addressLine1: '123 Fake St',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9,
          longitude: 77.6,
          phone: '+910000000000',
        }),
      ).rejects.toThrow(ForbiddenOperationException);
    });
  });

  describe('setPrimaryBranch()', () => {
    it('should transactionally switch primary branch and clear old primary', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);
      branchRepoMock.findById.mockResolvedValue(mockBranch);

      await service.setPrimaryBranch('sal_100', 'br_100', 'usr_owner');

      expect(branchRepoMock.setPrimaryBranch).toHaveBeenCalledWith('sal_100', 'br_100', expect.anything());
      expect(cacheServiceMock.delete).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'branch.updated.v1' }),
      );
    });
  });
});
