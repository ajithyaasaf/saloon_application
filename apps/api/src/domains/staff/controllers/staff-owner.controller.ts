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
  Put,
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
import { AssignBranchDto } from '../dto/assign-branch.dto';
import { AssignServiceDto } from '../dto/assign-service.dto';
import { CreateLeaveDto } from '../dto/create-leave.dto';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { InviteStaffDto } from '../dto/invite-staff.dto';
import { StaffDto } from '../dto/staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { BranchAssignmentService } from '../services/branch-assignment.service';
import { InvitationService } from '../services/invitation.service';
import { LeaveService } from '../services/leave.service';
import { ServiceAssignmentService } from '../services/service-assignment.service';
import { StaffService } from '../services/staff.service';
import { WorkingHoursService } from '../services/working-hours.service';

/**
 * StaffOwnerController — B2B endpoints for Salon Owners to manage staff lifecycle, branch assignments, service capabilities, working hours, and leaves.
 *
 * Auth: Requires valid JWT & SALON_OWNER role.
 *
 * Architecture ref: Phase 12.0 & Phase 12.4
 */
@ApiTags('Staff (Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/staff')
export class StaffOwnerController {
  constructor(
    private readonly staffService: StaffService,
    private readonly invitationService: InvitationService,
    private readonly branchAssignmentService: BranchAssignmentService,
    private readonly serviceAssignmentService: ServiceAssignmentService,
    private readonly workingHoursService: WorkingHoursService,
    private readonly leaveService: LeaveService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new staff profile' })
  @ApiResponse({ status: 201, description: 'Staff member created successfully', type: StaffDto })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiConflictResponse({ description: 'Employee code already exists in salon' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  public async createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: any) {
    const staff = await this.staffService.createStaff(dto, user?.userId ?? user?.id);
    return ResponseBuilder.created(plainToInstance(StaffDto, staff));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member profile' })
  @ApiResponse({ status: 200, description: 'Staff profile updated successfully', type: StaffDto })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiConflictResponse({ description: 'Optimistic locking failure or employee code collision' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  public async updateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: any,
  ) {
    const staff = await this.staffService.updateStaff(id, dto, user?.userId ?? user?.id);
    return ResponseBuilder.success(plainToInstance(StaffDto, staff));
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite new staff member via Email or SMS' })
  @ApiResponse({ status: 200, description: 'Invitation token generated and sent' })
  @ApiBadRequestResponse({ description: 'Neither email nor phone provided' })
  public async inviteStaff(@Body() dto: InviteStaffDto, @CurrentUser() user: any) {
    const result = await this.invitationService.inviteStaff(dto, user?.userId ?? user?.id);
    return ResponseBuilder.success({
      staff: plainToInstance(StaffDto, result.staff),
      token: result.token,
    });
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate suspended or invited staff member' })
  @ApiResponse({ status: 200, description: 'Staff member activated', type: StaffDto })
  @ApiBadRequestResponse({ description: 'Cannot activate terminated staff' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  public async activateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const staff = await this.staffService.activateStaff(id, version, user?.userId ?? user?.id);
    return ResponseBuilder.success(plainToInstance(StaffDto, staff));
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend staff member' })
  @ApiResponse({ status: 200, description: 'Staff member suspended', type: StaffDto })
  @ApiBadRequestResponse({ description: 'Cannot suspend terminated staff' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  public async suspendStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    const staff = await this.staffService.suspendStaff(id, version, reason, user?.userId ?? user?.id);
    return ResponseBuilder.success(plainToInstance(StaffDto, staff));
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate staff employment' })
  @ApiResponse({ status: 200, description: 'Staff employment terminated', type: StaffDto })
  @ApiBadRequestResponse({ description: 'Staff already terminated or self-termination attempted' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  public async terminateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const staff = await this.staffService.terminateStaff(id, version, user?.userId ?? user?.id);
    return ResponseBuilder.success(plainToInstance(StaffDto, staff));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive staff member record' })
  @ApiResponse({ status: 204, description: 'Staff record archived successfully' })
  @ApiBadRequestResponse({ description: 'Cannot archive active staff member' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  public async archiveStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    await this.staffService.archiveStaff(id, version, user?.userId ?? user?.id);
    return ResponseBuilder.noContent();
  }

  @Post('branches')
  @ApiOperation({ summary: 'Assign staff member to a salon branch' })
  @ApiResponse({ status: 201, description: 'Branch assigned successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  public async assignBranch(@Body() dto: AssignBranchDto, @CurrentUser() user: any) {
    const assignment = await this.branchAssignmentService.assignBranch(dto, user?.userId ?? user?.id);
    return ResponseBuilder.created(assignment);
  }

  @Patch('branches/:assignmentId/primary')
  @ApiOperation({ summary: 'Change staff member primary branch' })
  @ApiResponse({ status: 200, description: 'Primary branch assignment updated' })
  @ApiBadRequestResponse({ description: 'Staff member not assigned to branch' })
  public async changePrimaryBranch(
    @Param('assignmentId', ParseUUIDPipe) _assignmentId: string,
    @Body('staffId', ParseUUIDPipe) staffId: string,
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.branchAssignmentService.changePrimaryBranch(staffId, branchId, user?.userId ?? user?.id);
    return ResponseBuilder.success(assignment);
  }

  @Delete('branches/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove staff branch assignment' })
  @ApiResponse({ status: 204, description: 'Branch assignment removed successfully' })
  @ApiBadRequestResponse({ description: 'Cannot remove last active branch assignment' })
  public async removeBranchAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    await this.branchAssignmentService.removeBranchAssignment(assignmentId, version, user?.userId ?? user?.id);
    return ResponseBuilder.noContent();
  }

  @Post('services')
  @ApiOperation({ summary: 'Assign service capability to staff member' })
  @ApiResponse({ status: 201, description: 'Service capability assigned successfully' })
  @ApiBadRequestResponse({ description: 'Staff member not assigned to service branch' })
  @ApiConflictResponse({ description: 'Service capability already assigned' })
  public async assignService(@Body() dto: AssignServiceDto, @CurrentUser() user: any) {
    const assignment = await this.serviceAssignmentService.assignService(dto, user?.userId ?? user?.id);
    return ResponseBuilder.created(assignment);
  }

  @Delete('services/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove service capability from staff member' })
  @ApiResponse({ status: 204, description: 'Service capability removed successfully' })
  @ApiNotFoundResponse({ description: 'Service capability assignment not found' })
  public async removeServiceAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    await this.serviceAssignmentService.removeService(assignmentId, version, user?.userId ?? user?.id);
    return ResponseBuilder.noContent();
  }

  @Put('working-hours')
  @ApiOperation({ summary: 'Update staff working hours for a branch' })
  @ApiResponse({ status: 200, description: 'Working hours updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid shift times or break overlaps' })
  public async updateWorkingHours(
    @Body() dto: UpdateWorkingHoursDto,
    @Query('staffId', ParseUUIDPipe) staffId: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @CurrentUser() user: any,
  ) {
    const hours = await this.workingHoursService.updateWorkingHours(dto, staffId, branchId, user?.userId ?? user?.id);
    return ResponseBuilder.success(hours);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Request leave on behalf of staff member' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  @ApiBadRequestResponse({ description: 'Invalid dates or overlapping approved leave' })
  public async requestLeave(@Body() dto: CreateLeaveDto, @CurrentUser() user: any) {
    const leave = await this.leaveService.requestLeave(dto, dto.staffId, user?.userId ?? user?.id);
    return ResponseBuilder.created(leave);
  }

  @Post('leave/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiResponse({ status: 204, description: 'Leave request cancelled' })
  @ApiNotFoundResponse({ description: 'Leave request not found' })
  public async cancelLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    await this.leaveService.cancelLeave(id, version, actorId);
    return ResponseBuilder.noContent();
  }
}
