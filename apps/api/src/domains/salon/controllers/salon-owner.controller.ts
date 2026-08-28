import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { CreateSalonRequestDto } from '../dto/create-salon-request.dto';
import { UpdateSalonRequestDto } from '../dto/update-salon-request.dto';
import { BranchService } from '../services/branch.service';
import { SalonApprovalService } from '../services/salon-approval.service';
import { SalonService } from '../services/salon.service';
import { UpdateWorkingHourItemDto, WorkingHoursService } from '../services/working-hours.service';

/**
 * SalonOwnerController — B2B endpoints for Salon Owners to manage their salon aggregate.
 *
 * Auth: Requires valid JWT & SALON_OWNER role.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
@ApiTags('Salons (Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/salons')
export class SalonOwnerController {
  constructor(
    private readonly salonService: SalonService,
    private readonly branchService: BranchService,
    private readonly workingHoursService: WorkingHoursService,
    private readonly salonApprovalService: SalonApprovalService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new draft salon with primary branch' })
  @ApiResponse({ status: 201, description: 'Salon draft created successfully' })
  public async createSalon(@CurrentUser() user: { sub: string }, @Body() dto: CreateSalonRequestDto) {
    const salon = await this.salonService.createSalon(user.sub, dto);
    return ResponseBuilder.created(salon);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update salon aggregate profile details' })
  @ApiResponse({ status: 200, description: 'Salon updated successfully' })
  public async updateSalon(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateSalonRequestDto,
  ) {
    const updated = await this.salonService.updateSalon(id, user.sub, dto.version ?? 1, dto);
    return ResponseBuilder.success(updated);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit DRAFT salon profile for Super Admin approval' })
  @ApiResponse({ status: 200, description: 'Salon submitted for review' })
  public async submitForApproval(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    const submitted = await this.salonApprovalService.submitForApproval(id, user.sub);
    return ResponseBuilder.success(submitted);
  }

  @Post(':salonId/branches')
  @ApiOperation({ summary: 'Create a secondary branch location for a salon' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  public async createBranch(
    @CurrentUser() user: { sub: string },
    @Param('salonId') salonId: string,
    @Body() dto: CreateBranchDto,
  ) {
    const branch = await this.branchService.createBranch(salonId, user.sub, dto);
    return ResponseBuilder.created(branch);
  }

  @Post(':salonId/branches/:branchId/primary')
  @ApiOperation({ summary: 'Set a specific branch as primary for the salon' })
  @ApiResponse({ status: 200, description: 'Primary branch set successfully' })
  public async setPrimaryBranch(
    @CurrentUser() user: { sub: string },
    @Param('salonId') salonId: string,
    @Param('branchId') branchId: string,
  ) {
    await this.branchService.setPrimaryBranch(salonId, branchId, user.sub);
    return ResponseBuilder.message('Primary branch updated successfully');
  }

  @Put('branches/:branchId/hours')
  @ApiOperation({ summary: 'Update 7-day operating hours for a branch' })
  @ApiResponse({ status: 200, description: 'Working hours updated' })
  public async updateWorkingHours(
    @CurrentUser() user: { sub: string },
    @Param('branchId') branchId: string,
    @Body() hours: UpdateWorkingHourItemDto[],
  ) {
    await this.workingHoursService.updateWorkingHours(branchId, user.sub, hours);
    return ResponseBuilder.message('Working hours updated successfully');
  }
}
