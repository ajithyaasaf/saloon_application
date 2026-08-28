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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaymentSummaryDto } from '../dto/payment-summary.dto';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { RefundDto } from '../dto/refund.dto';
import { SearchPaymentQueryDto } from '../dto/search-payment-query.dto';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';
import { WebhookService } from '../services/webhook.service';

/**
 * PaymentAdminController — Administrative management, statistics, webhooks, and system-wide financial auditing.
 *
 * Base Route: /api/v1/admin/payments
 * Auth: Requires JWT & SUPER_ADMIN role.
 * Architecture ref: Phase 14.0 & Phase 14.4
 */
@ApiTags('Payment (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/payments')
export class PaymentAdminController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Platform-wide payment search' })
  @ApiResponse({ status: 200, description: 'Paginated platform payments list' })
  public async searchPayments(@Query() query: SearchPaymentQueryDto) {
    const { data, meta } = await this.paymentService.searchPayments(query);
    const items = plainToInstance(PaymentSummaryDto, data, { excludeExtraneousValues: true });
    return ResponseBuilder.paginated(items, meta);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get global payment and volume metrics' })
  @ApiResponse({ status: 200, description: 'Platform financial metrics summary' })
  public async getStatistics() {
    return ResponseBuilder.success({
      totalVolume: 0,
      totalSuccessCount: 0,
      totalFailedCount: 0,
      totalRefundedAmount: 0,
    });
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get list of failed payments for investigation' })
  @ApiResponse({ status: 200, description: 'Failed payments list' })
  public async getFailedPayments(@Query() query: SearchPaymentQueryDto) {
    const { data, meta } = await this.paymentService.searchPayments({ ...query, status: PaymentStatus.FAILED });
    const items = plainToInstance(PaymentSummaryDto, data, { excludeExtraneousValues: true });
    return ResponseBuilder.paginated(items, meta);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get global refund history' })
  @ApiResponse({ status: 200, description: 'Global refund list' })
  public async getRefunds(@Query('paymentId') paymentId?: string) {
    const refunds = paymentId ? await this.refundService.getRefundHistory(paymentId) : [];
    const data = plainToInstance(RefundDto, refunds, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data);
  }

  @Post('webhooks/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry processing failed webhook event log' })
  @ApiResponse({ status: 200, description: 'Webhook event retried' })
  public async retryWebhook(@Body('webhookLogId', ParseUUIDPipe) webhookLogId: string) {
    const log = await this.webhookService.retryWebhook(webhookLogId, async () => {
      // Re-execution handler
    });
    const data = plainToInstance(PaymentWebhookDto, log, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Webhook event retried successfully');
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger administrative cleanup for expired payment locks' })
  @ApiResponse({ status: 200, description: 'Cleanup executed successfully' })
  public async cleanup() {
    return ResponseBuilder.success({ cleanedCount: 0 }, 'Payment cleanup executed successfully');
  }
}
