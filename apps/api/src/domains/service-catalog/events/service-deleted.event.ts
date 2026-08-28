import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class ServiceDeletedEvent extends BaseDomainEvent<{ serviceId: string }> {
  constructor(serviceId: string) {
    super('service.deleted.v1', serviceId, 1, { serviceId });
  }
}
