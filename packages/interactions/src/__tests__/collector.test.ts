import { describe, test, expect } from "bun:test";
import { ComponentCollector } from "../collector.js";
import type { APIInteraction } from "@dbun/types";

function makeInteraction(customId = "btn"): APIInteraction {
  return { id: "1", application_id: "app", type: 3, token: "t", version: 1, data: { custom_id: customId } } as any;
}

describe("ComponentCollector", () => {
  describe("collect", () => {
    test("collects matching interactions", () => {
      const collector = new ComponentCollector(() => true);
      expect(collector.collect(makeInteraction())).toBe(true);
      expect(collector.collected).toHaveLength(1);
    });

    test("rejects non-matching interactions", () => {
      const collector = new ComponentCollector((i) => (i.data as any)?.custom_id === "btn");
      expect(collector.collect(makeInteraction("other"))).toBe(false);
      expect(collector.collected).toHaveLength(0);
    });

    test("auto-stops at max", () => {
      const collector = new ComponentCollector(() => true, { max: 2 });
      collector.collect(makeInteraction("1"));
      collector.collect(makeInteraction("2"));
      expect(collector.ended).toBe(true);
      expect(collector.endReason).toBe("limit");
    });

    test("returns false after ended", () => {
      const collector = new ComponentCollector(() => true, { max: 1 });
      collector.collect(makeInteraction("1"));
      expect(collector.collect(makeInteraction("2"))).toBe(false);
    });
  });

  describe("stop", () => {
    test("sets end reason", () => {
      const collector = new ComponentCollector(() => true);
      collector.stop("user");
      expect(collector.ended).toBe(true);
      expect(collector.endReason).toBe("user");
    });

    test("default reason is 'user'", () => {
      const collector = new ComponentCollector(() => true);
      collector.stop();
      expect(collector.endReason).toBe("user");
    });

    test("idempotent", () => {
      const collector = new ComponentCollector(() => true);
      collector.stop("a");
      collector.stop("b");
      expect(collector.endReason).toBe("a");
    });
  });

  describe("await", () => {
    test("resolves when stop is called", async () => {
      const collector = new ComponentCollector(() => true);
      const promise = collector.await();
      collector.collect(makeInteraction());
      collector.stop();
      const result = await promise;
      expect(result).toHaveLength(1);
    });

    test("resolves with collected items", async () => {
      const collector = new ComponentCollector(() => true);
      const promise = collector.await();
      collector.collect(makeInteraction("a"));
      collector.collect(makeInteraction("b"));
      collector.stop();
      const result = await promise;
      expect(result).toHaveLength(2);
    });
  });

  describe("timeout", () => {
    test("auto-stops after time", async () => {
      const collector = new ComponentCollector(() => true, { time: 10 });
      const promise = collector.await();
      await promise;
      expect(collector.ended).toBe(true);
      expect(collector.endReason).toBe("time");
    }, 100);
  });

  describe("getters", () => {
    test("collected returns copy", () => {
      const collector = new ComponentCollector(() => true);
      collector.collect(makeInteraction());
      const a = collector.collected;
      const b = collector.collected;
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    test("ended is false initially", () => {
      const collector = new ComponentCollector(() => true);
      expect(collector.ended).toBe(false);
    });

    test("endReason is null initially", () => {
      const collector = new ComponentCollector(() => true);
      expect(collector.endReason).toBeNull();
    });
  });
});
