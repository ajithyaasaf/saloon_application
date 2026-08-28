import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { CouponUsageService } from '../services/coupon-usage.service';
import { CouponService } from '../services/coupon.service';
import {
  ApplyCouponRequestDto,
  CouponUsageSearchRequestDto,
  CouponValidationRequestDto,
} from './dto/coupon-request.dto';
import {
  CouponUsageResponseDto,
  CouponValidationResponseDto,
  CustomerCouponResponseDto,
} from './dto/coupon-response.dto';

@ApiTags('Promotions (Customer Coupons)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/promotions/coupons')
export class CouponCustomerController {
  constructor(
    private readonly couponService: CouponService,
    private readonly couponUsageService: CouponUsageService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code for authenticated customer cart' })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  public async validateCoupon(
    @CurrentUser() user: any,
    @Body() dto: CouponValidationRequestDto,
  ) {
    const result = await this.couponService.validateCouponForCheckout(dto.code, {
      salonId: dto.salonId,
      branchId: dto.branchId,
      customerId: user.id,
      cartItems: dto.cartItems,
      checkDate: dto.checkDate ?? new Date(),
    });

    const responseDto: CouponValidationResponseDto = {
      isValid: result.isValid,
      reason: result.reason,
      discountAmount: result.discountAmount,
      qualifyingAmount: result.qualifyingAmount,
      eligibleItems: result.eligibleItems,
    };

    return ResponseBuilder.success(responseDto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply a valid coupon to booking/cart' })
  @ApiResponse({ status: 201, description: 'Coupon applied successfully' })
  public async applyCoupon(
    @CurrentUser() user: any,
    @Body() dto: ApplyCouponRequestDto,
  ) {
    // 1. Authoritative validation and calculation
    const coupon = await this.couponService.getCouponByCode(dto.code);

    const validation = await this.couponService.validateCouponForCheckout(dto.code, {
      salonId: coupon.salonId ?? undefined,
      branchId: dto.branchId,
      customerId: user.id,
      cartItems: dto.cartItems,
      checkDate: new Date(),
    });

    if (!validation.isValid) {
      throw new ForbiddenException(validation.reason ?? 'Coupon is not eligible for this cart.');
    }

    const bookingTotalBefore = dto.cartItems.reduce((acc, it) => acc + it.price, 0);
    const bookingTotalAfter = Math.max(0, bookingTotalBefore - validation.discountAmount);

    // 2. Atomic usage creation and quota reservation
    const usage = await this.couponUsageService.applyCoupon(
      {
        couponId: coupon.id,
        salonId: coupon.salonId ?? 'GLOBAL',
        branchId: dto.branchId,
        customerId: user.id,
        bookingId: dto.bookingId,
        appointmentId: dto.appointmentId,
        discountAmount: validation.discountAmount,
        bookingTotalBeforeDiscount: bookingTotalBefore,
        bookingTotalAfterDiscount: bookingTotalAfter,
      },
      user.id,
    );

    return ResponseBuilder.success(this.toUsageDto(usage));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List applicable active coupons for customer' })
  @ApiResponse({ status: 200, description: 'Applicable coupons returned' })
  public async getApplicableCoupons(
    @CurrentUser() user: any,
    @Query('salonId') salonId?: string,
  ) {
    const coupons = await this.couponService.findActiveBySalon(salonId);
    const sanitized = coupons
      .filter((c) => c.isActive())
      .map((c) => this.toCustomerDto(c));

    return ResponseBuilder.success(sanitized);
  }

  @Get('usages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer own coupon redemptions' })
  @ApiResponse({ status: 200, description: 'Coupon redemptions returned' })
  public async getMyCouponUsages(
    @CurrentUser() user: any,
    @Query() query: CouponUsageSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.couponUsageService.searchUsages({
      ...query,
      sortBy: query.sortBy as any,
      customerId: user.id, // Enforce tenant/customer isolation
    });

    const sanitizedData = res.data.map((u) => this.toUsageDto(u));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  private toCustomerDto(coupon: CouponEntity): CustomerCouponResponseDto {
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
      perCustomerLimit: coupon.perCustomerLimit,
      isAutoApply: coupon.isAutoApply,
      isCombinableWithOtherOffers: coupon.isCombinableWithOtherOffers,
      isHappyHour: coupon.isHappyHour,
      validDaysOfWeek: coupon.validDaysOfWeek,
      validStartTime: coupon.validStartTime,
      validEndTime: coupon.validEndTime,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isGlobal: coupon.isGlobal(),
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
