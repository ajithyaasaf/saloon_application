import { Test, TestingModule } from '@nestjs/testing';
import { DayOfWeek } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffWorkingHoursRepository } from '../repositories/staff-working-hours.repository';
import { WorkingHoursService } from '../services/working-hours.service';

describe('WorkingHoursService', () => {
  let service: WorkingHoursService;
  let hoursRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockHours = {
    id: 'wh-123',
    staffId: 'staff-123',
    branchId: 'branch-1',
    dayOfWeek: DayOfWeek.MON,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T18:00:00Z'),
    isActive: true,
    version: 1,
  };

  beforeEach(async () => {
    hoursRepository = {
      findHours: jest.fn(),
      findEffectiveOnDate: jest.fn(),
      upsertHours: jest.fn(),
      update: jest.fn(),
      deleteHours: jest.fn(),
    };

    transactionService = {
      run: jest.fn((cb) => cb({})),
    };

    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      delete: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn((key, fn) => fn()),
    };

    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursService,
        { provide: StaffWorkingHoursRepository, useValue: hoursRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<WorkingHoursService>(WorkingHoursService);
  });

  describe('updateWorkingHours', () => {
    it('should validate shift times and breaks and publish WorkingHoursUpdatedEvent', async () => {
      hoursRepository.upsertHours.mockResolvedValue(mockHours);

      const result = await service.updateWorkingHours(
        {
          version: 1,
          dayOfWeek: DayOfWeek.MON,
          startTime: '09:00',
          endTime: '18:00',
          breaks: [{ start: '13:00', end: '14:00' }],
        },
        'staff-123',
        'branch-1',
      );

      expect(result).toEqual(mockHours);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if startTime >= endTime', async () => {
      await expect(
        service.updateWorkingHours(
          {
            version: 1,
            dayOfWeek: DayOfWeek.MON,
            startTime: '18:00',
            endTime: '09:00',
          },
          'staff-123',
          'branch-1',
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if break falls outside shift', async () => {
      await expect(
        service.updateWorkingHours(
          {
            version: 1,
            dayOfWeek: DayOfWeek.MON,
            startTime: '09:00',
            endTime: '18:00',
            breaks: [{ start: '08:00', end: '10:00' }],
          },
          'staff-123',
          'branch-1',
        ),
      ).rejects.toThrow(ValidationException);
    });
  });
});
