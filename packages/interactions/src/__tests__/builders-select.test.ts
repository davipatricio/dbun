import { describe, test, expect } from "bun:test";
import {
  StringSelectBuilder,
  UserSelectBuilder,
  RoleSelectBuilder,
  MentionableSelectBuilder,
  ChannelSelectBuilder,
} from "../builders/select.js";
import { ComponentType, SelectMenuDefaultValueType } from "@dbun/types";

describe("StringSelectBuilder", () => {
  test("creates a string select", () => {
    const select = new StringSelectBuilder()
      .setCustomId("select_1")
      .setPlaceholder("Choose...")
      .addOption({ label: "Option A", value: "a" })
      .addOption({ label: "Option B", value: "b" });

    const json = select.toJSON();
    expect(json.type).toBe(ComponentType.StringSelect);
    expect(json.custom_id).toBe("select_1");
    expect(json.placeholder).toBe("Choose...");
    expect(Array.isArray(json.options)).toBe(true);
    expect((json.options as any[]).length).toBe(2);
    expect((json.options as any[])[0].label).toBe("Option A");
  });

  test("setMinValues and setMaxValues", () => {
    const json = new StringSelectBuilder()
      .setCustomId("s")
      .setMinValues(1)
      .setMaxValues(3)
      .addOption({ label: "X", value: "x" })
      .toJSON();
    expect(json.min_values).toBe(1);
    expect(json.max_values).toBe(3);
  });

  test("setDisabled", () => {
    const json = new StringSelectBuilder()
      .setCustomId("s")
      .setDisabled(true)
      .toJSON();
    expect(json.disabled).toBe(true);
  });

  test("setOptions replaces options", () => {
    const json = new StringSelectBuilder()
      .setCustomId("s")
      .setOptions([{ label: "Single", value: "s" }])
      .toJSON();
    expect((json.options as any[]).length).toBe(1);
  });
});

describe("UserSelectBuilder", () => {
  test("creates a user select", () => {
    const json = new UserSelectBuilder()
      .setCustomId("user_select")
      .setPlaceholder("Pick a user")
      .setMinValues(1)
      .setMaxValues(5)
      .toJSON();
    expect(json.type).toBe(ComponentType.UserSelect);
    expect(json.custom_id).toBe("user_select");
    expect(json.placeholder).toBe("Pick a user");
    expect(json.min_values).toBe(1);
    expect(json.max_values).toBe(5);
  });

  test("setDefaultValues", () => {
    const json = new UserSelectBuilder()
      .setCustomId("u")
      .setDefaultValues([{ id: "123", type: SelectMenuDefaultValueType.User }])
      .toJSON();
    expect(json.default_values).toEqual([{ id: "123", type: "user" }]);
  });
});

describe("RoleSelectBuilder", () => {
  test("creates a role select", () => {
    const json = new RoleSelectBuilder()
      .setCustomId("role_select")
      .setDisabled(true)
      .toJSON();
    expect(json.type).toBe(ComponentType.RoleSelect);
    expect(json.disabled).toBe(true);
  });
});

describe("MentionableSelectBuilder", () => {
  test("creates a mentionable select", () => {
    const json = new MentionableSelectBuilder()
      .setCustomId("m")
      .setPlaceholder("Select...")
      .toJSON();
    expect(json.type).toBe(ComponentType.MentionableSelect);
  });
});

describe("ChannelSelectBuilder", () => {
  test("creates a channel select with channel types", () => {
    const json = new ChannelSelectBuilder()
      .setCustomId("ch")
      .setChannelTypes([0, 2])
      .toJSON();
    expect(json.type).toBe(ComponentType.ChannelSelect);
    expect(json.channel_types).toEqual([0, 2]);
  });
});
