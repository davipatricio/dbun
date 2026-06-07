import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { LRUAdapter } from "../adapters/lru.js";

describe("LRUAdapter", () => {
  let adapter: LRUAdapter;

  beforeEach(() => {
    adapter = new LRUAdapter({ sweepInterval: 0 });
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

    test("delete removes entry", async () => {
      await adapter.set("key", "value");
      expect(await adapter.delete("key")).toEqual(true);
      expect(await adapter.get<string>("key")).toBeNull();
    });

    test("has returns true for existing key", async () => {
      await adapter.set("key", "value");
      expect(await adapter.has("key")).toEqual(true);
    });

    test("clear empties store", async () => {
      await adapter.set("a", 1);
      await adapter.set("b", 2);
      await adapter.clear();
      expect(await adapter.size()).toEqual(0);
    });
  });

  describe("LRU eviction", () => {
    test("evicts least recently used entry", async () => {
      const lru = new LRUAdapter({ max: 2, sweepInterval: 0 });
      await lru.set("a", 1);
      await lru.set("b", 2);
      await lru.get("a");
      await lru.set("c", 3);
      expect(await lru.get<number>("a")).toEqual(1);
      expect(await lru.get<number>("b")).toBeNull();
      expect(await lru.get<number>("c")).toEqual(3);
      await lru.stop();
    });

    test("promotes key on get", async () => {
      const lru = new LRUAdapter({ max: 2, sweepInterval: 0 });
      await lru.set("a", 1);
      await lru.set("b", 2);
      await lru.get("a");
      await lru.set("c", 3);
      expect(await lru.get<number>("a")).toEqual(1);
      await lru.stop();
    });

    test("update promotes key", async () => {
      const lru = new LRUAdapter({ max: 2, sweepInterval: 0 });
      await lru.set("a", 1);
      await lru.set("b", 2);
      await lru.set("a", 10);
      await lru.set("c", 3);
      expect(await lru.get<number>("a")).toEqual(10);
      expect(await lru.get<number>("b")).toBeNull();
      await lru.stop();
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
      expect(values.sort((a, b) => a - b)).toEqual([10, 20]);
    });

    test("entries returns pairs", async () => {
      await adapter.set("x", 99);
      const entries = await adapter.entries<number>();
      expect(entries).toEqual([["x", 99]]);
    });

    test("forEach iterates", async () => {
      await adapter.set("a", 1);
      const items: number[] = [];
      await adapter.forEach<number>((v) => items.push(v));
      expect(items).toEqual([1]);
    });
  });

  describe("stop", () => {
    test("can be called multiple times", async () => {
      await adapter.stop();
      await adapter.stop();
    });
  });
});
