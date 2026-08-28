import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { BranchAssignmentService } from '../../services/branch-assignment.service';
import { ServiceAssignmentService } from '../../services/service-assignment.service';
import { StaffService } from '../../services/staff.service';
import { WorkingHoursService } from '../../services/working-hours.service';
import { StaffPublicController } from '../staff-public.controller';

describe('StaffPublicController', () => {
  let controller: StaffPublicController;
  let staffService: any;
  let branchAssignmentService: any;
  let serviceAssignmentService: any;
  let workingHoursService: any;

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
      getStaff: jest.fn(),
      searchStaff: jest.fn(),
    };

    branchAssignmentService = {};
    serviceAssignmentService = {
      listAssignments: jest.fn(),
    };

    workingHoursService = {
      getEffectiveSchedule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffPublicController],
      providers: [
        { provide: StaffService, useValue: staffService },
        { provide: BranchAssignmentService, useValue: branchAssignmentService },
        { provide: ServiceAssignmentService, useValue: serviceAssignmentService },
        { provide: WorkingHoursService, useValue: workingHoursService },
      ],
    }).compile();

    controller = module.get<StaffPublicController>(StaffPublicController);
  });

  describe('getStaffById', () => {
    it('should return staff profile DTO wrapped in success response', async () => {
      staffService.getStaff.mockResolvedValue(mockStaff);

      const response = await controller.getStaffById(mockStaff.id);
      expect(response.data.id).toBe(mockStaff.id);
      expect(response.data.displayName).toBe(mockStaff.displayName);
      expect(staffService.getStaff).toHaveBeenCalledWith(mockStaff.id);
    });
  });

  describe('searchStaff', () => {
    it('should return paginated staff response', async () => {
      staffService.searchStaff.mockResolvedValue({
        data: [mockStaff],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrevious: false },
      });

      const response = await controller.searchStaff({ page: 1, limit: 10 });
      expect(response.data).toHaveLength(1);
      expect(response.meta.pagination.total).toBe(1);
    });
  });
});
