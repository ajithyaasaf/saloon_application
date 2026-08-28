import { Test, TestingModule } from '@nestjs/testing';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../../common/exceptions/validation.exception';
import { AuditService } from '../../../../shared/audit/audit.service';
import { CacheService } from '../../../../shared/cache/cache.service';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { TransactionService } from '../../../../shared/transaction/transaction.service';
import { ServiceCategoryRepository } from '../../repositories/service-category.repository';
import { CategoryService } from '../category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepoMock: { findById: jest.Mock; findByName: jest.Mock; findAll: jest.Mock; create: jest.Mock; update: jest.Mock; softDelete: jest.Mock };
  let transactionServiceMock: { run: jest.Mock };
  let auditServiceMock: { logInTransaction: jest.Mock };
  let cacheServiceMock: { getOrSet: jest.Mock; delete: jest.Mock };
  let eventBusServiceMock: { publish: jest.Mock };

  beforeEach(async () => {
    categoryRepoMock = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    transactionServiceMock = {
      run: jest.fn((cb) => cb({})),
    };

    auditServiceMock = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheServiceMock = {
      getOrSet: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBusServiceMock = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: ServiceCategoryRepository, useValue: categoryRepoMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: EventBusService, useValue: eventBusServiceMock },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  const mockCategory = {
    id: 'cat_100',
    name: 'Hair Styling',
    displayOrder: 1,
    iconMediaId: null,
    version: 1,
    deletedAt: null,
  };

  describe('createCategory()', () => {
    it('should create category, log audit, invalidate cache, and publish event', async () => {
      categoryRepoMock.findByName.mockResolvedValue(null);
      categoryRepoMock.create.mockResolvedValue(mockCategory);

      const res = await service.createCategory({ name: 'Hair Styling', displayOrder: 1 }, 'usr_admin');

      expect(res).toEqual(mockCategory);
      expect(transactionServiceMock.run).toHaveBeenCalled();
      expect(auditServiceMock.logInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CATEGORY_CREATED' }));
      expect(cacheServiceMock.delete).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'category.created.v1' }));
    });

    it('should throw ValidationException if category name exists', async () => {
      categoryRepoMock.findByName.mockResolvedValue(mockCategory);

      await expect(service.createCategory({ name: 'Hair Styling' })).rejects.toThrow(ValidationException);
    });
  });

  describe('updateCategory() and deleteCategory()', () => {
    it('should update category and invalidate cache', async () => {
      categoryRepoMock.findById.mockResolvedValue(mockCategory);
      categoryRepoMock.update.mockResolvedValue({ ...mockCategory, name: 'Hair Styling & Spa', version: 2 });

      const updated = await service.updateCategory('cat_100', { name: 'Hair Styling & Spa', version: 1 }, 'usr_admin');

      expect(updated.version).toBe(2);
      expect(cacheServiceMock.delete).toHaveBeenCalled();
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'category.updated.v1' }));
    });

    it('should throw ResourceNotFoundException when updating non-existent category', async () => {
      categoryRepoMock.findById.mockResolvedValue(null);

      await expect(service.updateCategory('cat_999', { version: 1 })).rejects.toThrow(ResourceNotFoundException);
    });

    it('should soft delete category and publish CategoryDeletedEvent', async () => {
      categoryRepoMock.findById.mockResolvedValue(mockCategory);

      await service.deleteCategory('cat_100', 1, 'usr_admin');

      expect(categoryRepoMock.softDelete).toHaveBeenCalledWith('cat_100', 1, expect.anything());
      expect(eventBusServiceMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'category.deleted.v1' }));
    });
  });
});
