import { Test, TestingModule } from '@nestjs/testing';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../../common/exceptions/validation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { ServiceCategoryRepository } from '../../repositories/service-category.repository';
import { ServiceRepository } from '../../repositories/service.repository';
import { ServiceService } from '../service.service';

describe('ServiceService', () => {
  let service: ServiceService;
  let serviceRepoMock: { findById: jest.Mock; findByCategory: jest.Mock; findAll: jest.Mock; search: jest.Mock; create: jest.Mock; update: jest.Mock; softDelete: jest.Mock };
  let categoryRepoMock: { findById: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { getOrSet: jest.Mock; delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    serviceRepoMock = {
      findById: jest.fn(),
      findByCategory: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    categoryRepoMock = { findById: jest.fn() };
    transactionServiceMock = { run: jest.fn((cb) => cb({})) };
    auditServiceMock = { logInTransaction: jest.fn().mockResolvedValue(undefined) };
    cacheServiceMock = { getOrSet: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    eventBusServiceMock = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        { provide: ServiceRepository, useValue: serviceRepoMock },
        { provide: ServiceCategoryRepository, useValue: categoryRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
  });

  const mockCategory = { id: 'cat_100', name: 'Hair Styling' };
  const mockService = {
    id: 'srv_100',
    categoryId: 'cat_100',
    name: "Men's Haircut",
    description: 'Scissor cut',
    genderCategory: 'UNISEX',
    coverMediaId: null,
    version: 1,
    deletedAt: null,
  };

  describe('createService()', () => {
    it('should create master service and publish event', async () => {
      categoryRepoMock.findById.mockResolvedValue(mockCategory);
      serviceRepoMock.findByCategory.mockResolvedValue([]);
      serviceRepoMock.create.mockResolvedValue(mockService);

      const res = await service.createService({ categoryId: 'cat_100', name: "Men's Haircut" }, 'usr_admin');

      expect(res).toEqual(mockService);
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'service.created.v1' }));
    });

    it('should throw ResourceNotFoundException if category does not exist', async () => {
      categoryRepoMock.findById.mockResolvedValue(null);

      await expect(service.createService({ categoryId: 'cat_999', name: 'Haircut' })).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw ValidationException if service name is duplicate in category', async () => {
      categoryRepoMock.findById.mockResolvedValue(mockCategory);
      serviceRepoMock.findByCategory.mockResolvedValue([mockService]);

      await expect(service.createService({ categoryId: 'cat_100', name: "Men's Haircut" })).rejects.toThrow(ValidationException);
    });
  });

  describe('updateService() and deleteService()', () => {
    it('should update service and invalidate cache', async () => {
      serviceRepoMock.findById.mockResolvedValue(mockService);
      serviceRepoMock.update.mockResolvedValue({ ...mockService, name: "Men's Premium Haircut", version: 2 });

      const updated = await service.updateService('srv_100', { name: "Men's Premium Haircut", version: 1 }, 'usr_admin');

      expect(updated.version).toBe(2);
      expect(cacheServiceMock.delete).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'service.updated.v1' }));
    });

    it('should soft delete service and publish ServiceDeletedEvent', async () => {
      serviceRepoMock.findById.mockResolvedValue(mockService);

      await service.deleteService('srv_100', 1, 'usr_admin');

      expect(serviceRepoMock.softDelete).toHaveBeenCalledWith('srv_100', 1, expect.anything());
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'service.deleted.v1' }));
    });
  });
});
