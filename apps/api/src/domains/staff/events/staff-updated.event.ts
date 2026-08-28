import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffUpdatedEvent extends BaseDomainEvent<{ staffId: string; salonId: string }> {
  constructor(staffId: string, salonId: string) {
    super('staff.updated.v1', staffId, 1, { staffId, salonId });
  }
}
