import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffCreatedEvent extends BaseDomainEvent<{ staffId: string; salonId: string; role: string; employeeCode: string }> {
  constructor(staffId: string, salonId: string, role: string, employeeCode: string) {
    super('staff.created.v1', staffId, 1, { staffId, salonId, role, employeeCode });
  }
}
