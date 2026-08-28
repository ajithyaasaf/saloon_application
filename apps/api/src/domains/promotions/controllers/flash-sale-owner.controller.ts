import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import { FlashSaleService } from '../services/flash-sale.service';
import {
  CancelFlashSaleRequestDto,
  CreateFlashSaleRequestDto,
  FlashSaleSearchRequestDto,
  UpdateFlashSaleRequestDto,
} from './dto/flash-sale-request.dto';
import { OwnerFlashSaleResponseDto } from './dto/flash-sale-response.dto';

@ApiTags('Promotions (Salon Owner & Staff Flash Sales)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
@Controller('owner/promotions/flash-sales')
export class FlashSaleOwnerController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a flash sale for a branch' })
  @ApiResponse({ status: 201, description: 'Flash sale created' })
  public async createFlashSale(
    @CurrentUser() user: any,
    @Body() dto: CreateFlashSaleRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const sale = await this.flashSaleService.createFlashSale(
      {
        ...dto,
        salonId,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(sale));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search flash sales for salon' })
  @ApiResponse({ status: 200, description: 'Flash sales returned' })
  public async searchFlashSales(
    @CurrentUser() user: any,
    @Query() query: FlashSaleSearchRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.flashSaleService.searchFlashSales({
      ...query,
      sortBy: query.sortBy as any,
      salonId,
    });

    const sanitizedData = res.data.map((s) => this.toOwnerDto(s));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get flash sale details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale details returned' })
  public async getFlashSaleById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const sale = await this.flashSaleService.getFlashSaleById(id, salonId);
    return ResponseBuilder.success(this.toOwnerDto(sale));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update flash sale parameters' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale updated' })
  public async updateFlashSale(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlashSaleRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.flashSaleService.updateFlashSale(
      id,
      dto,
      salonId,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate flash sale' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale activated' })
  public async activateFlashSale(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.flashSaleService.activateFlashSale(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an ongoing flash sale' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale ended' })
  public async endFlashSale(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.flashSaleService.endFlashSale(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel flash sale' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale cancelled' })
  public async cancelFlashSale(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFlashSaleRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.flashSaleService.cancelFlashSale(
      id,
      salonId,
      dto.reason,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toOwnerDto(updated));
  }

  private extractSalonId(user: any): string {
    const salonId = user?.salonId;
    if (!salonId) {
      throw new ForbiddenException('Authenticated user is not associated with a salon.');
    }
    return salonId;
  }

  private toOwnerDto(sale: FlashSaleEntity): OwnerFlashSaleResponseDto {
    return {
      id: sale.id,
      salonId: sale.salonId,
      branchId: sale.branchId,
      serviceId: sale.serviceId,
      title: sale.title,
      discountPercentage: sale.discountPercentage,
      specialPrice: sale.specialPrice,
      startTime: sale.startTime,
      endTime: sale.endTime,
      maxSlotQuota: sale.maxSlotQuota,
      bookedSlotCount: sale.bookedSlotCount,
      status: sale.status,
      version: sale.version,
      isAvailable: sale.isAvailable(),
      remainingSlots: sale.remainingSlots(),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }
}
