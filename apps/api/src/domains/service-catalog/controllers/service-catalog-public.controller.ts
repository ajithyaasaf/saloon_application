import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BranchServiceDto } from '../dto/branch-service.dto';
import { PaginatedServicesDto } from '../dto/paginated-services.dto';
import { SearchServiceQueryDto } from '../dto/search-service-query.dto';
import { ServiceCategoryDto } from '../dto/service-category.dto';
import { ServiceDto } from '../dto/service.dto';
import { BranchServiceService } from '../services/branch-service.service';
import { CategoryService } from '../services/category.service';
import { ServiceService } from '../services/service.service';

/**
 * ServiceCatalogPublicController — Public endpoints for discovering service categories, master services, and branch offerings.
 *
 * Auth: Unauthenticated / Public access allowed (@Public()).
 *
 * Architecture ref: Phase 11.0 & Phase 11.4
 */
@ApiTags('Service Catalog (Public)')
@Controller('services')
export class ServiceCatalogPublicController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly branchServiceService: BranchServiceService,
  ) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List all active master service categories' })
  @ApiResponse({ status: 200, description: 'List of master service categories', type: [ServiceCategoryDto] })
  public async listCategories() {
    const categories = await this.categoryService.listCategories();
    return ResponseBuilder.success(plainToInstance(ServiceCategoryDto, categories));
  }

  @Public()
  @Get('categories/:id')
  @ApiOperation({ summary: 'Get service category by ID' })
  @ApiResponse({ status: 200, description: 'Service category details', type: ServiceCategoryDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoryService.getCategory(id);
    return ResponseBuilder.success(plainToInstance(ServiceCategoryDto, category));
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all master service definitions' })
  @ApiResponse({ status: 200, description: 'List of master services', type: [ServiceDto] })
  public async listServices() {
    const services = await this.serviceService.listServices();
    return ResponseBuilder.success(plainToInstance(ServiceDto, services));
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search master services with pagination, category, and gender filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of master services', type: PaginatedServicesDto })
  @ApiBadRequestResponse({ description: 'Invalid search parameters' })
  public async searchServices(@Query() query: SearchServiceQueryDto) {
    const result = await this.serviceService.searchServices(query);
    return ResponseBuilder.paginated(plainToInstance(ServiceDto, result.data), result.meta);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get master service definition by ID' })
  @ApiResponse({ status: 200, description: 'Master service details', type: ServiceDto })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getServiceById(@Param('id', ParseUUIDPipe) id: string) {
    const service = await this.serviceService.getService(id);
    return ResponseBuilder.success(plainToInstance(ServiceDto, service));
  }

  @Public()
  @Get('branches/:branchId/services')
  @ApiOperation({ summary: 'List active services offered by a specific salon branch' })
  @ApiResponse({ status: 200, description: 'List of branch services', type: [BranchServiceDto] })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async listBranchServices(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const branchServices = await this.branchServiceService.listBranchServices(branchId);
    return ResponseBuilder.success(plainToInstance(BranchServiceDto, branchServices));
  }
}
