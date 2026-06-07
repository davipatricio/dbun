# @dbun/client - AI Agent Instructions

## Overview

@dbun/client is the main entry point for @dbun. The `Client` class orchestrates the REST client, WebSocket gateway shards, cache, interaction router, structures, and observability (tracing + metrics). This package depends on all other @dbun packages.

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

- `Client` - Main bot client with top-level entity managers
- `ClientOptions` - Options interface (`token`, `intents`, `cache`, `observability`)
- `ClientCacheOptions` - Cache configuration (`adapter` factory, `resources` per-entity TTL)
- `CacheResourceConfig` - Per-resource TTL/max (`maxAge`, `max`)
- `Intents` - Helper to compute Gateway intent bitfield
- `BaseManager<T>` - Base class for entity managers
- Entity managers: `GuildManager`, `ChannelManager`, `MessageManager`, `UserManager`, `GuildMemberManager`, `RoleManager`, `EmojiManager`, `VoiceStateManager`, `BanManager`

## Architecture

### Top-Level Entity Managers

Each Discord resource type has its own manager on the client:

```typescript
client.guilds      // GuildManager
client.channels    // ChannelManager
client.messages    // MessageManager
client.users       // UserManager
client.members     // GuildMemberManager
client.roles       // RoleManager
client.emojis      // EmojiManager
client.voiceStates // VoiceStateManager
client.bans        // BanManager
```

Each manager has:
- `.cache` - A `CacheManager` instance for that entity type
- `.fetch(id)` - Fetches from cache first, then REST API, returns a structure instance

### Sub-Managers on Structures

Structures returned by managers have their own sub-managers scoped to the parent entity:

```typescript
// Guild sub-managers
const guild = await client.guilds.fetch("guildId");
const member = await guild.members.fetch("userId");
const channel = await guild.channels.fetch("channelId");
const channels = await guild.channels.list();
const role = await guild.roles.fetch("roleId");
const emoji = await guild.emojis.fetch("emojiId");
const ban = await guild.bans.fetch("userId");

// Channel sub-managers
const channel = await client.channels.fetch("channelId");
const message = await channel.messages.fetch("messageId");
const sent = await channel.messages.send("Hello!");
const sent = await channel.messages.send({ content: "Hello!", embeds: [...] });
```

### Cache per Manager

Each manager gets its own `CacheManager` with its own adapter instance (created via the `adapter` factory function). This prevents key collisions between entity types.

### Per-Resource TTL

```typescript
const client = new Client({
  token,
  intents: [Intents.Guilds, Intents.GuildMessages],
  cache: {
    adapter: () => new LRUAdapter({ max: 2000 }),
    resources: {
      messages: { maxAge: 600_000 },   // 10 min
      guilds:   { maxAge: 21_600_000 }, // 6 hours
      users:    { maxAge: 3_600_000 },  // 1 hour
    },
  },
});
```

### Manager Fetch Patterns

```typescript
// Single-ID resources
const guild = await client.guilds.fetch("guildId");
const channel = await client.channels.fetch("channelId");
const user = await client.users.fetch("userId");

// Two-ID resources (parent + child)
const message = await client.messages.fetch("channelId", "messageId");
const member = await client.members.fetch("guildId", "userId");
const role = await client.roles.fetch("guildId", "roleId");
const emoji = await client.emojis.fetch("guildId", "emojiId");
const ban = await client.bans.fetch("guildId", "userId");
```

### Cache Access

```typescript
const cachedGuild = await client.guilds.cache.get("guildId");
const cachedChannel = await client.channels.cache.get("channelId");
```

### Lifecycle

- `destroy()` calls `stop()` on all manager caches to clear sweep timers, then disconnects the shard

## Common Patterns

```typescript
import { Client, Intents, LRUAdapter } from "@dbun/client";

const client = new Client({
  token: process.env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
  cache: {
    adapter: () => new LRUAdapter({ max: 2000 }),
    resources: {
      messages: { maxAge: 600_000 },
      guilds:   { maxAge: 21_600_000 },
    },
  },
});

client.on("ready", () => console.log("Ready"));
client.on("messageCreate", (msg) => msg.reply("Hello!"));

await client.login();
await client.destroy();
```

## Dependencies

- `@dbun/types`, `@dbun/rest`, `@dbun/ws`, `@dbun/cache`, `@dbun/structures`, `@dbun/interactions`, `@dbun/observability` (all workspace:*)

## Testing

- Test client initialization with mock subsystems and cache config
- Test per-resource cache strategies are wired correctly to each manager
- Test `destroy()` calls `stop()` on all manager caches
- Test manager `fetch()` returns cached data and falls back to REST
- Test structure sub-managers with mock context
- Test event emission and handler registration
