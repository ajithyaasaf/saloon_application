import { IDomainEvent } from '../base/domain-event.base';

/**
 * EventHandler — Function signature for handling a subscribed domain event.
 */
export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void>;

/**
 * IEventBusService — Provider-agnostic public interface for domain event publishing and subscription.
 *
 * Architecture ref: Phase 9.2 §4.4
 */
export interface IEventBusService {
  publish<T>(event: IDomainEvent<T>): Promise<void>;
  publishMany<T>(events: IDomainEvent<T>[]): Promise<void>;
  publishAsync<T>(event: IDomainEvent<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: EventHandler<T>): () => void;

  // Reserved Event Replay Contract
  replay?(eventName: string, fromTimestamp: string): Promise<void>;
}
