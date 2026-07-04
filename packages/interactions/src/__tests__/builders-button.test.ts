import { describe, test, expect } from "bun:test";
import { ButtonBuilder } from "../builders/button.js";
import { ButtonStyle, ComponentType } from "@dbun/types";

function data(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe("ButtonBuilder", () => {
  test("creates a primary button", () => {
    const btn = new ButtonBuilder()
      .setCustomId("test")
      .setLabel("Click me")
      .setStyle(ButtonStyle.Primary);

    const json = btn.toJSON();
    expect(data(json).type).toBe(ComponentType.Button);
    expect(data(json).style).toBe(ButtonStyle.Primary);
    expect(data(json).custom_id).toBe("test");
    expect(data(json).label).toBe("Click me");
  });

  test("creates with static helper", () => {
    const btn = ButtonBuilder.primary("btn_id", "Submit");
    const json = btn.toJSON();
    expect(data(json).custom_id).toBe("btn_id");
    expect(data(json).label).toBe("Submit");
    expect(data(json).style).toBe(ButtonStyle.Primary);
  });

  test("static secondary", () => {
    const json = ButtonBuilder.secondary("s", "S").toJSON();
    expect(data(json).style).toBe(ButtonStyle.Secondary);
  });

  test("static success", () => {
    const json = ButtonBuilder.success("ok", "OK").toJSON();
    expect(data(json).style).toBe(ButtonStyle.Success);
  });

  test("static danger", () => {
    const json = ButtonBuilder.danger("del", "Delete").toJSON();
    expect(data(json).style).toBe(ButtonStyle.Danger);
  });

  test("creates a link button", () => {
    const btn = ButtonBuilder.link("https://discord.com", "Visit");
    const json = btn.toJSON();
    expect(data(json).style).toBe(ButtonStyle.Link);
    expect(data(json).url).toBe("https://discord.com");
    expect(data(json).label).toBe("Visit");
  });

  test("creates a premium button", () => {
    const btn = ButtonBuilder.premium("sku_123");
    const json = btn.toJSON();
    expect(data(json).style).toBe(ButtonStyle.Premium);
    expect(data(json).sku_id).toBe("sku_123");
  });

  test("sets emoji", () => {
    const json = new ButtonBuilder()
      .setCustomId("e")
      .setLabel("Emoji")
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ name: "smile", id: "123", animated: false })
      .toJSON();
    expect(data(json).emoji).toEqual({ name: "smile", id: "123", animated: false });
  });

  test("sets disabled", () => {
    const json = new ButtonBuilder()
      .setCustomId("d")
      .setLabel("Disabled")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
      .toJSON();
    expect(data(json).disabled).toBe(true);
  });

  test("method chaining", () => {
    const json = new ButtonBuilder()
      .setCustomId("chain")
      .setLabel("Chain")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(false)
      .toJSON();
    expect(data(json).custom_id).toBe("chain");
    expect(data(json).label).toBe("Chain");
    expect(data(json).style).toBe(ButtonStyle.Danger);
    expect(data(json).disabled).toBe(false);
  });
});
