import { Test, TestingModule } from '@nestjs/testing';
import { BranchServiceService } from '../../services/branch-service.service';
import { CategoryService } from '../../services/category.service';
import { ServiceService } from '../../services/service.service';
import { ServiceCatalogOwnerController } from '../service-catalog-owner.controller';

describe('ServiceCatalogOwnerController', () => {
  let controller: ServiceCatalogOwnerController;
  let categoryServiceMock: { createCategory: jest.Mock; updateCategory: jest.Mock; deleteCategory: jest.Mock };
  let serviceServiceMock: { createService: jest.Mock; updateService: jest.Mock; deleteService: jest.Mock };
  let branchServiceServiceMock: { assignServiceToBranch: jest.Mock; updateBranchService: jest.Mock; changePrice: jest.Mock; removeBranchService: jest.Mock };

  beforeEach(async () => {
    categoryServiceMock = { createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn() };
    serviceServiceMock = { createService: jest.fn(), updateService: jest.fn(), deleteService: jest.fn() };
    branchServiceServiceMock = {
      assignServiceToBranch: jest.fn(),
      updateBranchService: jest.fn(),
      changePrice: jest.fn(),
      removeBranchService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceCatalogOwnerController],
      providers: [
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: ServiceService, useValue: serviceServiceMock },
        { provide: BranchServiceService, useValue: branchServiceServiceMock },
      ],
    }).compile();

    controller = module.get<ServiceCatalogOwnerController>(ServiceCatalogOwnerController);
  });

  const mockUser = { sub: 'usr_owner' };
  const mockCategory = { id: 'cat_100', name: 'Hair Styling', displayOrder: 1, createdAt: new Date(), updatedAt: new Date() };
  const mockService = { id: 'srv_100', categoryId: 'cat_100', name: "Men's Haircut", genderCategory: 'UNISEX', createdAt: new Date(), updatedAt: new Date() };
  const mockBranchService = { id: 'bs_100', branchId: 'br_100', serviceId: 'srv_100', price: 450.0, durationMinutes: 45, status: 'ACTIVE', isActive: true, createdAt: new Date(), updatedAt: new Date() };

  describe('category management', () => {
    it('should create category with user context', async () => {
      categoryServiceMock.createCategory.mockResolvedValue(mockCategory);

      const res = await controller.createCategory(mockUser, { name: 'Hair Styling' });
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('cat_100');
      expect(categoryServiceMock.createCategory).toHaveBeenCalledWith({ name: 'Hair Styling' }, 'usr_owner');
    });

    it('should update category', async () => {
      categoryServiceMock.updateCategory.mockResolvedValue(mockCategory);

      const res = await controller.updateCategory(mockUser, 'cat_100', { name: 'Hair Styling Updated', version: 1 });
      expect(res.success).toBe(true);
      expect(categoryServiceMock.updateCategory).toHaveBeenCalledWith('cat_100', { name: 'Hair Styling Updated', version: 1 }, 'usr_owner');
    });

    it('should soft delete category', async () => {
      categoryServiceMock.deleteCategory.mockResolvedValue(undefined);

      const res = await controller.deleteCategory(mockUser, 'cat_100', 1);
      expect(res.success).toBe(true);
      expect(categoryServiceMock.deleteCategory).toHaveBeenCalledWith('cat_100', 1, 'usr_owner');
    });
  });

  describe('service management', () => {
    it('should create master service', async () => {
      serviceServiceMock.createService.mockResolvedValue(mockService);

      const res = await controller.createService(mockUser, { categoryId: 'cat_100', name: "Men's Haircut" });
      expect(res.success).toBe(true);
      expect(serviceServiceMock.createService).toHaveBeenCalledWith({ categoryId: 'cat_100', name: "Men's Haircut" }, 'usr_owner');
    });

    it('should update master service', async () => {
      serviceServiceMock.updateService.mockResolvedValue(mockService);

      const res = await controller.updateService(mockUser, 'srv_100', { name: "Men's Premium Haircut", version: 1 });
      expect(res.success).toBe(true);
    });

    it('should soft delete master service', async () => {
      serviceServiceMock.deleteService.mockResolvedValue(undefined);

      const res = await controller.deleteService(mockUser, 'srv_100', 1);
      expect(res.success).toBe(true);
      expect(serviceServiceMock.deleteService).toHaveBeenCalledWith('srv_100', 1, 'usr_owner');
    });
  });

  describe('branch service offering management', () => {
    it('should assign service to branch', async () => {
      branchServiceServiceMock.assignServiceToBranch.mockResolvedValue(mockBranchService);

      const res = await controller.assignServiceToBranch(mockUser, 'br_100', { branchId: 'br_100', serviceId: 'srv_100', price: 450.0, durationMinutes: 45 });
      expect(res.success).toBe(true);
      expect(branchServiceServiceMock.assignServiceToBranch).toHaveBeenCalledWith(
        { branchId: 'br_100', serviceId: 'srv_100', price: 450.0, durationMinutes: 45 },
        'usr_owner',
      );
    });

    it('should update branch service price', async () => {
      branchServiceServiceMock.changePrice.mockResolvedValue({ ...mockBranchService, price: 550.0 });

      const res = await controller.changePrice(mockUser, 'bs_100', 1, 550.0);
      expect(res.success).toBe(true);
      expect(branchServiceServiceMock.changePrice).toHaveBeenCalledWith('bs_100', 1, 550.0, 'usr_owner');
    });

    it('should remove branch service offering', async () => {
      branchServiceServiceMock.removeBranchService.mockResolvedValue(undefined);

      const res = await controller.removeBranchService(mockUser, 'bs_100', 1);
      expect(res.success).toBe(true);
      expect(branchServiceServiceMock.removeBranchService).toHaveBeenCalledWith('bs_100', 1, 'usr_owner');
    });
  });
});
