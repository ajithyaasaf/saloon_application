import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlacklistType, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';

import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from '../dto/customer-profile.dto';
import { UpdateCustomerPreferenceDto, CustomerPreferenceDto } from '../dto/customer-preference.dto';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto, CustomerNoteDto } from '../dto/customer-note.dto';
import { CreateCustomerTagDto, UpdateCustomerTagDto, AssignCustomerTagDto, CustomerTagDto } from '../dto/customer-tag.dto';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto, MembershipPlanDto } from '../dto/membership-plan.dto';
import { CreateCustomerMembershipDto, UpdateCustomerMembershipDto, CustomerMembershipDto } from '../dto/customer-membership.dto';
import { CustomerLoyaltyDto, LoyaltyLedgerDto } from '../dto/customer-loyalty.dto';
import { CustomerWalletLedgerDto } from '../dto/customer-wallet.dto';
import { CreateReferralDto, CustomerReferralDto } from '../dto/customer-referral.dto';
import { CustomerProfileDto } from '../dto/customer-profile.dto';
import { SearchCustomerQueryDto } from '../dto/search-customer-query.dto';
import { CustomerMergeHistoryDto } from '../dto/customer-merge-history.dto';

import { CustomerService } from '../services/customer.service';
import { CustomerPreferenceService } from '../services/customer-preference.service';
import { CustomerTagService } from '../services/customer-tag.service';
import { CustomerLoyaltyService } from '../services/customer-loyalty.service';
import { MembershipService } from '../services/membership.service';
import { CustomerWalletService } from '../services/customer-wallet.service';
import { ReferralService } from '../services/referral.service';
import { CustomerMergeService } from '../services/customer-merge.service';

import { CustomerNoteRepository } from '../repositories/customer-note.repository';
import { CustomerTagRepository } from '../repositories/customer-tag.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';

@ApiTags('Customer (Salon Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/customers')
export class CustomerOwnerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly preferenceService: CustomerPreferenceService,
    private readonly tagService: CustomerTagService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly membershipService: MembershipService,
    private readonly walletService: CustomerWalletService,
    private readonly referralService: ReferralService,
    private readonly mergeService: CustomerMergeService,
    private readonly noteRepo: CustomerNoteRepository,
    private readonly tagRepo: CustomerTagRepository,
    private readonly planRepo: MembershipPlanRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new customer profile' })
  @ApiResponse({ status: 201, description: 'Customer profile created successfully' })
  @ApiConflictResponse({ description: 'Customer profile already exists with phone or email' })
  public async createCustomer(@Body() dto: CreateCustomerProfileDto, @CurrentUser() user: any) {
    const created = await this.customerService.createCustomer(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(CustomerProfileDto, created),
      'Customer profile created',
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter salon customer profiles (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated customer profiles list' })
  public async search(@Query() query: SearchCustomerQueryDto) {
    const result = await this.customerService.searchCustomers(query);
    return ResponseBuilder.paginated(
      result.data.map((item) => plainToInstance(CustomerProfileDto, item)),
      result.meta,
      'Customer profiles retrieved',
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full customer profile by ID' })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  @ApiNotFoundResponse({ description: 'Customer profile not found' })
  public async getCustomer(@Param('id', ParseUUIDPipe) id: string) {
    const customer = await this.customerService.getCustomer(id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, customer),
      'Customer profile retrieved',
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer profile details' })
  @ApiResponse({ status: 200, description: 'Customer profile updated' })
  public async updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.customerService.updateCustomer(id, dto, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, updated),
      'Customer profile updated',
    );
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block customer profile and add to blacklist' })
  @ApiResponse({ status: 200, description: 'Customer profile blocked' })
  public async blockCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('blacklistType') blacklistType: BlacklistType,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const blocked = await this.customerService.blockCustomer(id, blacklistType, reason, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, blocked),
      'Customer profile blocked',
    );
  }

  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile unblocked' })
  public async unblockCustomer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const unblocked = await this.customerService.unblockCustomer(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, unblocked),
      'Customer profile unblocked',
    );
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile archived' })
  public async archiveCustomer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const archived = await this.customerService.archiveCustomer(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, archived),
      'Customer profile archived',
    );
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile restored' })
  public async restoreCustomer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const restored = await this.customerService.restoreCustomer(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerProfileDto, restored),
      'Customer profile restored',
    );
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer preference & consent on behalf of customer' })
  public async updatePreferences(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body() dto: UpdateCustomerPreferenceDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const updated = await this.preferenceService.updatePreferences(
      customerProfileId,
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

  // ─── Customer Notes ────────────────────────────────────────────────────────
  @Post('notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a internal note to customer profile' })
  public async createNote(@Body() dto: CreateCustomerNoteDto, @CurrentUser() user: any) {
    const created = await this.noteRepo.create(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(CustomerNoteDto, created),
      'Customer note created',
    );
  }

  @Patch('notes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer note' })
  public async updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerNoteDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.noteRepo.update(id, dto, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerNoteDto, updated),
      'Customer note updated',
    );
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer note' })
  public async deleteNote(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.noteRepo.softDelete(id, user.id);
    return ResponseBuilder.noContent('Customer note deleted');
  }

  // ─── Tags ──────────────────────────────────────────────────────────────────
  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create salon customer tag' })
  public async createTag(@Body() dto: CreateCustomerTagDto, @CurrentUser() user: any) {
    const created = await this.tagService.createTag(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(CustomerTagDto, created),
      'Customer tag created',
    );
  }

  @Patch('tags/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer tag' })
  public async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerTagDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.tagService.updateTag(id, dto, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerTagDto, updated),
      'Customer tag updated',
    );
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer tag' })
  public async deleteTag(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.tagRepo.softDelete(id, user.id);
    return ResponseBuilder.noContent('Customer tag deleted');
  }

  @Post('assign-tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign tag to customer' })
  public async assignTag(@Body() dto: AssignCustomerTagDto, @CurrentUser() user: any) {
    await this.tagService.assignTag(dto.customerProfileId, dto.tagId, user.id);
    return ResponseBuilder.message('Tag assigned to customer successfully');
  }

  @Delete('assign-tag/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove tag assignment from customer' })
  public async removeTag(
    @Param('id', ParseUUIDPipe) tagId: string,
    @Query('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @CurrentUser() user: any,
  ) {
    await this.tagService.removeTag(customerProfileId, tagId, user.id);
    return ResponseBuilder.message('Tag removed from customer successfully');
  }

  // ─── Membership Plans & Memberships ────────────────────────────────────────
  @Post('membership-plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create membership plan' })
  public async createPlan(@Body() dto: CreateMembershipPlanDto, @CurrentUser() user: any) {
    const created = await this.membershipService.createPlan(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(MembershipPlanDto, created),
      'Membership plan created',
    );
  }

  @Patch('membership-plans/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update membership plan' })
  public async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.membershipService.updatePlan(id, dto, user.id);
    return ResponseBuilder.success(
      plainToInstance(MembershipPlanDto, updated),
      'Membership plan updated',
    );
  }

  @Delete('membership-plans/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete membership plan' })
  public async deletePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.planRepo.softDelete(id, user.id);
    return ResponseBuilder.noContent('Membership plan deleted');
  }

  @Post('memberships')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign membership to customer' })
  public async assignMembership(@Body() dto: CreateCustomerMembershipDto, @CurrentUser() user: any) {
    const assigned = await this.membershipService.assignMembership(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(CustomerMembershipDto, assigned),
      'Membership assigned to customer',
    );
  }

  @Post('memberships/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause customer membership' })
  public async pauseMembership(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const paused = await this.membershipService.pauseMembership(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerMembershipDto, paused),
      'Membership paused',
    );
  }

  @Post('memberships/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused customer membership' })
  public async resumeMembership(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const resumed = await this.membershipService.resumeMembership(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerMembershipDto, resumed),
      'Membership resumed',
    );
  }

  @Post('memberships/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel customer membership' })
  public async cancelMembership(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const cancelled = await this.membershipService.cancelMembership(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerMembershipDto, cancelled),
      'Membership cancelled',
    );
  }

  @Post('memberships/:id/expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expire customer membership' })
  public async expireMembership(@Param('id', ParseUUIDPipe) id: string) {
    const expired = await this.membershipService.expireMembership(id);
    return ResponseBuilder.success(
      plainToInstance(CustomerMembershipDto, expired),
      'Membership expired',
    );
  }

  // ─── Loyalty & Wallet Operations ───────────────────────────────────────────
  @Post('loyalty/earn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Award loyalty points to customer' })
  public async earnPoints(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('points') points: number,
    @Body('referenceType') referenceType?: string,
    @Body('referenceId') referenceId?: string,
    @CurrentUser() user?: any,
  ) {
    const updated = await this.loyaltyService.earnPoints(customerProfileId, points, referenceType, referenceId, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerLoyaltyDto, updated),
      'Loyalty points awarded',
    );
  }

  @Post('loyalty/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem loyalty points for customer' })
  public async redeemPoints(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('points') points: number,
    @Body('referenceType') referenceType?: string,
    @Body('referenceId') referenceId?: string,
    @CurrentUser() user?: any,
  ) {
    const updated = await this.loyaltyService.redeemPoints(customerProfileId, points, referenceType, referenceId, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerLoyaltyDto, updated),
      'Loyalty points redeemed',
    );
  }

  @Post('wallet/credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit customer wallet balance' })
  public async creditWallet(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('amount') amount: number,
    @Body('description') description?: string,
    @CurrentUser() user?: any,
  ) {
    const ledger = await this.walletService.credit(customerProfileId, amount, 'OWNER_CREDIT', undefined, description, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerWalletLedgerDto, ledger),
      'Wallet credited successfully',
    );
  }

  @Post('wallet/debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debit customer wallet balance' })
  public async debitWallet(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('amount') amount: number,
    @Body('description') description?: string,
    @CurrentUser() user?: any,
  ) {
    const ledger = await this.walletService.debit(customerProfileId, amount, 'OWNER_DEBIT', undefined, description, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerWalletLedgerDto, ledger),
      'Wallet debited successfully',
    );
  }

  @Post('wallet/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund amount to customer wallet' })
  public async refundWallet(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('amount') amount: number,
    @Body('referenceId') referenceId: string,
    @CurrentUser() user?: any,
  ) {
    const ledger = await this.walletService.refund(customerProfileId, amount, referenceId, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerWalletLedgerDto, ledger),
      'Wallet refunded successfully',
    );
  }

  @Post('wallet/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust customer wallet balance' })
  public async adjustWallet(
    @Body('customerProfileId', ParseUUIDPipe) customerProfileId: string,
    @Body('amountDelta') amountDelta: number,
    @Body('description') description: string,
    @CurrentUser() user?: any,
  ) {
    const ledger = await this.walletService.adjust(customerProfileId, amountDelta, description, user?.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerWalletLedgerDto, ledger),
      'Wallet adjusted successfully',
    );
  }

  // ─── Referrals & Merge ─────────────────────────────────────────────────────
  @Post('referrals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create manual customer referral' })
  public async createReferral(@Body() dto: CreateReferralDto, @CurrentUser() user: any) {
    const created = await this.referralService.createReferral(dto, user.id);
    return ResponseBuilder.created(
      plainToInstance(CustomerReferralDto, created),
      'Customer referral created',
    );
  }

  @Post('referrals/:id/reward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process referral reward claim' })
  public async rewardReferral(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const rewarded = await this.referralService.rewardReferral(id, user.id);
    return ResponseBuilder.success(
      plainToInstance(CustomerReferralDto, rewarded),
      'Referral reward processed',
    );
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge two customer profiles into one target profile' })
  public async mergeCustomers(
    @Body('sourceCustomerProfileId', ParseUUIDPipe) sourceCustomerProfileId: string,
    @Body('targetCustomerProfileId', ParseUUIDPipe) targetCustomerProfileId: string,
    @Body('mergeReason') mergeReason: string,
    @CurrentUser() user: any,
  ) {
    const record = await this.mergeService.mergeCustomers(
      sourceCustomerProfileId,
      targetCustomerProfileId,
      mergeReason,
      user.id,
    );
    return ResponseBuilder.success(
      plainToInstance(CustomerMergeHistoryDto, record),
      'Customer profiles merged successfully',
    );
  }
}
