import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { StaffInvitationRepository } from '../repositories/staff-invitation.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { InvitationService } from '../services/invitation.service';

describe('InvitationService', () => {
  let service: InvitationService;
  let staffRepository: any;
  let invitationRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;
  let notificationService: any;

  const mockStaff = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    salonId: '123e4567-e89b-12d3-a456-426614174001',
    employeeCode: 'EMP001',
    displayName: 'Jane Doe',
    role: StaffRole.STYLIST,
    employmentStatus: EmploymentStatus.ACTIVE,
    version: 1,
  };

  beforeEach(async () => {
    staffRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    invitationRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      findActiveToken: jest.fn(),
      markUsed: jest.fn(),
      deleteExpired: jest.fn(),
      invalidateUnusedForStaff: jest.fn().mockResolvedValue(undefined),
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

    notificationService = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: StaffRepository, useValue: staffRepository },
        { provide: StaffInvitationRepository, useValue: invitationRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  describe('inviteStaff', () => {
    it('should generate secure raw token, store hash, and send email notification', async () => {
      staffRepository.findById.mockResolvedValue(mockStaff);

      const result = await service.inviteStaff({
        salonId: mockStaff.salonId,
        staffId: mockStaff.id,
        displayName: mockStaff.displayName,
        role: mockStaff.role,
        inviteEmail: 'jane@example.com',
      });

      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64); // 32 bytes hex
      expect(notificationService.send).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException if neither email nor phone is provided', async () => {
      staffRepository.findById.mockResolvedValue(mockStaff);

      await expect(
        service.inviteStaff({
          salonId: mockStaff.salonId,
          staffId: mockStaff.id,
          displayName: mockStaff.displayName,
          role: mockStaff.role,
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('acceptInvitation', () => {
    it('should mark token used, set staff ACTIVE, and publish StaffActivatedEvent', async () => {
      const mockToken = {
        id: 'tok-123',
        staffId: mockStaff.id,
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
      };

      invitationRepository.findByHash.mockResolvedValue(mockToken);
      staffRepository.findById.mockResolvedValue(mockStaff);
      staffRepository.update.mockResolvedValue({ ...mockStaff, employmentStatus: EmploymentStatus.ACTIVE, userId: 'usr-123' });

      const result = await service.acceptInvitation({
        token: 'rawtoken123',
        userId: 'usr-123',
      });

      expect(result.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      expect(invitationRepository.markUsed).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ValidationException for invalid or expired token', async () => {
      invitationRepository.findByHash.mockResolvedValue(null);

      await expect(
        service.acceptInvitation({
          token: 'invalidtoken',
          userId: 'usr-123',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });
});
