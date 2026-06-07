# AGENTS.md - AI Agent Instructions

## Project Overview

@dbun is a modern Discord API wrapper for Bun runtime, built as a monorepo with multiple packages. It provides type-safe, performant interaction with Discord's Gateway (WebSocket) and HTTP REST APIs.

## Build Commands

```bash
# Install dependencies
bun install

# Build all packages
turbo build

# Development mode (watch)
turbo dev

# Lint all files
oxlint .

# Lint and fix
oxlint . --fix

# Format all files
oxfmt .

# Check formatting
oxfmt --check .

# Type check
tsgo --noEmit

# Run tests
bun test

# Clean all builds
turbo clean
```

## Code Style

- **Module system**: ESM-only (`type: "module"`)
- **TypeScript**: Strict mode, no implicit any
- **Formatting**: Oxfmt (Prettier-compatible)
- **Linting**: Oxlint with TypeScript plugin
- **No comments** unless explicitly asked
- **Prefer `const`** over `let`
- **Use async/await** over callbacks
- **Use Bun native APIs** (fetch, WebSocket, SQLite)

## Package Conventions

- Each package has: `package.json`, `tsconfig.json`, `tsdown.config.ts`, `.oxlintrc.json`, `.gitignore`
- Internal packages use `workspace:*` protocol
- Catalog versions from root `package.json`
- Export types from `@dbun/types` package
- Build output goes to `dist/` directory
- Source code goes to `src/` directory

## Import Conventions

```typescript
// Use workspace: protocol for internal deps
import { Guild } from "@dbun/types";
import { Collection } from "@dbun/cache";

// For relative imports within same package
import { something } from "./local";
```

## Architecture

- **@dbun/types** is the foundation (no dependencies)
- **@dbun/client** glues everything together
- **Cache system** uses adapter pattern (Memory/Redis/SQLite)
- **WebSocket** uses Bun native WebSocket client
- **REST** uses Bun.fetch() with rate limiting
- **OpenTelemetry** for observability

## Discord API Reference

- Gateway: WebSocket connection for real-time events
- HTTP REST: API calls for resources
- Interactions: Slash commands, buttons, modals
- Rate limits: Respect Discord's rate limiting (429 responses)
- API Version: v10 (latest stable)

## Common Patterns

### Cache Access
```typescript
await client.users.cache.get("userId");
await client.guilds.cache.get("guildId");
```

### Partial Structures
```typescript
// Partial objects can be fetched
const partial = channel.messages.cache.get("msgId");
const full = await partial.fetch();
```

### Event Handling
```typescript
client.on("messageCreate", (message) => {
  // Handle message
});
```

## Testing

- Use `bun test` for running tests
- Tests go in `src/__tests__/` or `*.test.ts` files
- Mock Discord API responses when testing

## Git Conventions

- Commit messages: `<type>(<scope>): <description>`
- Types: feat, fix, docs, style, refactor, test, chore
- Example: `feat(cache): add redis adapter`

## Security

- Never commit bot tokens or secrets
- Use environment variables for sensitive data
- Check `.env.example` for required variables
