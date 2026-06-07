# @dbun/ipc - AI Agent Instructions

## Overview

@dbun/ipc provides cross-machine sharding for @dbun. It distributes Discord gateway shards across processes or machines using pluggable IPC transports (Redis Pub/Sub, Redis Streams, Worker Threads).

The primary usage is through `Client` from `@dbun/client` with the `ipc` option. The standalone `Coordinator` and `Worker` classes are low-level building blocks used internally.

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

- `redisPubSubAdapter` — Create a Redis Pub/Sub IPC adapter
- `redisStreamsAdapter` — Create a Redis Streams IPC adapter
- `workerThreadsAdapter` — Create a Worker Threads IPC adapter
- `Worker` — Lightweight shard runner for worker processes
- `ShardRange` — Shard range with start, end, exclude
- `IPCAdapter` — Interface for pluggable IPC transports
- `IPCMessage` — Message protocol type
- `ShardAssignment` — Assignment sent from coordinator (range + totalShards)
- `RoundRobinStrategy` — Default assignment strategy
- `ManualStrategy` — Explicit per-worker ranges
- `Coordinator` — Low-level coordinator (used internally by GatewayManager)
- `GatewayManager` — Low-level gateway manager (used internally by Client)

## Architecture

### Usage via Client (recommended)

```typescript
// Coordinator process — full bot with IPC
import { Client, Intents } from "@dbun/client";
import { redisPubSubAdapter } from "@dbun/ipc";

const client = new Client({
  token: process.env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
  ipc: {
    mode: "coordinator",
    adapter: await redisPubSubAdapter({ url: process.env.REDIS_URL }),
    totalShards: "auto",
    assignment: "auto",
  },
});

client.on("messageCreate", (msg) => { /* normal event handling */ });
await client.login();
```

```typescript
// Worker process — lightweight shard runner
import { Worker, redisPubSubAdapter } from "@dbun/ipc";
import { Intents } from "@dbun/types";

const worker = new Worker({
  adapter: await redisPubSubAdapter({ url: process.env.REDIS_URL }),
  workerId: "worker-1",
  token: process.env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
});
await worker.start();
```

### Internal flow

1. `Client.login()` with `ipc.mode: "coordinator"` creates a `GatewayManager`
2. `GatewayManager` creates a `Coordinator` which manages shard assignment via the IPC adapter
3. Workers register with the coordinator, receive shard assignments, and connect to Discord
4. Workers forward all gateway events to the coordinator via IPC
5. Coordinator feeds events into `Client.handleDispatch()` — cache, interactions, and user events all work normally

### Shard Assignment

Three modes:
1. **Auto** (`"auto"`) — Coordinator splits `totalShards` evenly across registered workers. Rebalances on join/leave.
2. **Manual** (`Record<string, ShardRange>`) — Explicit ranges per worker. No rebalancing.
3. **Custom** (`AssignmentStrategy`) — User-defined `assign(workerIds, totalShards)` method.

### ShardRange

```typescript
interface ShardRange {
  start: number;      // first shard ID (inclusive)
  end: number;        // last shard ID (inclusive)
  exclude?: number[]; // shard IDs to skip
}
```

Helper: `expandRange(range)` returns `number[]` of all shard IDs in the range.

### Health Monitoring

- Workers send heartbeats every 15 seconds (configurable)
- Coordinator checks for stale workers every 30 seconds
- Worker is considered dead after missing 3 consecutive heartbeats
- Dead worker's shards are redistributed to surviving workers (auto mode only)

### IPC Adapters

- **Redis Pub/Sub** (`redisPubSubAdapter`): Uses Bun native `RedisClient` with pub/sub. Workers subscribe to their own channel for direct messages. Presence stored in Redis hash.
- **Redis Streams** (`redisStreamsAdapter`): Uses `XADD`/`XREADGROUP` with separate consumer groups per worker. Persistent delivery.
- **Worker Threads** (`workerThreadsAdapter`): Uses Bun `Worker` API with `postMessage`/`onmessage`. No external dependencies.

## Dependencies

- `@dbun/types` (workspace) — Discord API types
- `@dbun/ws` (workspace) — Shard, ShardManager, ShardOptions
- `bun` (built-in) — Native Redis client (`RedisClient`) for Redis adapters
- `@dbun/client` (optional peer) — Client integration via `ipc` option

## Testing

- Mock IPCAdapter for unit tests (no Redis needed)
- Test shard assignment strategies in isolation
- Test coordinator health check and redistribution logic
- Test message serialization/deserialization
- Client IPC tests in `@dbun/client/src/__tests__/ipc.test.ts`
