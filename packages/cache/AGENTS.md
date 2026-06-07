# @dbun/cache - AI Agent Instructions

## Overview

@dbun/cache provides the caching layer for Discord entities. Uses an adapter pattern supporting multiple backends: Memory, LRU, WeakRef, and Redis (via `bun:redis`). The `Collection<K,V>` class extends `Map` with query utilities and is used for in-process entity storage on structures.

## Commands

```bash
bun run build    # tsdown build
bun run dev      # watch mode
bun run lint     # oxlint src
bun run fmt      # oxfmt src
bun run typecheck # tsgo --noEmit
bun run clean    # rm -rf dist .turbo
```

## Key Exports

- `Collection<K,V>` - Extended Map with utility methods (find, filter, map, etc.)
- `CacheAdapter` - Interface for pluggable cache backends
- `CacheOptions` - Options type (`maxAge` in ms, `max` key count, `sweepInterval`)
- `MemoryAdapter` - In-memory, FIFO eviction on `max`, TTL + auto-sweep support
- `LRUAdapter` - In-memory, Least-Recently-Used eviction on `max`, TTL + auto-sweep support
- `WeakRefAdapter` - In-memory via `WeakRef`/`FinalizationRegistry`, GC-friendly, TTL + `max` + auto-sweep
- `RedisAdapter` - Remote via `bun:redis` (built-in), TTL (server-side via `EXPIRE`) + `max` support
- `CacheManager` - Facade over an adapter with per-namespace strategies, exposes `stop()`

## Architecture

- **Sweep**: All in-memory adapters run a periodic sweep timer (default 6h) that iterates all entries and deletes expired ones. Configure via `sweepInterval` in `CacheOptions` (0 to disable). Redis relies on server-side TTL.
- **`stop()`**: Every adapter and `CacheManager` implements `stop(): Promise<void>` to cleanly shut down sweep timers.
- **`CacheManager.setStrategy(namespace, opts)`**: Set per-resource TTL/max at runtime.
- Adapter `stop()` must be called on client destroy to prevent dangling timers.
- See `CacheAdapter` interface in `src/adapter.ts` for all methods.

## Per-Resource TTL (Client Level)

The `@dbun/client` package accepts per-resource cache config:

```typescript
const client = new Client({
  token,
  intents: [Intents.Guilds, Intents.GuildMessages],
  cache: {
    adapter: new LRUAdapter({ max: 2000 }),
    resources: {
      messages: { maxAge: 600_000 },  // 10 minutes
      guilds:   { maxAge: 21_600_000 }, // 6 hours
      users:    { maxAge: 3_600_000 },  // 1 hour
    },
  },
});
```

## Common Patterns

```typescript
import {
  Collection, CacheManager,
  MemoryAdapter, LRUAdapter, WeakRefAdapter, RedisAdapter,
} from "@dbun/cache";
import type { User } from "@dbun/types";

// Memory with FIFO eviction at 1000 keys
const mem = new CacheManager<User>({
  adapter: new MemoryAdapter({ max: 1000, maxAge: 60_000 }),
});

// LRU — best for hot data with size cap
const lru = new CacheManager<User>({
  adapter: new LRUAdapter({ max: 500, maxAge: 30_000 }),
});

// WeakRef — GC-pressure friendly, great for large sparse caches
const weak = new CacheManager<User>({
  adapter: new WeakRefAdapter({ maxAge: 120_000 }),
});

// Redis — uses REDIS_URL env var by default
const redis = new CacheManager<User>({
  adapter: new RedisAdapter({ prefix: "mybot:cache:" }),
});

await cache.set("userId", userData);
const user = await cache.get("userId");

// Clean shutdown
await cache.stop();
```

## Dependencies

- `@dbun/types` (workspace)
- `bun:redis` (built-in, used only by RedisAdapter)

## Testing

- Each adapter: test `max` eviction (FIFO vs LRU ordering), TTL expiry, stale cleanup
- Sweep: verify expired entries are deleted after `sweepInterval`
- `stop()`: verify timer is cleared and no memory leak
- RedisAdapter: needs a running Redis instance or mock `RedisClient`
