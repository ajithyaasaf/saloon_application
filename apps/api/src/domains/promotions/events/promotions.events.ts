import {
  CouponDiscountType,
  CouponStatus,
  CouponUsageStatus,
  FlashSaleStatus,
  GiftCardStatus,
  GiftCardTransactionType,
  MarketingCampaignStatus,
} from '@prisma/client';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

// ─── Coupon Events ────────────────────────────────────────────────────────────

export interface CouponCreatedPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
}

export class CouponCreatedEvent extends BaseDomainEvent<CouponCreatedPayload> {
  static readonly EVENT_NAME = 'coupon.created.v1';
  constructor(payload: CouponCreatedPayload, actorId?: string) {
    super(CouponCreatedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponUpdatedPayload {
  couponId: string;
  salonId?: string | null;
  updatedFields: string[];
}

export class CouponUpdatedEvent extends BaseDomainEvent<CouponUpdatedPayload> {
  static readonly EVENT_NAME = 'coupon.updated.v1';
  constructor(payload: CouponUpdatedPayload, actorId?: string) {
    super(CouponUpdatedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponActivatedPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
}

export class CouponActivatedEvent extends BaseDomainEvent<CouponActivatedPayload> {
  static readonly EVENT_NAME = 'coupon.activated.v1';
  constructor(payload: CouponActivatedPayload, actorId?: string) {
    super(CouponActivatedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponPausedPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
}

export class CouponPausedEvent extends BaseDomainEvent<CouponPausedPayload> {
  static readonly EVENT_NAME = 'coupon.paused.v1';
  constructor(payload: CouponPausedPayload, actorId?: string) {
    super(CouponPausedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponExpiredPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
}

export class CouponExpiredEvent extends BaseDomainEvent<CouponExpiredPayload> {
  static readonly EVENT_NAME = 'coupon.expired.v1';
  constructor(payload: CouponExpiredPayload, actorId?: string) {
    super(CouponExpiredEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponDepletedPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
  totalUsageLimit: number;
}

export class CouponDepletedEvent extends BaseDomainEvent<CouponDepletedPayload> {
  static readonly EVENT_NAME = 'coupon.depleted.v1';
  constructor(payload: CouponDepletedPayload, actorId?: string) {
    super(CouponDepletedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponArchivedPayload {
  couponId: string;
  salonId?: string | null;
  code: string;
}

export class CouponArchivedEvent extends BaseDomainEvent<CouponArchivedPayload> {
  static readonly EVENT_NAME = 'coupon.archived.v1';
  constructor(payload: CouponArchivedPayload, actorId?: string) {
    super(CouponArchivedEvent.EVENT_NAME, payload.couponId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponAppliedPayload {
  usageId: string;
  couponId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  bookingId?: string | null;
  discountAmount: number;
}

export class CouponAppliedEvent extends BaseDomainEvent<CouponAppliedPayload> {
  static readonly EVENT_NAME = 'coupon.applied.v1';
  constructor(payload: CouponAppliedPayload, actorId?: string) {
    super(CouponAppliedEvent.EVENT_NAME, payload.usageId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponSettledPayload {
  usageId: string;
  couponId: string;
  salonId: string;
  customerId: string;
  bookingId?: string | null;
  invoiceId?: string | null;
  discountAmount: number;
}

export class CouponSettledEvent extends BaseDomainEvent<CouponSettledPayload> {
  static readonly EVENT_NAME = 'coupon.settled.v1';
  constructor(payload: CouponSettledPayload, actorId?: string) {
    super(CouponSettledEvent.EVENT_NAME, payload.usageId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CouponReversedPayload {
  usageId: string;
  couponId: string;
  salonId: string;
  customerId: string;
  reversalReason: string;
  discountAmount: number;
}

export class CouponReversedEvent extends BaseDomainEvent<CouponReversedPayload> {
  static readonly EVENT_NAME = 'coupon.reversed.v1';
  constructor(payload: CouponReversedPayload, actorId?: string) {
    super(CouponReversedEvent.EVENT_NAME, payload.usageId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Gift Card Events ─────────────────────────────────────────────────────────

export interface GiftCardCreatedPayload {
  giftCardId: string;
  salonId: string;
  initialBalance: number;
  recipientEmail?: string | null;
  expiresAt: Date;
}

export class GiftCardCreatedEvent extends BaseDomainEvent<GiftCardCreatedPayload> {
  static readonly EVENT_NAME = 'gift-card.created.v1';
  constructor(payload: GiftCardCreatedPayload, actorId?: string) {
    super(GiftCardCreatedEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GiftCardRedeemedPayload {
  giftCardId: string;
  salonId: string;
  transactionId: string;
  amountRedeemed: number;
  balanceRemaining: number;
  bookingId?: string | null;
}

export class GiftCardRedeemedEvent extends BaseDomainEvent<GiftCardRedeemedPayload> {
  static readonly EVENT_NAME = 'gift-card.redeemed.v1';
  constructor(payload: GiftCardRedeemedPayload, actorId?: string) {
    super(GiftCardRedeemedEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GiftCardRefundCreditedPayload {
  giftCardId: string;
  salonId: string;
  transactionId: string;
  amountCredited: number;
  newBalance: number;
  notes?: string | null;
}

export class GiftCardRefundCreditedEvent extends BaseDomainEvent<GiftCardRefundCreditedPayload> {
  static readonly EVENT_NAME = 'gift-card.refund-credited.v1';
  constructor(payload: GiftCardRefundCreditedPayload, actorId?: string) {
    super(GiftCardRefundCreditedEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GiftCardExpiredPayload {
  giftCardId: string;
  salonId: string;
  forfeitedBalance: number;
}

export class GiftCardExpiredEvent extends BaseDomainEvent<GiftCardExpiredPayload> {
  static readonly EVENT_NAME = 'gift-card.expired.v1';
  constructor(payload: GiftCardExpiredPayload, actorId?: string) {
    super(GiftCardExpiredEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GiftCardCancelledPayload {
  giftCardId: string;
  salonId: string;
  reason?: string;
}

export class GiftCardCancelledEvent extends BaseDomainEvent<GiftCardCancelledPayload> {
  static readonly EVENT_NAME = 'gift-card.cancelled.v1';
  constructor(payload: GiftCardCancelledPayload, actorId?: string) {
    super(GiftCardCancelledEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GiftCardFrozenPayload {
  giftCardId: string;
  salonId: string;
}

export class GiftCardFrozenEvent extends BaseDomainEvent<GiftCardFrozenPayload> {
  static readonly EVENT_NAME = 'gift-card.frozen.v1';
  constructor(payload: GiftCardFrozenPayload, actorId?: string) {
    super(GiftCardFrozenEvent.EVENT_NAME, payload.giftCardId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Flash Sale Events ────────────────────────────────────────────────────────

export interface FlashSaleCreatedPayload {
  flashSaleId: string;
  salonId: string;
  branchId: string;
  serviceId: string;
  discountPercentage: number;
  specialPrice: number;
  startTime: Date;
  endTime: Date;
  maxSlotQuota: number;
}

export class FlashSaleCreatedEvent extends BaseDomainEvent<FlashSaleCreatedPayload> {
  static readonly EVENT_NAME = 'flash-sale.created.v1';
  constructor(payload: FlashSaleCreatedPayload, actorId?: string) {
    super(FlashSaleCreatedEvent.EVENT_NAME, payload.flashSaleId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface FlashSaleActivatedPayload {
  flashSaleId: string;
  salonId: string;
  branchId: string;
  serviceId: string;
}

export class FlashSaleActivatedEvent extends BaseDomainEvent<FlashSaleActivatedPayload> {
  static readonly EVENT_NAME = 'flash-sale.activated.v1';
  constructor(payload: FlashSaleActivatedPayload, actorId?: string) {
    super(FlashSaleActivatedEvent.EVENT_NAME, payload.flashSaleId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface FlashSaleEndedPayload {
  flashSaleId: string;
  salonId: string;
  bookedSlotCount: number;
}

export class FlashSaleEndedEvent extends BaseDomainEvent<FlashSaleEndedPayload> {
  static readonly EVENT_NAME = 'flash-sale.ended.v1';
  constructor(payload: FlashSaleEndedPayload, actorId?: string) {
    super(FlashSaleEndedEvent.EVENT_NAME, payload.flashSaleId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface FlashSaleCancelledPayload {
  flashSaleId: string;
  salonId: string;
  reason?: string;
}

export class FlashSaleCancelledEvent extends BaseDomainEvent<FlashSaleCancelledPayload> {
  static readonly EVENT_NAME = 'flash-sale.cancelled.v1';
  constructor(payload: FlashSaleCancelledPayload, actorId?: string) {
    super(FlashSaleCancelledEvent.EVENT_NAME, payload.flashSaleId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Marketing Campaign Events ────────────────────────────────────────────────

export interface MarketingCampaignCreatedPayload {
  campaignId: string;
  campaignCode: string;
  salonId: string;
  name: string;
  couponId?: string | null;
}

export class MarketingCampaignCreatedEvent extends BaseDomainEvent<MarketingCampaignCreatedPayload> {
  static readonly EVENT_NAME = 'marketing-campaign.created.v1';
  constructor(payload: MarketingCampaignCreatedPayload, actorId?: string) {
    super(MarketingCampaignCreatedEvent.EVENT_NAME, payload.campaignId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MarketingCampaignScheduledPayload {
  campaignId: string;
  salonId: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
}

export class MarketingCampaignScheduledEvent extends BaseDomainEvent<MarketingCampaignScheduledPayload> {
  static readonly EVENT_NAME = 'marketing-campaign.scheduled.v1';
  constructor(payload: MarketingCampaignScheduledPayload, actorId?: string) {
    super(MarketingCampaignScheduledEvent.EVENT_NAME, payload.campaignId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MarketingCampaignStartedPayload {
  campaignId: string;
  salonId: string;
}

export class MarketingCampaignStartedEvent extends BaseDomainEvent<MarketingCampaignStartedPayload> {
  static readonly EVENT_NAME = 'marketing-campaign.started.v1';
  constructor(payload: MarketingCampaignStartedPayload, actorId?: string) {
    super(MarketingCampaignStartedEvent.EVENT_NAME, payload.campaignId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MarketingCampaignCompletedPayload {
  campaignId: string;
  salonId: string;
  impressionsCount: number;
  clicksCount: number;
  bookingsCount: number;
  revenueGenerated: number;
}

export class MarketingCampaignCompletedEvent extends BaseDomainEvent<MarketingCampaignCompletedPayload> {
  static readonly EVENT_NAME = 'marketing-campaign.completed.v1';
  constructor(payload: MarketingCampaignCompletedPayload, actorId?: string) {
    super(MarketingCampaignCompletedEvent.EVENT_NAME, payload.campaignId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MarketingCampaignCancelledPayload {
  campaignId: string;
  salonId: string;
  reason?: string;
}

export class MarketingCampaignCancelledEvent extends BaseDomainEvent<MarketingCampaignCancelledPayload> {
  static readonly EVENT_NAME = 'marketing-campaign.cancelled.v1';
  constructor(payload: MarketingCampaignCancelledPayload, actorId?: string) {
    super(MarketingCampaignCancelledEvent.EVENT_NAME, payload.campaignId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}
