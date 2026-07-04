import { describe, test, expect } from "bun:test";
import { ModalBuilder } from "../builders/modal.js";
import { ActionRowBuilder } from "../builders/action-row.js";
import { TextInputBuilder } from "../builders/text-input.js";
import type { ModalComponentBuilder } from "../builders/modal.js";

function data(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe("ModalBuilder", () => {
  test("creates a modal", () => {
    const modal = new ModalBuilder()
      .setCustomId("feedback")
      .setTitle("Feedback Form")
      .addActionRow(
        new ActionRowBuilder<ModalComponentBuilder>().addComponent(
          TextInputBuilder.short("name", "Your name").setRequired(true),
        ),
      )
      .addActionRow(
        new ActionRowBuilder<ModalComponentBuilder>().addComponent(
          TextInputBuilder.paragraph("comment", "Your comment"),
        ),
      );

    const json = modal.toJSON();
    expect(data(json).custom_id).toBe("feedback");
    expect(data(json).title).toBe("Feedback Form");
    expect((json.components as unknown[])?.length).toBe(2);
  });

  test("setActionRows replaces existing", () => {
    const modal = new ModalBuilder()
      .setCustomId("test")
      .setTitle("Test")
      .addActionRow(
        new ActionRowBuilder<ModalComponentBuilder>().addComponent(
          TextInputBuilder.short("a", "A"),
        ),
      )
      .setActionRows([
        new ActionRowBuilder<ModalComponentBuilder>().addComponent(
          TextInputBuilder.paragraph("b", "B"),
        ),
      ]);

    const json = modal.toJSON();
    expect((json.components as unknown[])?.length).toBe(1);
  });

  test("addTextInput convenience method adds a text input wrapped in an action row", () => {
    const modal = new ModalBuilder()
      .setCustomId("feedback")
      .setTitle("Feedback")
      .addTextInput("name", "Your name")
      .addTextInput("comment", "Your comment");

    const json = modal.toJSON();
    expect((json.components as unknown[])?.length).toBe(2);
    expect((json.components?.[0] as { type: number } | undefined)?.type).toBe(1);
  });
});
