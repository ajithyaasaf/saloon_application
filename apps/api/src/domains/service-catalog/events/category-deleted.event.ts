import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class CategoryDeletedEvent extends BaseDomainEvent<{ categoryId: string }> {
  constructor(categoryId: string) {
    super('category.deleted.v1', categoryId, 1, { categoryId });
  }
}
