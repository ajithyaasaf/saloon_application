import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, LeaveStatus, LeaveType, StaffRole } from '@prisma/client';
import { InvitationService } from '../../services/invitation.service';
import { LeaveService } from '../../services/leave.service';
import { StaffService } from '../../services/staff.service';
import { StaffAdminController } from '../staff-admin.controller';

describe('StaffAdminController', () => {
  let controller: StaffAdminController;
  let staffService: any;
  let invitationService: any;
  let leaveService: any;

  const mockAdmin = { userId: 'admin-123', role: 'SUPER_ADMIN' };
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
  };

  const mockLeave = {
    id: 'leave-123',
    staffId: mockStaff.id,
    leaveType: LeaveType.CASUAL,
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-12'),
    status: LeaveStatus.APPROVED,
    version: 2,
  };

  beforeEach(async () => {
    staffService = {
      searchStaff: jest.fn(),
    };

    invitationService = {
      expireInvitations: jest.fn(),
    };

    leaveService = {
      approveLeave: jest.fn(),
      rejectLeave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffAdminController],
      providers: [
        { provide: StaffService, useValue: staffService },
        { provide: InvitationService, useValue: invitationService },
        { provide: LeaveService, useValue: leaveService },
      ],
    }).compile();

    controller = module.get<StaffAdminController>(StaffAdminController);
  });

  describe('searchAllStaff', () => {
    it('should return paginated staff list for admin audit', async () => {
      staffService.searchStaff.mockResolvedValue({
        data: [mockStaff],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrevious: false },
      });

      const response = await controller.searchAllStaff({ page: 1, limit: 10 });
      expect(response.data).toHaveLength(1);
      expect(staffService.searchStaff).toHaveBeenCalled();
    });
  });

  describe('approveLeave', () => {
    it('should delegate leave approval to LeaveService', async () => {
      leaveService.approveLeave.mockResolvedValue(mockLeave);

      const response = await controller.approveLeave(mockLeave.id, { version: 1 }, mockAdmin);
      expect(response.data.status).toBe(LeaveStatus.APPROVED);
      expect(leaveService.approveLeave).toHaveBeenCalledWith(mockLeave.id, 1, mockAdmin.userId);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should invoke invitation cleanup and return summary message', async () => {
      invitationService.expireInvitations.mockResolvedValue(5);

      const response = await controller.cleanupExpiredInvitations();
      expect(response.data.message).toContain('Cleaned up 5 expired invitation tokens');
      expect(invitationService.expireInvitations).toHaveBeenCalled();
    });
  });
});
