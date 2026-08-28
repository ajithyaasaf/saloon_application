import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface CustomerCreatedPayload {
  customerProfileId: string;
  salonId: string;
  primaryBranchId: string;
  customerCode: string;
  phone: string;
}

export class CustomerCreatedEvent extends BaseDomainEvent<CustomerCreatedPayload> {
  static readonly EVENT_NAME = 'customer.created.v1';
  constructor(payload: CustomerCreatedPayload, actorId?: string) {
    super(CustomerCreatedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerUpdatedPayload {
  customerProfileId: string;
  salonId: string;
  updatedFields: string[];
}

export class CustomerUpdatedEvent extends BaseDomainEvent<CustomerUpdatedPayload> {
  static readonly EVENT_NAME = 'customer.updated.v1';
  constructor(payload: CustomerUpdatedPayload, actorId?: string) {
    super(CustomerUpdatedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerBlockedPayload {
  customerProfileId: string;
  salonId: string;
  blacklistType?: string;
  reason?: string;
}

export class CustomerBlockedEvent extends BaseDomainEvent<CustomerBlockedPayload> {
  static readonly EVENT_NAME = 'customer.blocked.v1';
  constructor(payload: CustomerBlockedPayload, actorId?: string) {
    super(CustomerBlockedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerUnblockedPayload {
  customerProfileId: string;
  salonId: string;
}

export class CustomerUnblockedEvent extends BaseDomainEvent<CustomerUnblockedPayload> {
  static readonly EVENT_NAME = 'customer.unblocked.v1';
  constructor(payload: CustomerUnblockedPayload, actorId?: string) {
    super(CustomerUnblockedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerArchivedPayload {
  customerProfileId: string;
  salonId: string;
}

export class CustomerArchivedEvent extends BaseDomainEvent<CustomerArchivedPayload> {
  static readonly EVENT_NAME = 'customer.archived.v1';
  constructor(payload: CustomerArchivedPayload, actorId?: string) {
    super(CustomerArchivedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerTagAssignedPayload {
  customerProfileId: string;
  tagId: string;
  tagName: string;
}

export class CustomerTagAssignedEvent extends BaseDomainEvent<CustomerTagAssignedPayload> {
  static readonly EVENT_NAME = 'customer.tag-assigned.v1';
  constructor(payload: CustomerTagAssignedPayload, actorId?: string) {
    super(CustomerTagAssignedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerNoteAddedPayload {
  customerProfileId: string;
  noteId: string;
  branchId: string;
}

export class CustomerNoteAddedEvent extends BaseDomainEvent<CustomerNoteAddedPayload> {
  static readonly EVENT_NAME = 'customer.note-added.v1';
  constructor(payload: CustomerNoteAddedPayload, actorId?: string) {
    super(CustomerNoteAddedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface LoyaltyPointsEarnedPayload {
  customerProfileId: string;
  pointsEarned: number;
  newBalance: number;
  referenceType?: string;
  referenceId?: string;
}

export class LoyaltyPointsEarnedEvent extends BaseDomainEvent<LoyaltyPointsEarnedPayload> {
  static readonly EVENT_NAME = 'loyalty.points-earned.v1';
  constructor(payload: LoyaltyPointsEarnedPayload, actorId?: string) {
    super(LoyaltyPointsEarnedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface LoyaltyPointsRedeemedPayload {
  customerProfileId: string;
  pointsRedeemed: number;
  newBalance: number;
  referenceType?: string;
  referenceId?: string;
}

export class LoyaltyPointsRedeemedEvent extends BaseDomainEvent<LoyaltyPointsRedeemedPayload> {
  static readonly EVENT_NAME = 'loyalty.points-redeemed.v1';
  constructor(payload: LoyaltyPointsRedeemedPayload, actorId?: string) {
    super(LoyaltyPointsRedeemedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MembershipCreatedPayload {
  customerMembershipId: string;
  customerProfileId: string;
  membershipPlanId: string;
  endDate: Date;
}

export class MembershipCreatedEvent extends BaseDomainEvent<MembershipCreatedPayload> {
  static readonly EVENT_NAME = 'membership.created.v1';
  constructor(payload: MembershipCreatedPayload, actorId?: string) {
    super(MembershipCreatedEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface MembershipExpiredPayload {
  customerMembershipId: string;
  customerProfileId: string;
}

export class MembershipExpiredEvent extends BaseDomainEvent<MembershipExpiredPayload> {
  static readonly EVENT_NAME = 'membership.expired.v1';
  constructor(payload: MembershipExpiredPayload) {
    super(MembershipExpiredEvent.EVENT_NAME, payload.customerProfileId, 1, payload);
  }
}

export interface MembershipCancelledPayload {
  customerMembershipId: string;
  customerProfileId: string;
}

export class MembershipCancelledEvent extends BaseDomainEvent<MembershipCancelledPayload> {
  static readonly EVENT_NAME = 'membership.cancelled.v1';
  constructor(payload: MembershipCancelledPayload, actorId?: string) {
    super(MembershipCancelledEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface WalletCreditPayload {
  customerProfileId: string;
  amount: number;
  newBalance: number;
  referenceType?: string;
  referenceId?: string;
}

export class WalletCreditEvent extends BaseDomainEvent<WalletCreditPayload> {
  static readonly EVENT_NAME = 'wallet.credit.v1';
  constructor(payload: WalletCreditPayload, actorId?: string) {
    super(WalletCreditEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface WalletDebitPayload {
  customerProfileId: string;
  amount: number;
  newBalance: number;
  referenceType?: string;
  referenceId?: string;
}

export class WalletDebitEvent extends BaseDomainEvent<WalletDebitPayload> {
  static readonly EVENT_NAME = 'wallet.debit.v1';
  constructor(payload: WalletDebitPayload, actorId?: string) {
    super(WalletDebitEvent.EVENT_NAME, payload.customerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReferralCreatedPayload {
  customerReferralId: string;
  referrerCustomerProfileId: string;
  referredPhone: string;
}

export class ReferralCreatedEvent extends BaseDomainEvent<ReferralCreatedPayload> {
  static readonly EVENT_NAME = 'referral.created.v1';
  constructor(payload: ReferralCreatedPayload, actorId?: string) {
    super(ReferralCreatedEvent.EVENT_NAME, payload.referrerCustomerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ReferralRewardedPayload {
  customerReferralId: string;
  referrerCustomerProfileId: string;
  rewardPoints: number;
  rewardAmount: number;
}

export class ReferralRewardedEvent extends BaseDomainEvent<ReferralRewardedPayload> {
  static readonly EVENT_NAME = 'referral.rewarded.v1';
  constructor(payload: ReferralRewardedPayload, actorId?: string) {
    super(ReferralRewardedEvent.EVENT_NAME, payload.referrerCustomerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface CustomerMergedPayload {
  sourceCustomerProfileId: string;
  targetCustomerProfileId: string;
}

export class CustomerMergedEvent extends BaseDomainEvent<CustomerMergedPayload> {
  static readonly EVENT_NAME = 'customer.merged.v1';
  constructor(payload: CustomerMergedPayload, actorId?: string) {
    super(CustomerMergedEvent.EVENT_NAME, payload.targetCustomerProfileId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}
