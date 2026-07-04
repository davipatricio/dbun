export { Collection } from "./collection.js";
export { type CacheAdapter, type CacheOptions } from "./adapter.js";
export { MemoryAdapter } from "./adapters/memory.js";
export { LRUAdapter } from "./adapters/lru.js";
export { WeakRefAdapter } from "./adapters/weakref.js";
export { RedisAdapter } from "./adapters/redis.js";
export type { RedisAdapterOptions } from "./adapters/redis.js";
export { CacheManager, type CacheManagerOptions } from "./cache-manager.js";
export type { CacheStrategy, CacheStrategyOptions } from "./strategy.js";
export {
  HydratingCache,
  isPartialEntry,
  getPartialValue,
  getFullValue,
  type HydratingCacheOptions,
  type CacheEnvelope,
} from "./hydrating-cache.js";
