import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../../common/exceptions/validation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../repositories/branch.repository';
import { BusinessHoursRepository } from '../../repositories/business-hours.repository';
import { SalonRepository } from '../../repositories/salon.repository';
import { SalonApprovalService } from '../salon-approval.service';

describe('SalonApprovalService', () => {
  let service: SalonApprovalService;
  let salonRepoMock: { findById: jest.Mock; update: jest.Mock };
  let branchRepoMock: { findPrimaryBranch: jest.Mock };
  let businessHoursRepoMock: { findHoursByBranchId: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };
  let notificationServiceMock: { send: jest.Mock };

  beforeEach(async () => {
    salonRepoMock = { findById: jest.fn(), update: jest.fn() };
    branchRepoMock = { findPrimaryBranch: jest.fn() };
    businessHoursRepoMock = { findHoursByBranchId: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({})) };
    auditServiceMock = { logInTransaction: jest.fn() };
    cacheServiceMock = { delete: jest.fn() };
    eventBusServiceMock = { publish: jest.fn() };
    notificationServiceMock = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonApprovalService,
        { provide: SalonRepository, useValue: salonRepoMock },
        { provide: BranchRepository, useValue: branchRepoMock },
        { provide: BusinessHoursRepository, useValue: businessHoursRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compile();

    service = module.get<SalonApprovalService>(SalonApprovalService);
  });

  const mockSalon = {
    id: 'sal_100',
    ownerId: 'usr_owner',
    brandName: 'Royal Salon',
    status: 'DRAFT',
    version: 1,
  };

  describe('submitForApproval()', () => {
    it('should submit DRAFT salon after validating primary branch & 7-day working hours', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);
      branchRepoMock.findPrimaryBranch.mockResolvedValue({
        id: 'br_100',
        addressLine1: '123 Main St',
        city: 'Bangalore',
        pincode: '560001',
      });
      businessHoursRepoMock.findHoursByBranchId.mockResolvedValue(new Array(7).fill({}));
      salonRepoMock.update.mockResolvedValue({ ...mockSalon, status: 'PENDING_APPROVAL' });

      const submitted = await service.submitForApproval('sal_100', 'usr_owner');
      expect(submitted.status).toBe('PENDING_APPROVAL');
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'salon.submitted.v1' }),
      );
    });

    it('should throw ValidationException if primary branch hours are less than 7 days', async () => {
      salonRepoMock.findById.mockResolvedValue(mockSalon);
      branchRepoMock.findPrimaryBranch.mockResolvedValue({
        id: 'br_100',
        addressLine1: '123 Main St',
        city: 'Bangalore',
        pincode: '560001',
      });
      businessHoursRepoMock.findHoursByBranchId.mockResolvedValue(new Array(3).fill({})); // Only 3 days

      await expect(service.submitForApproval('sal_100', 'usr_owner')).rejects.toThrow(ValidationException);
    });
  });

  describe('approveSalon()', () => {
    it('should approve PENDING_APPROVAL salon, audit, publish event and send notification email', async () => {
      salonRepoMock.findById.mockResolvedValue({ ...mockSalon, status: 'PENDING_APPROVAL' });
      salonRepoMock.update.mockResolvedValue({ ...mockSalon, status: 'APPROVED' });

      const approved = await service.approveSalon('sal_100', 'usr_admin');
      expect(approved.status).toBe('APPROVED');
      expect(notificationServiceMock.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'EMAIL', recipient: 'usr_owner' }),
      );
    });
  });
});
