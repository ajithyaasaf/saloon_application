import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { ReviewStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import {
  ResolveReviewDisputeRequestDto,
  ResolveReviewFlagRequestDto,
} from './dto/review-moderation.dto';
import {
  ReviewDisputeSearchRequestDto,
  ReviewFlagSearchRequestDto,
  ReviewInvitationSearchRequestDto,
  ReviewSearchRequestDto,
} from './dto/review-query.dto';
import { ReviewDisputeService } from '../services/review-dispute.service';
import { ReviewInvitationService } from '../services/review-invitation.service';
import { ReviewModerationService } from '../services/review-moderation.service';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews (Super Admin & Moderation)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/reviews')
export class ReviewAdminController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly moderationService: ReviewModerationService,
    private readonly disputeService: ReviewDisputeService,
    private readonly invitationService: ReviewInvitationService,
  ) {}

  @Get('moderation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and inspect reviews needing moderation' })
  public async getModerationReviews(@Query() query: ReviewSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search(query);
    return ResponseBuilder.paginated(
      res.data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Post('moderation/:id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide review from public catalog' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async hideReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    const hidden = await this.reviewService.hideReview(
      id,
      reason ?? 'Moderator suppressed review',
      user.id,
    );
    return ResponseBuilder.success(hidden);
  }

  @Post('moderation/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish or reinstate review to public catalog' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async publishReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const published = await this.reviewService.publishReview(id, user.id);
    return ResponseBuilder.success(published);
  }

  @Post('moderation/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject review permanently' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async rejectReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    const rejected = await this.reviewService.rejectReview(
      id,
      reason ?? 'Moderator rejected review',
      user.id,
    );
    return ResponseBuilder.success(rejected);
  }

  @Post('moderation/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async archiveReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const archived = await this.reviewService.archiveReview(id, user.id);
    return ResponseBuilder.success(archived);
  }

  @Get('flags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and search flagged review reports' })
  public async getFlags(@Query() query: ReviewFlagSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.moderationService.getPendingFlags(query);
    return ResponseBuilder.paginated(
      res.data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Post('flags/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve review flag report' })
  @ApiParam({ name: 'id', description: 'Flag UUID' })
  public async resolveFlag(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReviewFlagRequestDto,
  ) {
    const resolved = await this.moderationService.resolveFlag(
      id,
      dto.status,
      dto.resolutionNotes,
      user.id,
      dto.actionOnReview,
    );
    return ResponseBuilder.success(resolved);
  }

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and search all review disputes across the platform' })
  public async getDisputes(@Query() query: ReviewDisputeSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.disputeService.searchDisputes(query);
    return ResponseBuilder.paginated(
      res.data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Post('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arbitrate and resolve review dispute' })
  @ApiParam({ name: 'id', description: 'Dispute UUID' })
  public async resolveDispute(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReviewDisputeRequestDto,
  ) {
    const resolved = await this.disputeService.resolveDispute(
      id,
      dto.status,
      dto.adminDecisionNotes,
      user.id,
      dto.version,
    );
    return ResponseBuilder.success(resolved);
  }

  @Get('invitations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and audit review invitations platform-wide' })
  public async getInvitations(@Query() query: ReviewInvitationSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.invitationService.searchInvitations(query);
    return ResponseBuilder.paginated(
      res.data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }
}
