import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import {
  CreateReviewDisputeRequestDto,
} from './dto/review-moderation.dto';
import { CreateReviewInvitationRequestDto } from './dto/review-invitation.dto';
import {
  ReviewDisputeSearchRequestDto,
  ReviewInvitationSearchRequestDto,
  ReviewSearchRequestDto,
} from './dto/review-query.dto';
import {
  CreateReviewReplyRequestDto,
  UpdateReviewReplyRequestDto,
} from './dto/review-reply.dto';
import {
  OwnerReviewResponseDto,
  RatingSummaryResponseDto,
  ReviewInvitationResponseDto,
} from './dto/review-response.dto';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';
import { ReviewDisputeService } from '../services/review-dispute.service';
import { ReviewInvitationService } from '../services/review-invitation.service';
import { ReviewReplyService } from '../services/review-reply.service';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews (Salon Owner & Staff)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
@Controller('owner/reviews')
export class ReviewOwnerController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly replyService: ReviewReplyService,
    private readonly disputeService: ReviewDisputeService,
    private readonly salonRatingService: SalonRatingService,
    private readonly branchRatingService: BranchRatingService,
    private readonly staffRatingService: StaffRatingService,
    private readonly serviceRatingService: ServiceRatingService,
    private readonly invitationService: ReviewInvitationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list all reviews for authenticated salon' })
  public async getSalonReviews(
    @CurrentUser() user: any,
    @Query() query: ReviewSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search({
      ...query,
      salonId: user.salonId, // Strict tenant scoping to authenticated salon
    });

    const data = res.data.map((r) => this.toOwnerDto(r));
    return ResponseBuilder.paginated(
      data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('reputation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get salon reputation and NPS analytics' })
  public async getSalonReputation(@CurrentUser() user: any) {
    const summary = await this.salonRatingService.getSummary(user.salonId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('reputation/branches/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get branch reputation analytics' })
  @ApiParam({ name: 'branchId', description: 'Branch UUID' })
  public async getBranchReputation(
    @CurrentUser() user: any,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const summary = await this.branchRatingService.getSummary(branchId, user.salonId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('reputation/staff/:staffId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get staff reputation analytics' })
  @ApiParam({ name: 'staffId', description: 'Staff UUID' })
  public async getStaffReputation(
    @CurrentUser() user: any,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    const summary = await this.staffRatingService.getSummary(staffId, user.salonId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('reputation/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get service reputation analytics' })
  @ApiParam({ name: 'serviceId', description: 'Service UUID' })
  public async getServiceReputation(
    @CurrentUser() user: any,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    const summary = await this.serviceRatingService.getSummary(serviceId, user.salonId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a formal review dispute' })
  public async submitDispute(
    @CurrentUser() user: any,
    @Body() dto: CreateReviewDisputeRequestDto,
  ) {
    const dispute = await this.disputeService.submitDispute(
      {
        reviewId: dto.reviewId,
        salonId: user.salonId,
        disputeReason: dto.disputeReason,
        evidenceDetails: dto.evidenceDetails,
      },
      user.id,
    );
    return ResponseBuilder.created(
      dispute,
    );
  }

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List review disputes for authenticated salon' })
  public async getDisputes(
    @CurrentUser() user: any,
    @Query() query: ReviewDisputeSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.disputeService.searchDisputes({
      ...query,
      salonId: user.salonId,
    });
    return ResponseBuilder.paginated(
      res.data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate and send a review invitation for a completed booking' })
  public async createInvitation(
    @CurrentUser() user: any,
    @Body() dto: CreateReviewInvitationRequestDto,
  ) {
    const invitation = await this.invitationService.createInvitation(
      {
        bookingId: dto.bookingId,
        salonId: user.salonId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        channel: dto.channel,
        expiresInDays: dto.expiresInDays,
      },
      user.id,
    );
    return ResponseBuilder.created(
      this.toInvitationDto(invitation),
    );
  }

  @Get('invitations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List review invitations for authenticated salon' })
  public async getInvitations(
    @CurrentUser() user: any,
    @Query() query: ReviewInvitationSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.invitationService.searchInvitations({
      ...query,
      salonId: user.salonId,
    });
    return ResponseBuilder.paginated(
      res.data.map((inv) => this.toInvitationDto(inv)),
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get salon review details' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async getSalonReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const review = await this.reviewService.getById(id);
    if (review.salonId !== user.salonId) {
      throw new ForbiddenException('Forbidden: Review does not belong to your salon');
    }
    return ResponseBuilder.success(
      this.toOwnerDto(review),
    );
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create official salon owner reply to review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async createReply(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewReplyRequestDto,
  ) {
    const reply = await this.replyService.createReply(
      id,
      user.salonId,
      user.id,
      dto.replyText,
    );
    return ResponseBuilder.created(reply);
  }

  @Patch(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update official salon reply' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async updateReply(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewReplyRequestDto,
  ) {
    const existingReply = await this.replyService.getByReview(id);
    if (!existingReply) {
      throw new NotFoundException('Reply not found');
    }
    const updated = await this.replyService.updateReply(
      existingReply.id,
      user.salonId,
      user.id,
      dto.replyText,
      dto.version,
    );
    return ResponseBuilder.success(updated);
  }

  @Delete(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete official salon reply' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async deleteReply(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existingReply = await this.replyService.getByReview(id);
    if (!existingReply) {
      throw new NotFoundException('Reply not found');
    }
    const deleted = await this.replyService.deleteReply(
      existingReply.id,
      user.salonId,
      user.id,
    );
    return ResponseBuilder.success(deleted);
  }

  private toOwnerDto(review: any): OwnerReviewResponseDto {
    return {
      id: review.id,
      salonId: review.salonId,
      branchId: review.branchId,
      customerId: review.customerId,
      bookingId: review.bookingId,
      overallRating: review.overallRating,
      reviewTitle: review.reviewTitle,
      reviewComment: review.reviewComment,
      cleanlinessRating: review.cleanlinessRating,
      hospitalityRating: review.hospitalityRating,
      valueRating: review.valueRating,
      ambienceRating: review.ambienceRating,
      isVerifiedPurchase: review.isVerifiedPurchase,
      isAnonymous: review.isAnonymous,
      helpfulVotesCount: review.helpfulVotesCount,
      status: review.status,
      version: review.version,
      publishedAt: review.publishedAt ?? review.createdAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewerName: review.isAnonymous ? 'Anonymous Customer' : (review.customer?.user?.fullName ?? 'Customer'),
      reply: review.reply
        ? {
            id: review.reply.id,
            replyText: review.reply.replyText,
            publishedAt: review.reply.publishedAt ?? review.reply.createdAt,
          }
        : null,
      itemRatings: review.itemRatings?.map((item: any) => ({
        id: item.id,
        serviceId: item.serviceId,
        staffId: item.staffId,
        ratingStars: item.ratingStars,
        itemComment: item.itemComment,
      })),
      mediaAttachments: review.mediaAttachments?.map((m: any) => ({
        id: m.id,
        mediaId: m.mediaId,
        caption: m.caption,
        isBeforePhoto: m.isBeforePhoto,
        isAfterPhoto: m.isAfterPhoto,
        displayOrder: m.displayOrder,
      })),
    };
  }

  private toSummaryDto(summary: any): RatingSummaryResponseDto {
    if (!summary) {
      return {
        totalReviews: 0,
        averageRating: 0,
        oneStarCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        fourStarCount: 0,
        fiveStarCount: 0,
        npsScore: null,
        bayesianScore: null,
        lastCalculatedAt: new Date(),
      };
    }
    return {
      totalReviews: summary.totalReviews,
      averageRating: Number(summary.averageRating),
      oneStarCount: summary.oneStarCount ?? 0,
      twoStarCount: summary.twoStarCount ?? 0,
      threeStarCount: summary.threeStarCount ?? 0,
      fourStarCount: summary.fourStarCount ?? 0,
      fiveStarCount: summary.fiveStarCount ?? 0,
      npsScore: summary.npsScore ? Number(summary.npsScore) : null,
      bayesianScore: summary.bayesianScore ? Number(summary.bayesianScore) : null,
      lastCalculatedAt: summary.lastCalculatedAt ?? new Date(),
    };
  }

  private toInvitationDto(invitation: any): ReviewInvitationResponseDto {
    return {
      id: invitation.id,
      bookingId: invitation.bookingId,
      salonId: invitation.salonId,
      branchId: invitation.branchId,
      customerId: invitation.customerId,
      status: invitation.status,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
      completedAt: invitation.completedAt,
      createdAt: invitation.createdAt,
    };
  }
}
