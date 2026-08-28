import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { SearchStaffQueryDto } from '../dto/search-staff-query.dto';
import { StaffDto } from '../dto/staff.dto';
import { BranchAssignmentService } from '../services/branch-assignment.service';
import { ServiceAssignmentService } from '../services/service-assignment.service';
import { StaffService } from '../services/staff.service';
import { WorkingHoursService } from '../services/working-hours.service';

/**
 * StaffPublicController — Public endpoints for discovering salon staff, schedules, and service capabilities.
 *
 * Auth: Unauthenticated / Public access allowed (@Public()).
 *
 * Architecture ref: Phase 12.0 & Phase 12.4
 */
@ApiTags('Staff (Public)')
@Controller('staff')
export class StaffPublicController {
  constructor(
    private readonly staffService: StaffService,
    private readonly branchAssignmentService: BranchAssignmentService,
    private readonly serviceAssignmentService: ServiceAssignmentService,
    private readonly workingHoursService: WorkingHoursService,
  ) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search and filter active staff members' })
  @ApiResponse({ status: 200, description: 'Paginated staff list', type: [StaffDto] })
  public async searchStaff(@Query() query: SearchStaffQueryDto) {
    const result = await this.staffService.searchStaff(query);
    return ResponseBuilder.paginated(plainToInstance(StaffDto, result.data), result.meta);
  }

  @Public()
  @Get('branches/:branchId/staff')
  @ApiOperation({ summary: 'List staff assigned to a specific branch' })
  @ApiResponse({ status: 200, description: 'List of staff members assigned to branch', type: [StaffDto] })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getBranchStaff(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const result = await this.staffService.searchStaff({ branchId, limit: 100 });
    return ResponseBuilder.success(plainToInstance(StaffDto, result.data));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get staff member profile by ID' })
  @ApiResponse({ status: 200, description: 'Staff member profile details', type: StaffDto })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getStaffById(@Param('id', ParseUUIDPipe) id: string) {
    const staff = await this.staffService.getStaff(id);
    return ResponseBuilder.success(plainToInstance(StaffDto, staff));
  }

  @Public()
  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get working hours and shift schedule for staff member at branch' })
  @ApiResponse({ status: 200, description: 'Working hours list for staff at branch' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getStaffSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const schedule = await this.workingHoursService.getEffectiveSchedule(id, branchId);
    return ResponseBuilder.success(schedule);
  }

  @Public()
  @Get(':id/services')
  @ApiOperation({ summary: 'List service capabilities for staff member' })
  @ApiResponse({ status: 200, description: 'List of service capabilities for staff member' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getStaffServices(@Param('id', ParseUUIDPipe) id: string) {
    const assignments = await this.serviceAssignmentService.listAssignments(id);
    return ResponseBuilder.success(assignments);
  }
}
