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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
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
  CreateReviewRequestDto,
  UpdateReviewRequestDto,
} from './dto/create-review.dto';
import { CreateReviewFlagRequestDto } from './dto/review-moderation.dto';
import { ReviewSearchRequestDto } from './dto/review-query.dto';
import { CustomerReviewResponseDto } from './dto/review-response.dto';
import { ReviewHelpfulVoteService } from '../services/review-helpful-vote.service';
import { ReviewModerationService } from '../services/review-moderation.service';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews (Customer Self-Service)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/reviews')
export class ReviewCustomerController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly helpfulVoteService: ReviewHelpfulVoteService,
    private readonly moderationService: ReviewModerationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a verified review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review successfully created and published' })
  @ApiBadRequestResponse({ description: 'Validation failed or booking incomplete' })
  @ApiForbiddenResponse({ description: 'Booking does not belong to the customer' })
  public async createReview(
    @CurrentUser() user: any,
    @Body() dto: CreateReviewRequestDto,
  ) {
    const created = await this.reviewService.createReview(dto, user.id);
    return ResponseBuilder.created(
      this.toCustomerDto(created),
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all reviews submitted by current customer' })
  @ApiResponse({ status: 200, description: 'Customer reviews returned' })
  public async getMyReviews(
    @CurrentUser() user: any,
    @Query() query: ReviewSearchRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.reviewService.search({
      ...query,
      customerId: user.id, // Mandatory tenant isolation to authenticated customer
    });

    const data = res.data.map((r) => this.toCustomerDto(r));
    return ResponseBuilder.paginated(
      data,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of own review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review details returned' })
  public async getMyReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const review = await this.reviewService.getById(id);
    if (review.customerId !== user.id) {
      throw new ForbiddenException('Forbidden: Review does not belong to you');
    }
    return ResponseBuilder.success(
      this.toCustomerDto(review),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async updateMyReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewRequestDto,
  ) {
    const updated = await this.reviewService.updateReview(
      id,
      dto,
      user.id,
      dto.version,
    );
    return ResponseBuilder.success(
      this.toCustomerDto(updated),
    );
  }

  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle helpful upvote on a review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async toggleHelpfulVote(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.helpfulVoteService.toggleVote(id, user.id);
    return ResponseBuilder.success(
      result,
    );
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report/flag an inappropriate review for moderation' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async flagReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewFlagRequestDto,
  ) {
    const flag = await this.moderationService.flagReview(
      {
        reviewId: id,
        reportedByUserId: user.id,
        reasonCategory: dto.reasonCategory,
        explanation: dto.explanation,
      },
      user.id,
    );
    return ResponseBuilder.created(
      { id: flag.id, status: flag.status },
    );
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive own review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  public async archiveReview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const review = await this.reviewService.getById(id);
    if (review.customerId !== user.id) {
      throw new ForbiddenException('Forbidden: Review does not belong to you');
    }
    const archived = await this.reviewService.archiveReview(id, user.id);
    return ResponseBuilder.success(
      this.toCustomerDto(archived),
    );
  }

  private toCustomerDto(review: any): CustomerReviewResponseDto {
    return {
      id: review.id,
      salonId: review.salonId,
      branchId: review.branchId,
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
      publishedAt: review.publishedAt ?? review.createdAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
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
}
