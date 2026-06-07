import { describe, test, expect } from "bun:test";
import { RoundRobinStrategy, ManualStrategy, expandRange } from "../strategies.js";
import type { ShardRange } from "../types.js";

describe("RoundRobinStrategy", () => {
  const strategy = new RoundRobinStrategy();

  test("distributes shards evenly", () => {
    const result = strategy.assign(["w1", "w2", "w3"], 12);
    expect(result.get("w1")).toEqual({ start: 0, end: 3 });
    expect(result.get("w2")).toEqual({ start: 4, end: 7 });
    expect(result.get("w3")).toEqual({ start: 8, end: 11 });
  });

  test("handles remainder shards", () => {
    const result = strategy.assign(["w1", "w2", "w3"], 10);
    expect(result.get("w1")).toEqual({ start: 0, end: 3 });
    expect(result.get("w2")).toEqual({ start: 4, end: 6 });
    expect(result.get("w3")).toEqual({ start: 7, end: 9 });
  });

  test("handles single worker", () => {
    const result = strategy.assign(["w1"], 5);
    expect(result.get("w1")).toEqual({ start: 0, end: 4 });
  });

  test("handles more workers than shards", () => {
    const result = strategy.assign(["w1", "w2", "w3"], 2);
    expect(result.get("w1")).toEqual({ start: 0, end: 0 });
    expect(result.get("w2")).toEqual({ start: 1, end: 1 });
    expect(result.size).toBe(2);
  });

  test("returns empty map for no workers", () => {
    const result = strategy.assign([], 10);
    expect(result.size).toBe(0);
  });

  test("returns empty map for zero shards", () => {
    const result = strategy.assign(["w1", "w2"], 0);
    expect(result.size).toBe(0);
  });

  test("covers all shards with no gaps", () => {
    const result = strategy.assign(["w1", "w2", "w3", "w4", "w5"], 120);
    const allIds: number[] = [];
    for (const range of result.values()) {
      for (let i = range.start; i <= range.end; i++) {
        allIds.push(i);
      }
    }
    allIds.sort((a, b) => a - b);
    expect(allIds).toEqual(Array.from({ length: 120 }, (_, i) => i));
  });

  test("handles 120 shards across 4 workers", () => {
    const result = strategy.assign(["w1", "w2", "w3", "w4"], 120);
    expect(result.get("w1")).toEqual({ start: 0, end: 29 });
    expect(result.get("w2")).toEqual({ start: 30, end: 59 });
    expect(result.get("w3")).toEqual({ start: 60, end: 89 });
    expect(result.get("w4")).toEqual({ start: 90, end: 119 });
  });

  test("handles single shard single worker", () => {
    const result = strategy.assign(["w1"], 1);
    expect(result.get("w1")).toEqual({ start: 0, end: 0 });
  });

  test("handles remainder edge case: 7 shards, 3 workers", () => {
    const result = strategy.assign(["w1", "w2", "w3"], 7);
    expect(result.get("w1")).toEqual({ start: 0, end: 2 });
    expect(result.get("w2")).toEqual({ start: 3, end: 4 });
    expect(result.get("w3")).toEqual({ start: 5, end: 6 });
    expect(result.size).toBe(3);
  });

  test("preserves worker order", () => {
    const result = strategy.assign(["z", "a", "m"], 9);
    const keys = [...result.keys()];
    expect(keys).toEqual(["z", "a", "m"]);
  });
});

describe("ManualStrategy", () => {
  test("assigns specified ranges", () => {
    const strategy = new ManualStrategy({
      "w1": { start: 0, end: 9 },
      "w2": { start: 10, end: 19 },
    });
    const result = strategy.assign(["w1", "w2"], 20);
    expect(result.get("w1")).toEqual({ start: 0, end: 9 });
    expect(result.get("w2")).toEqual({ start: 10, end: 19 });
  });

  test("skips workers not in the map", () => {
    const strategy = new ManualStrategy({
      "w1": { start: 0, end: 9 },
    });
    const result = strategy.assign(["w1", "w2", "w3"], 20);
    expect(result.get("w1")).toEqual({ start: 0, end: 9 });
    expect(result.get("w2")).toBeUndefined();
    expect(result.get("w3")).toBeUndefined();
  });

  test("supports exclude in ranges", () => {
    const strategy = new ManualStrategy({
      "w1": { start: 0, end: 9, exclude: [5] },
    });
    const result = strategy.assign(["w1"], 10);
    expect(result.get("w1")).toEqual({ start: 0, end: 9, exclude: [5] });
  });

  test("accepts Map input", () => {
    const ranges = new Map<string, ShardRange>();
    ranges.set("w1", { start: 0, end: 4 });
    ranges.set("w2", { start: 5, end: 9 });
    const strategy = new ManualStrategy(ranges);
    const result = strategy.assign(["w1", "w2"], 10);
    expect(result.get("w1")).toEqual({ start: 0, end: 4 });
    expect(result.get("w2")).toEqual({ start: 5, end: 9 });
  });

  test("handles empty worker list", () => {
    const strategy = new ManualStrategy({
      "w1": { start: 0, end: 9 },
    });
    const result = strategy.assign([], 10);
    expect(result.size).toBe(0);
  });

  test("handles ranges not starting at 0", () => {
    const strategy = new ManualStrategy({
      "w1": { start: 0, end: 39 },
      "w2": { start: 40, end: 79 },
      "w3": { start: 80, end: 119 },
    });
    const result = strategy.assign(["w1", "w2", "w3"], 120);
    expect(result.get("w2")).toEqual({ start: 40, end: 79 });
  });

  test("Map input returns same results as Record input", () => {
    const record = { "w1": { start: 0, end: 4 }, "w2": { start: 5, end: 9 } };
    const map = new Map(Object.entries(record));
    const s1 = new ManualStrategy(record);
    const s2 = new ManualStrategy(map);
    expect(s1.assign(["w1", "w2"], 10)).toEqual(s2.assign(["w1", "w2"], 10));
  });
});

describe("expandRange (from strategies)", () => {
  test("is same function as from types", () => {
    const range: ShardRange = { start: 0, end: 4 };
    expect(expandRange(range)).toEqual([0, 1, 2, 3, 4]);
  });
});
