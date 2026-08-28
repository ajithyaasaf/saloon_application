import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { CouponUsageEntity } from '../entities/coupon-usage.entity';
import { CouponEntity } from '../entities/coupon.entity';
import { CouponApplicabilityService } from '../services/coupon-applicability.service';
import { CouponUsageService } from '../services/coupon-usage.service';
import { CouponService } from '../services/coupon.service';
import {
  CouponSearchRequestDto,
  CouponUsageSearchRequestDto,
  CreateCouponRequestDto,
  ReverseCouponUsageRequestDto,
  SetCouponApplicabilityRequestDto,
  SetCouponCustomerEligibilityRequestDto,
  SettleCouponUsageRequestDto,
  UpdateCouponRequestDto,
} from './dto/coupon-request.dto';
import {
  CouponApplicabilityResponseDto,
  CouponUsageResponseDto,
  OwnerCouponResponseDto,
} from './dto/coupon-response.dto';

@ApiTags('Promotions (Salon Owner & Staff Coupons)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
@Controller('owner/promotions/coupons')
export class CouponOwnerController {
  constructor(
    private readonly couponService: CouponService,
    private readonly applicabilityService: CouponApplicabilityService,
    private readonly couponUsageService: CouponUsageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new coupon for salon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  public async createCoupon(
    @CurrentUser() user: any,
    @Body() dto: CreateCouponRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const created = await this.couponService.createCoupon(
      {
        ...dto,
        salonId,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(created));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter coupons for salon' })
  @ApiResponse({ status: 200, description: 'Coupons returned' })
  public async searchCoupons(
    @CurrentUser() user: any,
    @Query() query: CouponSearchRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.couponService.searchCoupons({
      ...query,
      sortBy: query.sortBy as any,
      salonId,
    });

    const sanitizedData = res.data.map((c) => this.toOwnerDto(c));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get coupon full details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon details returned' })
  public async getCouponById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const coupon = await this.couponService.getCouponById(id, salonId);
    return ResponseBuilder.success(this.toOwnerDto(coupon));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update coupon details' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  public async updateCoupon(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.couponService.updateCoupon(
      id,
      dto,
      salonId,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon activated' })
  public async activateCoupon(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.couponService.activateCoupon(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon paused' })
  public async pauseCoupon(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.couponService.pauseCoupon(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/soft-delete a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon archived' })
  public async archiveCoupon(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.couponService.archiveCoupon(id, salonId, user.id);
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Put(':id/applicability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set target service, category, and branch applicabilities' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Applicabilities updated' })
  public async setApplicabilities(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCouponApplicabilityRequestDto,
  ) {
    const salonId = this.extractSalonId(user);

    if (dto.serviceIds) {
      await this.applicabilityService.setServiceApplicabilities(id, dto.serviceIds, salonId);
    }
    if (dto.categoryIds) {
      await this.applicabilityService.setCategoryApplicabilities(id, dto.categoryIds, salonId);
    }
    if (dto.branchIds) {
      await this.applicabilityService.setBranchApplicabilities(id, dto.branchIds, salonId);
    }

    const all = await this.applicabilityService.getApplicabilitiesForCoupon(id, salonId);
    return ResponseBuilder.success(all);
  }

  @Put(':id/customer-eligibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set specific eligible customer IDs for coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Customer eligibilities updated' })
  public async setCustomerEligibilities(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCouponCustomerEligibilityRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.applicabilityService.setCustomerEligibilities(
      id,
      dto.customerIds,
      salonId,
    );
    return ResponseBuilder.success(updated);
  }

  @Get(':id/applicability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all applicability mappings for coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Applicability mappings returned' })
  public async getApplicabilities(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const all = await this.applicabilityService.getApplicabilitiesForCoupon(id, salonId);
    return ResponseBuilder.success(all);
  }

  @Get(':id/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get usage records and analytics for coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon usages returned' })
  public async getCouponUsages(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CouponUsageSearchRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [res, aggregation] = await Promise.all([
      this.couponUsageService.searchUsages({
        ...query,
        sortBy: query.sortBy as any,
        couponId: id,
        salonId,
      }),
      this.couponUsageService.aggregateUsage(id, salonId),
    ]);

    const sanitizedData = res.data.map((u) => this.toUsageDto(u));
    return ResponseBuilder.success({
      usages: sanitizedData,
      aggregation,
      meta: PaginationUtil.buildMeta(res.total, { page, limit }),
    });
  }

  @Post('usages/:usageId/settle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Settle a completed coupon usage record' })
  @ApiParam({ name: 'usageId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usage settled' })
  public async settleUsage(
    @CurrentUser() user: any,
    @Param('usageId', ParseUUIDPipe) usageId: string,
    @Body() dto: SettleCouponUsageRequestDto,
  ) {
    const usage = await this.couponUsageService.settleCouponUsage(usageId, dto.invoiceId, user.id);
    return ResponseBuilder.success(this.toUsageDto(usage));
  }

  @Post('usages/:usageId/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a coupon usage and restore quota' })
  @ApiParam({ name: 'usageId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usage reversed' })
  public async reverseUsage(
    @CurrentUser() user: any,
    @Param('usageId', ParseUUIDPipe) usageId: string,
    @Body() dto: ReverseCouponUsageRequestDto,
  ) {
    const usage = await this.couponUsageService.reverseCouponUsage(
      usageId,
      dto.reversalReason,
      user.id,
    );
    return ResponseBuilder.success(this.toUsageDto(usage));
  }

  private extractSalonId(user: any): string {
    const salonId = user?.salonId;
    if (!salonId) {
      throw new ForbiddenException('Authenticated user is not associated with a salon.');
    }
    return salonId;
  }

  private toOwnerDto(coupon: CouponEntity): OwnerCouponResponseDto {
    return {
      id: coupon.id,
      salonId: coupon.salonId,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minBookingAmount: coupon.minBookingAmount,
      minServicesCount: coupon.minServicesCount,
      applicabilityType: coupon.applicabilityType,
      customerEligibility: coupon.customerEligibility,
      totalUsageLimit: coupon.totalUsageLimit,
      perCustomerLimit: coupon.perCustomerLimit,
      currentUsageCount: coupon.currentUsageCount,
      isAutoApply: coupon.isAutoApply,
      isCombinableWithOtherOffers: coupon.isCombinableWithOtherOffers,
      isHappyHour: coupon.isHappyHour,
      validDaysOfWeek: coupon.validDaysOfWeek,
      validStartTime: coupon.validStartTime,
      validEndTime: coupon.validEndTime,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      status: coupon.status,
      version: coupon.version,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      isGlobal: coupon.isGlobal(),
      isDepleted: coupon.isDepleted(),
    };
  }

  private toUsageDto(usage: CouponUsageEntity): CouponUsageResponseDto {
    return {
      id: usage.id,
      couponId: usage.couponId,
      salonId: usage.salonId,
      branchId: usage.branchId,
      customerId: usage.customerId,
      bookingId: usage.bookingId,
      appointmentId: usage.appointmentId,
      invoiceId: usage.invoiceId,
      discountAmount: usage.discountAmount,
      bookingTotalBeforeDiscount: usage.bookingTotalBeforeDiscount,
      bookingTotalAfterDiscount: usage.bookingTotalAfterDiscount,
      status: usage.status,
      appliedAt: usage.appliedAt,
      settledAt: usage.settledAt,
      reversedAt: usage.reversedAt,
      reversalReason: usage.reversalReason,
      createdAt: usage.createdAt,
    };
  }
}
