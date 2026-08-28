import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationChannel, NotificationTemplate } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  CreateNotificationTemplateData,
  SearchNotificationTemplateQueryDto,
  UpdateNotificationTemplateData,
} from '../dto/notification-template.dto';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import {
  NotificationTemplateActivatedEvent,
  NotificationTemplateCreatedEvent,
  NotificationTemplateDeactivatedEvent,
  NotificationTemplateUpdatedEvent,
} from '../events/notification.events';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createTemplate(
    data: CreateNotificationTemplateData,
    actorId?: string,
  ): Promise<NotificationTemplateEntity> {
    const templateCode = data.templateCode.toUpperCase().trim();

    if (!templateCode || !/^[A-Z0-9_]+$/.test(templateCode)) {
      throw new BadRequestException(
        'Template code must be uppercase alphanumeric and underscores only.',
      );
    }

    if (!data.bodyTemplate || data.bodyTemplate.trim().length === 0) {
      throw new BadRequestException('Body template cannot be empty.');
    }

    const exists = await this.templateRepo.checkCodeExists(
      templateCode,
      data.salonId ?? undefined,
    );
    if (exists) {
      throw new ConflictException(
        `Notification template with code '${templateCode}' already exists for this scope.`,
      );
    }

    const created = await this.templateRepo.create({
      ...data,
      templateCode,
    });

    const entity = new NotificationTemplateEntity(created);

    // Invalidate Cache
    await this.invalidateTemplateCache(entity.salonId ?? undefined, entity.templateCode);

    // Audit Logging
    await this.auditService.log({
      action: 'CREATE',
      entityType: 'NotificationTemplate',
      entityId: entity.id,
      actorId,
      newState: {
        templateCode: entity.templateCode,
        channel: entity.channel,
        category: entity.category,
        salonId: entity.salonId,
      },
    });

    // Domain Event
    await this.eventBus.publish(
      new NotificationTemplateCreatedEvent(
        {
          templateId: entity.id,
          templateCode: entity.templateCode,
          salonId: entity.salonId,
          channel: entity.channel,
          category: entity.category,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async updateTemplate(
    id: string,
    data: UpdateNotificationTemplateData,
    salonId?: string | null,
    actorId?: string,
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Notification template with id '${id}' not found.`);
    }

    // Salon isolation check
    if (salonId && existing.salonId && existing.salonId !== salonId) {
      throw new ForbiddenException('Cannot modify a template belonging to another salon.');
    }

    let templateCode = data.templateCode;
    if (templateCode) {
      templateCode = templateCode.toUpperCase().trim();
      if (!/^[A-Z0-9_]+$/.test(templateCode)) {
        throw new BadRequestException(
          'Template code must be uppercase alphanumeric and underscores only.',
        );
      }

      if (templateCode !== existing.templateCode) {
        const exists = await this.templateRepo.checkCodeExists(
          templateCode,
          existing.salonId ?? undefined,
          id,
        );
        if (exists) {
          throw new ConflictException(
            `Notification template with code '${templateCode}' already exists for this scope.`,
          );
        }
      }
    }

    const updated = await this.templateRepo.update(
      id,
      {
        ...data,
        ...(templateCode && { templateCode }),
      },
      salonId,
    );

    if (!updated) {
      throw new NotFoundException(`Failed to update notification template '${id}'.`);
    }

    const entity = new NotificationTemplateEntity(updated);

    // Invalidate Cache
    await this.invalidateTemplateCache(entity.salonId ?? undefined, entity.templateCode);

    // Audit Logging
    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'NotificationTemplate',
      entityId: entity.id,
      actorId,
      previousState: {
        templateCode: existing.templateCode,
        channel: existing.channel,
      },
      newState: {
        templateCode: entity.templateCode,
        channel: entity.channel,
      },
    });

    // Domain Event
    await this.eventBus.publish(
      new NotificationTemplateUpdatedEvent(
        {
          templateId: entity.id,
          templateCode: entity.templateCode,
          salonId: entity.salonId,
          updatedFields: Object.keys(data),
        },
        actorId,
      ),
    );

    return entity;
  }

  public async activateTemplate(
    id: string,
    salonId?: string | null,
    actorId?: string,
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Notification template with id '${id}' not found.`);
    }

    const activated = await this.templateRepo.activate(id, salonId);
    if (!activated) {
      throw new NotFoundException(`Failed to activate notification template '${id}'.`);
    }

    const entity = new NotificationTemplateEntity(activated);
    await this.invalidateTemplateCache(entity.salonId ?? undefined, entity.templateCode);

    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'NotificationTemplate',
      entityId: entity.id,
      actorId,
      newState: { isActive: true },
    });

    await this.eventBus.publish(
      new NotificationTemplateActivatedEvent(
        {
          templateId: entity.id,
          templateCode: entity.templateCode,
          salonId: entity.salonId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async deactivateTemplate(
    id: string,
    salonId?: string | null,
    actorId?: string,
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Notification template with id '${id}' not found.`);
    }

    const deactivated = await this.templateRepo.deactivate(id, salonId);
    if (!deactivated) {
      throw new NotFoundException(`Failed to deactivate notification template '${id}'.`);
    }

    const entity = new NotificationTemplateEntity(deactivated);
    await this.invalidateTemplateCache(entity.salonId ?? undefined, entity.templateCode);

    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'NotificationTemplate',
      entityId: entity.id,
      actorId,
      newState: { isActive: false },
    });

    await this.eventBus.publish(
      new NotificationTemplateDeactivatedEvent(
        {
          templateId: entity.id,
          templateCode: entity.templateCode,
          salonId: entity.salonId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async softDeleteTemplate(
    id: string,
    salonId?: string | null,
    actorId?: string,
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Notification template with id '${id}' not found.`);
    }

    const deleted = await this.templateRepo.softDelete(id, salonId);
    if (!deleted) {
      throw new NotFoundException(`Failed to delete notification template '${id}'.`);
    }

    const entity = new NotificationTemplateEntity(deleted);
    await this.invalidateTemplateCache(entity.salonId ?? undefined, entity.templateCode);

    await this.auditService.log({
      action: 'DELETE',
      entityType: 'NotificationTemplate',
      entityId: entity.id,
      actorId,
    });

    return entity;
  }

  public async getTemplateById(
    id: string,
    salonId?: string | null,
  ): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepo.findById(id, salonId);
    if (!template) {
      throw new NotFoundException(`Notification template with id '${id}' not found.`);
    }

    return new NotificationTemplateEntity(template);
  }

  public async resolveTemplate(
    code: string,
    channel: NotificationChannel,
    salonId?: string | null,
  ): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepo.findByCodeAndChannel(code, channel, salonId);
    if (!template || !template.isActive || template.deletedAt) {
      throw new NotFoundException(
        `Active notification template for code '${code}' and channel '${channel}' not found.`,
      );
    }

    return new NotificationTemplateEntity(template);
  }

  public async renderTemplate(
    templateId: string,
    variables: Record<string, unknown>,
    salonId?: string | null,
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.getTemplateById(templateId, salonId);
    return template.render(variables);
  }

  public async previewTemplate(
    templateId: string,
    sampleVariables: Record<string, unknown> = {},
    salonId?: string | null,
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.getTemplateById(templateId, salonId);
    return template.renderPreview(sampleVariables);
  }

  public async searchTemplates(
    query: SearchNotificationTemplateQueryDto,
  ): Promise<{ data: NotificationTemplateEntity[]; total: number }> {
    const result = await this.templateRepo.search(query);
    return {
      data: result.data.map((t) => new NotificationTemplateEntity(t)),
      total: result.total,
    };
  }

  // ─── Cache Helpers ──────────────────────────────────────────────────────────

  private async invalidateTemplateCache(salonId?: string, code?: string): Promise<void> {
    await this.cacheService.deleteByPattern('notification-template:*');
    if (salonId) {
      await this.cacheService.delete(`salon:${salonId}:notification-templates`);
    }
  }
}
