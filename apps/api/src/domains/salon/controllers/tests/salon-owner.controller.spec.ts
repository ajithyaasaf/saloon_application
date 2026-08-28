import { Test, TestingModule } from '@nestjs/testing';
import { BranchService } from '../../services/branch.service';
import { SalonApprovalService } from '../../services/salon-approval.service';
import { SalonService } from '../../services/salon.service';
import { WorkingHoursService } from '../../services/working-hours.service';
import { SalonOwnerController } from '../salon-owner.controller';

describe('SalonOwnerController', () => {
  let controller: SalonOwnerController;
  let salonServiceMock: { createSalon: jest.Mock; updateSalon: jest.Mock };
  let branchServiceMock: { createBranch: jest.Mock; setPrimaryBranch: jest.Mock };
  let workingHoursServiceMock: { updateWorkingHours: jest.Mock };
  let salonApprovalServiceMock: { submitForApproval: jest.Mock };

  beforeEach(async () => {
    salonServiceMock = { createSalon: jest.fn(), updateSalon: jest.fn() };
    branchServiceMock = { createBranch: jest.fn(), setPrimaryBranch: jest.fn() };
    workingHoursServiceMock = { updateWorkingHours: jest.fn() };
    salonApprovalServiceMock = { submitForApproval: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonOwnerController],
      providers: [
        { provide: SalonService, useValue: salonServiceMock },
        { provide: BranchService, useValue: branchServiceMock },
        { provide: WorkingHoursService, useValue: workingHoursServiceMock },
        { provide: SalonApprovalService, useValue: salonApprovalServiceMock },
      ],
    }).compile();

    controller = module.get<SalonOwnerController>(SalonOwnerController);
  });

  const mockUser = { sub: 'usr_owner' };
  const mockSalon = { id: 'sal_100', brandName: 'Royal Salon', status: 'DRAFT' };

  describe('createSalon()', () => {
    it('should create draft salon and return HTTP 201 envelope', async () => {
      salonServiceMock.createSalon.mockResolvedValue(mockSalon);

      const response = await controller.createSalon(mockUser, {
        brandName: 'Royal Salon',
        primaryBranchName: 'Main Branch',
        addressLine1: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        phone: '+919876543210',
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockSalon);
    });
  });

  describe('submitForApproval()', () => {
    it('should submit salon for approval and return HTTP 200 envelope', async () => {
      salonApprovalServiceMock.submitForApproval.mockResolvedValue({ ...mockSalon, status: 'PENDING_APPROVAL' });

      const response = await controller.submitForApproval(mockUser, 'sal_100');
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('PENDING_APPROVAL');
    });
  });
});
