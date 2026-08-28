import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { CouponUsageEntity } from '../entities/coupon-usage.entity';
import { CouponEntity } from '../entities/coupon.entity';
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import { GiftCardEntity, GiftCardTransactionEntity } from '../entities/gift-card.entity';
import { MarketingCampaignEntity } from '../entities/marketing-campaign.entity';
import { CouponUsageService } from '../services/coupon-usage.service';
import { CouponService } from '../services/coupon.service';
import { FlashSaleService } from '../services/flash-sale.service';
import { GiftCardTransactionService } from '../services/gift-card-transaction.service';
import { GiftCardService } from '../services/gift-card.service';
import { MarketingCampaignService } from '../services/marketing-campaign.service';
import {
  CouponSearchRequestDto,
  CouponUsageSearchRequestDto,
} from './dto/coupon-request.dto';
import {
  CouponUsageResponseDto,
  OwnerCouponResponseDto,
} from './dto/coupon-response.dto';
import { FlashSaleSearchRequestDto } from './dto/flash-sale-request.dto';
import { OwnerFlashSaleResponseDto } from './dto/flash-sale-response.dto';
import {
  GiftCardSearchRequestDto,
  GiftCardTransactionSearchRequestDto,
} from './dto/gift-card-request.dto';
import {
  GiftCardTransactionResponseDto,
  OwnerGiftCardResponseDto,
} from './dto/gift-card-response.dto';
import { MarketingCampaignSearchRequestDto } from './dto/marketing-campaign-request.dto';
import { MarketingCampaignResponseDto } from './dto/marketing-campaign-response.dto';

@ApiTags('Promotions (Super Admin Platform Operations)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/promotions')
export class PromotionAdminController {
  constructor(
    private readonly couponService: CouponService,
    private readonly couponUsageService: CouponUsageService,
    private readonly giftCardService: GiftCardService,
    private readonly giftCardTxService: GiftCardTransactionService,
    private readonly flashSaleService: FlashSaleService,
    private readonly campaignService: MarketingCampaignService,
  ) {}

  @Get('coupons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide search and audit of coupons' })
  @ApiResponse({ status: 200, description: 'Coupons returned' })
  public async searchCoupons(@Query() query: CouponSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.couponService.searchCoupons({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((c) => this.toCouponDto(c));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('usages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide coupon usage audit' })
  @ApiResponse({ status: 200, description: 'Coupon usages returned' })
  public async searchUsages(@Query() query: CouponUsageSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.couponUsageService.searchUsages({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((u) => this.toUsageDto(u));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('gift-cards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide gift cards audit' })
  @ApiResponse({ status: 200, description: 'Gift cards returned' })
  public async searchGiftCards(@Query() query: GiftCardSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.giftCardService.searchGiftCards({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((g) => this.toGiftCardDto(g));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('gift-card-transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide gift card financial transactions audit' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  public async searchGiftCardTransactions(@Query() query: GiftCardTransactionSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.giftCardTxService.searchTransactions({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((t) => this.toTransactionDto(t));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('flash-sales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide flash sales audit' })
  @ApiResponse({ status: 200, description: 'Flash sales returned' })
  public async searchFlashSales(@Query() query: FlashSaleSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.flashSaleService.searchFlashSales({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((f) => this.toFlashSaleDto(f));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide marketing campaigns audit' })
  @ApiResponse({ status: 200, description: 'Campaigns returned' })
  public async searchCampaigns(@Query() query: MarketingCampaignSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.campaignService.searchCampaigns({
      ...query,
      sortBy: query.sortBy as any,
    });
    const sanitizedData = res.data.map((c) => this.toCampaignDto(c));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  private toCouponDto(coupon: CouponEntity): OwnerCouponResponseDto {
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

  private toGiftCardDto(card: GiftCardEntity): OwnerGiftCardResponseDto {
    return {
      id: card.id,
      giftCardCode: card.giftCardCode,
      maskedCode: `${card.giftCardCode.slice(0, 5)}****${card.giftCardCode.slice(-4)}`,
      salonId: card.salonId,
      purchasedByUserId: card.purchasedByUserId,
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      recipientPhone: card.recipientPhone,
      personalMessage: card.personalMessage,
      initialBalance: card.initialBalance,
      currentBalance: card.currentBalance,
      currency: card.currency,
      status: card.status,
      expiresAt: card.expiresAt,
      version: card.version,
      isExpired: card.isExpired(),
      isRedeemable: card.isRedeemable(),
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  private toTransactionDto(tx: GiftCardTransactionEntity): GiftCardTransactionResponseDto {
    return {
      id: tx.id,
      giftCardId: tx.giftCardId,
      bookingId: tx.bookingId,
      invoiceId: tx.invoiceId,
      transactionType: tx.transactionType,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      notes: tx.notes,
      createdAt: tx.createdAt,
    };
  }

  private toFlashSaleDto(sale: FlashSaleEntity): OwnerFlashSaleResponseDto {
    return {
      id: sale.id,
      salonId: sale.salonId,
      branchId: sale.branchId,
      serviceId: sale.serviceId,
      title: sale.title,
      discountPercentage: sale.discountPercentage,
      specialPrice: sale.specialPrice,
      startTime: sale.startTime,
      endTime: sale.endTime,
      maxSlotQuota: sale.maxSlotQuota,
      bookedSlotCount: sale.bookedSlotCount,
      status: sale.status,
      version: sale.version,
      isAvailable: sale.isAvailable(),
      remainingSlots: sale.remainingSlots(),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }

  private toCampaignDto(campaign: MarketingCampaignEntity): MarketingCampaignResponseDto {
    return {
      id: campaign.id,
      campaignCode: campaign.campaignCode,
      salonId: campaign.salonId,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      couponId: campaign.couponId,
      targetAudienceSegment: campaign.targetAudienceSegment,
      channels: campaign.channels,
      budgetLimit: campaign.budgetLimit,
      actualSpend: campaign.actualSpend,
      status: campaign.status,
      scheduledStartAt: campaign.scheduledStartAt,
      scheduledEndAt: campaign.scheduledEndAt,
      impressionsCount: campaign.impressionsCount,
      clicksCount: campaign.clicksCount,
      bookingsCount: campaign.bookingsCount,
      revenueGenerated: campaign.revenueGenerated,
      version: campaign.version,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
