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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BookingDetailDto } from '../dto/booking-detail.dto';
import { BookingSummaryDto } from '../dto/booking-summary.dto';
import { BookingDto } from '../dto/booking.dto';
import { SearchBookingQueryDto } from '../dto/search-booking-query.dto';
import { BookingStatusService } from '../services/booking-status.service';
import { BookingService } from '../services/booking.service';

/**
 * BookingOwnerController — Endpoints for Salon Owners and Staff to manage salon branch bookings and status transitions.
 *
 * Auth: Requires valid JWT & SALON_OWNER role.
 * Architecture ref: Phase 13.0 & Phase 13.4
 */
@ApiTags('Booking (Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/bookings')
export class BookingOwnerController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingStatusService: BookingStatusService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter salon branch bookings' })
  @ApiResponse({ status: 200, description: 'Paginated booking list', type: [BookingSummaryDto] })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Requires SALON_OWNER role' })
  public async searchBookings(@Query() query: SearchBookingQueryDto) {
    const result = await this.bookingService.searchBookings(query);
    return ResponseBuilder.paginated(plainToInstance(BookingSummaryDto, result.data), result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed booking breakdown' })
  @ApiResponse({ status: 200, description: 'Booking detail object', type: BookingDetailDto })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  public async getBookingById(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingService.getBooking(id);
    return ResponseBuilder.success(plainToInstance(BookingDetailDto, booking));
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking after payment or manual verification' })
  @ApiResponse({ status: 200, description: 'Booking confirmed', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking is not in PENDING status' })
  public async confirmBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @Body('paymentId') paymentId?: string,
  ) {
    const booking = await this.bookingService.confirmBooking(id, version, paymentId);
    return ResponseBuilder.success(plainToInstance(BookingDto, booking));
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check in customer at branch arrival' })
  @ApiResponse({ status: 200, description: 'Customer checked in', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking status is not CONFIRMED' })
  public async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const booking = await this.bookingStatusService.checkIn(id, version, actorId, 'SALON_OWNER');
    return ResponseBuilder.success(plainToInstance(BookingDto, booking));
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Mark service execution in progress' })
  @ApiResponse({ status: 200, description: 'Service started', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking status is not CHECKED_IN' })
  public async startService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const booking = await this.bookingStatusService.startService(id, version, actorId, 'SALON_OWNER');
    return ResponseBuilder.success(plainToInstance(BookingDto, booking));
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark all services completed' })
  @ApiResponse({ status: 200, description: 'Booking completed', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking status is not IN_PROGRESS' })
  public async completeBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const booking = await this.bookingStatusService.completeBooking(id, version, actorId, 'SALON_OWNER');
    return ResponseBuilder.success(plainToInstance(BookingDto, booking));
  }

  @Post(':id/no-show')
  @ApiOperation({ summary: 'Mark customer as no-show' })
  @ApiResponse({ status: 200, description: 'Booking marked as no-show', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking status is not CONFIRMED or PENDING' })
  public async markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const booking = await this.bookingStatusService.markNoShow(id, version, actorId, 'SALON_OWNER', reason);
    return ResponseBuilder.success(plainToInstance(BookingDto, booking));
  }
}
