import {
  ActionRowBuilder,
  ButtonBuilder,
  InteractionRouter,
  InteractionServer,
} from "@dbun/interactions";
import { RESTClient } from "@dbun/rest";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN! });
const router = new InteractionRouter();
router.setRest(rest);

router.command("hello", async (_interaction, response) => {
  await response.reply({ content: "Hi from the HTTP webhook server!" });
});

router.command("confirm", async (interaction, response) => {
  const userId = interaction.user?.id ?? "unknown";
  const row = new ActionRowBuilder()
    .addComponent(ButtonBuilder.success("cf_yes", "Yes"))
    .addComponent(ButtonBuilder.danger("cf_no", "No"));

  await response.reply({
    content: `<@${userId}> Are you sure?`,
    components: [row.toJSON()],
  });
});

router.component("cf_yes", async (_interaction, response) => {
  await response.update({ content: "You clicked yes!", components: [] });
});

router.component("cf_no", async (_interaction, response) => {
  await response.update({ content: "You clicked no.", components: [] });
});

const server = new InteractionServer({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  rest,
  router,
});

const port = Number(process.env.PORT ?? 3000);
const handle = server.serve(port);

console.log(`Interaction server listening on port ${port}`);

process.on("SIGINT", () => {
  handle.stop();
  console.log("Server stopped");
  process.exit(0);
});
