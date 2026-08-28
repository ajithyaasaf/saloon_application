import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BranchServiceDto } from '../dto/branch-service.dto';
import { ServiceCategoryDto } from '../dto/service-category.dto';
import { ServiceDto } from '../dto/service.dto';
import { BranchServiceService } from '../services/branch-service.service';
import { CategoryService } from '../services/category.service';
import { ServiceService } from '../services/service.service';

/**
 * ServiceCatalogAdminController — Admin endpoints for Super Admins to inspect master categories, services, and branch offerings.
 *
 * Auth: Requires valid JWT & SUPER_ADMIN role.
 *
 * Architecture ref: Phase 11.0 & Phase 11.4
 */
@ApiTags('Service Catalog (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/services')
export class ServiceCatalogAdminController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly branchServiceService: BranchServiceService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Super Admin view of all master service categories' })
  @ApiResponse({ status: 200, description: 'List of master service categories', type: [ServiceCategoryDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SUPER_ADMIN role' })
  public async listCategories() {
    const categories = await this.categoryService.listCategories();
    return ResponseBuilder.success(plainToInstance(ServiceCategoryDto, categories));
  }

  @Get()
  @ApiOperation({ summary: 'Super Admin view of all master service definitions' })
  @ApiResponse({ status: 200, description: 'List of master services', type: [ServiceDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SUPER_ADMIN role' })
  public async listServices() {
    const services = await this.serviceService.listServices();
    return ResponseBuilder.success(plainToInstance(ServiceDto, services));
  }

  @Get('branches/services')
  @ApiOperation({ summary: 'Super Admin view of branch service offerings' })
  @ApiResponse({ status: 200, description: 'List of branch services', type: [BranchServiceDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SUPER_ADMIN role' })
  public async listBranchServices(@Query('branchId') branchId?: string) {
    const branchServices = await this.branchServiceService.listBranchServices(branchId ?? '');
    return ResponseBuilder.success(plainToInstance(BranchServiceDto, branchServices));
  }
}
