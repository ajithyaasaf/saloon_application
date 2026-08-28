import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class WorkingHoursUpdatedEvent extends BaseDomainEvent<{ staffId: string; branchId: string }> {
  constructor(staffId: string, branchId: string) {
    super('working-hours.updated.v1', staffId, 1, { staffId, branchId });
  }
}
