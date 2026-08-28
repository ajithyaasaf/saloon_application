import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class LeaveApprovedEvent extends BaseDomainEvent<{ leaveId: string; staffId: string; approverId?: string; startDate: Date; endDate: Date }> {
  constructor(leaveId: string, staffId: string, approverId?: string, startDate: Date = new Date(), endDate: Date = new Date()) {
    super('leave.approved.v1', leaveId, 1, { leaveId, staffId, approverId, startDate, endDate });
  }
}
