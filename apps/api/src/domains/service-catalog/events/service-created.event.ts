import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class ServiceCreatedEvent extends BaseDomainEvent<{ serviceId: string; categoryId: string; name: string }> {
  constructor(serviceId: string, categoryId: string, name: string) {
    super('service.created.v1', serviceId, 1, { serviceId, categoryId, name });
  }
}
