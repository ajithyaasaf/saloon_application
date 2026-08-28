import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffRepository } from '../repositories/staff.repository';
import { StaffService } from '../services/staff.service';

describe('StaffService', () => {
  let service: StaffService;
  let staffRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockStaff = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    salonId: '123e4567-e89b-12d3-a456-426614174001',
    employeeCode: 'EMP001',
    displayName: 'Jane Doe',
    role: StaffRole.STYLIST,
    employmentStatus: EmploymentStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    staffRepository = {
      findById: jest.fn(),
      findByEmployeeCode: jest.fn(),
      countBySalon: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      search: jest.fn(),
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
        StaffService,
        { provide: StaffRepository, useValue: staffRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  describe('createStaff', () => {
    it('should create staff and publish StaffCreatedEvent', async () => {
      staffRepository.countBySalon.mockResolvedValue(0);
      staffRepository.findByEmployeeCode.mockResolvedValue(null);
      staffRepository.create.mockResolvedValue(mockStaff);

      const result = await service.createStaff({
        salonId: mockStaff.salonId,
        displayName: mockStaff.displayName,
        role: mockStaff.role,
      });

      expect(result).toEqual(mockStaff);
      expect(transactionService.run).toHaveBeenCalled();
      expect(auditService.logInTransaction).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException if employee code already exists', async () => {
      staffRepository.findByEmployeeCode.mockResolvedValue(mockStaff);

      await expect(
        service.createStaff({
          salonId: mockStaff.salonId,
          displayName: 'John',
          role: StaffRole.STYLIST,
          employeeCode: 'EMP001',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('terminateStaff', () => {
    it('should terminate active staff', async () => {
      staffRepository.findById.mockResolvedValue(mockStaff);
      staffRepository.update.mockResolvedValue({ ...mockStaff, employmentStatus: EmploymentStatus.TERMINATED });

      const result = await service.terminateStaff(mockStaff.id, 1, 'actor-123');

      expect(result.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if self-terminating', async () => {
      await expect(service.terminateStaff(mockStaff.id, 1, mockStaff.id)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if already terminated', async () => {
      staffRepository.findById.mockResolvedValue({ ...mockStaff, employmentStatus: EmploymentStatus.TERMINATED });

      await expect(service.terminateStaff(mockStaff.id, 1, 'actor-123')).rejects.toThrow(ValidationException);
    });
  });

  describe('archiveStaff', () => {
    it('should throw ValidationException if trying to archive active staff', async () => {
      staffRepository.findById.mockResolvedValue(mockStaff);

      await expect(service.archiveStaff(mockStaff.id, 1)).rejects.toThrow(ValidationException);
    });
  });
});
