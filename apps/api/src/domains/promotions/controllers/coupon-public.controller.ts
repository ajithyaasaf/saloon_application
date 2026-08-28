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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CouponStatus } from '@prisma/client';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { CouponEntity } from '../entities/coupon.entity';
import { CouponService } from '../services/coupon.service';
import {
  CouponSearchRequestDto,
  CouponValidationRequestDto,
} from './dto/coupon-request.dto';
import { Public } from '../../../common/decorators/public.decorator';
import {
  CouponValidationResponseDto,
  PublicCouponResponseDto,
} from './dto/coupon-response.dto';

@ApiTags('Promotions (Public Coupons)')
@Public()
@Controller('promotions/coupons')
export class CouponPublicController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search publicly available coupons' })
  @ApiResponse({ status: 200, description: 'Active public coupons returned' })
  public async searchCoupons(@Query() query: CouponSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.couponService.searchCoupons({
      ...query,
      sortBy: query.sortBy as any,
      status: CouponStatus.ACTIVE,
    });

    const sanitizedData = res.data
      .filter((c) => c.isActive())
      .map((c) => this.toPublicDto(c));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get currently active coupons for a salon or global' })
  @ApiResponse({ status: 200, description: 'Active coupons list returned' })
  public async getActiveCoupons(@Query('salonId') salonId?: string) {
    const coupons = await this.couponService.findActiveBySalon(salonId);
    const sanitizedData = coupons.map((c) => this.toPublicDto(c));
    return ResponseBuilder.success(sanitizedData);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get coupon details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coupon details returned' })
  public async getCouponById(@Param('id', ParseUUIDPipe) id: string) {
    const coupon = await this.couponService.getCouponById(id);
    return ResponseBuilder.success(this.toPublicDto(coupon));
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code against cart/booking items' })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  public async validateCoupon(@Body() dto: CouponValidationRequestDto) {
    const result = await this.couponService.validateCouponForCheckout(dto.code, {
      salonId: dto.salonId,
      branchId: dto.branchId,
      customerId: 'anonymous',
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

  private toPublicDto(coupon: CouponEntity): PublicCouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minBookingAmount: coupon.minBookingAmount,
      minServicesCount: coupon.minServicesCount,
      isAutoApply: coupon.isAutoApply,
      isHappyHour: coupon.isHappyHour,
      validDaysOfWeek: coupon.validDaysOfWeek,
      validStartTime: coupon.validStartTime,
      validEndTime: coupon.validEndTime,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isGlobal: coupon.isGlobal(),
    };
  }
}
