import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffActivatedEvent extends BaseDomainEvent<{ staffId: string; salonId: string; userId: string }> {
  constructor(staffId: string, salonId: string, userId: string) {
    super('staff.activated.v1', staffId, 1, { staffId, salonId, userId });
  }
}
