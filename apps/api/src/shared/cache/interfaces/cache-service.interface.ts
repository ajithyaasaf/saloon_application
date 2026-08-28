/**
 * ICacheService — Public interface contract for multi-tier cache-aside operations.
 *
 * Architecture ref: Phase 9.2 §4.2
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  increment(key: string, value?: number): Promise<number>;
  decrement(key: string, value?: number): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;

  // Reserved Cache Tag & Metrics Contracts
  invalidateTag?(tag: string): Promise<void>;
}
