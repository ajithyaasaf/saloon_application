import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { BranchRepository } from '../salon/repositories/branch.repository';
import { ServiceCatalogAdminController } from './controllers/service-catalog-admin.controller';
import { ServiceCatalogOwnerController } from './controllers/service-catalog-owner.controller';
import { ServiceCatalogPublicController } from './controllers/service-catalog-public.controller';
import { BranchServiceRepository } from './repositories/branch-service.repository';
import { ServiceCategoryRepository } from './repositories/service-category.repository';
import { ServiceRepository } from './repositories/service.repository';
import { BranchServiceService } from './services/branch-service.service';
import { CategoryService } from './services/category.service';
import { ServiceService } from './services/service.service';

/**
 * ServiceCatalogModule — NestJS module for Service Catalog domain.
 *
 * Encapsulates public, owner, and admin endpoints, domain services, and repository layers.
 * Depends on SharedModule for transaction, audit, cache, events, storage, and notification services.
 *
 * Architecture ref: Phase 11.0 & Phase 11.4
 */
@Module({
  imports: [SharedModule],
  controllers: [
    ServiceCatalogPublicController,
    ServiceCatalogOwnerController,
    ServiceCatalogAdminController,
  ],
  providers: [
    ServiceCategoryRepository,
    ServiceRepository,
    BranchServiceRepository,
    BranchRepository,
    CategoryService,
    ServiceService,
    BranchServiceService,
  ],
  exports: [CategoryService, ServiceService, BranchServiceService],
})
export class ServiceCatalogModule {}
