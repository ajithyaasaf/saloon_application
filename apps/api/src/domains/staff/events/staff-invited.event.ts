import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffInvitedEvent extends BaseDomainEvent<{ staffId: string; salonId: string; invitePhone?: string; inviteEmail?: string; expiresAt?: Date }> {
  constructor(staffId: string, salonId: string, invitePhone?: string, inviteEmail?: string, expiresAt?: Date) {
    super('staff.invited.v1', staffId, 1, { staffId, salonId, invitePhone, inviteEmail, expiresAt });
  }
}
