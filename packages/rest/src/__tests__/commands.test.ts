import { describe, test, expect, mock, beforeEach } from "bun:test";
import { ApplicationCommandManager } from "../commands.js";
import type { RESTClient } from "../client.js";
import type { RESTPutAPIApplicationCommandsJSONBody } from "@dbun/types";

function createMockRest(): RESTClient {
  return {
    get: mock(() => Promise.resolve([])),
    post: mock(() => Promise.resolve({ id: "1", name: "test", type: 1 })),
    put: mock(() => Promise.resolve([])),
    patch: mock(() => Promise.resolve({ id: "1", name: "edited" })),
    delete: mock(() => Promise.resolve()),
  } as unknown as RESTClient;
}

describe("ApplicationCommandManager", () => {
  let rest: RESTClient;
  let manager: ApplicationCommandManager;

  beforeEach(() => {
    rest = createMockRest();
    manager = new ApplicationCommandManager(rest, "app123");
  });

  describe("create", () => {
    test("sends POST to global commands endpoint", async () => {
      await manager.create({ name: "ping", description: "Pong!" });
      expect(rest.post).toHaveBeenCalledTimes(1);
      const [path, body] = (rest.post as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands");
      expect(body).toMatchObject({ name: "ping", description: "Pong!" });
    });

    test("sends POST to guild commands endpoint when guildId provided", async () => {
      await manager.create({ name: "ping", description: "Pong!" }, "guild456");
      const [path] = (rest.post as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands");
    });
  });

  describe("fetch", () => {
    test("sends GET to global command endpoint", async () => {
      await manager.fetch("cmd1");
      const [path] = (rest.get as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands/cmd1");
    });

    test("sends GET to guild command endpoint", async () => {
      await manager.fetch("cmd1", "guild456");
      const [path] = (rest.get as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands/cmd1");
    });
  });

  describe("list", () => {
    test("sends GET to global commands endpoint", async () => {
      await manager.list();
      const [path] = (rest.get as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands");
    });

    test("sends GET to guild commands endpoint", async () => {
      await manager.list("guild456");
      const [path] = (rest.get as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands");
    });
  });

  describe("edit", () => {
    test("sends PATCH to global command endpoint", async () => {
      await manager.edit("cmd1", { description: "Updated" });
      const [path, body] = (rest.patch as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands/cmd1");
      expect(body).toMatchObject({ description: "Updated" });
    });

    test("sends PATCH to guild command endpoint", async () => {
      await manager.edit("cmd1", { description: "Updated" }, "guild456");
      const [path] = (rest.patch as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands/cmd1");
    });
  });

  describe("delete", () => {
    test("sends DELETE to global command endpoint", async () => {
      await manager.delete("cmd1");
      const [path] = (rest.delete as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands/cmd1");
    });

    test("sends DELETE to guild command endpoint", async () => {
      await manager.delete("cmd1", "guild456");
      const [path] = (rest.delete as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands/cmd1");
    });
  });

  describe("bulkOverwrite", () => {
    test("sends PUT to global commands endpoint with array body", async () => {
      const cmds = [{ name: "ping", description: "Pong!" }] as RESTPutAPIApplicationCommandsJSONBody;
      await manager.bulkOverwrite(cmds);
      const [path, body] = (rest.put as any).mock.calls[0];
      expect(path).toBe("/applications/app123/commands");
      expect(body).toEqual(cmds);
    });

    test("sends PUT to guild commands endpoint", async () => {
      await manager.bulkOverwrite([], "guild456");
      const [path] = (rest.put as any).mock.calls[0];
      expect(path).toBe("/applications/app123/guilds/guild456/commands");
    });
  });
});
