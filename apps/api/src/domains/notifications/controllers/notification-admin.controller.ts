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
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationDispatchService } from '../services/notification-dispatch.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import {
  BroadcastNotificationRequestDto,
  SendNotificationRequestDto,
} from './dto/notification-request.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import {
  CreateNotificationTemplateRequestDto,
  PreviewNotificationTemplateRequestDto,
  RenderNotificationTemplateRequestDto,
  SearchNotificationTemplateRequestDto,
  UpdateNotificationTemplateRequestDto,
} from './dto/notification-template-request.dto';
import { NotificationTemplateResponseDto } from './dto/notification-template-response.dto';

@ApiTags('Notifications (Super Admin Platform Operations)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/notifications')
export class NotificationAdminController {
  constructor(
    private readonly templateService: NotificationTemplateService,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  // ─── Template Management ───────────────────────────────────────────────────

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create platform-wide or salon notification template' })
  @ApiResponse({ status: 201, description: 'Template created', type: NotificationTemplateResponseDto })
  public async createTemplate(
    @CurrentUser() user: any,
    @Body() dto: CreateNotificationTemplateRequestDto,
  ) {
    const created = await this.templateService.createTemplate(
      {
        ...dto,
        salonId: null, // Platform-wide by default from Super Admin
      },
      user.id,
    );
    return ResponseBuilder.success(this.toTemplateDto(created));
  }

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search all platform-wide notification templates' })
  @ApiResponse({ status: 200, description: 'Templates returned' })
  public async searchTemplates(@Query() query: SearchNotificationTemplateRequestDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const res = await this.templateService.searchTemplates({
      ...query,
      page,
      limit,
    });

    const sanitizedData = res.data.map((t) => this.toTemplateDto(t));
    return ResponseBuilder.paginated(
      sanitizedData,
      PaginationUtil.buildMeta(res.total, { page, limit }),
    );
  }

  @Get('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get template details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Template details returned', type: NotificationTemplateResponseDto })
  public async getTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    const template = await this.templateService.getTemplateById(id);
    return ResponseBuilder.success(this.toTemplateDto(template));
  }

  @Patch('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Template updated', type: NotificationTemplateResponseDto })
  public async updateTemplate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationTemplateRequestDto,
  ) {
    const updated = await this.templateService.updateTemplate(id, dto, null, user.id);
    return ResponseBuilder.success(this.toTemplateDto(updated));
  }

  @Patch('templates/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate notification template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Template activated', type: NotificationTemplateResponseDto })
  public async activateTemplate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const activated = await this.templateService.activateTemplate(id, null, user.id);
    return ResponseBuilder.success(this.toTemplateDto(activated));
  }

  @Patch('templates/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate notification template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Template deactivated', type: NotificationTemplateResponseDto })
  public async deactivateTemplate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deactivated = await this.templateService.deactivateTemplate(id, null, user.id);
    return ResponseBuilder.success(this.toTemplateDto(deactivated));
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete notification template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  public async deleteTemplate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deleted = await this.templateService.softDeleteTemplate(id, null, user.id);
    return ResponseBuilder.success(this.toTemplateDto(deleted));
  }

  @Post('templates/:id/render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render template with actual variables' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rendered content' })
  public async renderTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenderNotificationTemplateRequestDto,
  ) {
    const rendered = await this.templateService.renderTemplate(id, dto.variables);
    return ResponseBuilder.success(rendered);
  }

  @Post('templates/:id/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview template with sample variables or placeholders' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Preview rendered content' })
  public async previewTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewNotificationTemplateRequestDto,
  ) {
    const preview = await this.templateService.previewTemplate(id, dto.sampleVariables);
    return ResponseBuilder.success(preview);
  }

  // ─── Dispatch Operations ───────────────────────────────────────────────────

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send direct system notification to single user' })
  @ApiResponse({ status: 200, description: 'Notification dispatched', type: NotificationResponseDto })
  public async sendNotification(
    @CurrentUser() user: any,
    @Body() dto: SendNotificationRequestDto,
  ) {
    const dispatched = await this.dispatchService.dispatch(
      {
        ...dto,
        salonId: null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toNotificationDto(dispatched));
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send broadcast notification to multiple users' })
  @ApiResponse({ status: 200, description: 'Broadcast queued/dispatched' })
  public async broadcastNotification(
    @CurrentUser() user: any,
    @Body() dto: BroadcastNotificationRequestDto,
  ) {
    const results = await Promise.allSettled(
      dto.userIds.map((targetUserId, index) =>
        this.dispatchService.dispatch(
          {
            userId: targetUserId,
            salonId: null,
            templateCode: dto.templateCode,
            channels: dto.channels,
            priority: dto.priority,
            category: dto.category,
            title: dto.title,
            body: dto.body,
            templateVariables: dto.templateVariables,
            idempotencyKey: dto.idempotencyKeyPrefix
              ? `${dto.idempotencyKeyPrefix}:${targetUserId}:${index}`
              : undefined,
            metadata: dto.metadata,
          },
          user.id,
        ),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return ResponseBuilder.success({
      totalTargeted: dto.userIds.length,
      successful,
      failed,
    });
  }

  // ─── Transformers ──────────────────────────────────────────────────────────

  private toTemplateDto(entity: NotificationTemplateEntity): NotificationTemplateResponseDto {
    return {
      id: entity.id,
      salonId: entity.salonId,
      templateCode: entity.templateCode,
      channel: entity.channel,
      category: entity.category,
      description: entity.description,
      subjectTemplate: entity.subjectTemplate,
      bodyTemplate: entity.bodyTemplate,
      variables: entity.variables,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toNotificationDto(entity: NotificationEntity): NotificationResponseDto {
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
      deliveries: entity.deliveries?.map((d) => ({
        id: d.id,
        notificationId: d.notificationId,
        channel: d.channel,
        status: d.status,
        providerMessageId: d.providerMessageId,
        sentAt: d.sentAt,
        deliveredAt: d.deliveredAt,
        failedReason: d.failedReason,
        retryCount: d.retryCount,
        nextRetryAt: d.nextRetryAt,
        createdAt: d.createdAt,
      })),
    };
  }
}
