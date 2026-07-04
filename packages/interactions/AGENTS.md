# @dbun/interactions - AI Agent Instructions

## Overview

@dbun/interactions handles Discord Interactions: slash commands, message components (buttons, select menus), modals, and autocomplete. Provides routing, command building, component builders, response helpers, component collectors, and an HTTP server for webhook-based interaction receiving.

## Commands

```bash
bun run build            # tsdown build
bun run dev              # watch mode
bun run lint             # oxlint src
bun run fmt              # oxfmt src
bun run typecheck        # tsc --noEmit (on src/)
bun run typecheck:examples  # tsc --noEmit -p tsconfig.examples.json
bun run clean            # rm -rf dist .turbo
bun test                 # bun test
```

## Key Exports

### Routing
- `InteractionRouter` - Routes incoming interactions to handlers by type/customId/commandName. Auto-responds to PING. Supports wildcard handlers (`onCommand`, `onComponent`, `onModal`, `onAutocomplete`) and removal methods (`removeCommand`, `removeComponent`, `removeModal`, `removeAutocomplete`, plus `clear*` variants)

### Typed Handler Types
- `CommandInteractionHandler` - `(interaction: APIChatInputApplicationCommandInteraction, response: InteractionResponse) => void`
- `ComponentInteractionHandler` - `(interaction: APIMessageComponentInteraction, response: InteractionResponse) => void`
- `ModalSubmitInteractionHandler` - `(interaction: APIModalSubmitInteraction, response: InteractionResponse) => void`
- `AutocompleteInteractionHandler` - `(interaction: APIApplicationCommandAutocompleteInteraction, response: InteractionResponse) => void`

### Response Helpers
- `InteractionResponse` - Response helper with `reply()`, `deferReply()`, `followUp()`, `editReply()`, `deleteReply()`, `editFollowUp()`, `deleteFollowUp()`, `deferUpdate()`, `update()`, `sendModal()`, `sendAutocompleteResult()`, `pong()`. Has an internal `replied` flag that throws on double-sends. Exposes `isReplied` getter.

### Command Builders
- `CommandBuilder` - Builder for slash command definitions with support for subcommands, autocomplete, localizations, contexts, integration types, default member permissions
- `SubcommandBuilder` - Builder for subcommand options with nested options (positional constructor: `new SubcommandBuilder(name, description)`)
- `SubcommandGroupBuilder` - Builder for subcommand groups containing subcommands
- `CommandOptions` / `CommandOption` / `CommandChoice` - Option types for command parameters

### Component Builders
- `ButtonBuilder` - Builder for buttons (Primary, Secondary, Success, Danger, Link, Premium) with static helpers. `toJSON()` returns `APIButtonComponent` (a union — fields are style-specific).
- `StringSelectBuilder` / `UserSelectBuilder` / `RoleSelectBuilder` / `MentionableSelectBuilder` / `ChannelSelectBuilder` - Select menu builders
- `TextInputBuilder` - Builder for text inputs in modals (Short/Paragraph styles)
- `ActionRowBuilder<T extends ToJSON = ActionRowComponent & ToJSON>` - Generic action row builder. For modals, use `new ActionRowBuilder<ModalComponentBuilder>()` to allow text inputs.
- `ModalBuilder` - Builder for modal responses. Has `addTextInput(customId, label, style?)` convenience method.

### HTTP Server
- `InteractionServer` - HTTP server for receiving interactions via webhook (instead of Gateway). Validates Ed25519 signatures using Bun's native `crypto.subtle.verify`. PING is short-circuited inline (returns `{type:1}`) before delegating to the router.

### Re-exported Enums and Types
- `ApplicationCommandOptionType`, `ApplicationCommandType`, `ButtonStyle`, `ComponentType`, `InteractionResponseType`, `InteractionType`, `MessageFlags`, `TextInputStyle` (re-exported from `@dbun/types` for ergonomic use)
- `APIInteraction`, `APIChatInputApplicationCommandInteraction`, `APIMessageComponentInteraction`, `APIModalSubmitInteraction`, `APIApplicationCommandAutocompleteInteraction`, `APIApplicationCommandInteractionDataOption`, `APIModalSubmission`, `APIInteractionDataResolved`
- `ActionRowComponent`, `ModalComponentBuilder`, `SelectMenuType`, `SelectDefaultValue`

### Other
- `AutocompleteRouter` - Routes autocomplete interactions to handlers
- `ComponentCollector` - Collects and filters component interactions over time with `time`, `idle`, and `max` options. Event emitter pattern: `on("collect" | "end", ...)`.
- `ModalHandler` - Handles modal submit interactions

## Architecture

- `InteractionRouter` is registered on the `Client` and receives raw interaction payloads
- Router needs a REST client via `setRest()` before invoking `handle()`
- PING interactions are handled automatically (server returns inline `{type:1}`; router POSTs via REST for gateway-received PINGs)
- Handlers receive `(interaction: APIInteraction, response: InteractionResponse)` — use `response.reply()` etc.
- `InteractionResponse` uses the REST client for all requests (interaction callback + followup webhook)
- `CommandBuilder` supports full Discord API command options including subcommands, autocomplete, localizations
- `ComponentCollector` supports `time`, `idle`, `max` options and emits `collect` and `end` events
- `InteractionServer` validates Discord's Ed25519 signature headers using Bun's native Web Crypto API
- `InteractionResponse` guards against double-sends: calling `reply()`/`update()`/`sendModal()`/`deferReply()`/`deferUpdate()`/`sendAutocompleteResult()`/`pong()` twice throws. `followUp()`, `editReply()`, `editFollowUp()`, `deleteReply()`, `deleteFollowUp()` are excluded (multi-allowed).

## Discord Interactions: Domain Reference

### Delivery Channels

| Channel | Setup | Response window |
|---------|-------|-----------------|
| **Gateway** (WebSocket) | Bot connects via `ShardManager`; interactions arrive as dispatch events | Reply within 3s via REST, edit/follow-up for 15min |
| **HTTP Webhook** | Bot exposes public HTTPS endpoint; Discord POSTs signed requests | Must respond inline (200) or accept (202) within 3s; follow-ups via webhook for 15min |

### Interaction Types (`InteractionType` enum)

| Type | ID | Token? | Data field |
|------|----|--------|-----------|
| `Ping` | 1 | Yes | absent |
| `ApplicationCommand` | 2 | Yes | command metadata |
| `MessageComponent` | 3 | Yes | `custom_id` + component-type-specific fields |
| `ApplicationCommandAutocomplete` | 4 | Yes | partial command data |
| `ModalSubmit` | 5 | Yes | `custom_id` + `components` |

### Response Types (`InteractionResponseType` enum, sent in callback body `type`)

| Type | Value | Use |
|------|-------|-----|
| `Pong` | 1 | Reply to PING |
| `ChannelMessageWithSource` | 4 | Send a message |
| `DeferredChannelMessageWithSource` | 5 | "Bot is thinking..." (edit later) |
| `DeferredMessageUpdate` | 6 | Edit component-source message later |
| `UpdateMessage` | 7 | Edit the component-source message |
| `ApplicationCommandAutocompleteResult` | 8 | Autocomplete choices |
| `Modal` | 9 | Show a modal |
| `PremiumRequired` | 10 | Paywall blocked |

### Three-Phase Response Lifecycle

1. **Initial response** (within 3s): `POST /interactions/{interaction_id}/{token}/callback` with `{type, data?}`
2. **Edit original** (within 15min): `PATCH /webhooks/{app_id}/{token}/messages/@original`
3. **Follow-ups** (within 15min):
   - Create: `POST /webhooks/{app_id}/{token}`
   - Edit: `PATCH /webhooks/{app_id}/{token}/messages/{message_id}`
   - Delete: `DELETE /webhooks/{app_id}/{token}/messages/{message_id}`

`@original` is a sentinel for the initial response.

### Ephemeral = Flag, Not Field

`ephemeral: true` does **not** exist in callback data. It's `flags: MessageFlags.Ephemeral` (= 64). The `APIInteractionResponseCallbackData` type comes from `Omit<RESTPostAPIWebhookWithTokenJSONBody, 'avatar_url' | 'username'>` so it only has webhook-message fields.

### Resolved Data Structure

`APIInteractionDataResolved` (on chat input options, autocomplete options, and select menu submissions) has 5 optional maps:

```typescript
{
  users?: Record<Snowflake, APIUser>;
  members?: Record<Snowflake, APIInteractionDataResolvedGuildMember>;  // partial
  roles?: Record<Snowflake, APIRole>;
  channels?: Record<Snowflake, APIInteractionDataResolvedChannel>;    // partial
  messages?: Record<Snowflake, APIAttachment>;                        // for message context menu
}
```

For message-component selects, `interaction.data.resolved` is set with the user/role/channel data of the selected entities.

### Ed25519 Signature Verification (Webhook)

- Headers: `x-signature-ed25519` (hex) and `x-signature-timestamp` (string).
- Verify `crypto.subtle.verify("Ed25519", key, sig, ts_bytes + body_bytes)`.
- `BufferSource` parameters must be `Uint8Array<ArrayBuffer>` (use `.buffer` to get the underlying buffer).
- Public key comes from the Discord application's "General Information" page.
- Private key (for signing tests) is PKCS#8 DER, 48-byte raw Ed25519 key.

### Component System Quirks

- `ButtonBuilder.toJSON()` returns `APIButtonComponent` (a **union** of `WithCustomId | WithSKUId | WithURL`). Fields are style-specific — no shared `custom_id` accessor.
- `StringSelectBuilder` etc. `toJSON()` returns `Record<string, unknown>` (wider type).
- `ActionRowBuilder<T>` is generic. Default `T = ActionRowComponent & ToJSON` (message components: buttons + selects). For modals, use `new ActionRowBuilder<ModalComponentBuilder>()` explicitly to include `TextInputBuilder`.
- `ActionRowBuilder.toJSON()` returns `APIActionRowComponent<APIComponentInMessageActionRow>` — directly assignable to `APIMessageTopLevelComponent` for `reply({ components: [row.toJSON()] })`.

### Modal Submission Structure (new in 2024+)

`APIModalSubmissionComponent` is a **discriminated union** of three:
- `ModalSubmitActionRowComponent` (type=1) — `components: APIModalSubmitTextInputComponent[]`
- `ModalSubmitLabelComponent` (type=18) — `component: ModalSubmitComponent` (a text input, select, file upload, radio, checkbox, etc.)
- `ModalSubmitTextDisplayComponent` (type=10)

To extract values from a modal submit, walk both `ActionRow.components` and `Label.component` branches.

### Message Components v2 (Components on Messages)

Top-level message components: `ActionRow | Container | FileComponent | MediaGallery | Section | Separator | TextDisplay`.

- `APIComponentInMessageActionRow = APIButtonComponent | APISelectMenuComponent`
- `SelectMenuDefaultValueType` is a **string** enum: `"user" | "role" | "channel"`

### `user` / `member` Field Rules

- `interaction.user` is `APIUser | undefined` — present for DM, absent for guild.
- `interaction.member` is `APIInteractionGuildMember | undefined` — present for guild, absent for DM.
- Always check both: `const userId = interaction.user?.id;`

### Subcommand vs Option Type Narrowing

`APIApplicationCommandInteractionDataOption` is a **union**:
- `BasicOption` (string, integer, user, channel, role, mentionable, number, boolean, attachment) — has `value`, no `options`
- `SubcommandOption` (type=1) — has `options: APIApplicationCommandInteractionDataOption[]`, no `value`
- `SubcommandGroupOption` (type=2) — has `options: APIApplicationCommandInteractionDataSubcommandOption[]`

Narrow with `"options" in opt` before accessing nested options. The `target` of a subcommand is a basic option (no nested `options`).

### Router Pattern

- `router.command(name, handler)` — exact match by command name
- `router.component(customId, handler)` — exact match by custom_id
- `router.modal(customId, handler)` — exact match by modal custom_id
- `router.autocomplete(commandName, handler)` — exact match by command name (autocomplete)
- `router.onCommand(handler)` / `onComponent` / `onModal` / `onAutocomplete` — wildcard catch-all
- `router.removeCommand(name)` / `removeComponent` / `removeModal` / `removeAutocomplete` — returns `true` if removed
- `router.clearCommands()` / `clearComponents` / `clearModals` / `clearAutocomplete` — clear all

PING has no command data, so wildcards don't fire. Only the auto-responder in the router/server handles it.

### PING Handling is Split by Channel

- **Webhook server**: short-circuits inline — returns `Response.json({type:1})` BEFORE calling `router.handle()`. Webhook protocol requires an immediate HTTP response.
- **Router**: auto-responds via `response.pong()` (POST to callback endpoint) for gateway-received PINGs. Token is always present in gateway interactions.

### Type Naming Conventions

- `APIBaseInteraction<Type, Data>` is generic — each interaction subtype has its own `Data` shape.
- `APIDMInteractionWrapper<Original>` adds `user: APIUser` (removes `member`).
- `APIGuildInteractionWrapper<Original>` adds `member: APIInteractionGuildMember` (removes `user`).
- `InteractionType.Ping = 1` and `InteractionResponseType.Pong = 1` — numbers happen to match for the PING/Pong pair, but they're separate enums.

### `discord-api-types` is the Source of Truth

`@dbun/types` simply re-exports `discord-api-types/v10`. Don't fight the types — use the runtime enums (`InteractionType`, `MessageFlags`, etc.) instead of magic numbers.

## Common Patterns

```typescript
import {
  InteractionRouter,
  CommandBuilder,
  SubcommandBuilder,
  InteractionResponse,
  ButtonBuilder,
  ActionRowBuilder,
  StringSelectBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalComponentBuilder,
  InteractionServer,
  MessageFlags,
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
  type APIModalSubmitInteraction,
} from "@dbun/interactions";
import { ApplicationCommandManager, RESTClient } from "@dbun/rest";
import { ComponentType } from "@dbun/types";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN! });
const router = new InteractionRouter();
router.setRest(rest);

// Slash command with subcommands
const pingCmd = new CommandBuilder({ name: "ping", description: "Pong!" })
  .addSubcommand(
    new SubcommandBuilder("user", "Pong with user info").addOption({
      type: ApplicationCommandOptionType.User,
      name: "target",
      description: "User to pong",
      required: false,
    }),
  )
  .toJSON();

router.command("ping", async (interaction, response) => {
  const i = interaction as APIChatInputApplicationCommandInteraction;
  const sub = i.data.options?.[0];
  if (sub?.name === "user" && "options" in sub) {
    const target = sub.options?.find((o) => o.name === "target");
    await response.reply({
      content: `Pong <@${target && "value" in target ? target.value : "unknown"}>!`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await response.reply({ content: "Pong!" });
});

// Component handler with collector
router.command("confirm", async (interaction, response) => {
  const row = new ActionRowBuilder()
    .addComponent(ButtonBuilder.success("cf_yes", "Yes"))
    .addComponent(ButtonBuilder.danger("cf_no", "No"));

  await response.reply({ content: "Are you sure?", components: [row.toJSON()] });

  // (use ComponentCollector for awaitable, time-bound, max-bound collection)
});

// Send a modal (use ModalComponentBuilder generic for action rows)
const modal = new ModalBuilder()
  .setCustomId("feedback")
  .setTitle("Feedback")
  .addActionRow(
    new ActionRowBuilder<ModalComponentBuilder>().addComponent(
      TextInputBuilder.short("name", "Your name").setRequired(true),
    ),
  )
  .addTextInput("comment", "Your comment", TextInputStyle.Paragraph);

await response.sendModal(modal);

// HTTP webhook server (Bun native Ed25519, no extra deps)
const server = new InteractionServer({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  rest,
  router,
});
server.serve(3000);

// Register commands
const commands = new ApplicationCommandManager(rest, "application_id");
await commands.create(pingCmd);
```

## Examples

The `examples/` directory has 4 runnable scripts:

| File | Demonstrates |
|------|------------|
| `01-slash-command.ts` | Slash command with subcommands, options, autocomplete |
| `02-buttons-and-selects.ts` | Buttons (primary/success/danger/link), select menus, ComponentCollector with time/idle/max |
| `03-modal-form.ts` | Multi-field modal form, `APIModalSubmissionComponent` extraction, confirmation buttons |
| `04-webhook-server.ts` | HTTP webhook server receiving Ed25519-signed POSTs |

```bash
bun run examples/01-slash-command.ts
```

## Dependencies

- `@dbun/types` (workspace:*)
- `@dbun/rest` (workspace:*)

## Testing

- Test command building matches Discord API schema (`toJSON()` output)
- Test component builder `toJSON()` output
- Test router dispatch with mock interactions (including PING auto-response)
- Test `InteractionResponse` methods with mock REST client
- Test `replied` guard: throw on `reply()` after `reply()`, after `deferReply()`, after `update()`, after `sendModal()`, after `sendAutocompleteResult()`. Note: `followUp`, `editReply`, `editFollowUp`, `deleteReply`, `deleteFollowUp` do NOT trigger the guard.
- Test `ComponentCollector` with timeout/idle/event emitter
- Test `InteractionServer` signature verification (valid signature, invalid signature, tampered body, missing headers, non-POST method, PING short-circuit, non-PING delegation, 500 on router throw)
- Test `remove*` and `clear*` methods on the router
- Test `ModalBuilder.addTextInput` convenience method
- Test `extractModalValues`-style helpers to handle both `ActionRow` and `Label` components
