import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { SearchSalonQueryDto } from '../dto/search-salon-query.dto';
import { BranchService } from '../services/branch.service';
import { SalonService } from '../services/salon.service';

/**
 * SalonPublicController — Public endpoints for browsing, searching, and discovering Salons.
 *
 * Auth: Unauthenticated / Public access allowed (@Public()).
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
@ApiTags('Salons (Public)')
@Controller('salons')
export class SalonPublicController {
  constructor(
    private readonly salonService: SalonService,
    private readonly branchService: BranchService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search and list approved salons with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of approved salons' })
  public async searchSalons(@Query() query: SearchSalonQueryDto) {
    const result = await this.salonService.searchSalons(query);
    return ResponseBuilder.paginated(result.data, result.meta);
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby salon branches by geographical coordinates and radius' })
  @ApiResponse({ status: 200, description: 'List of nearby branches' })
  public async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radiusKm') radiusKm = 10,
    @Query('limit') limit = 20,
  ) {
    const branches = await this.branchService.findNearbyBranches(Number(lat), Number(lng), Number(radiusKm), Number(limit));
    return ResponseBuilder.success(branches);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get salon public profile by ID' })
  @ApiResponse({ status: 200, description: 'Salon profile details' })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  public async getSalonById(@Param('id') id: string) {
    const salon = await this.salonService.getSalonById(id);
    return ResponseBuilder.success(salon);
  }

  @Public()
  @Get(':id/branches')
  @ApiOperation({ summary: 'Get all branches for a specific salon' })
  @ApiResponse({ status: 200, description: 'List of branches for the salon' })
  public async getBranchesBySalonId(@Param('id') salonId: string) {
    const branches = await this.branchService.getBranchesBySalonId(salonId);
    return ResponseBuilder.success(branches);
  }

  @Public()
  @Get(':id/branches/:branchId')
  @ApiOperation({ summary: 'Get a specific branch for a salon' })
  @ApiResponse({ status: 200, description: 'Branch details' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  public async getBranchById(
    @Param('id') salonId: string,
    @Param('branchId') branchId: string,
  ) {
    const branch = await this.branchService.getBranchById(salonId, branchId);
    return ResponseBuilder.success(branch);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get salon public profile by unique URL slug' })
  @ApiResponse({ status: 200, description: 'Salon profile details' })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  public async getSalonBySlug(@Param('slug') slug: string) {
    const salon = await this.salonService.getSalonBySlug(slug);
    return ResponseBuilder.success(salon);
  }
}
