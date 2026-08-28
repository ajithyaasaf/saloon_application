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
  CancelGiftCardRequestDto,
  CreateGiftCardRequestDto,
  GiftCardSearchRequestDto,
  GiftCardTransactionSearchRequestDto,
  RefundCreditGiftCardRequestDto,
} from './dto/gift-card-request.dto';
import {
  GiftCardBalanceResponseDto,
  GiftCardTransactionResponseDto,
  OwnerGiftCardResponseDto,
} from './dto/gift-card-response.dto';

@ApiTags('Promotions (Salon Owner & Staff Gift Cards)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
@Controller('owner/promotions/gift-cards')
export class GiftCardOwnerController {
  constructor(
    private readonly giftCardService: GiftCardService,
    private readonly txService: GiftCardTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a new gift card directly in salon' })
  @ApiResponse({ status: 201, description: 'Gift card issued successfully' })
  public async issueGiftCard(
    @CurrentUser() user: any,
    @Body() dto: CreateGiftCardRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.issueGiftCard(
      {
        ...dto,
        salonId,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(card));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter gift cards for salon' })
  @ApiResponse({ status: 200, description: 'Gift cards returned' })
  public async searchGiftCards(
    @CurrentUser() user: any,
    @Query() query: GiftCardSearchRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.giftCardService.searchGiftCards({
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
  @ApiOperation({ summary: 'Get gift card details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gift card returned' })
  public async getGiftCardById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.getGiftCardById(id, salonId);
    return ResponseBuilder.success(this.toOwnerDto(card));
  }

  @Get(':id/balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get gift card balance & ledger reconciliation' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Balance returned' })
  public async getGiftCardBalance(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.getGiftCardById(id, salonId);
    const ledgerBalance = await this.txService.getLedgerBalance(id);

    return ResponseBuilder.success({
      giftCardId: card.id,
      giftCardCode: card.giftCardCode,
      currentBalance: card.currentBalance,
      initialBalance: card.initialBalance,
      currency: card.currency,
      status: card.status,
      isRedeemable: card.isRedeemable(),
      ledgerReconciliation: {
        giftCardId: card.id,
        initialBalance: card.initialBalance,
        currentBalance: card.currentBalance,
        calculatedLedgerBalance: ledgerBalance,
        isReconciled: card.currentBalance === ledgerBalance,
      },
    });
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze a gift card temporarily' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gift card frozen' })
  public async freezeGiftCard(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.freezeGiftCard(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(card));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel/void a gift card permanently' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gift card cancelled' })
  public async cancelGiftCard(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelGiftCardRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.cancelGiftCard(
      id,
      salonId,
      dto.reason,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(card));
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process refund credit onto gift card' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Refund credited' })
  public async refundCredit(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundCreditGiftCardRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const card = await this.giftCardService.refundCredit(
      {
        giftCardId: id,
        salonId,
        amount: dto.amount,
        bookingId: dto.bookingId,
        invoiceId: dto.invoiceId,
        notes: dto.notes,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(card));
  }

  @Get(':id/transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full audit ledger transactions for gift card' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  public async getTransactions(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    await this.giftCardService.getGiftCardById(id, salonId); // Authoritative tenant check

    const txs = await this.txService.getTransactionsByGiftCard(id);
    const sanitized = txs.map((tx: GiftCardTransactionEntity) => this.toTransactionDto(tx));
    return ResponseBuilder.success(sanitized);
  }

  private extractSalonId(user: any): string {
    const salonId = user?.salonId;
    if (!salonId) {
      throw new ForbiddenException('Authenticated user is not associated with a salon.');
    }
    return salonId;
  }

  private toOwnerDto(card: GiftCardEntity): OwnerGiftCardResponseDto {
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
}
