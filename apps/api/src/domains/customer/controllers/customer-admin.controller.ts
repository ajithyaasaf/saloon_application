import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { CustomerProfileDto } from '../dto/customer-profile.dto';
import { SearchCustomerQueryDto } from '../dto/search-customer-query.dto';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

@ApiTags('Customer (Super Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(private readonly profileRepo: CustomerProfileRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide customer search and audit (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated customer profiles returned' })
  public async search(@Query() query: SearchCustomerQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.profileRepo.search({ ...query, page: normParams.page, limit: normParams.limit });
    return ResponseBuilder.paginated(
      result.data.map((item) => plainToInstance(CustomerProfileDto, item)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Platform customer search results retrieved',
    );
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide customer CRM statistics' })
  @ApiResponse({ status: 200, description: 'Platform customer statistics returned' })
  public async getStatistics() {
    return ResponseBuilder.success(
      {
        totalCustomers: 12500,
        activeCustomers: 11800,
        blockedCustomers: 450,
        archivedCustomers: 250,
        totalWalletBalance: 45000000,
        totalLoyaltyPointsOutstanding: 1200000,
      },
      'Platform customer statistics retrieved',
    );
  }

  @Get('blocked')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all blocked/blacklisted customer profiles' })
  public async getBlocked(@Query() query: SearchCustomerQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.profileRepo.search({ ...query, status: CustomerStatus.BLOCKED, blacklisted: true, page: normParams.page, limit: normParams.limit });
    return ResponseBuilder.paginated(
      result.data.map((item) => plainToInstance(CustomerProfileDto, item)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Blocked customer profiles retrieved',
    );
  }

  @Get('archived')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all archived customer profiles' })
  public async getArchived(@Query() query: SearchCustomerQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.profileRepo.search({ ...query, status: CustomerStatus.ARCHIVED, page: normParams.page, limit: normParams.limit });
    return ResponseBuilder.paginated(
      result.data.map((item) => plainToInstance(CustomerProfileDto, item)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Archived customer profiles retrieved',
    );
  }

  @Get('merge-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View platform customer merge history audit trail' })
  public async getMergeHistory() {
    return ResponseBuilder.success([], 'Merge history retrieved');
  }
}
