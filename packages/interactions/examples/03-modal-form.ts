import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandBuilder,
  InteractionRouter,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type APIModalSubmitInteraction,
  type ModalComponentBuilder,
} from "@dbun/interactions";
import { RESTClient } from "@dbun/rest";
import { ComponentType, type APIModalSubmissionComponent } from "@dbun/types";

const rest = new RESTClient({ token: process.env.DISCORD_TOKEN! });
const router = new InteractionRouter();
router.setRest(rest);

const feedbackCommand = new CommandBuilder({
  name: "feedback",
  description: "Open the feedback form",
}).toJSON();

router.command("feedback", async (_interaction, response) => {
  const modal = new ModalBuilder()
    .setCustomId("feedback_form")
    .setTitle("Feedback Form")
    .addActionRow(
      new ActionRowBuilder<ModalComponentBuilder>().addComponent(
        TextInputBuilder.short("name", "Your name").setRequired(true).setMaxLength(50),
      ),
    )
    .addActionRow(
      new ActionRowBuilder<ModalComponentBuilder>().addComponent(
        TextInputBuilder.paragraph("comment", "Your feedback")
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(2000)
          .setPlaceholder("Tell us what you think..."),
      ),
    )
    .addActionRow(
      new ActionRowBuilder<ModalComponentBuilder>().addComponent(
        TextInputBuilder.short("rating", "Rating 1-10")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2),
      ),
    );

  await response.sendModal(modal);
});

router.modal("feedback_form", async (interaction, response) => {
  const i = interaction as APIModalSubmitInteraction;
  const fields = extractModalValues(i);

  const name = fields.name ?? "Anonymous";
  const comment = fields.comment ?? "";
  const rating = fields.rating ?? "?";

  console.log(`[feedback] ${name} (${rating}/10): ${comment}`);

  await response.reply({
    content: `Thanks for the feedback, **${name}**!`,
    flags: MessageFlags.Ephemeral,
  });
});

function extractModalValues(
  modal: APIModalSubmitInteraction,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const component of modal.data.components ?? []) {
    collectFromComponent(component, out);
  }
  return out;
}

function collectFromComponent(
  component: APIModalSubmissionComponent,
  out: Record<string, string>,
): void {
  if (component.type === ComponentType.ActionRow) {
    for (const child of component.components) {
      if (child.type === ComponentType.TextInput && child.value !== undefined) {
        out[child.custom_id] = child.value;
      }
    }
    return;
  }

  if (component.type === ComponentType.Label) {
    const inner = component.component;
    if ("value" in inner && typeof inner.value === "string") {
      out[inner.custom_id] = inner.value;
    } else if ("values" in inner && Array.isArray(inner.values)) {
      out[inner.custom_id] = inner.values.join(",");
    }
  }
}

const supportCommand = new CommandBuilder({
  name: "support",
  description: "Open a support ticket",
}).toJSON();

const ticketDrafts = new Map<string, { subject?: string; body?: string }>();

router.command("support", async (interaction, response) => {
  const userId = interaction.user?.id;
  if (!userId) {
    await response.reply({ content: "Could not identify user.", flags: MessageFlags.Ephemeral });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("support_ticket")
    .setTitle("Support Ticket")
    .addTextInput("subject", "Subject")
    .addTextInput("body", "Describe your issue", TextInputStyle.Paragraph);

  await response.sendModal(modal);
  ticketDrafts.set(userId, {});
});

router.modal("support_ticket", async (interaction, response) => {
  const i = interaction as APIModalSubmitInteraction;
  const values = extractModalValues(i);
  const userId = i.user?.id;
  if (!userId) {
    await response.reply({ content: "Could not identify user.", flags: MessageFlags.Ephemeral });
    return;
  }

  ticketDrafts.set(userId, { subject: values.subject, body: values.body });

  const confirmRow = new ActionRowBuilder()
    .addComponent(ButtonBuilder.success("support_confirm", "Submit"))
    .addComponent(ButtonBuilder.danger("support_cancel", "Cancel"));

  await response.reply({
    content: `Confirm ticket?\n**Subject:** ${values.subject ?? ""}\n**Body:** ${values.body ?? ""}`,
    components: [confirmRow.toJSON()],
    flags: MessageFlags.Ephemeral,
  });
});

router.component("support_confirm", async (interaction, response) => {
  const userId = interaction.user?.id;
  if (!userId) return;
  const draft = ticketDrafts.get(userId);
  if (!draft) {
    await response.update({ content: "No draft found.", components: [] });
    return;
  }
  console.log(`[ticket] ${userId}: ${draft.subject}`);
  ticketDrafts.delete(userId);
  await response.update({ content: "Ticket submitted!", components: [] });
});

router.component("support_cancel", async (interaction, response) => {
  const userId = interaction.user?.id;
  if (!userId) return;
  ticketDrafts.delete(userId);
  await response.update({ content: "Cancelled.", components: [] });
});

console.log("Modal handlers registered:", feedbackCommand.name, supportCommand.name);
