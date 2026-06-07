import { describe, test, expect, mock } from "bun:test";
import { Client } from "../client.js";
import { GatewayIntentBits } from "@dbun/types";
import type { IPCAdapter, IPCMessage, ShardRange, WorkerMetadata } from "@dbun/ipc";

function createMockAdapter(): IPCAdapter & {
  messages: IPCMessage[];
  workers: Map<string, WorkerMetadata>;
  assignment: Map<string, ShardRange>;
  messageHandler: ((message: IPCMessage) => void) | null;
} {
  const adapter = {
    messages: [] as IPCMessage[],
    workers: new Map<string, WorkerMetadata>(),
    assignment: new Map<string, ShardRange>(),
    messageHandler: null as ((message: IPCMessage) => void) | null,

    async sendToWorker(_workerId: string, message: IPCMessage) {
      adapter.messages.push(message);
    },
    async sendToCoordinator(_message: IPCMessage) {},
    async broadcast(message: IPCMessage) {
      adapter.messages.push(message);
    },
    onMessage(handler: (message: IPCMessage) => void) {
      adapter.messageHandler = handler;
    },
    offMessage() {},
    async registerWorker(workerId: string, metadata: WorkerMetadata) {
      adapter.workers.set(workerId, metadata);
    },
    async unregisterWorker(workerId: string) {
      adapter.workers.delete(workerId);
    },
    async heartbeat(_workerId: string) {},
    async getWorkers() {
      return [...adapter.workers.values()];
    },
    async getShardAssignment() {
      return new Map(adapter.assignment);
    },
    async setShardAssignment(assignment: Map<string, ShardRange>) {
      adapter.assignment = assignment;
    },
    async connect() {},
    async disconnect() {},
  };
  return adapter;
}

const makeMetadata = (workerId: string): WorkerMetadata => ({
  workerId,
  hostname: "test",
  pid: 1,
  lastHeartbeat: Date.now(),
  startedAt: Date.now(),
});

describe("Client IPC Integration", () => {
  describe("constructor with ipc option", () => {
    test("accepts ipc coordinator options", () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });
      expect(client.token).toBe("test-token");
      expect(client.guilds).toBeDefined();
    });

    test("accepts ipc worker options", () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "worker",
          adapter,
          workerId: "w1",
        },
      });
      expect(client.token).toBe("test-token");
    });
  });

  describe("login with coordinator mode", () => {
    test("creates gateway manager and receives shard events", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });

      const readyHandler = mock(() => {});
      client.on("ready", readyHandler);

      await client.login();

      adapter.messageHandler!({
        type: "worker:register",
        workerId: "w1",
        data: makeMetadata("w1"),
        timestamp: Date.now(),
      });

      await Bun.sleep(10);

      adapter.messageHandler!({
        type: "shard:ready",
        workerId: "w1",
        shardId: 0,
        timestamp: Date.now(),
      });

      await Bun.sleep(10);

      expect(readyHandler).toHaveBeenCalled();

      await client.destroy();
    });

    test("gateway shard events feed into handleDispatch and update cache", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });

      await client.login();

      adapter.messageHandler!({
        type: "shard:event",
        workerId: "w1",
        shardId: 0,
        data: {
          event: "MESSAGE_CREATE",
          data: {
            id: "msg-1",
            content: "hello",
            channel_id: "ch-1",
            author: { id: "u1", username: "test", discriminator: "0" },
          },
        },
        timestamp: Date.now(),
      });

      await Bun.sleep(10);

      const msg = await client.messages.cache.get("msg-1");
      expect(msg).toBeDefined();

      await client.destroy();
    });

    test("gateway GUILD_CREATE feeds into cache", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });

      await client.login();

      adapter.messageHandler!({
        type: "shard:event",
        workerId: "w1",
        shardId: 0,
        data: {
          event: "GUILD_CREATE",
          data: {
            id: "guild-1",
            name: "Test Guild",
            channels: [{ id: "ch-1", name: "general" }],
            members: [{ user: { id: "u1" } }],
            roles: [{ id: "r1", name: "Admin" }],
            emojis: [{ id: "e1", name: "👍" }],
            voice_states: [],
          },
        },
        timestamp: Date.now(),
      });

      await Bun.sleep(10);

      expect(await client.guilds.cache.get("guild-1")).toBeDefined();
      expect(await client.channels.cache.get("ch-1")).toBeDefined();
      expect(await client.members.cache.get("guild-1:u1")).toBeDefined();
      expect(await client.roles.cache.get("guild-1:r1")).toBeDefined();

      await client.destroy();
    });

    test("user event handlers receive dispatched events", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });

      const messageHandler = mock(() => {});
      client.on("MESSAGE_CREATE", messageHandler);

      await client.login();

      adapter.messageHandler!({
        type: "shard:event",
        workerId: "w1",
        shardId: 0,
        data: {
          event: "MESSAGE_CREATE",
          data: { id: "m1", content: "test" },
        },
        timestamp: Date.now(),
      });

      await Bun.sleep(10);

      expect(messageHandler).toHaveBeenCalledWith({ id: "m1", content: "test" });

      await client.destroy();
    });

    test("destroy cleans up gateway manager", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "coordinator",
          adapter,
          totalShards: 4,
          assignment: "auto",
        },
      });

      await client.login();
      await client.destroy();

      expect(client.isReady()).toBe(false);
    });
  });

  describe("login with worker mode", () => {
    test("creates gateway manager in worker mode", async () => {
      const adapter = createMockAdapter();
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
        ipc: {
          mode: "worker",
          adapter,
          workerId: "w1",
          shards: { start: 0, end: 9 },
          totalShards: 10,
        },
      });

      const debugHandler = mock(() => {});
      client.on("debug", debugHandler);

      await client.login();
      await Bun.sleep(10);

      await client.destroy();
    });
  });

  describe("login without ipc", () => {
    test("uses ShardManager as before", async () => {
      const client = new Client({
        token: "test-token",
        intents: [GatewayIntentBits.Guilds],
      });

      expect(client.ws).toBeNull();
    });
  });
});
