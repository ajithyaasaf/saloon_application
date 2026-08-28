import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { UserNotificationPreferenceEntity } from '../entities/user-notification-preference.entity';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import {
  SetQuietHoursRequestDto,
  UpdatePreferenceRequestDto,
} from './dto/notification-preference-request.dto';
import { UserNotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';

@ApiTags('Notifications (User Notification Preferences)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications/preferences')
export class NotificationPreferenceController {
  constructor(private readonly preferenceService: NotificationPreferenceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user notification preferences matrix across all channels' })
  @ApiResponse({
    status: 200,
    description: 'Preferences returned',
    type: [UserNotificationPreferenceResponseDto],
  })
  public async getPreferences(@CurrentUser() user: any) {
    const preferences = await this.preferenceService.getUserPreferences(user.id);
    return ResponseBuilder.success(preferences.map((p) => this.toPreferenceDto(p)));
  }

  @Get(':channel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get preference for a specific channel' })
  @ApiParam({ name: 'channel', enum: NotificationChannel })
  @ApiResponse({
    status: 200,
    description: 'Preference returned',
    type: UserNotificationPreferenceResponseDto,
  })
  public async getPreferenceByChannel(
    @CurrentUser() user: any,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ) {
    const preference = await this.preferenceService.getPreferenceByChannel(user.id, channel);
    return ResponseBuilder.success(this.toPreferenceDto(preference));
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update or upsert channel notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preference updated',
    type: UserNotificationPreferenceResponseDto,
  })
  public async updatePreference(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferenceRequestDto,
  ) {
    const updated = await this.preferenceService.updatePreference(
      {
        userId: user.id,
        channel: dto.channel,
        isEnabled: dto.isEnabled,
        quietHoursEnabled: dto.quietHoursEnabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
      },
      user.id,
    );
    return ResponseBuilder.success(this.toPreferenceDto(updated));
  }

  @Patch(':channel/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Opt-in / enable specific notification channel' })
  @ApiParam({ name: 'channel', enum: NotificationChannel })
  @ApiResponse({ status: 200, description: 'Channel enabled' })
  public async enableChannel(
    @CurrentUser() user: any,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ) {
    const updated = await this.preferenceService.enableChannel(user.id, channel, user.id);
    return ResponseBuilder.success(this.toPreferenceDto(updated));
  }

  @Patch(':channel/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Opt-out / disable specific notification channel' })
  @ApiParam({ name: 'channel', enum: NotificationChannel })
  @ApiResponse({ status: 200, description: 'Channel disabled' })
  public async disableChannel(
    @CurrentUser() user: any,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ) {
    const updated = await this.preferenceService.disableChannel(user.id, channel, user.id);
    return ResponseBuilder.success(this.toPreferenceDto(updated));
  }

  @Post('quiet-hours')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure quiet hours for a channel' })
  @ApiResponse({ status: 200, description: 'Quiet hours set' })
  public async setQuietHours(
    @CurrentUser() user: any,
    @Body() dto: SetQuietHoursRequestDto,
  ) {
    const updated = await this.preferenceService.setQuietHours(
      user.id,
      dto.channel,
      dto.start,
      dto.end,
      user.id,
    );
    return ResponseBuilder.success(this.toPreferenceDto(updated));
  }

  @Delete(':channel/quiet-hours')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove quiet hours for a channel' })
  @ApiParam({ name: 'channel', enum: NotificationChannel })
  @ApiResponse({ status: 200, description: 'Quiet hours removed' })
  public async removeQuietHours(
    @CurrentUser() user: any,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ) {
    const updated = await this.preferenceService.removeQuietHours(user.id, channel, user.id);
    return ResponseBuilder.success(this.toPreferenceDto(updated));
  }

  // ─── Transformer ───────────────────────────────────────────────────────────

  private toPreferenceDto(
    entity: UserNotificationPreferenceEntity,
  ): UserNotificationPreferenceResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      channel: entity.channel,
      isEnabled: entity.isEnabled,
      quietHoursEnabled: entity.quietHoursEnabled,
      quietHoursStart: entity.quietHoursStart,
      quietHoursEnd: entity.quietHoursEnd,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
