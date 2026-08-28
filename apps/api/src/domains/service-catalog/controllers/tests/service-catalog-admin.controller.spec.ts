import { Test, TestingModule } from '@nestjs/testing';
import { BranchServiceService } from '../../services/branch-service.service';
import { CategoryService } from '../../services/category.service';
import { ServiceService } from '../../services/service.service';
import { ServiceCatalogAdminController } from '../service-catalog-admin.controller';

describe('ServiceCatalogAdminController', () => {
  let controller: ServiceCatalogAdminController;
  let categoryServiceMock: { listCategories: jest.Mock };
  let serviceServiceMock: { listServices: jest.Mock };
  let branchServiceServiceMock: { listBranchServices: jest.Mock };

  beforeEach(async () => {
    categoryServiceMock = { listCategories: jest.fn() };
    serviceServiceMock = { listServices: jest.fn() };
    branchServiceServiceMock = { listBranchServices: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceCatalogAdminController],
      providers: [
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: ServiceService, useValue: serviceServiceMock },
        { provide: BranchServiceService, useValue: branchServiceServiceMock },
      ],
    }).compile();

    controller = module.get<ServiceCatalogAdminController>(ServiceCatalogAdminController);
  });

  const mockCategory = { id: 'cat_100', name: 'Hair Styling', displayOrder: 1, createdAt: new Date(), updatedAt: new Date() };
  const mockService = { id: 'srv_100', categoryId: 'cat_100', name: "Men's Haircut", genderCategory: 'UNISEX', createdAt: new Date(), updatedAt: new Date() };
  const mockBranchService = { id: 'bs_100', branchId: 'br_100', serviceId: 'srv_100', price: 450.0, durationMinutes: 45, status: 'ACTIVE', isActive: true, createdAt: new Date(), updatedAt: new Date() };

  describe('listCategories()', () => {
    it('should return all categories for admin', async () => {
      categoryServiceMock.listCategories.mockResolvedValue([mockCategory]);

      const res = await controller.listCategories();
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('cat_100');
    });
  });

  describe('listServices()', () => {
    it('should return all services for admin', async () => {
      serviceServiceMock.listServices.mockResolvedValue([mockService]);

      const res = await controller.listServices();
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('srv_100');
    });
  });

  describe('listBranchServices()', () => {
    it('should return branch services for admin', async () => {
      branchServiceServiceMock.listBranchServices.mockResolvedValue([mockBranchService]);

      const res = await controller.listBranchServices('br_100');
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('bs_100');
      expect(branchServiceServiceMock.listBranchServices).toHaveBeenCalledWith('br_100');
    });
  });
});
