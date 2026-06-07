# Discord bot running on 30 shards across 3 workers

This example runs a Discord bot with shards distributed across 3 worker containers, coordinated by a single coordinator container, using Redis for IPC.

The coordinator uses `Client` with `ipc.mode: "coordinator"` — giving you the full Client API (cache, REST, interactions, events) with shards running on remote workers.

## Architecture

```
┌────────────────────────────────────────┐
│   Coordinator (Client + ipc option)    │
│   Full bot: cache, REST, interactions  │
│   Receives all gateway events          │
└────────────────┬───────────────────────┘
                 │ Redis Pub/Sub
        ┌────────┼────────┐
        │        │        │
   ┌────▼───┐ ┌──▼──┐ ┌──▼──┐
   │Worker 1│ │  W2 │ │  W3 │
   │shards  │ │     │ │     │
   │ 0-9    │ │10-19│ │20-29│
   └────────┘ └─────┘ └─────┘
```

## Setup

1. Copy `.env.example` to `.env` and fill in your bot token:

```bash
cp .env.example .env
```

2. Start everything:

```bash
docker compose up -d
```

3. Check logs:

```bash
docker compose logs -f coordinator
docker compose logs -f worker-1 worker-2 worker-3
```

4. Scale workers (optional):

```bash
docker compose up -d --scale worker-3=0 --scale worker-4=3
```

5. Stop:

```bash
docker compose down
```

## How it works

1. Coordinator starts a `Client` with `ipc.mode: "coordinator"` and fetches recommended shard count from Discord
2. Workers connect to Redis and register with the coordinator
3. Coordinator assigns shard ranges evenly across workers (auto mode)
4. Each worker opens WebSocket connections to Discord for its assigned shards
5. All gateway events flow from workers → coordinator via Redis
6. Coordinator's `Client` processes events normally — cache updates, interaction routing, event emission
7. If a worker dies, its shards redistribute to survivors automatically
