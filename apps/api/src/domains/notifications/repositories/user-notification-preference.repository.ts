import { ConflictException, Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma, UserNotificationPreference } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateNotificationPreferenceData,
  UpdateNotificationPreferenceData,
  UpsertNotificationPreferenceData,
} from '../dto/notification-preference.dto';
import { IUserNotificationPreferenceRepository } from './interfaces/user-notification-preference.repository.interface';

@Injectable()
export class UserNotificationPreferenceRepository
  implements IUserNotificationPreferenceRepository
{
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<UserNotificationPreference | null> {
    return this.db.userNotificationPreference.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  public async findByUser(userId: string): Promise<UserNotificationPreference[]> {
    return this.db.userNotificationPreference.findMany({
      where: { userId },
      orderBy: { channel: 'asc' },
      include: {
        user: true,
      },
    });
  }

  public async findByUserAndChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<UserNotificationPreference | null> {
    return this.db.userNotificationPreference.findUnique({
      where: {
        userId_channel: {
          userId,
          channel,
        },
      },
      include: {
        user: true,
      },
    });
  }

  public async findEnabledByUser(userId: string): Promise<UserNotificationPreference[]> {
    return this.db.userNotificationPreference.findMany({
      where: {
        userId,
        isEnabled: true,
      },
      orderBy: { channel: 'asc' },
      include: {
        user: true,
      },
    });
  }

  public async create(
    data: CreateNotificationPreferenceData,
  ): Promise<UserNotificationPreference> {
    try {
      return await this.db.userNotificationPreference.create({
        data: {
          userId: data.userId,
          channel: data.channel,
          isEnabled: data.isEnabled ?? true,
          quietHoursEnabled: data.quietHoursEnabled ?? false,
          quietHoursStart: data.quietHoursStart ?? null,
          quietHoursEnd: data.quietHoursEnd ?? null,
        },
        include: {
          user: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Notification preference for user '${data.userId}' and channel '${data.channel}' already exists`,
        );
      }
      throw error;
    }
  }

  public async update(
    id: string,
    data: UpdateNotificationPreferenceData,
  ): Promise<UserNotificationPreference | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updateData: Prisma.UserNotificationPreferenceUpdateInput = {};
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.quietHoursEnabled !== undefined) {
      updateData.quietHoursEnabled = data.quietHoursEnabled;
    }
    if (data.quietHoursStart !== undefined) {
      updateData.quietHoursStart = data.quietHoursStart;
    }
    if (data.quietHoursEnd !== undefined) {
      updateData.quietHoursEnd = data.quietHoursEnd;
    }

    return this.db.userNotificationPreference.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  public async upsert(
    data: UpsertNotificationPreferenceData,
  ): Promise<UserNotificationPreference> {
    return this.db.userNotificationPreference.upsert({
      where: {
        userId_channel: {
          userId: data.userId,
          channel: data.channel,
        },
      },
      create: {
        userId: data.userId,
        channel: data.channel,
        isEnabled: data.isEnabled ?? true,
        quietHoursEnabled: data.quietHoursEnabled ?? false,
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
      },
      update: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.quietHoursEnabled !== undefined && {
          quietHoursEnabled: data.quietHoursEnabled,
        }),
        ...(data.quietHoursStart !== undefined && {
          quietHoursStart: data.quietHoursStart,
        }),
        ...(data.quietHoursEnd !== undefined && {
          quietHoursEnd: data.quietHoursEnd,
        }),
      },
      include: {
        user: true,
      },
    });
  }

  public async delete(id: string, userId?: string): Promise<UserNotificationPreference | null> {
    const where: Prisma.UserNotificationPreferenceWhereInput = { id };
    if (userId) {
      where.userId = userId;
    }

    const existing = await this.db.userNotificationPreference.findFirst({ where });
    if (!existing) return null;

    return this.db.userNotificationPreference.delete({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  public async deleteByUser(userId: string): Promise<number> {
    const result = await this.db.userNotificationPreference.deleteMany({
      where: { userId },
    });
    return result.count;
  }
}
