import { BadRequestException } from '@nestjs/common';
import { NotificationCategory, NotificationChannel, NotificationTemplate } from '@prisma/client';

export class NotificationTemplateEntity {
  id: string;
  salonId?: string | null;
  templateCode: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  description?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  variables?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<NotificationTemplate> | any) {
    Object.assign(this, partial);
  }

  public isPlatformWide(): boolean {
    return !this.salonId;
  }

  public isUsable(): boolean {
    return this.isActive && !this.deletedAt;
  }

  public extractRequiredVariables(): string[] {
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const vars = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = regex.exec(this.bodyTemplate)) !== null) {
      vars.add(match[1]);
    }

    if (this.subjectTemplate) {
      while ((match = regex.exec(this.subjectTemplate)) !== null) {
        vars.add(match[1]);
      }
    }

    return Array.from(vars);
  }

  public validateVariables(provided: Record<string, unknown>): {
    valid: boolean;
    missing: string[];
  } {
    const required = this.extractRequiredVariables();
    const missing = required.filter(
      (v) => provided[v] === undefined || provided[v] === null,
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  public render(variables: Record<string, unknown>): { subject?: string; body: string } {
    const validation = this.validateVariables(variables);
    if (!validation.valid) {
      throw new BadRequestException(
        `Missing required template variables: ${validation.missing.join(', ')}`,
      );
    }

    const interpolate = (text: string): string => {
      return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
        const val = variables[key];
        return val !== undefined && val !== null ? String(val) : '';
      });
    };

    return {
      subject: this.subjectTemplate ? interpolate(this.subjectTemplate) : undefined,
      body: interpolate(this.bodyTemplate),
    };
  }

  public renderPreview(sampleVariables: Record<string, unknown> = {}): {
    subject?: string;
    body: string;
  } {
    const interpolate = (text: string): string => {
      return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
        const val = sampleVariables[key];
        return val !== undefined && val !== null ? String(val) : `[${key}]`;
      });
    };

    return {
      subject: this.subjectTemplate ? interpolate(this.subjectTemplate) : undefined,
      body: interpolate(this.bodyTemplate),
    };
  }
}
