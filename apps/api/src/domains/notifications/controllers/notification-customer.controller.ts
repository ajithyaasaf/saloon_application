import {
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
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationInboxService } from '../services/notification-inbox.service';
import { SearchNotificationRequestDto } from './dto/notification-request.dto';
import {
  NotificationInboxCountResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto';

@ApiTags('Notifications (Customer Inbox)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('customer/notifications')
export class NotificationCustomerController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current customer paginated notification inbox' })
  @ApiResponse({ status: 200, description: 'Inbox returned' })
  public async getInbox(
    @CurrentUser() user: any,
    @Query() query: SearchNotificationRequestDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.inboxService.getInbox(user.id, {
      page,
      limit,
      isRead: query.isRead,
      category: query.category,
    });

    const sanitizedData = res.data.map((n) => this.toCustomerDto(n));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get total unread notifications count for badge' })
  @ApiResponse({ status: 200, description: 'Unread count returned', type: NotificationInboxCountResponseDto })
  public async getUnreadCount(@CurrentUser() user: any) {
    const unreadCount = await this.inboxService.getUnreadCount(user.id);
    return ResponseBuilder.success({ unreadCount });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer notification details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notification details returned', type: NotificationResponseDto })
  public async getNotificationById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notification = await this.inboxService.getNotificationById(id, user.id);
    return ResponseBuilder.success(this.toCustomerDto(notification));
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark customer notification as read' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notification marked read', type: NotificationResponseDto })
  public async markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const updated = await this.inboxService.markAsRead(id, user.id, user.id);
    return ResponseBuilder.success(this.toCustomerDto(updated));
  }

  @Patch(':id/unread')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark customer notification as unread' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notification marked unread', type: NotificationResponseDto })
  public async markAsUnread(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const updated = await this.inboxService.markAsUnread(id, user.id, user.id);
    return ResponseBuilder.success(this.toCustomerDto(updated));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications in inbox as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  public async markAllAsRead(@CurrentUser() user: any) {
    const result = await this.inboxService.markAllAsRead(user.id, user.id);
    return ResponseBuilder.success(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete notification from inbox' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  public async deleteNotification(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deleted = await this.inboxService.deleteNotification(id, user.id, user.id);
    return ResponseBuilder.success(this.toCustomerDto(deleted));
  }

  // ─── Transformer ───────────────────────────────────────────────────────────

  private toCustomerDto(entity: NotificationEntity): NotificationResponseDto {
    return {
      id: entity.id,
      salonId: entity.salonId,
      userId: entity.userId,
      templateId: entity.templateId,
      channel: entity.channel,
      priority: entity.priority,
      category: entity.category,
      title: entity.title,
      body: entity.body,
      idempotencyKey: entity.idempotencyKey,
      metadata: entity.metadata,
      scheduledAt: entity.scheduledAt,
      readAt: entity.readAt,
      isRead: entity.isRead(),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Omit internal provider delivery logs from customer response for security
    };
  }
}
