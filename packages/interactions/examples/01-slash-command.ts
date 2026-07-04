import {
  CommandBuilder,
  InteractionRouter,
  SubcommandBuilder,
  MessageFlags,
  type APIChatInputApplicationCommandInteraction,
} from "@dbun/interactions";
import { RESTClient } from "@dbun/rest";
import { ApplicationCommandOptionType } from "@dbun/types";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN! });
const router = new InteractionRouter();
router.setRest(rest);

const pingCommand = new CommandBuilder({
  name: "ping",
  description: "Replies with pong!",
})
  .addSubcommand(
    new SubcommandBuilder("user", "Pong with user info").addOption({
      type: ApplicationCommandOptionType.User,
      name: "target",
      description: "User to pong",
      required: false,
    }),
  )
  .addSubcommand(
    new SubcommandBuilder("fast", "Quick pong with latency").addOption({
      type: ApplicationCommandOptionType.String,
      name: "message",
      description: "Message to echo",
      required: false,
      autocomplete: true,
    }),
  )
  .toJSON();

router.command("ping", async (interaction, response) => {
  const i = interaction as APIChatInputApplicationCommandInteraction;
  const sub = i.data.options?.[0];

  if (sub?.name === "user" && "options" in sub) {
    const target = sub.options?.find((o) => o.name === "target");
    await response.reply({
      content: `Pong ${target && "value" in target && target.value ? `<@${target.value}>` : ""}!`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub?.name === "fast") {
    const sent = Date.now();
    await response.reply({ content: "Pong!" });
    const latency = Date.now() - sent;
    await response.editReply({ content: `Pong! (${latency}ms)` });
    return;
  }

  await response.reply({ content: "Pong!" });
});

router.autocomplete("ping", async (_interaction, response) => {
  await response.sendAutocompleteResult([
    { name: "Hello world", value: "hello" },
    { name: "Goodbye world", value: "goodbye" },
  ]);
});

console.log("Slash command schema:", JSON.stringify(pingCommand, null, 2));
