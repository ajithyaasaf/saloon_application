import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { BranchAssignmentService } from '../../services/branch-assignment.service';
import { InvitationService } from '../../services/invitation.service';
import { LeaveService } from '../../services/leave.service';
import { ServiceAssignmentService } from '../../services/service-assignment.service';
import { StaffService } from '../../services/staff.service';
import { WorkingHoursService } from '../../services/working-hours.service';
import { StaffOwnerController } from '../staff-owner.controller';

describe('StaffOwnerController', () => {
  let controller: StaffOwnerController;
  let staffService: any;
  let invitationService: any;
  let branchAssignmentService: any;
  let serviceAssignmentService: any;
  let workingHoursService: any;
  let leaveService: any;

  const mockUser = { userId: 'owner-123', role: 'SALON_OWNER' };
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

  beforeEach(async () => {
    staffService = {
      createStaff: jest.fn(),
      updateStaff: jest.fn(),
      activateStaff: jest.fn(),
      suspendStaff: jest.fn(),
      terminateStaff: jest.fn(),
      archiveStaff: jest.fn(),
    };

    invitationService = {
      inviteStaff: jest.fn(),
    };

    branchAssignmentService = {
      assignBranch: jest.fn(),
      changePrimaryBranch: jest.fn(),
      removeBranchAssignment: jest.fn(),
    };

    serviceAssignmentService = {
      assignService: jest.fn(),
      removeService: jest.fn(),
    };

    workingHoursService = {
      updateWorkingHours: jest.fn(),
    };

    leaveService = {
      requestLeave: jest.fn(),
      cancelLeave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffOwnerController],
      providers: [
        { provide: StaffService, useValue: staffService },
        { provide: InvitationService, useValue: invitationService },
        { provide: BranchAssignmentService, useValue: branchAssignmentService },
        { provide: ServiceAssignmentService, useValue: serviceAssignmentService },
        { provide: WorkingHoursService, useValue: workingHoursService },
        { provide: LeaveService, useValue: leaveService },
      ],
    }).compile();

    controller = module.get<StaffOwnerController>(StaffOwnerController);
  });

  describe('createStaff', () => {
    it('should delegate staff creation to StaffService and return DTO', async () => {
      staffService.createStaff.mockResolvedValue(mockStaff);

      const dto = {
        salonId: mockStaff.salonId,
        displayName: mockStaff.displayName,
        role: mockStaff.role,
      };

      const response = await controller.createStaff(dto, mockUser);
      expect(response.data.displayName).toBe(mockStaff.displayName);
      expect(staffService.createStaff).toHaveBeenCalledWith(dto, mockUser.userId);
    });
  });

  describe('inviteStaff', () => {
    it('should delegate invitation to InvitationService', async () => {
      invitationService.inviteStaff.mockResolvedValue({ staff: mockStaff, token: 'rawtoken' });

      const dto = {
        salonId: mockStaff.salonId,
        displayName: mockStaff.displayName,
        role: mockStaff.role,
        inviteEmail: 'jane@example.com',
      };

      const response = await controller.inviteStaff(dto, mockUser);
      expect(response.data.token).toBe('rawtoken');
      expect(invitationService.inviteStaff).toHaveBeenCalledWith(dto, mockUser.userId);
    });
  });

  describe('terminateStaff', () => {
    it('should delegate termination to StaffService', async () => {
      staffService.terminateStaff.mockResolvedValue({ ...mockStaff, employmentStatus: EmploymentStatus.TERMINATED });

      const response = await controller.terminateStaff(mockStaff.id, 1, mockUser);
      expect(response.data.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(staffService.terminateStaff).toHaveBeenCalledWith(mockStaff.id, 1, mockUser.userId);
    });
  });
});
