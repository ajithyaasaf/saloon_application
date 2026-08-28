import { Test, TestingModule } from '@nestjs/testing';
import { SalonApprovalService } from '../../services/salon-approval.service';
import { SalonService } from '../../services/salon.service';
import { SalonAdminController } from '../salon-admin.controller';

describe('SalonAdminController', () => {
  let controller: SalonAdminController;
  let salonApprovalServiceMock: { approveSalon: jest.Mock; rejectSalon: jest.Mock };
  let salonServiceMock: { searchSalons: jest.Mock; getSalonById: jest.Mock };

  beforeEach(async () => {
    salonApprovalServiceMock = { approveSalon: jest.fn(), rejectSalon: jest.fn() };
    salonServiceMock = { searchSalons: jest.fn(), getSalonById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonAdminController],
      providers: [
        { provide: SalonApprovalService, useValue: salonApprovalServiceMock },
        { provide: SalonService, useValue: salonServiceMock },
      ],
    }).compile();

    controller = module.get<SalonAdminController>(SalonAdminController);
  });

  const mockAdminUser = { sub: 'usr_admin' };
  const mockApprovedSalon = { id: 'sal_100', status: 'APPROVED' };

  describe('searchSalons()', () => {
    it('should return paginated list of salons', async () => {
      salonServiceMock.searchSalons.mockResolvedValue({
        data: [mockApprovedSalon],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const response = await controller.searchSalons({ page: 1, limit: 20 } as any);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('getSalonById()', () => {
    it('should return salon by id', async () => {
      salonServiceMock.getSalonById.mockResolvedValue(mockApprovedSalon);

      const response = await controller.getSalonById('sal_100');
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('sal_100');
    });
  });

  describe('approveSalon()', () => {
    it('should approve salon and return HTTP 200 envelope', async () => {
      salonApprovalServiceMock.approveSalon.mockResolvedValue(mockApprovedSalon);

      const response = await controller.approveSalon(mockAdminUser, 'sal_100');
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('APPROVED');
    });
  });

  describe('rejectSalon()', () => {
    it('should reject salon and return HTTP 200 envelope', async () => {
      salonApprovalServiceMock.rejectSalon.mockResolvedValue({ id: 'sal_100', status: 'REJECTED' });

      const response = await controller.rejectSalon(mockAdminUser, 'sal_100', { reason: 'Invalid GSTIN' });
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('REJECTED');
    });
  });
});

