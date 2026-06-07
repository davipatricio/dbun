import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CacheManager } from "../cache-manager.js";
import { MemoryAdapter } from "../adapters/memory.js";

describe("CacheManager", () => {
  let manager: CacheManager;

  beforeEach(() => {
    manager = new CacheManager({
      adapter: new MemoryAdapter({ sweepInterval: 0 }),
    });
  });

  afterEach(async () => {
    await manager.stop();
  });

  describe("basic operations", () => {
    test("set and get", async () => {
      await manager.set("key", "value");
      expect(await manager.get<string>("key")).toEqual("value");
    });

    test("get returns null for missing key", async () => {
      expect(await manager.get<string>("missing")).toBeNull();
    });

    test("delete removes entry", async () => {
      await manager.set("key", "value");
      expect(await manager.delete("key")).toEqual(true);
      expect(await manager.get<string>("key")).toBeNull();
    });

    test("has checks existence", async () => {
      await manager.set("key", "value");
      expect(await manager.has("key")).toEqual(true);
      expect(await manager.has("missing")).toEqual(false);
    });

    test("clear empties store", async () => {
      await manager.set("a", 1);
      await manager.set("b", 2);
      await manager.clear();
      expect(await manager.size()).toEqual(0);
    });

    test("size returns count", async () => {
      await manager.set("a", 1);
      expect(await manager.size()).toEqual(1);
    });
  });

  describe("deleteByPrefix", () => {
    test("deletes keys matching prefix", async () => {
      await manager.set("guild:123:channel1", "c1");
      await manager.set("guild:123:channel2", "c2");
      await manager.set("guild:456:channel3", "c3");
      const count = await manager.deleteByPrefix("guild:123:");
      expect(count).toEqual(2);
      expect(await manager.get<string>("guild:123:channel1")).toBeNull();
      expect(await manager.get<string>("guild:123:channel2")).toBeNull();
      expect(await manager.get<string>("guild:456:channel3")).toEqual("c3");
    });

    test("returns 0 when no keys match", async () => {
      await manager.set("a", 1);
      const count = await manager.deleteByPrefix("z");
      expect(count).toEqual(0);
    });

    test("returns 0 on empty store", async () => {
      const count = await manager.deleteByPrefix("any");
      expect(count).toEqual(0);
    });

    test("deletes all keys with matching prefix", async () => {
      await manager.set("prefix:a", 1);
      await manager.set("prefix:b", 2);
      await manager.set("prefix:c", 3);
      const count = await manager.deleteByPrefix("prefix:");
      expect(count).toEqual(3);
      expect(await manager.size()).toEqual(0);
    });
  });

  describe("strategy", () => {
    test("applies per-namespace TTL", async () => {
      const mgr = new CacheManager({
        adapter: new MemoryAdapter({ sweepInterval: 0 }),
        strategy: { ns: { maxAge: 1 } },
      });
      await mgr.set("key", "value", "ns");
      expect(await mgr.get<string>("key")).toEqual("value");
      await Bun.sleep(10);
      expect(await mgr.get<string>("key")).toBeNull();
      await mgr.stop();
    });

    test("setStrategy updates strategy", async () => {
      manager.setStrategy("ns2", { maxAge: 1 });
      await manager.set("key", "value", "ns2");
      expect(await manager.get<string>("key")).toEqual("value");
      await Bun.sleep(10);
      expect(await manager.get<string>("key")).toBeNull();
    });
  });

  describe("getAdapter", () => {
    test("returns the adapter instance", () => {
      const adapter = manager.getAdapter();
      expect(adapter).toBeDefined();
    });
  });
});
