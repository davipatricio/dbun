# @dbun/interactions - AI Agent Instructions

## Overview

@dbun/interactions handles Discord Interactions: slash commands, message components (buttons, select menus), modals, and autocomplete. Provides routing, command building, response helpers, and component collectors.

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

- `InteractionRouter` - Routes incoming interactions to handlers by type/customId/commandName
- `InteractionResponse` - Response helper with `reply()`, `deferReply()`, `followUp()`, `editReply()`, `deleteReply()`, `deferUpdate()`, `update()`
- `CommandBuilder` - Builder for slash command definitions (name, description, options)
- `CommandHandler` - Type for slash command execute callbacks `(interaction, response) => void`
- `CommandOptions` / `CommandOption` - Option types for command parameters
- `AutocompleteRouter` - Routes autocomplete interactions to handlers
- `ComponentCollector` - Collects and filters component interactions over time
- `ModalHandler` - Handles modal submit interactions

## Architecture

- `InteractionRouter` is registered on the `Client` and receives raw interaction payloads
- Router needs a REST client via `setRest()` before invoking `handle()`
- Handlers receive `(interaction: APIInteraction, response: InteractionResponse)` — use `response.reply()` etc.
- `InteractionResponse` uses the interaction token webhook endpoint directly (no rate limiting)
- `CommandBuilder` builds command definitions for bulk overwrite registration via `ApplicationCommandManager`
- `ComponentCollector` works on message components with optional filter predicate and time/max limits
- Autocomplete handlers are registered separately from command handlers

## Common Patterns

```typescript
import { InteractionRouter, CommandBuilder, InteractionResponse } from "@dbun/interactions";
import { ApplicationCommandManager } from "@dbun/rest";

const commands = new ApplicationCommandManager(rest, appId);
const router = new InteractionRouter();
router.setRest(rest);

router.command("ping", async (interaction, response) => {
  await response.reply({ content: "Pong!" });
});

router.component("delete_btn", async (interaction, response) => {
  await response.deferUpdate();
  await response.followUp({ content: "Deleted!" });
});

// Register commands
await commands.create(new CommandBuilder("ping", "Pong!").toJSON());

// Client wiring
client.on("INTERACTION_CREATE", async (data) => {
  await router.handle(data);
});
```

## Dependencies

- `@dbun/types` (workspace:*)
- `@dbun/rest` (workspace:*)

## Testing

- Test command building matches Discord API schema
- Test router dispatch with mock interactions
- Test InteractionResponse methods with mock fetch
- Test ComponentCollector with timeout and filter
