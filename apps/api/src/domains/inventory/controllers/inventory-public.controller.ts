import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { ProductDto, ProductVariantDto } from '../dto/product.dto';
import { SearchProductQueryDto } from '../dto/search-inventory.dto';
import { ProductService } from '../services/product.service';

/**
 * InventoryPublicController — Public catalog endpoints for customers & guest browsing.
 * Exposes safe product catalog data, suppressing internal cost prices, supplier info, and stock counts.
 *
 * Architecture ref: Phase 16.0 & Phase 16.4
 */
@ApiTags('Inventory (Public)')
@Public()
@Controller('inventory')
export class InventoryPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get('products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and browse active public products (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated public product list returned' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  public async getPublicProducts(@Query() query: SearchProductQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.productService.searchProducts({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });

    const sanitizedData = result.data.map((p) => {
      const dto = plainToInstance(ProductDto, p);
      if (dto.variants) {
        dto.variants = dto.variants.map((v) => {
          const varDto = plainToInstance(ProductVariantDto, v);
          delete (varDto as any).costPrice;
          delete (varDto as any).professionalPrice;
          return varDto;
        });
      }
      return dto;
    });

    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(result.total, normParams),
      'Public product catalog retrieved successfully',
    );
  }

  @Get('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public product details by ID' })
  @ApiResponse({ status: 200, description: 'Public product details returned' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async getPublicProduct(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const product = await this.productService.getProduct(id, salonId);
    const dto = plainToInstance(ProductDto, product);
    if (dto.variants) {
      dto.variants = dto.variants.map((v) => {
        const varDto = plainToInstance(ProductVariantDto, v);
        delete (varDto as any).costPrice;
        delete (varDto as any).professionalPrice;
        return varDto;
      });
    }
    return ResponseBuilder.success(dto, 'Product details retrieved successfully');
  }

  @Get('products/:id/variants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public variants for a product' })
  @ApiResponse({ status: 200, description: 'Product variants returned' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async getPublicProductVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
  ) {
    const product = await this.productService.getProduct(id, salonId);
    const variants = (product.variants || []).map((v) => {
      const varDto = plainToInstance(ProductVariantDto, v);
      delete (varDto as any).costPrice;
      delete (varDto as any).professionalPrice;
      return varDto;
    });
    return ResponseBuilder.success(variants, 'Product variants retrieved successfully');
  }
}
