import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FlashSaleStatus } from '@prisma/client';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import { FlashSaleService } from '../services/flash-sale.service';
import { Public } from '../../../common/decorators/public.decorator';
import { FlashSaleSearchRequestDto } from './dto/flash-sale-request.dto';
import { PublicFlashSaleResponseDto } from './dto/flash-sale-response.dto';

@ApiTags('Promotions (Public Flash Sales)')
@Public()
@Controller('promotions/flash-sales')
export class FlashSalePublicController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search publicly active flash sales' })
  @ApiResponse({ status: 200, description: 'Flash sales returned' })
  public async searchFlashSales(@Query() query: FlashSaleSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.flashSaleService.searchFlashSales({
      ...query,
      sortBy: query.sortBy as any,
      status: FlashSaleStatus.ACTIVE,
    });

    const sanitizedData = res.data
      .filter((s) => s.isAvailable())
      .map((s) => this.toPublicDto(s));

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get currently active flash sales for a branch' })
  @ApiResponse({ status: 200, description: 'Active flash sales list returned' })
  public async getActiveFlashSales(@Query('branchId') branchId?: string) {
    const sales = await this.flashSaleService.getCurrentlyActiveFlashSales(branchId);
    const sanitizedData = sales
      .filter((s) => s.isAvailable())
      .map((s) => this.toPublicDto(s));

    return ResponseBuilder.success(sanitizedData);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get flash sale details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Flash sale details returned' })
  public async getFlashSaleById(@Param('id', ParseUUIDPipe) id: string) {
    const sale = await this.flashSaleService.getFlashSaleById(id);
    return ResponseBuilder.success(this.toPublicDto(sale));
  }

  private toPublicDto(sale: FlashSaleEntity): PublicFlashSaleResponseDto {
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
      isAvailable: sale.isAvailable(),
      remainingSlots: sale.remainingSlots(),
    };
  }
}
