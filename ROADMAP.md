# ROADMAP

## Phase 1: Foundation
- [x] Monorepo setup (bun workspaces, turborepo, catalogs)
- [x] Tooling setup (tsdown, oxlint, oxfmt)
- [x] @dbun/types - Re-exports from discord-api-types + snowflake utilities
- [x] @dbun/cache - Cache system with adapters (Memory, LRU, WeakRef, Redis)
- [x] Shared tsconfig (root tsconfig.json, no internal/tsconfig)
- [x] @dbun/utils - Shared utilities (Bun.sleep, parallel, binary helpers)

## Phase 2: Core
- [x] @dbun/rest - HTTP client with rate limiting (Bun native fetch)
- [x] @dbun/ws - WebSocket gateway (Bun native WebSocket)
- [x] Heartbeat, resume, reconnection logic with zombie detection
- [x] Gateway URL fetching from /gateway/bot
- [x] Proper close code handling (resumable vs non-resumable)
- [x] JSON/ETF encoding via codec
- [x] Transport compression (zlib-stream via node:zlib, zstd-stream via Bun.zstd)
- [x] Rate limiting with bucket-based routing (X-RateLimit-Bucket header)
- [x] File upload support (multipart/form-data)
- [x] Command registration API (ApplicationCommandManager via REST)

## Phase 3: Structures
- [x] @dbun/structures - Discord object classes (Guild, Channel, Message, User, etc.)
- [x] Partial structures support
- [x] Permission utilities (PermissionFlagsBits)
- [x] Sub-managers on structures (guild.members, channel.messages, etc.)
- [x] Message sending via channel.messages.send()

## Phase 4: Interactions
- [x] @dbun/interactions - Command handling (InteractionRouter)
- [x] Slash command builder (CommandBuilder)
- [x] Component collectors (ComponentCollector)
- [x] Modal handlers (ModalHandler)
- [x] Autocomplete handlers (AutocompleteRouter)
- [x] Interaction response helpers (reply, deferReply, followUp, editReply, deleteReply, deferUpdate, update)

## Phase 5: Client
- [x] @dbun/client - Main client class
- [x] Intents system (GatewayIntentBits)
- [x] Sharding support (ShardManager with concurrent identify + max_concurrency buckets)
- [x] Debug event system (client.on("debug"))
- [x] Raw gateway event access (client.ws.on("dispatch"))
- [x] Type-safe event emitter (ClientEvents with typed payloads)
- [x] Cache managers (client.guilds, client.channels, client.users, etc.)
- [x] Gateway event → cache population (GUILD_CREATE caches guild, channels, members, roles, emojis, voice states)
- [ ] IPC communication (cross-machine sharding)
- [ ] Worker thread shard runner (GatewayManager)

## Phase 6: Observability
- [x] @dbun/observability - Tracer + Metrics stubs
- [x] Debug event integration (onDebug callback pattern)
- [ ] OpenTelemetry integration (replace stubs)
- [ ] Gateway/REST metrics
- [ ] Structured logging

## Phase 7: Advanced
- [x] ETF encoding support
- [ ] @dbun/create - CLI scaffolding tool
- [ ] Advanced caching strategies (Redis persistence, SQLite backend)
- [x] Command registration API
