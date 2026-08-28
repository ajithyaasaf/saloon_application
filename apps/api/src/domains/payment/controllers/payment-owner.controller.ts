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
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { InvoiceDto } from '../dto/invoice.dto';
import { PaymentDetailDto } from '../dto/payment-detail.dto';
import { PaymentDto } from '../dto/payment.dto';
import { PaymentSummaryDto } from '../dto/payment-summary.dto';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { RefundDto } from '../dto/refund.dto';
import { SearchPaymentQueryDto } from '../dto/search-payment-query.dto';
import { InvoiceService } from '../services/invoice.service';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';
import { WebhookService } from '../services/webhook.service';
import { SkipAllThrottlers } from '../../../common/throttler';

/**
 * PaymentOwnerController — B2B Salon Owner operations for managing branch payments, captures, refunds, and invoices.
 *
 * Base Route: /api/v1/owner/payments
 * Auth: Requires JWT & SALON_OWNER role.
 * Architecture ref: Phase 14.0 & Phase 14.4
 */
@ApiTags('Payment (Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/payments')
export class PaymentOwnerController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly invoiceService: InvoiceService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search payments for owned salon branches' })
  @ApiResponse({ status: 200, description: 'Paginated payments list' })
  public async searchPayments(@Query() query: SearchPaymentQueryDto) {
    const { data, meta } = await this.paymentService.searchPayments(query);
    const items = plainToInstance(PaymentSummaryDto, data, { excludeExtraneousValues: true });
    return ResponseBuilder.paginated(items, meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment detail' })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  public async getPayment(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.paymentService.getPayment(id);
    const data = plainToInstance(PaymentDetailDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data);
  }

  @Post(':id/authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authorize payment for hold/deposit' })
  @ApiResponse({ status: 200, description: 'Payment authorized' })
  public async authorizePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: number,
    @Body('providerTransactionId') providerTransactionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.authorizePayment(id, amount, providerTransactionId, userId);
    const data = plainToInstance(PaymentDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Payment authorized successfully');
  }

  @Post(':id/capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture payment (full or partial settlement)' })
  @ApiResponse({ status: 200, description: 'Payment captured' })
  public async capturePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: number,
    @Body('providerTransactionId') providerTransactionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.capturePayment(id, amount, providerTransactionId, userId);
    const data = plainToInstance(PaymentDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Payment captured successfully');
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Issue full or partial refund' })
  @ApiResponse({ status: 201, description: 'Refund issued successfully' })
  public async issueRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser('userId') userId: string,
  ) {
    const refund = await this.refundService.createRefund({ ...dto, paymentId: id }, userId);
    const data = plainToInstance(RefundDto, refund, { excludeExtraneousValues: true });
    return ResponseBuilder.created(data, 'Refund created successfully');
  }

  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually expire unpaid stale payment' })
  @ApiResponse({ status: 200, description: 'Payment marked expired' })
  public async expirePayment(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.paymentService.expirePayment(id);
    const data = plainToInstance(PaymentDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Payment marked as expired');
  }

  @Post('invoice/generate')
  @ApiOperation({ summary: 'Generate GST-compliant tax invoice' })
  @ApiResponse({ status: 201, description: 'Invoice generated' })
  public async generateInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser('userId') userId: string,
  ) {
    const invoice = await this.invoiceService.generateInvoice(dto, userId);
    const data = plainToInstance(InvoiceDto, invoice, { excludeExtraneousValues: true });
    return ResponseBuilder.created(data, 'Invoice generated successfully');
  }

  @Post('invoice/:id/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue generated invoice and generate PDF storage link' })
  @ApiResponse({ status: 200, description: 'Invoice issued' })
  public async issueInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('pdfStorageUrl') pdfStorageUrl: string,
    @CurrentUser('userId') userId: string,
  ) {
    const invoice = await this.invoiceService.issueInvoice(id, pdfStorageUrl, userId);
    const data = plainToInstance(InvoiceDto, invoice, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Invoice issued successfully');
  }

  @SkipAllThrottlers()
  @Post('webhook/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually process incoming gateway webhook payload' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  public async processWebhook(@Body('webhookLogId', ParseUUIDPipe) webhookLogId: string) {
    const log = await this.webhookService.processWebhook(webhookLogId, async () => {
      // Inversion handler
    });
    const data = plainToInstance(PaymentWebhookDto, log, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Webhook log processed');
  }
}
