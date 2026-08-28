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
import { MarketingCampaignEntity } from '../entities/marketing-campaign.entity';
import { MarketingCampaignService } from '../services/marketing-campaign.service';
import {
  CancelCampaignRequestDto,
  CreateMarketingCampaignRequestDto,
  IncrementCampaignMetricsRequestDto,
  MarketingCampaignSearchRequestDto,
  ScheduleCampaignRequestDto,
  UpdateMarketingCampaignRequestDto,
} from './dto/marketing-campaign-request.dto';
import {
  CampaignMetricsResponseDto,
  MarketingCampaignResponseDto,
} from './dto/marketing-campaign-response.dto';

@ApiTags('Promotions (Salon Owner & Staff Campaigns)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
@Controller('owner/promotions/campaigns')
export class MarketingCampaignOwnerController {
  constructor(private readonly campaignService: MarketingCampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new marketing campaign' })
  @ApiResponse({ status: 201, description: 'Marketing campaign created' })
  public async createCampaign(
    @CurrentUser() user: any,
    @Body() dto: CreateMarketingCampaignRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const campaign = await this.campaignService.createCampaign(
      {
        ...dto,
        salonId,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toDto(campaign));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter marketing campaigns for salon' })
  @ApiResponse({ status: 200, description: 'Marketing campaigns returned' })
  public async searchCampaigns(
    @CurrentUser() user: any,
    @Query() query: MarketingCampaignSearchRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.campaignService.searchCampaigns({
      ...query,
      sortBy: query.sortBy as any,
      salonId,
    });

    const sanitizedData = res.data.map((c) => this.toDto(c));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get campaign details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign details returned' })
  public async getCampaignById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const salonId = this.extractSalonId(user);
    const campaign = await this.campaignService.getCampaignById(id, salonId);
    return ResponseBuilder.success(this.toDto(campaign));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update marketing campaign' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  public async updateCampaign(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketingCampaignRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.campaignService.updateCampaign(
      id,
      dto,
      salonId,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toDto(updated));
  }

  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule a campaign with active date window' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign scheduled' })
  public async scheduleCampaign(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleCampaignRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.campaignService.scheduleCampaign(
      id,
      dto.startAt,
      dto.endAt,
      salonId,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toDto(updated));
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a campaign immediately' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign started' })
  public async startCampaign(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.campaignService.startCampaign(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toDto(updated));
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a campaign' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign completed' })
  public async completeCampaign(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expectedVersion') expectedVersion?: number,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.campaignService.completeCampaign(
      id,
      salonId,
      expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toDto(updated));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a campaign' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  public async cancelCampaign(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCampaignRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    const updated = await this.campaignService.cancelCampaign(
      id,
      salonId,
      dto.reason,
      dto.expectedVersion,
      user.id,
    );
    return ResponseBuilder.success(this.toDto(updated));
  }

  @Post(':id/metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record metric interactions for campaign' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Metrics recorded' })
  public async recordMetrics(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IncrementCampaignMetricsRequestDto,
  ) {
    const salonId = this.extractSalonId(user);
    await this.campaignService.getCampaignById(id, salonId); // Verify salon ownership

    const updated = await this.campaignService.recordMetrics(
      id,
      {
        impressionsCount: dto.impressionsCount,
        clicksCount: dto.clicksCount,
        bookingsCount: dto.bookingsCount,
        revenueGenerated: dto.revenueGenerated,
      },
      dto.expectedVersion,
    );

    const metricsDto: CampaignMetricsResponseDto = {
      campaignId: updated.id,
      impressionsCount: updated.impressionsCount,
      clicksCount: updated.clicksCount,
      bookingsCount: updated.bookingsCount,
      revenueGenerated: updated.revenueGenerated,
      conversionRate:
        updated.clicksCount > 0 ? (updated.bookingsCount / updated.clicksCount) * 100 : 0,
    };

    return ResponseBuilder.success(metricsDto);
  }

  private extractSalonId(user: any): string {
    const salonId = user?.salonId;
    if (!salonId) {
      throw new ForbiddenException('Authenticated user is not associated with a salon.');
    }
    return salonId;
  }

  private toDto(campaign: MarketingCampaignEntity): MarketingCampaignResponseDto {
    return {
      id: campaign.id,
      campaignCode: campaign.campaignCode,
      salonId: campaign.salonId,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      couponId: campaign.couponId,
      targetAudienceSegment: campaign.targetAudienceSegment,
      channels: campaign.channels,
      budgetLimit: campaign.budgetLimit,
      actualSpend: campaign.actualSpend,
      status: campaign.status,
      scheduledStartAt: campaign.scheduledStartAt,
      scheduledEndAt: campaign.scheduledEndAt,
      impressionsCount: campaign.impressionsCount,
      clicksCount: campaign.clicksCount,
      bookingsCount: campaign.bookingsCount,
      revenueGenerated: campaign.revenueGenerated,
      version: campaign.version,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
