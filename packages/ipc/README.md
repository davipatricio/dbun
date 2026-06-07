# @dbun/ipc

Cross-machine sharding for @dbun. Distributes Discord gateway shards across processes or machines with pluggable IPC transports.

## Why?

A single process can only handle so many WebSocket shards (each ~30-50MB RAM + CPU). At 50,000+ guilds you need 50+ shards. At 100,000+ guilds, 100+ shards. One machine can't do it all.

@dbun/ipc lets you:

- **Scale horizontally** — run shards across multiple containers/machines
- **Auto-distribute** — coordinator assigns shards evenly, no per-container config
- **Auto-recover** — if a worker dies, its shards redistribute to survivors
- **Use any transport** — Redis Pub/Sub, Redis Streams, or Bun worker threads

## Install

```bash
bun add @dbun/ipc
```

## Quick Start

The recommended way to use IPC is through `Client` with the `ipc` option from `@dbun/client`. This gives you the full bot API — cache, REST, interactions, events — with shards running on remote workers.

### Coordinator (main process)

```typescript
import { Client, Intents } from "@dbun/client";
import { redisPubSubAdapter } from "@dbun/ipc";

const client = new Client({
  token: process.env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
  ipc: {
    mode: "coordinator",
    adapter: await redisPubSubAdapter({ url: "redis://redis:6379" }),
    totalShards: "auto",
    assignment: "auto",
  },
});

client.on("ready", () => console.log("All shards connected"));
client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") msg.reply("Pong!");
});

await client.login();
```

Cache, REST calls, interactions — everything works as if all shards were local.

### Worker (container process)

Workers don't need a full Client. Use `Worker` from `@dbun/ipc` directly:

```typescript
import { Worker, redisPubSubAdapter } from "@dbun/ipc";
import { Intents } from "@dbun/types";

const worker = new Worker({
  adapter: await redisPubSubAdapter({ url: "redis://redis:6379" }),
  workerId: process.env.WORKER_ID ?? "worker-1",
  token: process.env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
});

await worker.start();
```

Spin up N workers and the coordinator auto-distributes shards.

## Assignment Modes

### Auto (recommended)

The coordinator splits shards evenly across all registered workers. When a worker joins or leaves, shards rebalance automatically.

```typescript
const client = new Client({
  token, intents,
  ipc: {
    mode: "coordinator",
    adapter: await redisPubSubAdapter(),
    totalShards: 120,
    assignment: "auto",
  },
});
```

120 shards, 4 workers = 30 shards each. Add a 5th worker = 24 each. All automatic.

### Manual

Explicit shard ranges per worker. No rebalancing.

```typescript
const client = new Client({
  token, intents,
  ipc: {
    mode: "coordinator",
    adapter: await redisPubSubAdapter(),
    totalShards: 120,
    assignment: {
      "worker-1": { start: 0, end: 39 },
      "worker-2": { start: 40, end: 79, exclude: [55] },
      "worker-3": { start: 80, end: 119 },
    },
  },
});
```

### Custom Strategy

Implement `AssignmentStrategy` for custom logic:

```typescript
import type { AssignmentStrategy } from "@dbun/ipc";

const strategy: AssignmentStrategy = {
  assign(workerIds, totalShards) {
    // Your custom logic
    return new Map();
  },
};

const client = new Client({
  token, intents,
  ipc: { mode: "coordinator", adapter: await redisPubSubAdapter(), totalShards: 120, assignment: strategy },
});
```

## Shard Ranges

Shard ranges use the `ShardRange` type:

```typescript
interface ShardRange {
  start: number;   // first shard ID (inclusive)
  end: number;     // last shard ID (inclusive)
  exclude?: number[]; // shard IDs to skip
}
```

Examples:
- `{ start: 0, end: 29 }` — shards 0 through 29
- `{ start: 0, end: 99, exclude: [42, 43] }` — shards 0-99 except 42 and 43

## Adapters

### Redis Pub/Sub

Lowest latency. Fire-and-forget. Good for most use cases.

```typescript
import { redisPubSubAdapter } from "@dbun/ipc";

const adapter = await redisPubSubAdapter({
  url: "redis://localhost:6379",
  prefix: "mybot:ipc:", // default: "dbun:ipc:"
});
```

### Redis Streams

Persistent delivery with consumer groups. Messages survive coordinator restarts. At-least-once semantics.

```typescript
import { redisStreamsAdapter } from "@dbun/ipc";

const adapter = await redisStreamsAdapter({
  url: "redis://localhost:6379",
  prefix: "mybot:ipc:",
});
```

### Worker Threads

In-process via Bun's native `Worker` API. No external dependencies. Good for single-machine setups.

```typescript
import { workerThreadsAdapter } from "@dbun/ipc";

const adapter = await workerThreadsAdapter({
  workerScript: "./worker-entry.ts",
});
```

## Multi-Machine Setup

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine

  coordinator:
    build: .
    command: bun run coordinator.ts
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      REDIS_URL: redis://redis:6379

  worker-1:
    build: .
    command: bun run worker.ts
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      REDIS_URL: redis://redis:6379
      WORKER_ID: worker-1

  worker-2:
    build: .
    command: bun run worker.ts
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      REDIS_URL: redis://redis:6379
      WORKER_ID: worker-2
```

Scale workers dynamically:

```bash
docker compose up -d --scale worker-2=5
```

### Kubernetes

```yaml
# Coordinator — 1 replica
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discord-coordinator
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: coordinator
          command: ["bun", "run", "coordinator.ts"]
          env:
            - name: DISCORD_TOKEN
              valueFrom: { secretKeyRef: { name: discord-secrets, key: token } }
            - name: REDIS_URL
              value: "redis://redis.default.svc.cluster.local:6379"

---
# Workers — scale replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discord-worker
spec:
  replicas: 4
  template:
    spec:
      containers:
        - name: worker
          command: ["bun", "run", "worker.ts"]
          env:
            - name: DISCORD_TOKEN
              valueFrom: { secretKeyRef: { name: discord-secrets, key: token } }
            - name: REDIS_URL
              value: "redis://redis.default.svc.cluster.local:6379"
            - name: WORKER_ID
              valueFrom: { fieldRef: { fieldPath: metadata.name } }
```

```bash
kubectl scale deployment discord-worker --replicas=10
```

### Multiple Machines (no containers)

Just point all machines at the same Redis:

```bash
# Machine 1 — coordinator
REDIS_URL=redis://10.0.0.5:6379 DISCORD_TOKEN=xxx bun run coordinator.ts

# Machine 2 — worker
REDIS_URL=redis://10.0.0.5:6379 DISCORD_TOKEN=xxx WORKER_ID=w2 bun run worker.ts

# Machine 3 — worker
REDIS_URL=redis://10.0.0.5:6379 DISCORD_TOKEN=xxx WORKER_ID=w3 bun run worker.ts
```

## Transport Architecture

```
Coordinator Process (Client + ipc)     Worker Process(es)
┌──────────────────────────────┐      ┌──────────────────┐
│  Client                      │      │     Worker       │
│  - cache, REST, interactions │◄─IPC─│  - runs Shards   │
│  - receives all events       │ Redis│  - forwards      │
│  - shard assignment          │      │    events        │
└──────────────────────────────┘      └──────────────────┘
```

## Dependencies

- `@dbun/types` — Discord API types
- `@dbun/ws` — Shard and ShardManager
- `bun` (built-in) — Native Redis client for Redis adapters
- `@dbun/client` — (optional peer) Client integration via `ipc` option
