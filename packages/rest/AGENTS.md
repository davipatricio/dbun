# @dbun/rest - AI Agent Instructions

## Overview

@dbun/rest handles Discord HTTP REST API calls using `Bun.fetch()` with built-in rate limiting via a bucket-based algorithm. Designed for the Discord v10 API.

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

- `RESTClient` - HTTP client with methods: `get`, `post`, `put`, `patch`, `delete`, `postFile`
- `RESTClientOptions` - Options (token, version, userAgent, retries, retryDelay, rateLimiter)
- `DiscordAPIError` - Typed error for Discord API error responses with `isRateLimited`, `isServerError`, `isRetryable`
- `RateLimiter` - Token-bucket rate limiter per route (customizable)
- `RateLimiterOptions` - Options for rate limiter (retryDelay)
- `RateLimitHeaders` - Parsed rate limit response headers
- `ApplicationCommandManager` - Create, fetch, list, edit, delete, and bulk overwrite application commands

## Architecture

- `RESTClient` uses `Bun.fetch()` for all HTTP requests
- `RateLimiter` implements per-bucket queuing using `X-RateLimit-Bucket` header
- Automatically retries on 429 (Rate Limited) with `Retry-After` header respect
- Fast fails on 401 (authentication) and 403 (forbidden) — no retries
- Retries on 5xx server errors with exponential backoff and jitter
- Token validation at construction time (rejects empty or whitespace-containing tokens)
- `postFile()` supports multipart/form-data file uploads via FormData + Blob
- `ApplicationCommandManager` wraps REST for command CRUD (global and guild-scoped)

## Common Patterns

```typescript
import { RESTClient, ApplicationCommandManager, DiscordAPIError } from "@dbun/rest";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN });

// Basic REST calls
const guild = await rest.get(`/guilds/${guildId}`);
const msg = await rest.post(`/channels/${chId}/messages`, { content: "Hello" });

// File upload
await rest.postFile(`/channels/${chId}/messages`, {
  name: "image.png",
  data: imageBuffer,
}, { content: "Check this out!" });

// Command registration
const commands = new ApplicationCommandManager(rest, "application_id");
await commands.create({ name: "ping", description: "Pong!" });
await commands.bulkOverwrite([{ name: "ping", description: "Pong!" }]);
const cmds = await commands.list();

// Error handling
try {
  await rest.get("/users/@me");
} catch (err) {
  if (err instanceof DiscordAPIError) {
    if (err.isRateLimited) {
      console.log(`Rate limited, retry after ${err.retryAfter}s`);
    }
  }
}
```

## Dependencies

- `@dbun/types` (workspace:*)

## Testing

- Mock `Bun.fetch` responses for unit tests
- Test rate limiter bucket logic and 429 retry behavior
- Test error parsing for Discord API error responses
- Test command CRUD operations
