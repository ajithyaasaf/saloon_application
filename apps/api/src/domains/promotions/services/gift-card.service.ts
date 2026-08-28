import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import * as crypto from 'crypto';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  CreateGiftCardData,
  SearchGiftCardQueryDto,
  UpdateGiftCardData,
} from '../dto/gift-card.dto';
import { GiftCardEntity } from '../entities/gift-card.entity';
import {
  GiftCardCancelledEvent,
  GiftCardCreatedEvent,
  GiftCardExpiredEvent,
  GiftCardFrozenEvent,
  GiftCardRedeemedEvent,
  GiftCardRefundCreditedEvent,
} from '../events/promotions.events';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';

export interface IssueGiftCardInput {
  salonId: string;
  purchasedByUserId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  personalMessage?: string | null;
  initialBalance: number;
  currency?: string;
  expiresAt: Date;
}

export interface RedeemGiftCardInput {
  giftCardCode: string;
  salonId: string;
  amount: number;
  bookingId?: string | null;
  invoiceId?: string | null;
}

export interface RefundGiftCardInput {
  giftCardId: string;
  salonId: string;
  amount: number;
  bookingId?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
}

@Injectable()
export class GiftCardService {
  private readonly logger = new Logger(GiftCardService.name);

  constructor(
    private readonly giftCardRepo: GiftCardRepository,
    private readonly txRepo: GiftCardTransactionRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async issueGiftCard(
    input: IssueGiftCardInput,
    actorId?: string,
  ): Promise<GiftCardEntity> {
    if (input.initialBalance <= 0) {
      throw new BadRequestException('Gift card initial balance must be greater than 0.');
    }

    if (input.expiresAt <= new Date()) {
      throw new BadRequestException('Gift card expiration date must be in the future.');
    }

    // Generate secure 16-character alphanumeric code formatted as GC-XXXX-XXXX-XXXX
    const giftCardCode = this.generateGiftCardCode();

    const { card } = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const createdCard = await this.giftCardRepo.create(
        {
          giftCardCode,
          salonId: input.salonId,
          purchasedByUserId: input.purchasedByUserId ?? null,
          recipientName: input.recipientName ?? null,
          recipientEmail: input.recipientEmail ?? null,
          recipientPhone: input.recipientPhone ?? null,
          personalMessage: input.personalMessage ?? null,
          initialBalance: input.initialBalance,
          currentBalance: input.initialBalance,
          currency: input.currency ?? 'INR',
          status: GiftCardStatus.ACTIVE,
          expiresAt: input.expiresAt,
        },
        tx,
      );

      // Immutable issue ledger entry
      await this.txRepo.create(
        {
          giftCardId: createdCard.id,
          transactionType: GiftCardTransactionType.ISSUE,
          amount: input.initialBalance,
          balanceBefore: 0,
          balanceAfter: input.initialBalance,
          notes: 'Initial gift card issuance',
          performedByUserId: actorId ?? input.purchasedByUserId ?? null,
        },
        tx,
      );

      return { card: createdCard };
    });

    const entity = new GiftCardEntity(card);

    await this.invalidateGiftCardCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'GIFT_CARD_CREATED',
      entityType: 'GiftCard',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: {
        initialBalance: entity.initialBalance,
        currency: entity.currency,
        maskedCode: this.maskCode(entity.giftCardCode),
      },
    });

    await this.eventBus.publish(
      new GiftCardCreatedEvent(
        {
          giftCardId: entity.id,
          salonId: entity.salonId,
          initialBalance: entity.initialBalance,
          recipientEmail: entity.recipientEmail,
          expiresAt: entity.expiresAt,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async redeemGiftCard(
    input: RedeemGiftCardInput,
    actorId?: string,
  ): Promise<{ giftCard: GiftCardEntity; amountRedeemed: number; remainingBalance: number }> {
    if (input.amount <= 0) {
      throw new BadRequestException('Redemption amount must be greater than 0.');
    }

    const card = await this.giftCardRepo.findByCode(input.giftCardCode, input.salonId);
    if (!card) {
      throw new NotFoundException('Gift card not found or not valid for this salon.');
    }

    const cardEntity = new GiftCardEntity(card);
    if (!cardEntity.isRedeemable()) {
      throw new ConflictException(
        `Gift card cannot be redeemed. Status: ${card.status}, Expired: ${card.expiresAt < new Date()}`,
      );
    }

    if (card.currentBalance < input.amount) {
      throw new ConflictException(
        `Insufficient gift card balance. Current: ₹${card.currentBalance / 100}, Requested: ₹${input.amount / 100}`,
      );
    }

    const balanceBefore = card.currentBalance;
    const balanceAfter = balanceBefore - input.amount;

    const { updatedCard, tx } = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.giftCardRepo.debitBalance(card.id, input.amount, card.version, tx);

      const transaction = await this.txRepo.create(
        {
          giftCardId: card.id,
          bookingId: input.bookingId ?? null,
          invoiceId: input.invoiceId ?? null,
          transactionType: GiftCardTransactionType.REDEMPTION,
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          notes: input.bookingId ? `Redemption for booking ${input.bookingId}` : 'Gift card redemption',
          performedByUserId: actorId,
        },
        tx,
      );

      return { updatedCard: updated, tx: transaction };
    });

    const resultEntity = new GiftCardEntity(updatedCard);

    await this.invalidateGiftCardCache(resultEntity.salonId, resultEntity.id);

    await this.auditService.log({
      action: 'GIFT_CARD_REDEEMED',
      entityType: 'GiftCard',
      entityId: resultEntity.id,
      actorId,
      metadata: { salonId: resultEntity.salonId },
      newState: {
        amountRedeemed: input.amount,
        remainingBalance: resultEntity.currentBalance,
        bookingId: input.bookingId,
      },
      entityVersion: resultEntity.version,
    });

    await this.eventBus.publish(
      new GiftCardRedeemedEvent(
        {
          giftCardId: resultEntity.id,
          salonId: resultEntity.salonId,
          transactionId: tx.id,
          amountRedeemed: input.amount,
          balanceRemaining: resultEntity.currentBalance,
          bookingId: input.bookingId,
        },
        actorId,
      ),
    );

    return {
      giftCard: resultEntity,
      amountRedeemed: input.amount,
      remainingBalance: resultEntity.currentBalance,
    };
  }

  public async refundCredit(
    input: RefundGiftCardInput,
    actorId?: string,
  ): Promise<GiftCardEntity> {
    if (input.amount <= 0) {
      throw new BadRequestException('Refund credit amount must be greater than 0.');
    }

    const card = await this.giftCardRepo.findById(input.giftCardId, input.salonId);
    if (!card) {
      throw new NotFoundException(`Gift card with id ${input.giftCardId} not found.`);
    }

    if (card.currentBalance + input.amount > card.initialBalance) {
      throw new ConflictException('Refund amount exceeds the original gift card initial balance.');
    }

    const balanceBefore = card.currentBalance;
    const balanceAfter = balanceBefore + input.amount;

    const { updatedCard, tx } = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updated = await this.giftCardRepo.creditBalance(card.id, input.amount, card.version, tx);

      const transaction = await this.txRepo.create(
        {
          giftCardId: card.id,
          bookingId: input.bookingId ?? null,
          invoiceId: input.invoiceId ?? null,
          transactionType: GiftCardTransactionType.REFUND_CREDIT,
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          notes: input.notes ?? 'Refund credit to gift card',
          performedByUserId: actorId,
        },
        tx,
      );

      return { updatedCard: updated, tx: transaction };
    });

    const entity = new GiftCardEntity(updatedCard);

    await this.invalidateGiftCardCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'GIFT_CARD_REFUND_CREDITED',
      entityType: 'GiftCard',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: {
        amountCredited: input.amount,
        newBalance: entity.currentBalance,
      },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new GiftCardRefundCreditedEvent(
        {
          giftCardId: entity.id,
          salonId: entity.salonId,
          transactionId: tx.id,
          amountCredited: input.amount,
          newBalance: entity.currentBalance,
          notes: input.notes,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async freezeGiftCard(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<GiftCardEntity> {
    const updated = await this.giftCardRepo.freeze(id, expectedVersion);
    const entity = new GiftCardEntity(updated);

    await this.invalidateGiftCardCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'GIFT_CARD_FROZEN',
      entityType: 'GiftCard',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { status: GiftCardStatus.FROZEN },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new GiftCardFrozenEvent({ giftCardId: entity.id, salonId: entity.salonId }, actorId),
    );

    return entity;
  }

  public async cancelGiftCard(
    id: string,
    salonId?: string,
    reason?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<GiftCardEntity> {
    const updated = await this.giftCardRepo.cancel(id, expectedVersion);
    const entity = new GiftCardEntity(updated);

    await this.invalidateGiftCardCache(entity.salonId, entity.id);

    await this.auditService.log({
      action: 'GIFT_CARD_CANCELLED',
      entityType: 'GiftCard',
      entityId: entity.id,
      actorId,
      metadata: { salonId: entity.salonId },
      newState: { status: GiftCardStatus.CANCELLED, reason },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new GiftCardCancelledEvent(
        { giftCardId: entity.id, salonId: entity.salonId, reason },
        actorId,
      ),
    );

    return entity;
  }

  public async getGiftCardById(id: string, salonId?: string): Promise<GiftCardEntity> {
    const card = await this.giftCardRepo.findById(id, salonId);
    if (!card) {
      throw new NotFoundException(`Gift card with id ${id} not found.`);
    }
    return new GiftCardEntity(card);
  }

  public async getGiftCardByCode(code: string, salonId?: string): Promise<GiftCardEntity> {
    const card = await this.giftCardRepo.findByCode(code, salonId);
    if (!card) {
      throw new NotFoundException('Gift card not found.');
    }
    return new GiftCardEntity(card);
  }

  public async searchGiftCards(
    query: SearchGiftCardQueryDto,
  ): Promise<{ data: GiftCardEntity[]; total: number }> {
    const res = await this.giftCardRepo.search(query);
    return {
      data: res.data.map((g) => new GiftCardEntity(g)),
      total: res.total,
    };
  }

  private generateGiftCardCode(): string {
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `GC-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}`;
  }

  private maskCode(code: string): string {
    if (code.length < 8) return '****';
    return `${code.slice(0, 5)}****${code.slice(-4)}`;
  }

  private async invalidateGiftCardCache(salonId: string, cardId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`giftcard:${cardId}`),
      this.cacheService.delete(`salon:${salonId}:giftcards:all`),
    ]);
  }
}
