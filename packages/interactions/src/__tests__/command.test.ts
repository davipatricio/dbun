import { describe, test, expect } from "bun:test";
import { CommandBuilder, SubcommandBuilder, SubcommandGroupBuilder } from "../command.js";
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

    test("sets name_localizations", () => {
      const cmd = new CommandBuilder({
        name: "ping",
        nameLocalizations: { "es-ES": "bip" },
      });
      expect(cmd.toJSON().name_localizations).toEqual({ "es-ES": "bip" });
    });

    test("sets description_localizations", () => {
      const cmd = new CommandBuilder({
        name: "ping",
        descriptionLocalizations: { "es-ES": "Responder con pong" },
      });
      expect(cmd.toJSON().description_localizations).toEqual({ "es-ES": "Responder con pong" });
    });

    test("sets default_member_permissions", () => {
      const cmd = new CommandBuilder({ name: "admin", defaultMemberPermissions: "0" });
      expect(cmd.toJSON().default_member_permissions).toBe("0");
    });

    test("sets contexts", () => {
      const cmd = new CommandBuilder({ name: "ctx", contexts: [0, 1] });
      expect(cmd.toJSON().contexts).toEqual([0, 1]);
    });

    test("sets integration_types", () => {
      const cmd = new CommandBuilder({ name: "int", integrationTypes: [0] });
      expect(cmd.toJSON().integration_types).toEqual([0]);
    });
  });

  describe("setters", () => {
    test("setNameLocalizations", () => {
      const cmd = new CommandBuilder({ name: "x" }).setNameLocalizations({ de: "y" });
      expect(cmd.toJSON().name_localizations).toEqual({ de: "y" });
    });

    test("setDescriptionLocalizations", () => {
      const cmd = new CommandBuilder({ name: "x" }).setDescriptionLocalizations({ de: "y" });
      expect(cmd.toJSON().description_localizations).toEqual({ de: "y" });
    });

    test("setDefaultMemberPermissions", () => {
      const cmd = new CommandBuilder({ name: "x" }).setDefaultMemberPermissions("8");
      expect(cmd.toJSON().default_member_permissions).toBe("8");
    });

    test("setDmPermission", () => {
      const cmd = new CommandBuilder({ name: "x" }).setDmPermission(true);
      expect(cmd.toJSON().dm_permission).toBe(true);
    });

    test("setContexts", () => {
      const cmd = new CommandBuilder({ name: "x" }).setContexts([0, 2]);
      expect(cmd.toJSON().contexts).toEqual([0, 2]);
    });

    test("setIntegrationTypes", () => {
      const cmd = new CommandBuilder({ name: "x" }).setIntegrationTypes([1]);
      expect(cmd.toJSON().integration_types).toEqual([1]);
    });
  });

  describe("options", () => {
    test("addOption with autocomplete", () => {
      const cmd = new CommandBuilder({ name: "search" }).addOption({
        name: "query",
        description: "Search query",
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
      });
      const json = cmd.toJSON();
      expect(json.options).toHaveLength(1);
      expect((json.options![0] as any).autocomplete).toBe(true);
    });

    test("addOption with min/max values", () => {
      const cmd = new CommandBuilder({ name: "roll" }).addOption({
        name: "sides",
        description: "Number of sides",
        type: ApplicationCommandOptionType.Integer,
        minValue: 2,
        maxValue: 100,
      });
      const opt = cmd.toJSON().options![0] as any;
      expect(opt.min_value).toBe(2);
      expect(opt.max_value).toBe(100);
    });

    test("addOption with channel_types", () => {
      const cmd = new CommandBuilder({ name: "pin" }).addOption({
        name: "channel",
        description: "Target channel",
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [0, 5],
      });
      const opt = cmd.toJSON().options![0] as any;
      expect(opt.channel_types).toEqual([0, 5]);
    });

    test("addOption with min/max length for strings", () => {
      const cmd = new CommandBuilder({ name: "note" }).addOption({
        name: "text",
        description: "Note",
        type: ApplicationCommandOptionType.String,
        minLength: 1,
        maxLength: 1000,
      });
      const opt = cmd.toJSON().options![0] as any;
      expect(opt.min_length).toBe(1);
      expect(opt.max_length).toBe(1000);
    });
  });

  describe("subcommands", () => {
    test("addSubcommand", () => {
      const sub = new SubcommandBuilder("get", "Get a resource")
        .addOption({
          name: "id",
          description: "Resource ID",
          type: ApplicationCommandOptionType.String,
          required: true,
        });

      const cmd = new CommandBuilder({ name: "resource", description: "Manage resources" })
        .addSubcommand(sub);

      const json = cmd.toJSON();
      expect(json.options).toHaveLength(1);
      const opt = json.options![0] as any;
      expect(opt.type).toBe(1);
      expect(opt.name).toBe("get");
      expect(opt.description).toBe("Get a resource");
      expect(opt.options).toHaveLength(1);
    });

    test("addSubcommandGroup", () => {
      const sub = new SubcommandBuilder("add", "Add an item");
      const group = new SubcommandGroupBuilder("items", "Manage items")
        .addSubcommand(sub);

      const cmd = new CommandBuilder({ name: "inventory", description: "Inventory" })
        .addSubcommandGroup(group);

      const json = cmd.toJSON();
      const opt = json.options![0] as any;
      expect(opt.type).toBe(2);
      expect(opt.name).toBe("items");
      expect(opt.options).toHaveLength(1);
      expect(opt.options[0].name).toBe("add");
    });

    test("subcommand with localizations", () => {
      const sub = new SubcommandBuilder("get", "Get")
        .setNameLocalizations({ de: "holen" })
        .setDescriptionLocalizations({ de: "Holen" });

      const cmd = new CommandBuilder({ name: "cmd", description: "cmd" })
        .addSubcommand(sub);

      const opt = cmd.toJSON().options![0] as any;
      expect(opt.name_localizations).toEqual({ de: "holen" });
      expect(opt.description_localizations).toEqual({ de: "Holen" });
    });
  });
});
