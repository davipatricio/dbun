import { describe, test, expect } from "bun:test";
import { ActionRowBuilder } from "../builders/action-row.js";
import { ButtonBuilder } from "../builders/button.js";
import { StringSelectBuilder } from "../builders/select.js";
import { ComponentType } from "@dbun/types";

describe("ActionRowBuilder", () => {
  test("creates an action row with buttons", () => {
    const row = new ActionRowBuilder()
      .addComponent(ButtonBuilder.primary("btn", "Click"))
      .addComponent(ButtonBuilder.secondary("btn2", "Cancel"));

    const json = row.toJSON();
    expect(json.type).toBe(ComponentType.ActionRow);
    expect(Array.isArray(json.components)).toBe(true);
    expect(json.components.length).toBe(2);
  });

  test("creates an action row with a select", () => {
    const row = new ActionRowBuilder()
      .addComponent(new StringSelectBuilder().setCustomId("sel").addOption({ label: "A", value: "a" }));

    const json = row.toJSON();
    expect(json.type).toBe(ComponentType.ActionRow);
    expect(json.components.length).toBe(1);
  });

  test("setComponents replaces all", () => {
    const row = new ActionRowBuilder()
      .addComponent(ButtonBuilder.primary("a", "A"))
      .setComponents([ButtonBuilder.danger("b", "B")]);

    const json = row.toJSON();
    expect(json.components.length).toBe(1);
  });

  test("addComponents appends multiple", () => {
    const row = new ActionRowBuilder()
      .addComponents([
        ButtonBuilder.primary("a", "A"),
        ButtonBuilder.secondary("b", "B"),
      ]);

    const json = row.toJSON();
    expect(json.components.length).toBe(2);
  });
});
