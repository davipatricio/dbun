import { describe, test, expect } from "bun:test";
import { CommandBuilder } from "../command.js";
import { ApplicationCommandOptionType, ApplicationCommandType } from "@dbun/types";

describe("CommandBuilder", () => {
  describe("constructor", () => {
    test("sets name and description", () => {
      const cmd = new CommandBuilder({ name: "ping", description: "Pong!" });
      const json = cmd.toJSON();
      expect(json.name).toBe("ping");
      expect(json.description).toBe("Pong!");
    });

    test("defaults description to empty string", () => {
      const cmd = new CommandBuilder({ name: "ping" });
      expect(cmd.toJSON().description).toBe("");
    });

    test("defaults type to ChatInput (1)", () => {
      const cmd = new CommandBuilder({ name: "ping" });
      expect(cmd.toJSON().type).toBe(1);
    });

    test("accepts custom type", () => {
      const cmd = new CommandBuilder({ name: "menu", type: ApplicationCommandType.Message });
      expect(cmd.toJSON().type).toBe(ApplicationCommandType.Message);
    });

    test("sets dm_permission", () => {
      const cmd = new CommandBuilder({ name: "ping", dmPermission: false });
      expect(cmd.toJSON().dm_permission).toBe(false);
    });

    test("sets nsfw", () => {
      const cmd = new CommandBuilder({ name: "ping", nsfw: true });
      expect(cmd.toJSON().nsfw).toBe(true);
    });
  });

  describe("setName", () => {
    test("updates name", () => {
      const cmd = new CommandBuilder({ name: "ping" }).setName("pong");
      expect(cmd.toJSON().name).toBe("pong");
    });

    test("returns this for chaining", () => {
      const cmd = new CommandBuilder({ name: "ping" });
      expect(cmd.setName("pong")).toBe(cmd);
    });
  });

  describe("setDescription", () => {
    test("updates description", () => {
      const cmd = new CommandBuilder({ name: "ping" }).setDescription("New desc");
      expect(cmd.toJSON().description).toBe("New desc");
    });

    test("returns this for chaining", () => {
      const cmd = new CommandBuilder({ name: "ping" });
      expect(cmd.setDescription("desc")).toBe(cmd);
    });
  });

  describe("addOption", () => {
    test("adds option", () => {
      const cmd = new CommandBuilder({ name: "ping" }).addOption({
        name: "target",
        description: "User to ping",
        type: ApplicationCommandOptionType.User,
        required: true,
      });
      const json = cmd.toJSON();
      expect(json.options).toHaveLength(1);
      expect(json.options![0]).toMatchObject({
        name: "target",
        description: "User to ping",
        type: ApplicationCommandOptionType.User,
        required: true,
      });
    });

    test("adds multiple options", () => {
      const cmd = new CommandBuilder({ name: "test" })
        .addOption({ name: "a", description: "A", type: ApplicationCommandOptionType.String })
        .addOption({ name: "b", description: "B", type: ApplicationCommandOptionType.Integer });
      expect(cmd.toJSON().options).toHaveLength(2);
    });

    test("returns this for chaining", () => {
      const cmd = new CommandBuilder({ name: "ping" });
      const result = cmd.addOption({
        name: "x",
        description: "x",
        type: ApplicationCommandOptionType.String,
      });
      expect(result).toBe(cmd);
    });

    test("includes choices", () => {
      const cmd = new CommandBuilder({ name: "test" }).addOption({
        name: "color",
        description: "Pick a color",
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: "Red", value: "red" },
          { name: "Blue", value: "blue" },
        ],
      });
      const option = cmd.toJSON().options![0] as any;
      expect(option.choices).toHaveLength(2);
      expect(option.choices[0].name).toBe("Red");
    });
  });

  describe("constructor with options", () => {
    test("sets initial options from constructor", () => {
      const cmd = new CommandBuilder({
        name: "greet",
        description: "Greet someone",
        options: [
          { name: "name", description: "Name", type: ApplicationCommandOptionType.String, required: true },
        ],
      });
      expect(cmd.toJSON().options).toHaveLength(1);
      expect(cmd.toJSON().options![0]!.name).toBe("name");
    });
  });

  describe("toJSON", () => {
    test("returns complete APIApplicationCommand shape", () => {
      const cmd = new CommandBuilder({ name: "test", description: "Test command" });
      const json = cmd.toJSON();
      expect(json).toHaveProperty("name", "test");
      expect(json).toHaveProperty("description", "Test command");
      expect(json).toHaveProperty("type", 1);
    });
  });

  describe("fluent chaining", () => {
    test("supports full builder chain", () => {
      const json = new CommandBuilder({ name: "start" })
        .setName("begin")
        .setDescription("Begin something")
        .addOption({ name: "mode", description: "Mode", type: ApplicationCommandOptionType.String })
        .addOption({ name: "count", description: "Count", type: ApplicationCommandOptionType.Integer })
        .toJSON();

      expect(json.name).toBe("begin");
      expect(json.description).toBe("Begin something");
      expect(json.options).toHaveLength(2);
    });
  });
});
