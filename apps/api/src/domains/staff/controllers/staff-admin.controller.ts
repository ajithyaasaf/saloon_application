import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EmploymentStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { ApproveLeaveDto } from '../dto/approve-leave.dto';
import { RejectLeaveDto } from '../dto/reject-leave.dto';
import { SearchStaffQueryDto } from '../dto/search-staff-query.dto';
import { StaffDto } from '../dto/staff.dto';
import { InvitationService } from '../services/invitation.service';
import { LeaveService } from '../services/leave.service';
import { StaffService } from '../services/staff.service';

/**
 * StaffAdminController — Platform admin endpoints for managing staff records, approving/rejecting leave requests, and system maintenance.
 *
 * Auth: Requires valid JWT & SUPER_ADMIN role.
 *
 * Architecture ref: Phase 12.0 & Phase 12.4
 */
@ApiTags('Staff (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/staff')
export class StaffAdminController {
  constructor(
    private readonly staffService: StaffService,
    private readonly invitationService: InvitationService,
    private readonly leaveService: LeaveService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search and audit staff members across all salons' })
  @ApiResponse({ status: 200, description: 'Paginated staff list', type: [StaffDto] })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Super Admin access required' })
  public async searchAllStaff(@Query() query: SearchStaffQueryDto) {
    const result = await this.staffService.searchStaff(query);
    return ResponseBuilder.paginated(plainToInstance(StaffDto, result.data), result.meta);
  }

  @Get('pending-invitations')
  @ApiOperation({ summary: 'List all pending staff invitations' })
  @ApiResponse({ status: 200, description: 'List of staff members in INVITED status', type: [StaffDto] })
  public async listPendingInvitations() {
    const result = await this.staffService.searchStaff({ employmentStatus: EmploymentStatus.INVITED, limit: 100 });
    return ResponseBuilder.success(plainToInstance(StaffDto, result.data));
  }

  @Post('leave/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve staff leave request' })
  @ApiResponse({ status: 200, description: 'Leave request approved' })
  @ApiBadRequestResponse({ description: 'Leave already approved/rejected or version mismatch' })
  @ApiNotFoundResponse({ description: 'Leave request not found' })
  public async approveLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveDto,
    @CurrentUser() user: any,
  ) {
    const approverId = user?.userId ?? user?.id;
    const leave = await this.leaveService.approveLeave(id, dto.version, approverId);
    return ResponseBuilder.success(leave);
  }

  @Post('leave/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject staff leave request' })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  @ApiBadRequestResponse({ description: 'Rejection reason missing or leave already processed' })
  @ApiNotFoundResponse({ description: 'Leave request not found' })
  public async rejectLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser() user: any,
  ) {
    const approverId = user?.userId ?? user?.id;
    const leave = await this.leaveService.rejectLeave(id, dto.version, approverId, dto.rejectionReason);
    return ResponseBuilder.success(leave);
  }

  @Post('cleanup-expired-invitations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up expired invitation tokens' })
  @ApiResponse({ status: 200, description: 'Count of expired invitation tokens deleted' })
  public async cleanupExpiredInvitations() {
    const deletedCount = await this.invitationService.expireInvitations();
    return ResponseBuilder.message(`Cleaned up ${deletedCount} expired invitation tokens`);
  }
}
