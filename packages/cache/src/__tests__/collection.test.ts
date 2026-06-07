import { describe, test, expect } from "bun:test";
import { Collection } from "../collection.js";

describe("Collection", () => {
  function createTestCollection(): Collection<string, number> {
    const col = new Collection<string, number>();
    col.set("a", 1);
    col.set("b", 2);
    col.set("c", 3);
    return col;
  }

  describe("find", () => {
    test("returns first matching value", () => {
      const col = createTestCollection();
      expect(col.find((v) => v === 2)).toEqual(2);
    });

    test("returns undefined when no match", () => {
      const col = createTestCollection();
      expect(col.find((v) => v === 99)).toBeUndefined();
    });

    test("receives key in predicate", () => {
      const col = createTestCollection();
      const result = col.find((_v, k) => k === "b");
      expect(result).toEqual(2);
    });
  });

  describe("findKey", () => {
    test("returns key of first matching value", () => {
      const col = createTestCollection();
      expect(col.findKey((v) => v === 3)).toEqual("c");
    });

    test("returns undefined when no match", () => {
      const col = createTestCollection();
      expect(col.findKey((v) => v === 99)).toBeUndefined();
    });
  });

  describe("filter", () => {
    test("returns new collection with matching entries", () => {
      const col = createTestCollection();
      const filtered = col.filter((v) => v > 1);
      expect(filtered.size).toEqual(2);
      expect(filtered.get("b")).toEqual(2);
      expect(filtered.get("c")).toEqual(3);
    });

    test("returns empty collection when no matches", () => {
      const col = createTestCollection();
      const filtered = col.filter((v) => v > 100);
      expect(filtered.size).toEqual(0);
    });

    test("does not mutate original", () => {
      const col = createTestCollection();
      col.filter((v) => v > 1);
      expect(col.size).toEqual(3);
    });
  });

  describe("map", () => {
    test("transforms values", () => {
      const col = createTestCollection();
      const mapped = col.map((v) => v * 10);
      expect(mapped).toEqual([10, 20, 30]);
    });

    test("receives key in transform function", () => {
      const col = createTestCollection();
      const mapped = col.map((_v, k) => k.toUpperCase());
      expect(mapped).toEqual(["A", "B", "C"]);
    });
  });

  describe("some", () => {
    test("returns true if any match", () => {
      const col = createTestCollection();
      expect(col.some((v) => v === 2)).toEqual(true);
    });

    test("returns false if none match", () => {
      const col = createTestCollection();
      expect(col.some((v) => v === 99)).toEqual(false);
    });
  });

  describe("every", () => {
    test("returns true if all match", () => {
      const col = createTestCollection();
      expect(col.every((v) => v > 0)).toEqual(true);
    });

    test("returns false if any fails", () => {
      const col = createTestCollection();
      expect(col.every((v) => v > 2)).toEqual(false);
    });
  });

  describe("first / last", () => {
    test("first returns first value", () => {
      const col = createTestCollection();
      expect(col.first()).toEqual(1);
    });

    test("last returns last value", () => {
      const col = createTestCollection();
      expect(col.last()).toEqual(3);
    });

    test("first returns undefined on empty", () => {
      expect(new Collection().first()).toBeUndefined();
    });

    test("last returns undefined on empty", () => {
      expect(new Collection().last()).toBeUndefined();
    });
  });

  describe("random", () => {
    test("returns a value from the collection", () => {
      const col = createTestCollection();
      const val = col.random();
      expect([1, 2, 3]).toContain(val!);
    });

    test("returns undefined on empty", () => {
      expect(new Collection().random()).toBeUndefined();
    });
  });

  describe("sort", () => {
    test("sorts by default comparator", () => {
      const col = new Collection<string, number>();
      col.set("c", 3);
      col.set("a", 1);
      col.set("b", 2);
      col.sort();
      expect([...col.values()]).toEqual([1, 2, 3]);
    });

    test("sorts with custom comparator", () => {
      const col = new Collection<string, number>();
      col.set("a", 1);
      col.set("b", 2);
      col.set("c", 3);
      col.sort(([, a], [, b]) => b - a);
      expect([...col.values()]).toEqual([3, 2, 1]);
    });

    test("returns this for chaining", () => {
      const col = new Collection<string, number>();
      expect(col.sort()).toEqual(col);
    });
  });
});
