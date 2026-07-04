import { describe, test, expect } from "bun:test";
import { Interaction } from "../interaction.js";
import { InteractionType } from "@dbun/types";
import type { APIInteraction, APIUser, APIGuildMember } from "@dbun/types";

const mockUser: APIUser = {
  id: "u1",
  username: "alice",
  discriminator: "0",
  global_name: null,
  avatar: null,
} as APIUser;

const mockMember: APIGuildMember = {
  user: mockUser,
  roles: [],
  joined_at: "2024-01-01T00:00:00+00:00",
} as unknown as APIGuildMember;

function createPingInteraction(): APIInteraction {
  return {
    id: "1234567890",
    application_id: "app_id",
    type: InteractionType.Ping,
    token: "ping_token",
    version: 1,
  } as APIInteraction;
}

function createChatInputInteraction(
  data: Record<string, unknown> = { id: "cmd_id", name: "ping", type: 1 },
): APIInteraction {
  return {
    id: "1234567890",
    application_id: "app_id",
    type: InteractionType.ApplicationCommand,
    token: "tok",
    version: 1,
    guild_id: "guild_id",
    channel_id: "channel_id",
    member: mockMember,
    user: mockUser,
    app_permissions: "442368",
    locale: "en-US",
    guild_locale: "en-US",
    data,
  } as unknown as APIInteraction;
}

function createDMInteraction(): APIInteraction {
  return {
    id: "1234567890",
    application_id: "app_id",
    type: InteractionType.ApplicationCommand,
    token: "tok",
    version: 1,
    channel_id: "dm_channel",
    user: mockUser,
    app_permissions: "442368",
    locale: "en-US",
    data: { id: "cmd_id", name: "ping", type: 1 },
  } as unknown as APIInteraction;
}

function createComponentInteraction(): APIInteraction {
  return {
    id: "1234567890",
    application_id: "app_id",
    type: InteractionType.MessageComponent,
    token: "tok",
    version: 1,
    guild_id: "g",
    channel_id: "c",
    member: mockMember,
    app_permissions: "1",
    locale: "en-US",
    data: { custom_id: "btn_1", component_type: 2 },
  } as unknown as APIInteraction;
}

function createModalSubmitInteraction(): APIInteraction {
  return {
    id: "1234567890",
    application_id: "app_id",
    type: InteractionType.ModalSubmit,
    token: "tok",
    version: 1,
    guild_id: "g",
    channel_id: "c",
    member: mockMember,
    app_permissions: "1",
    locale: "en-US",
    data: { custom_id: "modal_1", components: [] },
  } as unknown as APIInteraction;
}

describe("Interaction structure", () => {
  describe("base properties", () => {
    test("id and toJSON", () => {
      const raw = createChatInputInteraction();
      const interaction = new Interaction(raw);
      expect(interaction.id).toBe("1234567890");
      expect(interaction.toJSON()).toBe(raw);
      expect(interaction.valueOf()).toBe("1234567890");
    });

    test("type, token, applicationId", () => {
      const interaction = new Interaction(createChatInputInteraction());
      expect(interaction.type).toBe(InteractionType.ApplicationCommand);
      expect(interaction.token).toBe("tok");
      expect(interaction.applicationId).toBe("app_id");
      expect(interaction.version).toBe(1);
      expect(interaction.appPermissions).toBe("442368");
    });

    test("guildId and channelId when present", () => {
      const interaction = new Interaction(createChatInputInteraction());
      expect(interaction.guildId).toBe("guild_id");
      expect(interaction.channelId).toBe("channel_id");
    });

    test("locale and guildLocale", () => {
      const interaction = new Interaction(createChatInputInteraction());
      expect(interaction.locale).toBe("en-US");
      expect(interaction.guildLocale).toBe("en-US");
    });

    test("locale is undefined for PING", () => {
      const interaction = new Interaction(createPingInteraction());
      expect(interaction.locale).toBeUndefined();
      expect(interaction.guildLocale).toBeUndefined();
    });

    test("DM interaction has user not member", () => {
      const interaction = new Interaction(createDMInteraction());
      expect(interaction.guildId).toBeUndefined();
      expect(interaction.member).toBeUndefined();
      expect(interaction.user).toBeDefined();
    });
  });

  describe("commandData", () => {
    test("returns interaction data for chat input", () => {
      const data = { id: "cmd_id", name: "ping", type: 1, options: [] };
      const interaction = new Interaction(createChatInputInteraction(data as any));
      expect(interaction.commandData).toEqual(data);
    });

    test("returns interaction data for component", () => {
      const interaction = new Interaction(createComponentInteraction());
      expect(interaction.commandData).toBeDefined();
      expect((interaction.commandData as any).custom_id).toBe("btn_1");
    });

    test("returns interaction data for modal submit", () => {
      const interaction = new Interaction(createModalSubmitInteraction());
      expect(interaction.commandData).toBeDefined();
    });

    test("returns undefined for PING", () => {
      const interaction = new Interaction(createPingInteraction());
      expect(interaction.commandData).toBeUndefined();
    });
  });

  describe("resolved data", () => {
    test("returns resolved users/members", () => {
      const member = {
        user: mockUser,
        roles: [],
        joined_at: "2024-01-01T00:00:00+00:00",
        nick: "al",
      };
      const resolved = {
        users: { u1: mockUser },
        members: { u1: member },
        channels: {},
        roles: {},
        messages: {},
      };
      const raw = createChatInputInteraction({
        id: "cmd_id",
        name: "ping",
        type: 1,
        resolved,
      } as any);
      const interaction = new Interaction(raw);
      expect(interaction.resolved).toBeDefined();
      expect(interaction.resolved?.users?.u1).toEqual(mockUser);
      expect(interaction.resolved?.members?.u1?.nick).toBe("al");
    });

    test("returns undefined when no resolved data", () => {
      const interaction = new Interaction(createChatInputInteraction());
      expect(interaction.resolved).toBeUndefined();
    });
  });
});
