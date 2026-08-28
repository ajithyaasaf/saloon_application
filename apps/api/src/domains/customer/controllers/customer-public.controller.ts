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
import { CustomerLoyaltyDto } from '../dto/customer-loyalty.dto';
import { CustomerProfileDto } from '../dto/customer-profile.dto';
import { MembershipPlanDto } from '../dto/membership-plan.dto';
import { SearchCustomerQueryDto } from '../dto/search-customer-query.dto';
import { CustomerLoyaltyService } from '../services/customer-loyalty.service';
import { CustomerService } from '../services/customer.service';
import { MembershipService } from '../services/membership.service';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';

@ApiTags('Customer (Public)')
@Public()
@Controller('customers')
export class CustomerPublicController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly membershipService: MembershipService,
    private readonly planRepo: MembershipPlanRepository,
  ) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search public customer profile summaries (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated customer summaries returned' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  public async search(@Query() query: SearchCustomerQueryDto) {
    const result = await this.customerService.searchCustomers(query);
    return ResponseBuilder.paginated(
      result.data.map((item) => plainToInstance(CustomerProfileDto, item)),
      result.meta,
      'Customer search results retrieved',
    );
  }

  @Get('membership-plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active membership plans for a salon' })
  @ApiResponse({ status: 200, description: 'Active membership plans returned' })
  public async getMembershipPlans(@Query('salonId') salonId: string) {
    const plans = await this.planRepo.findBySalon(salonId);
    return ResponseBuilder.success(
      plans.map((p) => plainToInstance(MembershipPlanDto, p)),
      'Membership plans retrieved',
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer profile detail by ID' })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  @ApiNotFoundResponse({ description: 'Customer profile not found' })
  public async getCustomer(@Param('id', ParseUUIDPipe) id: string) {
    const customer = await this.customerService.getCustomer(id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, customer),
      'Customer profile retrieved',
    );
  }

  @Get(':id/loyalty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer loyalty account overview' })
  @ApiResponse({ status: 200, description: 'Customer loyalty account details' })
  @ApiNotFoundResponse({ description: 'Customer loyalty account not found' })
  public async getLoyalty(@Param('id', ParseUUIDPipe) id: string) {
    const customer = await this.customerService.getCustomer(id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, customer),
      'Customer loyalty overview retrieved',
    );
  }
}
