import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenOperationException } from '../../../../common/exceptions/forbidden-operation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../repositories/branch.repository';
import { BusinessHoursRepository } from '../../repositories/business-hours.repository';
import { SalonRepository } from '../../repositories/salon.repository';
import { SalonService } from '../salon.service';

describe('SalonService', () => {
  let service: SalonService;
  let salonRepoMock: {
    findById: jest.Mock;
    findBySlug: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
  };
  let branchRepoMock: { create: jest.Mock };
  let businessHoursRepoMock: { upsertHours: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { getOrSet: jest.Mock; delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    salonRepoMock = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };
    branchRepoMock = { create: jest.fn() };
    businessHoursRepoMock = { upsertHours: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({})) };
    auditServiceMock = { logInTransaction: jest.fn() };
    cacheServiceMock = { getOrSet: jest.fn(), delete: jest.fn() };
    eventBusServiceMock = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonService,
        { provide: SalonRepository, useValue: salonRepoMock },
        { provide: BranchRepository, useValue: branchRepoMock },
        { provide: BusinessHoursRepository, useValue: businessHoursRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<SalonService>(SalonService);
  });

  const mockSalon = {
    id: 'sal_100',
    ownerId: 'usr_owner',
    brandName: 'Royal Salon',
    slug: 'royal-salon',
    status: 'DRAFT',
    version: 1,
  };

  describe('createSalon()', () => {
    it('should transactionally create Salon + Primary Branch + Business Hours + Audit + Publish Event', async () => {
      salonRepoMock.create.mockResolvedValue(mockSalon);
      branchRepoMock.create.mockResolvedValue({ id: 'br_100', isPrimary: true });

      const created = await service.createSalon('usr_owner', {
        brandName: 'Royal Salon',
        primaryBranchName: 'Main Branch',
        addressLine1: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        phone: '+919876543210',
      });

      expect(created).toEqual(mockSalon);
      expect(salonRepoMock.create).toHaveBeenCalled();
      expect(branchRepoMock.create).toHaveBeenCalled();
      expect(businessHoursRepoMock.upsertHours).toHaveBeenCalled();
      expect(auditServiceMock.logInTransaction).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'salon.created.v1' }),
      );
    });
  });

  describe('updateSalon()', () => {
    it('should update salon profile and evict cache post-commit', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);
      salonRepoMock.update.mockResolvedValue({ ...mockSalon, brandName: 'Royal Luxury Salon', version: 2 });

      const updated = await service.updateSalon('sal_100', 'usr_owner', 1, { brandName: 'Royal Luxury Salon' });

      expect(updated.brandName).toBe('Royal Luxury Salon');
      expect(cacheServiceMock.delete).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'salon.updated.v1' }),
      );
    });

    it('should throw ForbiddenOperationException if user is not the salon owner', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);

      await expect(
        service.updateSalon('sal_100', 'usr_other_user', 1, { brandName: 'Hacked' }),
      ).rejects.toThrow(ForbiddenOperationException);
    });
  });
});
