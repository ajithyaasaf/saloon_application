import {
  Body,
  Controller,
  Delete,
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
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BookingDetailDto } from '../dto/booking-detail.dto';
import { BookingSummaryDto } from '../dto/booking-summary.dto';
import { BookingDto } from '../dto/booking.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateReservationLockDto } from '../dto/create-reservation-lock.dto';
import { ReservationLockDto } from '../dto/reservation-lock.dto';
import { SearchBookingQueryDto } from '../dto/search-booking-query.dto';
import { BookingService } from '../services/booking.service';
import { ReservationService } from '../services/reservation.service';

/**
 * BookingCustomerController — Endpoints for B2C Customers to make, view, cancel bookings and manage slot locks.
 *
 * Auth: Requires JWT & CUSTOMER role.
 * Architecture ref: Phase 13.0 & Phase 13.4
 */
@ApiTags('Booking (Customer)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/bookings')
export class BookingCustomerController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly reservationService: ReservationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new appointment booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiConflictResponse({ description: 'Selected slot is unavailable or locked' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Requires CUSTOMER role' })
  public async createBooking(@Body() dto: CreateBookingDto, @CurrentUser('userId') userId: string) {
    const booking = await this.bookingService.createBooking({
      ...dto,
      customerId: userId,
      createdByUserId: userId,
    });
    return ResponseBuilder.created(plainToInstance(BookingDto, booking));
  }

  @Get()
  @ApiOperation({ summary: 'Get booking history for authenticated customer' })
  @ApiResponse({ status: 200, description: 'Paginated customer booking history', type: [BookingSummaryDto] })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  public async getCustomerBookings(
    @Query() query: SearchBookingQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.bookingService.searchBookings({
      ...query,
      customerId: userId,
    });
    return ResponseBuilder.paginated(plainToInstance(BookingSummaryDto, result.data), result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiResponse({ status: 200, description: 'Detailed booking breakdown', type: BookingDetailDto })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  public async getBookingById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const booking = await this.bookingService.getBooking(id);
    if (booking.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to view this booking');
    }
    return ResponseBuilder.success(plainToInstance(BookingDetailDto, booking));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully', type: BookingDto })
  @ApiBadRequestResponse({ description: 'Booking cannot be cancelled in current status' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  public async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('version') version: number,
    @CurrentUser('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.bookingService.getBooking(id);
    if (booking.customerId !== userId) {
      throw new ForbiddenOperationException('You are not authorized to cancel this booking');
    }
    const cancelled = await this.bookingService.cancelBooking(id, version, userId, reason);
    return ResponseBuilder.success(plainToInstance(BookingDto, cancelled));
  }

  @Throttle({ booking: { limit: 15, ttl: 60000 } })
  @Post('reservation')
  @ApiOperation({ summary: 'Acquire 10-minute temporary slot reservation lock' })
  @ApiResponse({ status: 201, description: 'Reservation lock acquired', type: ReservationLockDto })
  @ApiConflictResponse({ description: 'Slot is already locked by another checkout session' })
  public async acquireLock(@Body() dto: CreateReservationLockDto, @CurrentUser('userId') userId: string) {
    const lock = await this.reservationService.acquireLock({
      ...dto,
      customerId: userId,
    });
    return ResponseBuilder.created(plainToInstance(ReservationLockDto, lock));
  }

  @Delete('reservation/:lockKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Release temporary reservation lock' })
  @ApiResponse({ status: 204, description: 'Reservation lock released' })
  public async releaseLock(@Param('lockKey') lockKey: string) {
    await this.reservationService.releaseLock(lockKey);
    return ResponseBuilder.noContent();
  }
}
