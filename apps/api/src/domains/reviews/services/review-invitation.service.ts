import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, NotificationChannel, ReviewInvitationStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { SearchReviewInvitationQueryDto } from '../dto/search-review.dto';
import { ReviewInvitationEntity } from '../entities/review-invitation.entity';
import {
  ReviewInvitationCompletedEvent,
  ReviewInvitationCreatedEvent,
  ReviewInvitationExpiredEvent,
  ReviewInvitationFailedEvent,
  ReviewInvitationOpenedEvent,
  ReviewInvitationSentEvent,
} from '../events/reviews-events.event';
import { ReviewInvitationRepository } from '../repositories/review-invitation.repository';

export interface CreateInvitationInput {
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  channel?: NotificationChannel;
  expiresInDays?: number;
}

@Injectable()
export class ReviewInvitationService {
  private readonly logger = new Logger(ReviewInvitationService.name);

  constructor(
    private readonly invitationRepo: ReviewInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createInvitation(
    input: CreateInvitationInput,
    actorUserId?: string,
  ): Promise<ReviewInvitationEntity> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${input.bookingId} not found.`);
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Review invitations can only be issued for completed bookings.');
    }

    const existing = await this.invitationRepo.findByBooking(input.bookingId);
    if (existing) {
      throw new ConflictException('A review invitation has already been created for this booking.');
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresInDays = input.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const created = await this.invitationRepo.create({
      bookingId: input.bookingId,
      salonId: input.salonId,
      branchId: input.branchId,
      customerId: input.customerId,
      channel: input.channel ?? NotificationChannel.PUSH,
      invitationToken,
      status: ReviewInvitationStatus.PENDING,
      expiresAt,
    });

    await this.auditService.log({
      action: 'REVIEW_INVITATION_CREATED',
      actorId: actorUserId ?? input.customerId,
      entityType: 'ReviewInvitation',
      entityId: created.id,
      metadata: { salonId: input.salonId, bookingId: input.bookingId, channel: input.channel },
    });

    this.eventBus.publish(
      new ReviewInvitationCreatedEvent(
        {
          invitationId: created.id,
          bookingId: input.bookingId,
          salonId: input.salonId,
          branchId: input.branchId,
          customerId: input.customerId,
          invitationToken,
        },
        actorUserId,
      ),
    );

    return new ReviewInvitationEntity(created as any);
  }

  public async validateAndOpenToken(invitationToken: string): Promise<ReviewInvitationEntity> {
    const invitation = await this.invitationRepo.findByToken(invitationToken);
    if (!invitation) {
      throw new NotFoundException('Invalid or unknown review invitation token.');
    }

    const entity = new ReviewInvitationEntity(invitation as any);
    if (entity.isExpired()) {
      await this.invitationRepo.markExpired(invitation.id);
      throw new BadRequestException('This review invitation has expired.');
    }

    if (invitation.status === ReviewInvitationStatus.COMPLETED) {
      throw new BadRequestException('This review invitation has already been redeemed.');
    }

    if (invitation.status !== ReviewInvitationStatus.OPENED) {
      await this.invitationRepo.markOpened(invitation.id);
      this.eventBus.publish(
        new ReviewInvitationOpenedEvent({
          invitationId: invitation.id,
          bookingId: invitation.bookingId,
        }),
      );
    }

    return new ReviewInvitationEntity({
      ...invitation,
      status: ReviewInvitationStatus.OPENED,
    } as any);
  }

  public async markSent(invitationId: string): Promise<ReviewInvitationEntity> {
    const invitation = await this.invitationRepo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException(`Review invitation ${invitationId} not found.`);
    }

    const updated = await this.invitationRepo.markSent(invitationId);

    this.eventBus.publish(
      new ReviewInvitationSentEvent({
        invitationId,
        bookingId: invitation.bookingId,
        customerId: invitation.customerId,
      }),
    );

    return new ReviewInvitationEntity(updated as any);
  }

  public async markCompleted(invitationId: string, reviewId: string): Promise<ReviewInvitationEntity> {
    const invitation = await this.invitationRepo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException(`Review invitation ${invitationId} not found.`);
    }

    const updated = await this.invitationRepo.markCompleted(invitationId);

    this.eventBus.publish(
      new ReviewInvitationCompletedEvent({
        invitationId,
        bookingId: invitation.bookingId,
        reviewId,
      }),
    );

    return new ReviewInvitationEntity(updated as any);
  }

  public async markFailed(invitationId: string, reason?: string): Promise<ReviewInvitationEntity> {
    const invitation = await this.invitationRepo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException(`Review invitation ${invitationId} not found.`);
    }

    const updated = await this.invitationRepo.markFailed(invitationId);

    this.eventBus.publish(
      new ReviewInvitationFailedEvent({
        invitationId,
        bookingId: invitation.bookingId,
        reason,
      }),
    );

    return new ReviewInvitationEntity(updated as any);
  }

  public async searchInvitations(
    query: SearchReviewInvitationQueryDto,
  ): Promise<{ data: ReviewInvitationEntity[]; total: number }> {
    const res = await this.invitationRepo.search(query);
    return {
      data: res.data.map((inv) => new ReviewInvitationEntity(inv as any)),
      total: res.total,
    };
  }
}
