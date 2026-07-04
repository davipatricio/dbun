import {
  ActionRowBuilder,
  ButtonBuilder,
  ComponentCollector,
  InteractionRouter,
  MessageFlags,
  StringSelectBuilder,
  type APIMessageComponentInteraction,
} from "@dbun/interactions";
import { RESTClient } from "@dbun/rest";
import { ComponentType } from "@dbun/types";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN! });
const router = new InteractionRouter();
router.setRest(rest);

const activeCollectors = new Map<string, ComponentCollector>();

router.command("confirm", async (interaction, response) => {
  const userId = interaction.user?.id;
  if (!userId) {
    await response.reply({ content: "Could not identify user.", flags: MessageFlags.Ephemeral });
    return;
  }

  const row = new ActionRowBuilder()
    .addComponent(ButtonBuilder.success("confirm_yes", "Yes"))
    .addComponent(ButtonBuilder.danger("confirm_no", "No"));

  await response.reply({
    content: "Are you sure?",
    components: [row.toJSON()],
  });

  const collector = new ComponentCollector(
    (i) => {
      const ci = i as APIMessageComponentInteraction;
      return (
        ci.data.custom_id === "confirm_yes" || ci.data.custom_id === "confirm_no"
      );
    },
    { time: 60_000, idle: 30_000, max: 1 },
  );

  collector.on("collect", async (i) => {
    const ci = i as APIMessageComponentInteraction;
    const chose = ci.data.custom_id === "confirm_yes";
    await response.editReply({
      content: chose ? "Confirmed!" : "Cancelled.",
      components: [],
    });
    collector.stop("answered");
  });

  collector.on("end", async (_collected, reason) => {
    activeCollectors.delete(userId);
    if (reason === "time") {
      await response.editReply({
        content: "Timed out. No response received.",
        components: [],
      });
    }
  });

  activeCollectors.set(userId, collector);
  await collector.await();
});

router.command("favorite", async (_interaction, response) => {
  const select = new StringSelectBuilder()
    .setCustomId("favorite_color")
    .setPlaceholder("Choose a color")
    .addOption({ label: "Red", value: "red" })
    .addOption({ label: "Green", value: "green" })
    .addOption({ label: "Blue", value: "blue" });

  const row = new ActionRowBuilder().addComponent(select);
  await response.reply({
    content: "Pick your favorite color:",
    components: [row.toJSON()],
  });
});

router.component("favorite_color", async (interaction, response) => {
  const ci = interaction as APIMessageComponentInteraction;
  if (ci.data.component_type !== ComponentType.StringSelect) return;
  const values = ci.data.values;
  const choice = values[0] ?? "none";
  await response.reply({ content: `You picked: ${choice}`, flags: MessageFlags.Ephemeral });
});

router.command("support", async (_interaction, response) => {
  const row = new ActionRowBuilder()
    .addComponent(
      ButtonBuilder.link("https://discord.gg/example", "Join support server"),
    )
    .addComponent(
      ButtonBuilder.primary("support_open_ticket", "Open a ticket"),
    );

  await response.reply({ content: "Need help?", components: [row.toJSON()] });
});

router.component("support_open_ticket", async (_interaction, response) => {
  await response.reply({ content: "Ticket created!", flags: MessageFlags.Ephemeral });
});
