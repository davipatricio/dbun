# @dbun Packages - Architecture Overview

## Package Dependency Graph

```
@dbun/types          (foundation, no deps)
├── @dbun/utils       (shared utilities, no deps)
├── @dbun/cache       (cache system, depends on types)
├── @dbun/rest        (HTTP client, depends on types)
├── @dbun/ws          (WebSocket gateway, depends on types)
├── @dbun/structures  (Discord entities, depends on types + cache)
├── @dbun/interactions (command handling, depends on types + rest)
├── @dbun/observability (tracing/metrics stubs, depends on types)
└── @dbun/client      (main entry, depends on ALL above)
```

## Package Layout

Each package follows the same structure:

```
packages/{name}/
├── AGENTS.md          # AI agent instructions for this package
├── package.json       # ESM-only, workspace:* deps, catalog:* devDeps
├── tsconfig.json      # Extends root tsconfig.json
├── tsdown.config.ts   # Build config with deps.neverBundle
├── .oxlintrc.json     # Oxlint config
├── .gitignore         # Ignores dist + .turbo
└── src/
    ├── index.ts       # Main entry, exports public API
    └── *.ts           # Implementation modules
```

## Dependency Management

- **Internal packages**: `workspace:*` protocol
- **External packages**: `catalog:` from root `package.json`
- **Build tooling**: `tsdown` for bundling (Rolldown-powered), generates `.d.ts`
- **Dev dependencies**: `@types/bun` required in every package
- **deps.neverBundle**: Must be set in every `tsdown.config.ts` (not deprecated `external`)

## Build Order

Turbo's `dependsOn: ["^build"]` ensures dependencies build before dependents:
1. `@dbun/types`, `@dbun/utils` (level 0, no deps)
2. `@dbun/cache`, `@dbun/rest`, `@dbun/ws`, `@dbun/structures`, `@dbun/observability` (level 1, depends on types)
3. `@dbun/interactions` (level 2, depends on types + rest)
4. `@dbun/client` (level 3, depends on all)
5. `@dbun/playground` (level 4, depends on client)

## Key Design Decisions

- **Bun native APIs only**: `Bun.fetch()`, `Bun.WebSocket`, `Bun.sleep()`, `Bun.zstdDecompressSync()`
- **No transitive external dependencies**: Each package bundles only what it uses
- **Event-driven architecture**: Client → ShardManager → Shard → HeartbeatManager
- **Adaptable cache**: Interface-based adapters (Memory, LRU, WeakRef, Redis)
- **Gateway event caching**: Client populates caches from dispatch events automatically
- **Type-safe events**: `ClientEvents` interface maps event names to typed payloads
- **Interaction response pattern**: Router passes `InteractionResponse` to handlers (reply, defer, followUp, etc.)
