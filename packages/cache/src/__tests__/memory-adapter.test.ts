import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { MemoryAdapter } from "../adapters/memory.js";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter({ sweepInterval: 0 });
  });

  afterEach(async () => {
    await adapter.stop();
  });

  describe("basic operations", () => {
    test("set and get", async () => {
      await adapter.set("key", "value");
      expect(await adapter.get<string>("key")).toEqual("value");
    });

    test("get returns null for missing key", async () => {
      expect(await adapter.get<string>("missing")).toBeNull();
    });

    test("set overwrites existing key", async () => {
      await adapter.set("key", "old");
      await adapter.set("key", "new");
      expect(await adapter.get<string>("key")).toEqual("new");
    });

    test("delete removes entry", async () => {
      await adapter.set("key", "value");
      const result = await adapter.delete("key");
      expect(result).toEqual(true);
      expect(await adapter.get<string>("key")).toBeNull();
    });

    test("delete returns false for missing key", async () => {
      expect(await adapter.delete("missing")).toEqual(false);
    });

    test("has returns true for existing key", async () => {
      await adapter.set("key", "value");
      expect(await adapter.has("key")).toEqual(true);
    });

    test("has returns false for missing key", async () => {
      expect(await adapter.has("missing")).toEqual(false);
    });

    test("clear empties store", async () => {
      await adapter.set("a", 1);
      await adapter.set("b", 2);
      await adapter.clear();
      expect(await adapter.size()).toEqual(0);
    });

    test("size returns count", async () => {
      await adapter.set("a", 1);
      await adapter.set("b", 2);
      expect(await adapter.size()).toEqual(2);
    });
  });

  describe("iteration", () => {
    test("keys returns all keys", async () => {
      await adapter.set("a", 1);
      await adapter.set("b", 2);
      const keys = await adapter.keys();
      expect(keys.sort()).toEqual(["a", "b"]);
    });

    test("values returns all values", async () => {
      await adapter.set("a", 10);
      await adapter.set("b", 20);
      const values = await adapter.values<number>();
      expect(values.sort()).toEqual([10, 20]);
    });

    test("entries returns key-value pairs", async () => {
      await adapter.set("a", 1);
      const entries = await adapter.entries<number>();
      expect(entries).toEqual([["a", 1]]);
    });

    test("forEach iterates all entries", async () => {
      await adapter.set("a", 1);
      await adapter.set("b", 2);
      const collected: [string, number][] = [];
      await adapter.forEach<number>((value, key) => {
        collected.push([key, value]);
      });
      expect(collected).toHaveLength(2);
    });
  });

  describe("TTL", () => {
    test("entry expires after maxAge", async () => {
      await adapter.set("key", "value", { maxAge: 1 });
      expect(await adapter.get<string>("key")).toEqual("value");
      await Bun.sleep(10);
      expect(await adapter.get<string>("key")).toBeNull();
    });

    test("has returns false for expired entry", async () => {
      await adapter.set("key", "value", { maxAge: 1 });
      await Bun.sleep(10);
      expect(await adapter.has("key")).toEqual(false);
    });

    test("entry without maxAge does not expire", async () => {
      await adapter.set("key", "value");
      await Bun.sleep(10);
      expect(await adapter.get<string>("key")).toEqual("value");
    });
  });

  describe("max eviction", () => {
    test("evicts oldest entry when max exceeded", async () => {
      const small = new MemoryAdapter({ max: 2, sweepInterval: 0 });
      await small.set("a", 1);
      await small.set("b", 2);
      await small.set("c", 3);
      expect(await small.get<number>("a")).toBeNull();
      expect(await small.get<number>("b")).toEqual(2);
      expect(await small.get<number>("c")).toEqual(3);
      await small.stop();
    });
  });

  describe("stop", () => {
    test("can be called multiple times", async () => {
      await adapter.stop();
      await adapter.stop();
    });
  });
});
