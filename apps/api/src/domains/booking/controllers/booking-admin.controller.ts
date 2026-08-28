import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { BookingSummaryDto } from '../dto/booking-summary.dto';
import { SearchBookingQueryDto } from '../dto/search-booking-query.dto';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingService } from '../services/booking.service';
import { ReservationService } from '../services/reservation.service';

/**
 * BookingAdminController — System administration endpoints for global booking operations and lock maintenance.
 *
 * Auth: Requires valid JWT & SUPER_ADMIN role.
 * Architecture ref: Phase 13.0 & Phase 13.4
 */
@ApiTags('Booking (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/bookings')
export class BookingAdminController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingRepository: BookingRepository,
    private readonly reservationService: ReservationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global cross-salon booking search' })
  @ApiResponse({ status: 200, description: 'Paginated global booking list', type: [BookingSummaryDto] })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Requires SUPER_ADMIN role' })
  public async globalSearch(@Query() query: SearchBookingQueryDto) {
    const result = await this.bookingService.searchBookings(query);
    return ResponseBuilder.paginated(plainToInstance(BookingSummaryDto, result.data), result.meta);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get booking counts and summary metrics' })
  @ApiResponse({ status: 200, description: 'Booking metrics' })
  public async getStatistics(
    @Query('salonId') salonId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const total = await this.bookingRepository.count({
      ...(salonId ? { salonId } : {}),
      ...(branchId ? { branchId } : {}),
    });
    return ResponseBuilder.success({ totalBookings: total });
  }

  @Post('cleanup-expired-locks')
  @ApiOperation({ summary: 'Trigger manual background cleanup of expired reservation locks' })
  @ApiResponse({ status: 200, description: 'Cleanup execution count' })
  public async cleanupExpiredLocks() {
    const count = await this.reservationService.cleanupExpiredLocks();
    return ResponseBuilder.success({ cleanedCount: count });
  }
}
