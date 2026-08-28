import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BranchServiceDto } from '../dto/branch-service.dto';
import { CreateBranchServiceDto } from '../dto/create-branch-service.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ServiceCategoryDto } from '../dto/service-category.dto';
import { ServiceDto } from '../dto/service.dto';
import { UpdateBranchServiceDto } from '../dto/update-branch-service.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { BranchServiceService } from '../services/branch-service.service';
import { CategoryService } from '../services/category.service';
import { ServiceService } from '../services/service.service';

/**
 * ServiceCatalogOwnerController — B2B endpoints for Salon Owners to manage service categories, services, and branch pricing.
 *
 * Auth: Requires valid JWT & SALON_OWNER role.
 *
 * Architecture ref: Phase 11.0 & Phase 11.4
 */
@ApiTags('Service Catalog (Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/services')
export class ServiceCatalogOwnerController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly branchServiceService: BranchServiceService,
  ) {}

  @Post('categories')
  @ApiOperation({ summary: 'Create a new master service category' })
  @ApiResponse({ status: 201, description: 'Category created successfully', type: ServiceCategoryDto })
  @ApiBadRequestResponse({ description: 'Validation failure or duplicate category name' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async createCategory(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCategoryDto,
  ) {
    const category = await this.categoryService.createCategory(dto, user.sub);
    return ResponseBuilder.created(plainToInstance(ServiceCategoryDto, category));
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update master service category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully', type: ServiceCategoryDto })
  @ApiBadRequestResponse({ description: 'Validation failure' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async updateCategory(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const updated = await this.categoryService.updateCategory(id, dto, user.sub);
    return ResponseBuilder.success(plainToInstance(ServiceCategoryDto, updated));
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete master service category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async deleteCategory(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version?: number,
  ) {
    await this.categoryService.deleteCategory(id, Number(version ?? 1), user.sub);
    return ResponseBuilder.message('ServiceCategory deleted successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new master service definition' })
  @ApiResponse({ status: 201, description: 'Service created successfully', type: ServiceDto })
  @ApiBadRequestResponse({ description: 'Validation failure or duplicate service name' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async createService(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateServiceDto,
  ) {
    const service = await this.serviceService.createService(dto, user.sub);
    return ResponseBuilder.created(plainToInstance(ServiceDto, service));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update master service definition' })
  @ApiResponse({ status: 200, description: 'Service updated successfully', type: ServiceDto })
  @ApiBadRequestResponse({ description: 'Validation failure' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async updateService(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const updated = await this.serviceService.updateService(id, dto, user.sub);
    return ResponseBuilder.success(plainToInstance(ServiceDto, updated));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete master service definition' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async deleteService(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version?: number,
  ) {
    await this.serviceService.deleteService(id, Number(version ?? 1), user.sub);
    return ResponseBuilder.message('Service deleted successfully');
  }

  @Post('branches/:branchId/services')
  @ApiOperation({ summary: 'Assign master service to salon branch' })
  @ApiResponse({ status: 201, description: 'Service assigned to branch successfully', type: BranchServiceDto })
  @ApiBadRequestResponse({ description: 'Invalid price or duration' })
  @ApiConflictResponse({ description: 'Service already assigned to branch' })
  @ApiNotFoundResponse({ description: 'Branch or Service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async assignServiceToBranch(
    @CurrentUser() user: { sub: string },
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: CreateBranchServiceDto,
  ) {
    const branchService = await this.branchServiceService.assignServiceToBranch({ ...dto, branchId }, user.sub);
    return ResponseBuilder.created(plainToInstance(BranchServiceDto, branchService));
  }

  @Patch('branches/services/:id')
  @ApiOperation({ summary: 'Update branch service offering settings' })
  @ApiResponse({ status: 200, description: 'Branch service updated successfully', type: BranchServiceDto })
  @ApiBadRequestResponse({ description: 'Validation failure' })
  @ApiNotFoundResponse({ description: 'Branch service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async updateBranchService(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchServiceDto,
  ) {
    const updated = await this.branchServiceService.updateBranchService(id, dto, user.sub);
    return ResponseBuilder.success(plainToInstance(BranchServiceDto, updated));
  }

  @Patch('branches/services/:id/price')
  @ApiOperation({ summary: 'Update price of a branch service offering and record price history' })
  @ApiResponse({ status: 200, description: 'Price updated successfully', type: BranchServiceDto })
  @ApiBadRequestResponse({ description: 'Invalid price' })
  @ApiNotFoundResponse({ description: 'Branch service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async changePrice(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @Body('price') price: number,
  ) {
    const updated = await this.branchServiceService.changePrice(id, Number(version ?? 1), Number(price), user.sub);
    return ResponseBuilder.success(plainToInstance(BranchServiceDto, updated));
  }

  @Delete('branches/services/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete branch service offering' })
  @ApiResponse({ status: 200, description: 'Branch service removed successfully' })
  @ApiNotFoundResponse({ description: 'Branch service not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async removeBranchService(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version?: number,
  ) {
    await this.branchServiceService.removeBranchService(id, Number(version ?? 1), user.sub);
    return ResponseBuilder.message('BranchService removed successfully');
  }
}
