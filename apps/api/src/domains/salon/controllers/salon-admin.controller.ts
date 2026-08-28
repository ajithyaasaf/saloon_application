import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { RejectSalonRequestDto } from '../dto/reject-salon-request.dto';
import { SearchSalonQueryDto } from '../dto/search-salon-query.dto';
import { SalonApprovalService } from '../services/salon-approval.service';
import { SalonService } from '../services/salon.service';

/**
 * SalonAdminController — B2B Admin endpoints for Super Admins to review and approve Salons.
 *
 * Auth: Requires valid JWT & SUPER_ADMIN role.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
@ApiTags('Salons (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/salons')
export class SalonAdminController {
  constructor(
    private readonly salonApprovalService: SalonApprovalService,
    private readonly salonService: SalonService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Super Admin lists and searches all salons' })
  @ApiResponse({ status: 200, description: 'Paginated list of all salons' })
  public async searchSalons(@Query() query: SearchSalonQueryDto) {
    const result = await this.salonService.searchSalons(query);
    return ResponseBuilder.paginated(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Super Admin retrieves detailed salon profile by ID' })
  @ApiResponse({ status: 200, description: 'Salon profile details' })
  public async getSalonById(@Param('id') id: string) {
    const salon = await this.salonService.getSalonById(id);
    return ResponseBuilder.success(salon);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Super Admin approves a PENDING_APPROVAL salon' })
  @ApiResponse({ status: 200, description: 'Salon approved successfully' })
  public async approveSalon(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    const approved = await this.salonApprovalService.approveSalon(id, user.sub);
    return ResponseBuilder.success(approved);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Super Admin rejects a PENDING_APPROVAL salon with a reason' })
  @ApiResponse({ status: 200, description: 'Salon rejected successfully' })
  public async rejectSalon(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: RejectSalonRequestDto,
  ) {
    const rejected = await this.salonApprovalService.rejectSalon(id, user.sub, dto.reason);
    return ResponseBuilder.success(rejected);
  }
}

