# @dbun/types - AI Agent Instructions

## Overview

@dbun/types is the foundation package with zero dependencies. Contains all TypeScript type definitions and interfaces for Discord API v10 resources, Gateway payloads, permissions, and interactions. Also includes Snowflake utilities.

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

- `Snowflake` - Type alias and helpers (`snowflakeToTimestamp`, `timestampToSnowflake`, `calculateShardId`)
- `PermissionFlagsBits` - BigInt permission constants
- `GatewayOpcodes`, `GatewayIntents`, `GatewayPayload`, `GatewayIdentify`, `GatewayHello`, `GatewayReady`, `GatewayCloseCodes`
- Resource types: `Guild`, `Channel`, `Message`, `User`, `GuildMember`, `Role`, `Emoji`, `Sticker`, `Webhook`, `VoiceState`, `Ban`, `Attachment`, `Embed`, `Invite`, `Poll`, `ScheduledEvent`, `Stage`, `AuditLog`, `AutoModeration`, `Entitlement`, `SKU`, `Application`, `Connection`
- Interaction types: `Interaction`, `ApplicationCommand`, `ComponentTypes`, `ModalData`
- `API` prefix convention for raw Discord API responses (e.g. `APIGuild`, `APIChannel`)

## Architecture

- Pure type package - no runtime code except Snowflake helpers
- All types mirror the Discord API v10 JSON schema
- Raw API response types prefixed with `API` (e.g. `APIGuild`)
- Internal/wrapper types without prefix (e.g. `Guild` may extend `APIGuild` with extra methods)
- Organized into `resources/` and `interactions/` subdirectories

## Common Patterns

```typescript
import type { APIGuild, Snowflake } from "@dbun/types";
import { snowflakeToTimestamp, calculateShardId } from "@dbun/types";

const createdAt = snowflakeToTimestamp("123456789012345678");
const shardId = calculateShardId(guildId, totalShards);
```

## Dependencies

None (foundation package).

## Testing

- Test Snowflake timestamp conversion and shard calculation
- Verify type correctness (compile-time checks)
