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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { PaymentDetailDto } from '../dto/payment-detail.dto';
import { PaymentDto } from '../dto/payment.dto';
import { PaymentSummaryDto } from '../dto/payment-summary.dto';
import { RefundDto } from '../dto/refund.dto';
import { SearchPaymentQueryDto } from '../dto/search-payment-query.dto';
import { InvoiceService } from '../services/invoice.service';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';

/**
 * PaymentCustomerController — Endpoints for B2C Customers to create, view, cancel payments and request refunds.
 *
 * Base Route: /api/v1/customer/payments
 * Auth: Requires JWT & CUSTOMER role.
 * Architecture ref: Phase 14.0 & Phase 14.4
 */
@ApiTags('Payment (Customer)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/payments')
export class PaymentCustomerController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new payment order' })
  @ApiResponse({ status: 201, description: 'Payment order created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid payment parameters' })
  @ApiConflictResponse({ description: 'Idempotency key collision' })
  public async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.createPayment({ ...dto, customerId: userId }, userId);
    const data = plainToInstance(PaymentDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.created(data, 'Payment created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get customer payment history' })
  @ApiResponse({ status: 200, description: 'Paginated customer payment list' })
  public async getMyPayments(
    @Query() query: SearchPaymentQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    const { data, meta } = await this.paymentService.searchPayments({ ...query, customerId: userId });
    const items = plainToInstance(PaymentSummaryDto, data, { excludeExtraneousValues: true });
    return ResponseBuilder.paginated(items, meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  public async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(id);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to view this payment');
    }
    const data = plainToInstance(PaymentDetailDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel pending payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiBadRequestResponse({ description: 'Payment cannot be cancelled' })
  public async cancelPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(id);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to cancel this payment');
    }
    const cancelled = await this.paymentService.cancelPayment(id, reason || 'Cancelled by customer', userId);
    const data = plainToInstance(PaymentDto, cancelled, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Payment cancelled successfully');
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed or expired payment' })
  @ApiResponse({ status: 200, description: 'Payment re-initiated successfully' })
  public async retryPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(id);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to retry this payment');
    }
    const data = plainToInstance(PaymentDto, payment, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data, 'Payment re-initiated successfully');
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download invoice PDF for payment' })
  @ApiResponse({ status: 200, description: 'Invoice storage link' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  public async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(id);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to access this invoice');
    }
    const result = await this.invoiceService.downloadInvoice(id);
    return ResponseBuilder.success(result);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Request refund for paid appointment' })
  @ApiResponse({ status: 201, description: 'Refund requested successfully' })
  @ApiBadRequestResponse({ description: 'Refund amount exceeds maximum allowed balance' })
  public async requestRefund(
    @Body() dto: CreateRefundDto,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(dto.paymentId);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to request a refund for this payment');
    }
    const refund = await this.refundService.createRefund(dto, userId);
    const data = plainToInstance(RefundDto, refund, { excludeExtraneousValues: true });
    return ResponseBuilder.created(data, 'Refund requested successfully');
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get customer refund history' })
  @ApiResponse({ status: 200, description: 'Customer refund history' })
  public async getRefunds(
    @Query('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const payment = await this.paymentService.getPayment(paymentId);
    if (payment.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to view refunds for this payment');
    }
    const refunds = await this.refundService.getRefundHistory(paymentId);
    const data = plainToInstance(RefundDto, refunds, { excludeExtraneousValues: true });
    return ResponseBuilder.success(data);
  }
}
