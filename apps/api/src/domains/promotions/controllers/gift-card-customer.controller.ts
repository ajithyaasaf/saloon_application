import {
  Body,
  Controller,
  ForbiddenException,
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
import { GiftCardEntity, GiftCardTransactionEntity } from '../entities/gift-card.entity';
import { GiftCardTransactionService } from '../services/gift-card-transaction.service';
import { GiftCardService } from '../services/gift-card.service';
import {
  CustomerPurchaseGiftCardRequestDto,
  GiftCardSearchRequestDto,
  RedeemGiftCardRequestDto,
} from './dto/gift-card-request.dto';
import {
  CustomerGiftCardResponseDto,
  GiftCardBalanceResponseDto,
  GiftCardRedemptionResultDto,
  GiftCardTransactionResponseDto,
} from './dto/gift-card-response.dto';

@ApiTags('Promotions (Customer Gift Cards)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/promotions/gift-cards')
export class GiftCardCustomerController {
  constructor(
    private readonly giftCardService: GiftCardService,
    private readonly txService: GiftCardTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Purchase a new gift card for self or recipient' })
  @ApiResponse({ status: 201, description: 'Gift card purchased successfully' })
  public async purchaseGiftCard(
    @CurrentUser() user: any,
    @Body() dto: CustomerPurchaseGiftCardRequestDto,
  ) {
    const card = await this.giftCardService.issueGiftCard(
      {
        salonId: dto.salonId,
        purchasedByUserId: user.id,
        recipientName: dto.recipientName,
        recipientEmail: dto.recipientEmail,
        recipientPhone: dto.recipientPhone,
        personalMessage: dto.personalMessage,
        initialBalance: dto.initialBalance,
        currency: dto.currency,
        expiresAt: dto.expiresAt,
      },
      user.id,
    );

    return ResponseBuilder.success(this.toCustomerDto(card));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List gift cards purchased by or gifted to the customer' })
  @ApiResponse({ status: 200, description: 'Customer gift cards returned' })
  public async getMyGiftCards(
    @CurrentUser() user: any,
    @Query() query: GiftCardSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.giftCardService.searchGiftCards({
      ...query,
      sortBy: query.sortBy as any,
      purchasedByUserId: user.id, // Strictly scoped to authenticated customer
    });

    const sanitizedData = res.data.map((c) => this.toCustomerDto(c));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get gift card details (Masked secret)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gift card returned' })
  public async getGiftCardById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const card = await this.giftCardService.getGiftCardById(id);
    this.assertOwnership(card, user);
    return ResponseBuilder.success(this.toCustomerDto(card));
  }

  @Get(':id/balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check gift card balance' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gift card balance returned' })
  public async getGiftCardBalance(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const card = await this.giftCardService.getGiftCardById(id);
    this.assertOwnership(card, user);

    const balanceDto: GiftCardBalanceResponseDto = {
      giftCardId: card.id,
      maskedCode: this.maskCode(card.giftCardCode),
      currentBalance: card.currentBalance,
      initialBalance: card.initialBalance,
      currency: card.currency,
      status: card.status,
      expiresAt: card.expiresAt,
      isRedeemable: card.isRedeemable(),
    };

    return ResponseBuilder.success(balanceDto);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem gift card using code during checkout' })
  @ApiResponse({ status: 200, description: 'Redemption processed' })
  public async redeemGiftCard(
    @CurrentUser() user: any,
    @Body() dto: RedeemGiftCardRequestDto,
  ) {
    const result = await this.giftCardService.redeemGiftCard(
      {
        giftCardCode: dto.giftCardCode,
        salonId: dto.salonId,
        amount: dto.amount,
        bookingId: dto.bookingId,
        invoiceId: dto.invoiceId,
      },
      user.id,
    );

    const responseDto: GiftCardRedemptionResultDto = {
      giftCard: this.toCustomerDto(result.giftCard),
      amountRedeemed: result.amountRedeemed,
      remainingBalance: result.remainingBalance,
    };

    return ResponseBuilder.success(responseDto);
  }

  @Get(':id/transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transaction history for owned gift card' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  public async getTransactions(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const card = await this.giftCardService.getGiftCardById(id);
    this.assertOwnership(card, user);

    const txs = await this.txService.getTransactionsByGiftCard(id);
    const sanitized = txs.map((tx: GiftCardTransactionEntity) => this.toTransactionDto(tx));
    return ResponseBuilder.success(sanitized);
  }

  private assertOwnership(card: GiftCardEntity, user: any): void {
    const isPurchaser = card.purchasedByUserId === user.id;
    const isRecipientEmail =
      card.recipientEmail && card.recipientEmail.toLowerCase() === user.email?.toLowerCase();
    const isRecipientPhone = card.recipientPhone && card.recipientPhone === user.phone;

    if (!isPurchaser && !isRecipientEmail && !isRecipientPhone) {
      throw new ForbiddenException('You do not have permission to access this gift card.');
    }
  }

  private maskCode(code: string): string {
    if (code.length < 8) return '****';
    return `${code.slice(0, 5)}****${code.slice(-4)}`;
  }

  private toCustomerDto(card: GiftCardEntity): CustomerGiftCardResponseDto {
    return {
      id: card.id,
      maskedCode: this.maskCode(card.giftCardCode),
      salonId: card.salonId,
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      recipientPhone: card.recipientPhone,
      personalMessage: card.personalMessage,
      initialBalance: card.initialBalance,
      currentBalance: card.currentBalance,
      currency: card.currency,
      status: card.status,
      expiresAt: card.expiresAt,
      isExpired: card.isExpired(),
      isRedeemable: card.isRedeemable(),
      createdAt: card.createdAt,
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
}
