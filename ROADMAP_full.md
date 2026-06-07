# ROADMAP (Full Context)

## Project Overview

@dbun is a modern, modular Discord API wrapper built for Bun runtime. It provides a type-safe, performant, and extensible way to interact with Discord's Gateway (WebSocket) and HTTP REST APIs.

### Design Principles
- **Bun-native**: Use Bun's built-in APIs (fetch, WebSocket, SQLite, worker threads)
- **Modular**: Each concern is a separate package
- **Type-safe**: Full TypeScript with strict mode, discord-api-types for API typings
- **Extensible**: Cache adapters, event handlers, and more can be extended
- **Observable**: Built-in OpenTelemetry tracing and metrics

### Tech Stack
| Tool | Purpose |
|------|---------|
| Bun 1.4+ | Runtime + package manager |
| Turborepo | Monorepo orchestration |
| TypeScript 5.8+ | Type checking (tsc --noEmit) |
| Oxlint | Linting |
| Oxfmt | Formatting |
| tsdown | Package bundling (Rolldown-powered) |
| discord-api-types | Official Discord API type definitions |
| OpenTelemetry | Observability |

---

## Package Architecture

### Dependency Graph
```
@dbun/types (re-exports discord-api-types + snowflake utils)
    │
    ├── @dbun/cache (Memory, LRU, WeakRef, Redis adapters)
    │
    ├── @dbun/rest (HTTP client, rate limiting)
    │
    ├── @dbun/ws (WebSocket gateway, sharding, gateway URL fetching)
    │
    ├── @dbun/structures (Discord objects, partials, permissions)
    │
    ├── @dbun/interactions (commands, components, modals, autocomplete)
    │
    ├── @dbun/observability (tracer + metrics stubs, debug events)
    │
    └── @dbun/client (glues everything together, cache managers, sharding)
```

### Package Responsibilities

#### @dbun/types
- Re-exports all types from `discord-api-types/v10`
- Snowflake utilities (snowflakeToTimestamp, timestampToSnowflake, calculateShardId)
- DISCORD_EPOCH constant
- No custom type definitions — uses official discord-api-types

#### @dbun/cache
- CacheAdapter interface (extensible)
- Memory adapter (Map-based, default)
- LRU adapter (Least Recently Used eviction)
- WeakRef adapter (garbage-collectible references)
- Redis adapter (Bun native RedisClient)
- Collection class (extended Map with Discord helpers)
- CacheManager with TTL, max size, strategy support

#### @dbun/rest
- REST client using Bun.fetch()
- Rate limiter (per-route buckets)
- Sequential request queue
- Error handling (DiscordAPIError)
- GET, POST, PUT, PATCH, DELETE methods

#### @dbun/ws
- Shard class (single Gateway WebSocket connection)
  - Proper resume flow (uses resume_gateway_url from READY)
  - Zombie heartbeat detection → reconnect
  - Close code handling (resumable vs non-resumable)
  - Public emit for event forwarding
- ShardManager class (multi-shard orchestration)
  - Fetches gateway info from /gateway/bot
  - Concurrent identify with max_concurrency buckets
  - Event forwarding from shards
  - Debug event system
- Gateway URL fetching helper (fetchGatewayUrl, fetchGatewayInfo)
- HeartbeatManager with jitter and ack tracking

#### @dbun/structures
- BaseStructure<T> abstract class
- PartialStructure<T> for lazy-loaded objects
- Guild, Channel, Message, User, GuildMember
- Role, Emoji, Sticker, Webhook, VoiceState, Ban
- Permissions utility (PermissionFlagsBits)
- ClientContext binding for REST/cache access

#### @dbun/interactions
- InteractionRouter (routes by type + name/customId)
- CommandBuilder (slash command definitions)
- ComponentCollector (collects button/select interactions)
- ModalHandler (modal submit routing)
- AutocompleteRouter (autocomplete routing)
- Uses InteractionType enum from discord-api-types

#### @dbun/observability
- DBunTracer (span recording with onDebug callback)
- DBunMetrics (counter + histogram stubs)
- Debug event integration

#### @dbun/client
- Main Client class (glues all packages)
- Intents builder (GatewayIntentBits)
- Cache managers per resource type:
  - client.guilds, client.channels, client.messages
  - client.users, client.members, client.roles
  - client.emojis, client.voiceStates, client.bans
- Configurable cache adapters per resource
- Event system (client.on/off/emit)
- Debug event forwarding from shard + tracer
- client.ws getter for raw gateway event access

---

## Phase Details

### Phase 1: Foundation ✅

**Goal**: Set up the monorepo infrastructure and foundational packages.

**Completed**:
- Bun workspaces with catalog support
- Turborepo for task orchestration
- tsdown for package building (Rolldown-powered)
- oxlint and oxfmt for linting/formatting
- Root tsconfig.json with shared compiler options
- @dbun/types re-exporting discord-api-types/v10
- @dbun/cache with Memory, LRU, WeakRef, Redis adapters
- @types/bun as devDependency in all packages

---

### Phase 2: Core ✅

**Goal**: Implement HTTP and WebSocket communication layers.

**Completed**:
- @dbun/rest with Bun.fetch() and rate limiting
- @dbun/ws with Bun native WebSocket
- Heartbeat with jitter and ack tracking
- Resume/reconnection with exponential backoff
- Gateway URL fetching from /gateway/bot
- Proper close code handling (4000-4014)
- Zombie connection detection → reconnect
- Debug event system

**Remaining**:
- Transport compression (zlib-stream, zstd-stream)
- ETF encoding support

---

### Phase 3: Structures ✅

**Goal**: Create Discord object classes with partial support.

**Completed**:
- BaseStructure with id, fetch(), cache integration
- PartialStructure for lazy-loaded objects
- Guild, Channel, Message, User, GuildMember
- Role, Emoji, Sticker, Webhook, VoiceState, Ban
- Permissions utility with PermissionFlagsBits
- ClientContext binding (REST + cache access)

**Remaining**:
- Message components (ActionRow, Button, SelectMenu, TextInput)
- Invite, AuditLog, StageInstance, GuildScheduledEvent
- AutoModerationRule, Poll, Entitlement, Application

---

### Phase 4: Interactions ✅

**Goal**: Build the interaction handling system.

**Completed**:
- InteractionRouter (routes APPLICATION_COMMAND, MESSAGE_COMPONENT, MODAL_SUBMIT)
- CommandBuilder (name, description, options)
- ComponentCollector (filter, time, max)
- ModalHandler (customId routing)
- AutocompleteRouter (optionName routing)

**Remaining**:
- Context menu command builder
- Command registration API (POST /applications/{id}/commands)

---

### Phase 5: Client ✅ (mostly)

**Goal**: Create the main client that glues everything together.

**Completed**:
- Main Client class with all subsystems
- Intents builder (GatewayIntentBits)
- ShardManager with concurrent identify
- Cache managers per resource type
- Event system (on/off/emit)
- Debug event forwarding
- client.ws for raw gateway access

**Remaining**:
- IPC communication (cross-machine sharding)
- Worker thread shard runner (GatewayManager)
- Automatic shard count from /gateway/bot

---

### Phase 6: Observability (Partial)

**Goal**: Add observability and monitoring.

**Completed**:
- DBunTracer with onDebug callback
- DBunMetrics stubs
- Debug event integration throughout

**Remaining**:
- Real OpenTelemetry integration
- Custom metrics (gateway latency, REST requests, cache hits)
- Span definitions for Discord operations
- Structured logging

---

### Phase 7: Advanced (Not Started)

**Goal**: Add advanced features and the builder CLI.

**Tasks**:
1. Implement ETF encoding support
2. Create @dbun/create CLI (with decorators)
3. Add advanced caching strategies
4. Performance optimizations
5. Documentation

---

## Discord API Coverage

### Resources to Support
- [x] Guild
- [x] Channel (Text, Voice, Category, Thread, Forum, Media, Stage)
- [x] Message
- [x] User
- [x] GuildMember
- [x] Role
- [x] Emoji
- [x] Sticker
- [x] Webhook
- [ ] Invite
- [x] Ban
- [x] VoiceState
- [ ] VoiceRegion
- [ ] AuditLog
- [ ] StageInstance
- [ ] GuildScheduledEvent
- [ ] AutoModerationRule
- [ ] Poll
- [ ] Entitlement
- [ ] SKU
- [ ] Application
- [ ] Integration
- [ ] Connection
- [x] Permissions

### Gateway Events
- [x] READY (session_id, resume_gateway_url stored)
- [x] All dispatch events forwarded via client.on(eventName)
- [x] Raw gateway access via client.ws.on(eventName)
- [x] INTERACTION_CREATE routed to InteractionRouter

---

## File Structure Standards

Each package contains:
```
packages/<name>/
├── package.json        # Package config with exports, workspace deps
├── tsconfig.json       # Extends ../../tsconfig.json
├── tsdown.config.ts    # Build config with deps.neverBundle
├── .oxlintrc.json      # Lint config
├── .gitignore          # Package-specific ignores
└── src/
    ├── index.ts        # Main entry
    └── ...             # Source files
```

### Key Conventions
- All packages extend root tsconfig.json (no internal/tsconfig)
- tsdown uses `deps.neverBundle` (not deprecated `external`)
- @dbun/types is a thin re-export of discord-api-types/v10
- Debug events use `onDebug` callback pattern (no console.log in library code)
- All packages have @types/bun as devDependency
