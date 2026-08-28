import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { AvailabilityService } from '../services/availability.service';

/**
 * BookingPublicController — Unauthenticated endpoints for slot discovery and branch service/staff availability.
 *
 * Auth: Public (@Public()).
 * Architecture ref: Phase 13.0 & Phase 13.4
 */
@ApiTags('Booking (Public)')
@Controller('bookings')
export class BookingPublicController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Check if slot is available for branch and services' })
  @ApiResponse({ status: 200, description: 'Availability check result' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  public async checkAvailability(
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Query('date') date: string,
    @Query('serviceIds') serviceIds: string,
    @Query('staffId') staffId?: string,
  ) {
    const ids = serviceIds ? serviceIds.split(',').map((s) => s.trim()) : [];
    const isAvailable = await this.availabilityService.checkAvailability(
      branchId,
      new Date(date),
      ids,
      staffId,
    );
    return ResponseBuilder.success({ isAvailable });
  }

  @Public()
  @Get('slots')
  @ApiOperation({ summary: 'Find available booking time slots for branch and services' })
  @ApiResponse({ status: 200, description: 'Available slot list' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  public async findAvailableSlots(
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Query('date') date: string,
    @Query('serviceIds') serviceIds: string,
    @Query('staffId') staffId?: string,
  ) {
    const ids = serviceIds ? serviceIds.split(',').map((s) => s.trim()) : [];
    const slots = await this.availabilityService.findAvailableSlots(
      branchId,
      new Date(date),
      ids,
      staffId,
    );
    return ResponseBuilder.success(slots);
  }

  @Public()
  @Get('branches/:branchId/staff')
  @ApiOperation({ summary: 'List available staff members for slot time window' })
  @ApiResponse({ status: 200, description: 'List of available staff members' })
  @ApiBadRequestResponse({ description: 'Invalid UUID or date parameters' })
  public async getAvailableStaff(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('serviceId') serviceId?: string,
  ) {
    const staff = await this.availabilityService.findAvailableStaff(
      branchId,
      new Date(date),
      new Date(startTime),
      new Date(endTime),
      serviceId,
    );
    return ResponseBuilder.success(staff);
  }
}
