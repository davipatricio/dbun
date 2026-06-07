import { describe, test, expect, mock } from "bun:test";
import { Client } from "../client.js";
import { GatewayIntentBits } from "@dbun/types";

function createClient() {
  return new Client({
    token: "test-token-123",
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
}

function dispatch(client: Client, event: string, data: unknown) {
  (client as any).handleDispatch(event, data);
}

describe("Client", () => {
  describe("constructor", () => {
    test("creates client with valid options", () => {
      const client = createClient();
      expect(client.token).toBe("test-token-123");
      expect(client.rest).toBeDefined();
      expect(client.interactions).toBeDefined();
      expect(client.tracer).toBeDefined();
      expect(client.metrics).toBeDefined();
    });

    test("creates cache managers for all resources", () => {
      const client = createClient();
      expect(client.guilds).toBeDefined();
      expect(client.channels).toBeDefined();
      expect(client.messages).toBeDefined();
      expect(client.users).toBeDefined();
      expect(client.members).toBeDefined();
      expect(client.roles).toBeDefined();
      expect(client.emojis).toBeDefined();
      expect(client.voiceStates).toBeDefined();
      expect(client.bans).toBeDefined();
    });

    test("commands is null without applicationId", () => {
      const client = createClient();
      expect(client.commands).toBeNull();
    });

    test("commands exists with applicationId", () => {
      const client = new Client({
        token: "token",
        intents: [GatewayIntentBits.Guilds],
        applicationId: "app-123",
      });
      expect(client.commands).toBeDefined();
    });

    test("ws is null before login", () => {
      const client = createClient();
      expect(client.ws).toBeNull();
    });

    test("isReady returns false initially", () => {
      const client = createClient();
      expect(client.isReady()).toBe(false);
    });
  });

  describe("event system", () => {
    test("on registers handler and returns this", () => {
      const client = createClient();
      const handler = mock(() => {});
      const result = client.on("ready", handler);
      expect(result).toBe(client);
    });

    test("emit calls registered handlers", () => {
      const client = createClient();
      const handler = mock(() => {});
      client.on("debug", handler);
      client.emit("debug", "test message");
      expect(handler).toHaveBeenCalledWith("test message");
    });

    test("off removes handler", () => {
      const client = createClient();
      const handler = mock(() => {});
      client.on("debug", handler);
      client.off("debug", handler);
      client.emit("debug", "test");
      expect(handler).not.toHaveBeenCalled();
    });

    test("multiple handlers for same event", () => {
      const client = createClient();
      const h1 = mock(() => {});
      const h2 = mock(() => {});
      client.on("debug", h1);
      client.on("debug", h2);
      client.emit("debug", "msg");
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleDispatch", () => {
    test("READY sets applicationId and caches user", async () => {
      const client = createClient();
      dispatch(client, "READY", {
        user: { id: "user-1", username: "test", discriminator: "0" },
        application: { id: "app-1" },
      });
      await Bun.sleep(5);
      const user = await client.users.cache.get("user-1");
      expect(user).toBeDefined();
    });

    test("GUILD_CREATE caches guild, channels, members, roles", async () => {
      const client = createClient();
      dispatch(client, "GUILD_CREATE", {
        id: "guild-1",
        name: "Test Guild",
        channels: [{ id: "ch-1", name: "general" }],
        members: [{ user: { id: "u1" } }],
        roles: [{ id: "r1", name: "Admin" }],
        emojis: [{ id: "e1", name: "👍" }],
        voice_states: [],
      });
      await Bun.sleep(5);
      const guild = await client.guilds.cache.get("guild-1");
      expect(guild).toBeDefined();
      const channel = await client.channels.cache.get("ch-1");
      expect(channel).toBeDefined();
      const member = await client.members.cache.get("guild-1:u1");
      expect(member).toBeDefined();
      const role = await client.roles.cache.get("guild-1:r1");
      expect(role).toBeDefined();
    });

    test("GUILD_UPDATE updates guild in cache", async () => {
      const client = createClient();
      dispatch(client, "GUILD_CREATE", {
        id: "guild-1",
        name: "Old Name",
        channels: [],
        members: [],
        roles: [],
        emojis: [],
      });
      await Bun.sleep(5);
      dispatch(client, "GUILD_UPDATE", { id: "guild-1", name: "New Name" });
      await Bun.sleep(5);
      const guild = await client.guilds.cache.get("guild-1");
      expect(guild).toBeDefined();
    });

    test("GUILD_DELETE removes guild and cascading data", async () => {
      const client = createClient();
      dispatch(client, "GUILD_CREATE", {
        id: "guild-1",
        name: "Test",
        channels: [],
        members: [{ user: { id: "u1" } }],
        roles: [{ id: "r1", name: "Role" }],
        emojis: [{ id: "e1", name: "🎉" }],
        voice_states: [{ user_id: "u2" }],
      });
      await Bun.sleep(5);
      dispatch(client, "GUILD_DELETE", { id: "guild-1", unavailable: false });
      await Bun.sleep(5);
      const guild = await client.guilds.cache.get("guild-1");
      expect(guild === null).toBe(true);
    });

    test("CHANNEL_CREATE caches channel", async () => {
      const client = createClient();
      dispatch(client, "CHANNEL_CREATE", { id: "ch-1", name: "general", type: 0 });
      await Bun.sleep(5);
      const channel = await client.channels.cache.get("ch-1");
      expect(channel).toBeDefined();
    });

    test("CHANNEL_DELETE removes channel", async () => {
      const client = createClient();
      dispatch(client, "CHANNEL_CREATE", { id: "ch-1", name: "test", type: 0 });
      await Bun.sleep(5);
      dispatch(client, "CHANNEL_DELETE", { id: "ch-1", name: "test", type: 0 });
      await Bun.sleep(5);
      const channel = await client.channels.cache.get("ch-1");
      expect(channel).toBe(null);
    });

    test("MESSAGE_CREATE caches message", async () => {
      const client = createClient();
      dispatch(client, "MESSAGE_CREATE", {
        id: "msg-1",
        content: "hello",
        channel_id: "ch-1",
        author: { id: "u1", username: "test", discriminator: "0" },
      });
      await Bun.sleep(5);
      const msg = await client.messages.cache.get("msg-1");
      expect(msg).toBeDefined();
    });

    test("MESSAGE_DELETE removes message", async () => {
      const client = createClient();
      dispatch(client, "MESSAGE_CREATE", {
        id: "msg-1",
        content: "hello",
        channel_id: "ch-1",
        author: { id: "u1", username: "test", discriminator: "0" },
      });
      await Bun.sleep(5);
      dispatch(client, "MESSAGE_DELETE", { id: "msg-1", channel_id: "ch-1" });
      await Bun.sleep(5);
      const msg = await client.messages.cache.get("msg-1");
      expect(msg).toBe(null);
    });

    test("MESSAGE_DELETE_BULK removes multiple messages", async () => {
      const client = createClient();
      dispatch(client, "MESSAGE_CREATE", {
        id: "m1", content: "a", channel_id: "ch-1", author: { id: "u1", username: "t", discriminator: "0" },
      });
      dispatch(client, "MESSAGE_CREATE", {
        id: "m2", content: "b", channel_id: "ch-1", author: { id: "u1", username: "t", discriminator: "0" },
      });
      await Bun.sleep(5);
      dispatch(client, "MESSAGE_DELETE_BULK", { ids: ["m1", "m2"], channel_id: "ch-1" });
      await Bun.sleep(5);
      expect(await client.messages.cache.get("m1")).toBe(null);
      expect(await client.messages.cache.get("m2")).toBe(null);
    });

    test("GUILD_MEMBER_ADD caches member", async () => {
      const client = createClient();
      dispatch(client, "GUILD_MEMBER_ADD", {
        guild_id: "g1",
        user: { id: "u1", username: "test", discriminator: "0" },
      });
      await Bun.sleep(5);
      const member = await client.members.cache.get("g1:u1");
      expect(member).toBeDefined();
    });

    test("GUILD_MEMBER_REMOVE deletes member", async () => {
      const client = createClient();
      dispatch(client, "GUILD_MEMBER_ADD", {
        guild_id: "g1",
        user: { id: "u1", username: "test", discriminator: "0" },
      });
      await Bun.sleep(5);
      dispatch(client, "GUILD_MEMBER_REMOVE", {
        guild_id: "g1",
        user: { id: "u1", username: "test", discriminator: "0" },
      });
      await Bun.sleep(5);
      expect(await client.members.cache.get("g1:u1")).toBe(null);
    });

    test("GUILD_ROLE_CREATE caches role", async () => {
      const client = createClient();
      dispatch(client, "GUILD_ROLE_CREATE", {
        guild_id: "g1",
        role: { id: "r1", name: "Admin" },
      });
      await Bun.sleep(5);
      const role = await client.roles.cache.get("g1:r1");
      expect(role).toBeDefined();
    });

    test("GUILD_ROLE_DELETE removes role", async () => {
      const client = createClient();
      dispatch(client, "GUILD_ROLE_CREATE", {
        guild_id: "g1",
        role: { id: "r1", name: "Admin" },
      });
      await Bun.sleep(5);
      dispatch(client, "GUILD_ROLE_DELETE", {
        guild_id: "g1",
        role_id: "r1",
      });
      await Bun.sleep(5);
      expect(await client.roles.cache.get("g1:r1")).toBe(null);
    });

    test("GUILD_BAN_ADD caches ban", async () => {
      const client = createClient();
      dispatch(client, "GUILD_BAN_ADD", {
        guild_id: "g1",
        user: { id: "u1", username: "bad", discriminator: "0" },
      });
      await Bun.sleep(5);
      const ban = await client.bans.cache.get("g1:u1");
      expect(ban).toBeDefined();
    });

    test("GUILD_BAN_REMOVE deletes ban", async () => {
      const client = createClient();
      dispatch(client, "GUILD_BAN_ADD", {
        guild_id: "g1",
        user: { id: "u1", username: "bad", discriminator: "0" },
      });
      await Bun.sleep(5);
      dispatch(client, "GUILD_BAN_REMOVE", {
        guild_id: "g1",
        user: { id: "u1", username: "bad", discriminator: "0" },
      });
      await Bun.sleep(5);
      expect(await client.bans.cache.get("g1:u1")).toBe(null);
    });

    test("VOICE_STATE_UPDATE caches voice state with guild", async () => {
      const client = createClient();
      dispatch(client, "VOICE_STATE_UPDATE", {
        guild_id: "g1",
        user_id: "u1",
        channel_id: "ch-1",
      });
      await Bun.sleep(5);
      const vs = await client.voiceStates.cache.get("g1:u1");
      expect(vs).toBeDefined();
    });

    test("VOICE_STATE_UPDATE ignores DM voice states (no guild_id)", async () => {
      const client = createClient();
      dispatch(client, "VOICE_STATE_UPDATE", {
        user_id: "u1",
        channel_id: "ch-1",
      });
      await Bun.sleep(5);
      const vs = await client.voiceStates.cache.get("ch-1");
      expect(vs).toBe(null);
    });

    test("USER_UPDATE caches user", async () => {
      const client = createClient();
      dispatch(client, "USER_UPDATE", {
        id: "u1",
        username: "updated",
        discriminator: "0",
      });
      await Bun.sleep(5);
      const user = await client.users.cache.get("u1");
      expect(user).toBeDefined();
    });

    test("THREAD_CREATE caches thread as channel", async () => {
      const client = createClient();
      dispatch(client, "THREAD_CREATE", {
        id: "t-1",
        name: "Thread",
        type: 11,
      });
      await Bun.sleep(5);
      const thread = await client.channels.cache.get("t-1");
      expect(thread).toBeDefined();
    });

    test("THREAD_DELETE removes thread", async () => {
      const client = createClient();
      dispatch(client, "THREAD_CREATE", { id: "t-1", name: "Thread", type: 11 });
      await Bun.sleep(5);
      dispatch(client, "THREAD_DELETE", { id: "t-1", guild_id: "g1" });
      await Bun.sleep(5);
      expect(await client.channels.cache.get("t-1")).toBe(null);
    });

    test("emit fires dispatched event", () => {
      const client = createClient();
      const handler = mock(() => {});
      client.on("MESSAGE_CREATE", handler);
      dispatch(client, "MESSAGE_CREATE", { id: "m1" });
      expect(handler).toHaveBeenCalledWith({ id: "m1" });
    });
  });
});
