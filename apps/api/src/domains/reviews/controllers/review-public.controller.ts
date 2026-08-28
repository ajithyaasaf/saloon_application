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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { ReviewSearchRequestDto } from './dto/review-query.dto';
import {
  PublicReviewResponseDto,
  RatingSummaryResponseDto,
} from './dto/review-response.dto';
import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from '../services/reputation-summary.service';
import { Public } from '../../../common/decorators/public.decorator';
import { ReviewInvitationService } from '../services/review-invitation.service';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews (Public)')
@Public()
@Controller('reviews')
export class ReviewPublicController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly salonRatingService: SalonRatingService,
    private readonly branchRatingService: BranchRatingService,
    private readonly staffRatingService: StaffRatingService,
    private readonly serviceRatingService: ServiceRatingService,
    private readonly invitationService: ReviewInvitationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search publicly published reviews' })
  @ApiResponse({ status: 200, description: 'Published reviews returned' })
  public async searchReviews(@Query() query: ReviewSearchRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search({
      ...query,
      status: ReviewStatus.PUBLISHED, // Strict enforcement: Only published reviews in public catalog
    });

    const sanitizedData = res.data.map((r) => this.toPublicDto(r));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('salon/:salonId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get published reviews for a specific salon' })
  @ApiParam({ name: 'salonId', description: 'Salon UUID' })
  public async getSalonReviews(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query() query: ReviewSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search({
      ...query,
      salonId,
      status: ReviewStatus.PUBLISHED,
    });

    const sanitizedData = res.data.map((r) => this.toPublicDto(r));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('branch/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get published reviews for a specific branch' })
  @ApiParam({ name: 'branchId', description: 'Branch UUID' })
  public async getBranchReviews(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query() query: ReviewSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search({
      ...query,
      branchId,
      status: ReviewStatus.PUBLISHED,
    });

    const sanitizedData = res.data.map((r) => this.toPublicDto(r));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('salon/:salonId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public salon rating and reputation summary' })
  @ApiParam({ name: 'salonId', description: 'Salon UUID' })
  public async getSalonRatingSummary(@Param('salonId', ParseUUIDPipe) salonId: string) {
    const summary = await this.salonRatingService.getSummary(salonId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('branch/:branchId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public branch rating summary' })
  @ApiParam({ name: 'branchId', description: 'Branch UUID' })
  public async getBranchRatingSummary(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const summary = await this.branchRatingService.getSummary(branchId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('staff/:staffId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public staff rating summary' })
  @ApiParam({ name: 'staffId', description: 'Staff UUID' })
  public async getStaffRatingSummary(@Param('staffId', ParseUUIDPipe) staffId: string) {
    const summary = await this.staffRatingService.getSummary(staffId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('service/:serviceId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public service rating summary' })
  @ApiParam({ name: 'serviceId', description: 'Service UUID' })
  public async getServiceRatingSummary(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    const summary = await this.serviceRatingService.getSummary(serviceId);
    return ResponseBuilder.success(
      this.toSummaryDto(summary),
    );
  }

  @Get('invitations/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and open a review invitation token' })
  @ApiParam({ name: 'token', description: 'Cryptographic invitation token' })
  public async validateInvitation(@Param('token') token: string) {
    const invitation = await this.invitationService.validateAndOpenToken(token);
    return ResponseBuilder.success(
      {
        id: invitation.id,
        bookingId: invitation.bookingId,
        salonId: invitation.salonId,
        branchId: invitation.branchId,
        expiresAt: invitation.expiresAt,
      },
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get single published review detail' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async getReviewById(@Param('id', ParseUUIDPipe) id: string) {
    const review = await this.reviewService.getById(id);
    return ResponseBuilder.success(
      this.toPublicDto(review),
    );
  }

  private toPublicDto(review: any): PublicReviewResponseDto {
    return {
      id: review.id,
      salonId: review.salonId,
      branchId: review.branchId,
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
      publishedAt: review.publishedAt ?? review.createdAt,
      reviewerName: review.isAnonymous ? 'Verified Customer' : (review.customer?.user?.fullName ?? 'Customer'),
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
}
