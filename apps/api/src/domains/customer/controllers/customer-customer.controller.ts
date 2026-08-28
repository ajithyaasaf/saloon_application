import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { UpdateCustomerPreferenceDto } from '../dto/customer-preference.dto';
import { CustomerProfileDto } from '../dto/customer-profile.dto';
import { CustomerPreferenceDto } from '../dto/customer-preference.dto';
import { CustomerWalletLedgerDto } from '../dto/customer-wallet.dto';
import { LoyaltyLedgerDto } from '../dto/customer-loyalty.dto';
import { CustomerMembershipDto } from '../dto/customer-membership.dto';
import { CustomerVisitHistoryDto } from '../dto/customer-visit-history.dto';
import { CustomerReferralDto } from '../dto/customer-referral.dto';
import { CustomerNoteDto } from '../dto/customer-note.dto';
import { CustomerLoyaltyService } from '../services/customer-loyalty.service';
import { CustomerPreferenceService } from '../services/customer-preference.service';
import { CustomerService } from '../services/customer.service';
import { CustomerVisitService } from '../services/customer-visit.service';
import { CustomerWalletService } from '../services/customer-wallet.service';
import { MembershipService } from '../services/membership.service';
import { ReferralService } from '../services/referral.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerMembershipRepository } from '../repositories/customer-membership.repository';
import { CustomerReferralRepository } from '../repositories/customer-referral.repository';
import { CustomerNoteRepository } from '../repositories/customer-note.repository';

@ApiTags('Customer (Customer Self-Service)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/customers')
export class CustomerCustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly preferenceService: CustomerPreferenceService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly walletService: CustomerWalletService,
    private readonly membershipService: MembershipService,
    private readonly visitService: CustomerVisitService,
    private readonly referralService: ReferralService,
    private readonly profileRepo: CustomerProfileRepository,
    private readonly membershipRepo: CustomerMembershipRepository,
    private readonly referralRepo: CustomerReferralRepository,
    private readonly noteRepo: CustomerNoteRepository,
  ) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current customer profile details' })
  @ApiResponse({ status: 200, description: 'Current customer profile returned' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized JWT token' })
  public async getProfile(@CurrentUser() user: any) {
    const customer = await this.customerService.getCustomer(user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, customer),
      'Customer profile retrieved',
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current customer overview (Alias)' })
  @ApiResponse({ status: 200, description: 'Customer profile overview' })
  public async getOverview(@CurrentUser() user: any) {
    return this.getProfile(user);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer preference and marketing consent' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  public async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateCustomerPreferenceDto,
    @Req() req: any,
  ) {
    const updated = await this.preferenceService.updatePreferences(
      user.id,
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
    return ResponseBuilder.success(
      plainToInstance(CustomerPreferenceDto, updated),
      'Customer preferences updated',
    );
  }

  @Get('wallet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer wallet balance and transaction ledger' })
  @ApiResponse({ status: 200, description: 'Wallet transaction ledger returned' })
  public async getWalletLedger(@CurrentUser() user: any) {
    const ledger = await this.walletService.getLedger(user.id);
    return ResponseBuilder.success(
      ledger.map((entry) => plainToInstance(CustomerWalletLedgerDto, entry)),
      'Wallet ledger retrieved',
    );
  }

  @Get('loyalty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer loyalty balance and points ledger' })
  @ApiResponse({ status: 200, description: 'Loyalty points ledger returned' })
  public async getLoyaltyLedger(@CurrentUser() user: any) {
    const ledger = await this.loyaltyService.getLedger(user.id);
    return ResponseBuilder.success(
      ledger.map((entry) => plainToInstance(LoyaltyLedgerDto, entry)),
      'Loyalty ledger retrieved',
    );
  }

  @Get('membership')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current active membership plan subscription' })
  @ApiResponse({ status: 200, description: 'Active membership details' })
  public async getMembership(@CurrentUser() user: any) {
    const active = await this.membershipRepo.findActiveMembership(user.id);
    return ResponseBuilder.success(
      active ? plainToInstance(CustomerMembershipDto, active) : null,
      'Active membership retrieved',
    );
  }

  @Get('visits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer appointment visit history' })
  @ApiResponse({ status: 200, description: 'Customer visit history returned' })
  public async getVisits(@CurrentUser() user: any) {
    const visits = await this.visitService.getVisitHistory(user.id);
    return ResponseBuilder.success(
      visits.map((v) => plainToInstance(CustomerVisitHistoryDto, v)),
      'Visit history retrieved',
    );
  }

  @Get('referrals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer referral program history' })
  @ApiResponse({ status: 200, description: 'Referral history returned' })
  public async getReferrals(@CurrentUser() user: any) {
    const referrals = await this.referralRepo.findByCustomer(user.id);
    return ResponseBuilder.success(
      referrals.map((r) => plainToInstance(CustomerReferralDto, r)),
      'Referral history retrieved',
    );
  }

  @Get('notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public notes attached to customer profile' })
  @ApiResponse({ status: 200, description: 'Customer notes returned' })
  public async getNotes(@CurrentUser() user: any) {
    const notes = await this.noteRepo.findByCustomer(user.id);
    const publicNotes = notes.filter((n) => !n.isPrivate);
    return ResponseBuilder.success(
      publicNotes.map((n) => plainToInstance(CustomerNoteDto, n)),
      'Customer notes retrieved',
    );
  }
}
