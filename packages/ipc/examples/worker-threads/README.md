# Worker Threads Example

Single-machine sharding using Bun's native Worker API. No Redis required.

## Architecture

```
┌──────────────────────────────────────┐
│   Main Process (Coordinator + Client)│
│   Full bot: cache, REST, interactions│
│   Spawns worker threads              │
└──────────┬───────────────────────────┘
           │ postMessage / onmessage
    ┌──────┴──────┐
    │             │
┌───▼──────┐ ┌───▼──────┐
│ Thread 1 │ │ Thread 2 │
│ shards   │ │ shards   │
│ 0-1      │ │ 2-3      │
└──────────┘ └──────────┘
```

## Run

```bash
bun run coordinator.ts
```

The coordinator spawns worker threads automatically. No external services needed.

## When to use

- Single machine with multiple CPU cores
- Development/testing
- Bots that don't need cross-machine scaling
- No Redis available

## vs Redis adapters

| Feature | Worker Threads | Redis Pub/Sub |
|---------|---------------|---------------|
| External deps | None | Redis server |
| Multi-machine | No | Yes |
| Latency | ~0ms (in-process) | ~1ms (network) |
| Process isolation | Threads | Separate processes |
| Production use | Small bots | Any size |
