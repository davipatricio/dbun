# @dbun/ws - AI Agent Instructions

## Overview

@dbun/ws handles Discord Gateway connections via Bun's native WebSocket client. Supports sharding, identify/resume, heartbeating, ETF encoding, transport compression (zlib-stream via node:zlib, zstd-stream via Bun.zstd), and reconnection with exponential backoff.

## Commands

```bash
bun run build    # tsdown build
bun run dev      # watch mode
bun run lint     # oxlint src
bun run fmt      # oxfmt src
bun run typecheck # tsc --noEmit
bun run clean    # rm -rf dist .turbo
```

## Key Exports

- `Shard` - Single Gateway WebSocket connection
- `ShardOptions` - Options for a shard (token, intents, shardId, totalShards, encoding, compress)
- `ShardManager` - Manages multiple shards with concurrent identify and max_concurrency buckets
- `ShardManagerOptions` - Options for the manager (token, intents, totalShards, encoding, compress)
- `EncodingMode` - Type for `"json"` or `"etf"` encoding
- `CompressionMode` - Type for `"zlib-stream"`, `"zstd-stream"`, or `null`
- `Decompressor` - Interface for transport decompression
- `buildGatewayUrl` - Builds gateway URL with encoding/compression query params

## Architecture

- `Shard` wraps Bun's `WebSocket` with auto-identify on open
- `HeartbeatManager` handles interval-based heartbeats with ack tracking (zombie connection detection)
- `Shard` automatically resumes on reconnect (if session ID is valid), otherwise re-identifies
- `ShardManager` creates and distributes shards, emits events to the client
- Uses Discord's recommended sharding: concurrent identify via `max_concurrency` buckets
- **ETF encoding** via custom encoder/decoder (small ints, integers, floats, atoms, strings, lists, maps, binaries, big ints)
- **Transport compression**: zlib-stream (node:zlib with Z_SYNC_FLUSH suffix detection), zstd-stream (Bun.zstdDecompressSync with zstd frame boundary detection)

## Common Patterns

```typescript
import { ShardManager } from "@dbun/ws";
import { GatewayIntentBits } from "@dbun/types";

const manager = new ShardManager({
  token: process.env.DISCORD_TOKEN,
  intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages,
  totalShards: "auto",
  encoding: "etf",
  compress: "zstd-stream",
});

manager.on("dispatch", (event, data, shardId) => {
  console.log(`Shard ${shardId}: ${event}`);
});
manager.on("debug", (msg) => console.log(msg));

await manager.connect();
```

## Dependencies

- `@dbun/types` (workspace:*)

## Testing

- Mock WebSocket connection lifecycle (open, message, close, error)
- Test heartbeat interval and ack timeout
- Test identify/resume/reconnect logic
- Test ShardManager shard creation and event forwarding
- Test ETF encoding/decoding round-trip
- Test zlib-stream and zstd-stream decompression
