import { Test, TestingModule } from '@nestjs/testing';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffLeaveRepository } from '../repositories/staff-leave.repository';
import { LeaveService } from '../services/leave.service';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockLeave = {
    id: 'leave-123',
    staffId: 'staff-123',
    leaveType: LeaveType.CASUAL,
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-12'),
    status: LeaveStatus.PENDING,
    isBookingBlocked: false,
    version: 1,
  };

  beforeEach(async () => {
    leaveRepository = {
      findById: jest.fn(),
      findApproved: jest.fn(),
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
        LeaveService,
        { provide: StaffLeaveRepository, useValue: leaveRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  describe('requestLeave', () => {
    it('should create leave request and publish LeaveRequestedEvent', async () => {
      leaveRepository.findApproved.mockResolvedValue([]);
      leaveRepository.create.mockResolvedValue(mockLeave);

      const result = await service.requestLeave(
        {
          staffId: 'staff-123',
          leaveType: LeaveType.CASUAL,
          startDate: '2026-08-10',
          endDate: '2026-08-12',
        },
        'staff-123',
      );

      expect(result).toEqual(mockLeave);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if startDate > endDate', async () => {
      await expect(
        service.requestLeave(
          {
            staffId: 'staff-123',
            leaveType: LeaveType.CASUAL,
            startDate: '2026-08-12',
            endDate: '2026-08-10',
          },
          'staff-123',
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if approved leave overlaps', async () => {
      leaveRepository.findApproved.mockResolvedValue([mockLeave]);

      await expect(
        service.requestLeave(
          {
            staffId: 'staff-123',
            leaveType: LeaveType.CASUAL,
            startDate: '2026-08-10',
            endDate: '2026-08-12',
          },
          'staff-123',
        ),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('approveLeave', () => {
    it('should approve leave and block bookings', async () => {
      leaveRepository.findById.mockResolvedValue(mockLeave);
      leaveRepository.update.mockResolvedValue({ ...mockLeave, status: LeaveStatus.APPROVED, isBookingBlocked: true });

      const result = await service.approveLeave(mockLeave.id, 1, 'manager-123');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if approving already rejected leave', async () => {
      leaveRepository.findById.mockResolvedValue({ ...mockLeave, status: LeaveStatus.REJECTED });

      await expect(service.approveLeave(mockLeave.id, 1, 'manager-123')).rejects.toThrow(ValidationException);
    });
  });

  describe('rejectLeave', () => {
    it('should reject leave request with reason', async () => {
      leaveRepository.findById.mockResolvedValue(mockLeave);
      leaveRepository.update.mockResolvedValue({ ...mockLeave, status: LeaveStatus.REJECTED });

      const result = await service.rejectLeave(mockLeave.id, 1, 'manager-123', 'Staff shortage');

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if rejecting already approved leave', async () => {
      leaveRepository.findById.mockResolvedValue({ ...mockLeave, status: LeaveStatus.APPROVED });

      await expect(service.rejectLeave(mockLeave.id, 1, 'manager-123', 'Reason')).rejects.toThrow(ValidationException);
    });
  });
});
