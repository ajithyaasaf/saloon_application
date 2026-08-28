import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffBranchAssignmentRepository } from '../repositories/staff-branch-assignment.repository';
import { StaffServiceAssignmentRepository } from '../repositories/staff-service-assignment.repository';
import { ServiceAssignmentService } from '../services/service-assignment.service';

describe('ServiceAssignmentService', () => {
  let service: ServiceAssignmentService;
  let serviceAssignmentRepository: any;
  let branchAssignmentRepository: any;
  let prisma: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockServiceAssignment = {
    id: 'sa-123',
    staffId: 'staff-123',
    branchServiceId: 'bs-123',
    isActive: true,
    assignedAt: new Date(),
    version: 1,
  };

  beforeEach(async () => {
    serviceAssignmentRepository = {
      findById: jest.fn(),
      findByStaff: jest.fn(),
      findAssignment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    branchAssignmentRepository = {
      findAssignments: jest.fn(),
    };

    prisma = {
      branchService: {
        findFirst: jest.fn(),
      },
    };

    transactionService = {
      run: jest.fn((cb) => cb({})),
    };

    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceAssignmentService,
        { provide: StaffServiceAssignmentRepository, useValue: serviceAssignmentRepository },
        { provide: StaffBranchAssignmentRepository, useValue: branchAssignmentRepository },
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<ServiceAssignmentService>(ServiceAssignmentService);
  });

  describe('assignService', () => {
    it('should assign service capability when staff is assigned to the branch', async () => {
      serviceAssignmentRepository.findAssignment.mockResolvedValue(null);
      prisma.branchService.findFirst.mockResolvedValue({ id: 'bs-123', branchId: 'branch-1' });
      branchAssignmentRepository.findAssignments.mockResolvedValue([{ branchId: 'branch-1' }]);
      serviceAssignmentRepository.create.mockResolvedValue(mockServiceAssignment);

      const result = await service.assignService({
        staffId: 'staff-123',
        branchServiceId: 'bs-123',
      });

      expect(result).toEqual(mockServiceAssignment);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException if service is already assigned', async () => {
      serviceAssignmentRepository.findAssignment.mockResolvedValue(mockServiceAssignment);

      await expect(
        service.assignService({
          staffId: 'staff-123',
          branchServiceId: 'bs-123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ValidationException if staff is not assigned to the service branch', async () => {
      serviceAssignmentRepository.findAssignment.mockResolvedValue(null);
      prisma.branchService.findFirst.mockResolvedValue({ id: 'bs-123', branchId: 'branch-99' });
      branchAssignmentRepository.findAssignments.mockResolvedValue([{ branchId: 'branch-1' }]);

      await expect(
        service.assignService({
          staffId: 'staff-123',
          branchServiceId: 'bs-123',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });
});
