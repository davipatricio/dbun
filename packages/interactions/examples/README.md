# @dbun/interactions Examples

Runnable examples demonstrating the @dbun/interactions package.

## Prerequisites

- Bun >= 1.0
- A Discord bot token (`DISCORD_TOKEN`) and application ID (`DISCORD_APPLICATION_ID`)
- For example 04: a public key (`DISCORD_PUBLIC_KEY`)

```bash
export DISCORD_TOKEN=...
export DISCORD_APPLICATION_ID=...
export DISCORD_PUBLIC_KEY=...
```

## Examples

| File | Description |
|------|-------------|
| `01-slash-command.ts` | Slash command with subcommands, options, and autocomplete. |
| `02-buttons-and-selects.ts` | Buttons (primary/success/danger/link), select menus, and a `ComponentCollector` with time/idle/max limits. |
| `03-modal-form.ts` | Multi-field modal form, with confirmation buttons after submit. |
| `04-webhook-server.ts` | HTTP webhook server receiving interactions via Ed25519-signed POSTs (no gateway). |

## Running

```bash
bun run examples/01-slash-command.ts
bun run examples/02-buttons-and-selects.ts
bun run examples/03-modal-form.ts
bun run examples/04-webhook-server.ts
```

Each example registers handlers on a shared router but does not register commands with Discord
or start a client. Wire them up to `@dbun/client` (or just an `InteractionRouter` + `RESTClient`)
as shown.
