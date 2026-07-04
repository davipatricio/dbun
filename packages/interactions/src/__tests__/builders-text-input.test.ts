import { describe, test, expect } from "bun:test";
import { TextInputBuilder } from "../builders/text-input.js";
import { ComponentType, TextInputStyle } from "@dbun/types";

describe("TextInputBuilder", () => {
  test("creates a short text input", () => {
    const input = TextInputBuilder.short("name", "Your name")
      .setPlaceholder("Enter name")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100);

    const json = input.toJSON();
    expect(json.type).toBe(ComponentType.TextInput);
    expect(json.style).toBe(TextInputStyle.Short);
    expect(json.custom_id).toBe("name");
    expect(json.label).toBe("Your name");
    expect(json.placeholder).toBe("Enter name");
    expect(json.required).toBe(true);
    expect(json.min_length).toBe(1);
    expect(json.max_length).toBe(100);
  });

  test("creates a paragraph text input", () => {
    const json = TextInputBuilder.paragraph("bio", "About you").toJSON();
    expect(json.style).toBe(TextInputStyle.Paragraph);
    expect(json.custom_id).toBe("bio");
    expect(json.label).toBe("About you");
  });

  test("setValue prefills value", () => {
    const json = new TextInputBuilder()
      .setCustomId("pre")
      .setLabel("Prefilled")
      .setStyle(TextInputStyle.Short)
      .setValue("hello")
      .toJSON();
    expect(json.value).toBe("hello");
  });

  test("method chaining", () => {
    const json = new TextInputBuilder()
      .setCustomId("chain")
      .setLabel("Chain")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMinLength(10)
      .setMaxLength(4000)
      .setPlaceholder("Type here...")
      .toJSON();
    expect(json.custom_id).toBe("chain");
    expect(json.label).toBe("Chain");
    expect(json.style).toBe(TextInputStyle.Paragraph);
    expect(json.required).toBe(false);
    expect(json.min_length).toBe(10);
    expect(json.max_length).toBe(4000);
    expect(json.placeholder).toBe("Type here...");
  });
});
