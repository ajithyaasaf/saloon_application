import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceService } from '../services/invoice.service';
import { WebhookService } from '../services/webhook.service';

/**
 * PaymentPublicController — Unauthenticated endpoints for gateway provider options, public invoice verification, and webhook ingestion.
 *
 * Base Route: /api/v1/payments
 * Auth: Public (@Public()).
 * Architecture ref: Phase 14.0 & Phase 14.4
 */
@ApiTags('Payment (Public)')
@Controller('payments')
export class PaymentPublicController {
  constructor(
    private readonly invoiceService: InvoiceService,
    @Optional() private readonly webhookService?: WebhookService,
  ) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Get list of supported payment gateway providers' })
  @ApiResponse({ status: 200, description: 'Supported payment providers list' })
  public async getProviders() {
    const providers = Object.values(PaymentProvider);
    return ResponseBuilder.success({ providers });
  }

  @Public()
  @Get('methods')
  @ApiOperation({ summary: 'Get list of supported payment methods' })
  @ApiResponse({ status: 200, description: 'Supported payment methods list' })
  public async getMethods() {
    const methods = Object.values(PaymentMethod);
    return ResponseBuilder.success({ methods });
  }

  @Public()
  @Get('invoice/:invoiceNumber')
  @ApiOperation({ summary: 'Lookup public invoice by invoice number' })
  @ApiResponse({ status: 200, description: 'Public invoice details' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  public async getInvoiceByNumber(@Param('invoiceNumber') invoiceNumber: string) {
    const result = await this.invoiceService.downloadInvoice(invoiceNumber);
    return ResponseBuilder.success(result);
  }

  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and ingest payment gateway webhook payload' })
  @ApiResponse({ status: 200, description: 'Webhook ingested and queued for verification' })
  public async handleWebhook(
    @Param('provider') providerStr: string,
    @Headers('x-razorpay-signature') razorpaySig: string,
    @Headers('x-razorpay-event-id') razorpayEventId: string,
    @Body() payload: any,
  ) {
    if (!this.webhookService) {
      return ResponseBuilder.success({ received: true });
    }
    const provider = (providerStr.toUpperCase() as PaymentProvider) || PaymentProvider.RAZORPAY;
    const signature = razorpaySig || payload?.signature || '';
    const eventId = razorpayEventId || payload?.event_id || payload?.id;

    const log = await this.webhookService.receiveWebhook(
      provider,
      signature,
      payload,
      eventId,
    );
    return ResponseBuilder.success({ webhookLogId: log.id, received: true });
  }
}
