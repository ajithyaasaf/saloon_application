import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffBranchAssignmentRepository } from '../repositories/staff-branch-assignment.repository';
import { BranchAssignmentService } from '../services/branch-assignment.service';

describe('BranchAssignmentService', () => {
  let service: BranchAssignmentService;
  let assignmentRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockAssignment = {
    id: 'asgn-123',
    staffId: 'staff-123',
    branchId: 'branch-1',
    isPrimary: true,
    startDate: new Date(),
    endDate: null,
    isActive: true,
    version: 1,
  };

  beforeEach(async () => {
    assignmentRepository = {
      findById: jest.fn(),
      findAssignments: jest.fn(),
      findPrimaryBranch: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
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
        BranchAssignmentService,
        { provide: StaffBranchAssignmentRepository, useValue: assignmentRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<BranchAssignmentService>(BranchAssignmentService);
  });

  describe('assignBranch', () => {
    it('should assign first branch as primary automatically', async () => {
      assignmentRepository.findAssignments.mockResolvedValue([]);
      assignmentRepository.create.mockResolvedValue(mockAssignment);

      const result = await service.assignBranch({
        staffId: 'staff-123',
        branchId: 'branch-1',
      });

      expect(result.isPrimary).toBe(true);
      expect(eventBusService.publish).toHaveBeenCalled();
    });
  });

  describe('changePrimaryBranch', () => {
    it('should switch primary branch atomically inside transaction', async () => {
      const assignment1 = { id: 'asgn-1', staffId: 'staff-123', branchId: 'b-1', isPrimary: true, version: 1 };
      const assignment2 = { id: 'asgn-2', staffId: 'staff-123', branchId: 'b-2', isPrimary: false, version: 1 };

      assignmentRepository.findAssignments.mockResolvedValue([assignment1, assignment2]);
      assignmentRepository.update.mockResolvedValue({ ...assignment2, isPrimary: true, version: 2 });

      const result = await service.changePrimaryBranch('staff-123', 'b-2');

      expect(result.isPrimary).toBe(true);
      expect(transactionService.run).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalled();
    });
  });

  describe('removeBranchAssignment', () => {
    it('should throw ValidationException if removing last active branch assignment', async () => {
      assignmentRepository.findById.mockResolvedValue(mockAssignment);
      assignmentRepository.findAssignments.mockResolvedValue([mockAssignment]);

      await expect(service.removeBranchAssignment(mockAssignment.id, 1)).rejects.toThrow(ValidationException);
    });
  });
});
