# @dbun/structures - AI Agent Instructions

## Overview

@dbun/structures provides Discord entity wrappers (Guild, Channel, Message, User, etc.) with methods for common operations. Each structure extends `BaseStructure` and integrates with the cache system via `ClientContext`.

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

- `BaseStructure<T>` - Abstract base with `id`, `context`, cache integration
- `PartialStructure<T>` - For Discord partial objects
- `ClientContext` - Interface for client-provided REST + cache access
- `Guild` - Guild with sub-managers: `.members`, `.channels`, `.roles`, `.emojis`, `.bans`, `.voiceStates`
- `Channel` - Channel with sub-manager: `.messages` (fetch, send)
- `Message`, `User`, `GuildMember`, `Role`, `Emoji`, `Sticker`, `Webhook`, `VoiceState`, `Ban`
- `Permissions` - Permission checking with bitfield helpers

## Architecture

### ClientContext

Structures receive a `ClientContext` (injected by the Client) containing:
- `rest` - REST client for API calls
- `cache` - Per-entity CacheManager instances

This allows structures to have sub-managers without depending on `@dbun/client` directly.

### Sub-Managers on Structures

**Guild:**
```typescript
const guild = await client.guilds.fetch("guildId");
const member = await guild.members.fetch("userId");
const channel = await guild.channels.fetch("channelId");
const channels = await guild.channels.list();
const role = await guild.roles.fetch("roleId");
const emoji = await guild.emojis.fetch("emojiId");
const ban = await guild.bans.fetch("userId");
const voiceState = await guild.voiceStates.get("userId");
```

**Channel:**
```typescript
const channel = await client.channels.fetch("channelId");
const message = await channel.messages.fetch("messageId");
const sent = await channel.messages.send("Hello!");
const sent = await channel.messages.send({ content: "Hello!", embeds: [...] });
```

### Type Naming

Uses `discord-api-types/v10` naming convention:
- `APIGuild`, `APIChannel`, `APIMessage`, `APIUser`, `APIGuildMember`, `APIRole`, `APIEmoji`, `APIBan`, `APIVoiceState`, `APISticker`, `APIWebhook`

## Dependencies

- `@dbun/types`, `@dbun/cache` (both workspace:*)

## Testing

- Test each structure's REST method calls with mock context
- Test sub-manager fetch/list/send with mock REST responses
- Test Permissions bitfield calculations
