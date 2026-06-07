import { describe, test, expect } from "bun:test";
import {
  expandRange,
  rangeSize,
  rangeContains,
} from "../types.js";
import type { ShardRange } from "../types.js";

describe("expandRange", () => {
  test("expands a simple range", () => {
    const range: ShardRange = { start: 0, end: 4 };
    expect(expandRange(range)).toEqual([0, 1, 2, 3, 4]);
  });

  test("excludes specified shard IDs", () => {
    const range: ShardRange = { start: 0, end: 9, exclude: [3, 7] };
    expect(expandRange(range)).toEqual([0, 1, 2, 4, 5, 6, 8, 9]);
  });

  test("returns empty array when all excluded", () => {
    const range: ShardRange = { start: 0, end: 2, exclude: [0, 1, 2] };
    expect(expandRange(range)).toEqual([]);
  });

  test("handles single shard range", () => {
    const range: ShardRange = { start: 5, end: 5 };
    expect(expandRange(range)).toEqual([5]);
  });

  test("handles empty exclude array", () => {
    const range: ShardRange = { start: 0, end: 3, exclude: [] };
    expect(expandRange(range)).toEqual([0, 1, 2, 3]);
  });

  test("handles undefined exclude", () => {
    const range: ShardRange = { start: 0, end: 3 };
    expect(expandRange(range)).toEqual([0, 1, 2, 3]);
  });

  test("handles large ranges", () => {
    const range: ShardRange = { start: 0, end: 999 };
    const result = expandRange(range);
    expect(result.length).toBe(1000);
    expect(result[0]).toBe(0);
    expect(result[999]).toBe(999);
  });

  test("handles range not starting at 0", () => {
    const range: ShardRange = { start: 30, end: 39 };
    expect(expandRange(range)).toEqual([30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
  });

  test("handles multiple excludes", () => {
    const range: ShardRange = { start: 0, end: 9, exclude: [0, 2, 4, 6, 8] };
    expect(expandRange(range)).toEqual([1, 3, 5, 7, 9]);
  });
});

describe("rangeSize", () => {
  test("returns correct size for simple range", () => {
    expect(rangeSize({ start: 0, end: 9 })).toBe(10);
  });

  test("subtracts excluded count", () => {
    expect(rangeSize({ start: 0, end: 9, exclude: [3, 7] })).toBe(8);
  });

  test("returns 1 for single shard", () => {
    expect(rangeSize({ start: 5, end: 5 })).toBe(1);
  });

  test("returns 0 when all excluded", () => {
    expect(rangeSize({ start: 0, end: 2, exclude: [0, 1, 2] })).toBe(0);
  });

  test("handles range not starting at 0", () => {
    expect(rangeSize({ start: 30, end: 59 })).toBe(30);
  });

  test("handles large range", () => {
    expect(rangeSize({ start: 0, end: 119 })).toBe(120);
  });
});

describe("rangeContains", () => {
  test("returns true for shard in range", () => {
    expect(rangeContains({ start: 0, end: 9 }, 5)).toBe(true);
  });

  test("returns true for start boundary", () => {
    expect(rangeContains({ start: 0, end: 9 }, 0)).toBe(true);
  });

  test("returns true for end boundary", () => {
    expect(rangeContains({ start: 0, end: 9 }, 9)).toBe(true);
  });

  test("returns false for shard below range", () => {
    expect(rangeContains({ start: 5, end: 9 }, 4)).toBe(false);
  });

  test("returns false for shard above range", () => {
    expect(rangeContains({ start: 0, end: 5 }, 6)).toBe(false);
  });

  test("returns false for excluded shard", () => {
    expect(rangeContains({ start: 0, end: 9, exclude: [5] }, 5)).toBe(false);
  });

  test("returns true for non-excluded shard", () => {
    expect(rangeContains({ start: 0, end: 9, exclude: [5] }, 4)).toBe(true);
  });

  test("returns false for range not starting at 0", () => {
    expect(rangeContains({ start: 30, end: 59 }, 29)).toBe(false);
    expect(rangeContains({ start: 30, end: 59 }, 30)).toBe(true);
    expect(rangeContains({ start: 30, end: 59 }, 59)).toBe(true);
    expect(rangeContains({ start: 30, end: 59 }, 60)).toBe(false);
  });
});
