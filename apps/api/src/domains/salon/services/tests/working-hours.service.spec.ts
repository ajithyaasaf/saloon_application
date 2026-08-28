import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../../common/exceptions/validation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../repositories/branch.repository';
import { BusinessHoursRepository } from '../../repositories/business-hours.repository';
import { SalonRepository } from '../../repositories/salon.repository';
import { WorkingHoursService } from '../working-hours.service';

describe('WorkingHoursService', () => {
  let service: WorkingHoursService;
  let salonRepoMock: { findById: jest.Mock };
  let branchRepoMock: { findById: jest.Mock };
  let businessHoursRepoMock: { upsertHours: jest.Mock; addSpecialHoliday: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    salonRepoMock = { findById: jest.fn() };
    branchRepoMock = { findById: jest.fn() };
    businessHoursRepoMock = { upsertHours: jest.fn(), addSpecialHoliday: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({})) };
    auditServiceMock = { logInTransaction: jest.fn() };
    cacheServiceMock = { delete: jest.fn() };
    eventBusServiceMock = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursService,
        { provide: SalonRepository, useValue: salonRepoMock },
        { provide: BranchRepository, useValue: branchRepoMock },
        { provide: BusinessHoursRepository, useValue: businessHoursRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<WorkingHoursService>(WorkingHoursService);
  });

  const mockSalon = { id: 'sal_100', ownerId: 'usr_owner' };
  const mockBranch = { id: 'br_100', salonId: 'sal_100' };

  describe('updateWorkingHours()', () => {
    it('should update operating hours when openTime < closeTime', async () => {
      branchRepoMock.findById.mockResolvedValue(mockBranch);
      salonRepoMock.findById.mockResolvedValue(mockSalon);

      const hours = [
        {
          dayOfWeek: 'MONDAY' as any,
          openTime: new Date('1970-01-01T09:00:00Z'),
          closeTime: new Date('1970-01-01T20:00:00Z'),
          isClosed: false,
        },
      ];

      await service.updateWorkingHours('br_100', 'usr_owner', hours);

      expect(businessHoursRepoMock.upsertHours).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'workinghours.updated.v1' }),
      );
    });

    it('should throw ValidationException when openTime >= closeTime for open day', async () => {
      branchRepoMock.findById.mockResolvedValue(mockBranch);
      salonRepoMock.findById.mockResolvedValue(mockSalon);

      const invalidHours = [
        {
          dayOfWeek: 'MONDAY' as any,
          openTime: new Date('1970-01-01T20:00:00Z'), // open 20:00
          closeTime: new Date('1970-01-01T09:00:00Z'), // close 09:00 (invalid)
          isClosed: false,
        },
      ];

      await expect(service.updateWorkingHours('br_100', 'usr_owner', invalidHours)).rejects.toThrow(
        ValidationException,
      );
    });
  });
});
