import { Test, TestingModule } from '@nestjs/testing';
import { BranchServiceService } from '../../services/branch-service.service';
import { CategoryService } from '../../services/category.service';
import { ServiceService } from '../../services/service.service';
import { ServiceCatalogPublicController } from '../service-catalog-public.controller';

describe('ServiceCatalogPublicController', () => {
  let controller: ServiceCatalogPublicController;
  let categoryServiceMock: { listCategories: jest.Mock; getCategory: jest.Mock };
  let serviceServiceMock: { listServices: jest.Mock; getService: jest.Mock; searchServices: jest.Mock };
  let branchServiceServiceMock: { listBranchServices: jest.Mock };

  beforeEach(async () => {
    categoryServiceMock = { listCategories: jest.fn(), getCategory: jest.fn() };
    serviceServiceMock = { listServices: jest.fn(), getService: jest.fn(), searchServices: jest.fn() };
    branchServiceServiceMock = { listBranchServices: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceCatalogPublicController],
      providers: [
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: ServiceService, useValue: serviceServiceMock },
        { provide: BranchServiceService, useValue: branchServiceServiceMock },
      ],
    }).compile();

    controller = module.get<ServiceCatalogPublicController>(ServiceCatalogPublicController);
  });

  const mockCategory = { id: 'cat_100', name: 'Hair Styling', displayOrder: 1, createdAt: new Date(), updatedAt: new Date() };
  const mockService = { id: 'srv_100', categoryId: 'cat_100', name: "Men's Haircut", genderCategory: 'UNISEX', createdAt: new Date(), updatedAt: new Date() };
  const mockBranchService = { id: 'bs_100', branchId: 'br_100', serviceId: 'srv_100', price: 450.0, durationMinutes: 45, status: 'ACTIVE', isActive: true, createdAt: new Date(), updatedAt: new Date() };

  describe('listCategories()', () => {
    it('should return success envelope with master categories', async () => {
      categoryServiceMock.listCategories.mockResolvedValue([mockCategory]);

      const res = await controller.listCategories();
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('cat_100');
      expect(categoryServiceMock.listCategories).toHaveBeenCalled();
    });
  });

  describe('getCategoryById()', () => {
    it('should return success envelope with category details', async () => {
      categoryServiceMock.getCategory.mockResolvedValue(mockCategory);

      const res = await controller.getCategoryById('cat_100');
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('cat_100');
      expect(categoryServiceMock.getCategory).toHaveBeenCalledWith('cat_100');
    });
  });

  describe('listServices() and getServiceById()', () => {
    it('should return success envelope with master services', async () => {
      serviceServiceMock.listServices.mockResolvedValue([mockService]);

      const res = await controller.listServices();
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('srv_100');
    });

    it('should return service by id', async () => {
      serviceServiceMock.getService.mockResolvedValue(mockService);

      const res = await controller.getServiceById('srv_100');
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('srv_100');
    });
  });

  describe('searchServices()', () => {
    it('should return paginated services envelope', async () => {
      serviceServiceMock.searchServices.mockResolvedValue({
        data: [mockService],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrevious: false },
      });

      const res = await controller.searchServices({});
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('srv_100');
      expect(res.meta.pagination.total).toBe(1);
    });
  });

  describe('listBranchServices()', () => {
    it('should return active branch services envelope', async () => {
      branchServiceServiceMock.listBranchServices.mockResolvedValue([mockBranchService]);

      const res = await controller.listBranchServices('br_100');
      expect(res.success).toBe(true);
      expect(res.data[0].id).toBe('bs_100');
      expect(branchServiceServiceMock.listBranchServices).toHaveBeenCalledWith('br_100');
    });
  });
});
