import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffTerminatedEvent extends BaseDomainEvent<{ staffId: string; salonId: string; actorId?: string; terminatedAt: Date }> {
  constructor(staffId: string, salonId: string, actorId?: string, terminatedAt: Date = new Date()) {
    super('staff.terminated.v1', staffId, 1, { staffId, salonId, actorId, terminatedAt });
  }
}
