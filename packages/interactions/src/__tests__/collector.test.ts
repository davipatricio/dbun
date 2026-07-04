import { describe, test, expect } from "bun:test";
import { ComponentCollector } from "../collector.js";
import type { APIInteraction } from "@dbun/types";

function createMockInteraction(id: string, customId: string): APIInteraction {
  return {
    id,
    application_id: "app",
    type: 3,
    token: "tok",
    version: 1,
    data: { custom_id: customId },
  } as APIInteraction;
}

describe("ComponentCollector", () => {
  test("collects matching interactions", () => {
    const collector = new ComponentCollector(
      (i) => (i.data as any)?.custom_id === "btn_test",
    );

    expect(collector.collect(createMockInteraction("1", "btn_test"))).toBe(true);
    expect(collector.collect(createMockInteraction("2", "btn_test"))).toBe(true);
    expect(collector.collected).toHaveLength(2);
  });

  test("rejects non-matching interactions", () => {
    const collector = new ComponentCollector(
      (i) => (i.data as any)?.custom_id === "btn_target",
    );

    expect(collector.collect(createMockInteraction("1", "btn_other"))).toBe(false);
    expect(collector.collected).toHaveLength(0);
  });

  test("stops at max", () => {
    const collector = new ComponentCollector(() => true, { max: 2 });
    collector.collect(createMockInteraction("1", "a"));
    collector.collect(createMockInteraction("2", "b"));
    expect(collector.collect(createMockInteraction("3", "c"))).toBe(false);
    expect(collector.ended).toBe(true);
    expect(collector.endReason).toBe("limit");
  });

  test("does not collect after stop", () => {
    const collector = new ComponentCollector(() => true);
    collector.collect(createMockInteraction("1", "a"));
    collector.stop("user");
    expect(collector.collect(createMockInteraction("2", "b"))).toBe(false);
    expect(collector.ended).toBe(true);
    expect(collector.endReason).toBe("user");
  });

  test("emits collect event", () => {
    const collector = new ComponentCollector(() => true);
    let received: APIInteraction | undefined;
    collector.on("collect", (i) => {
      received = i;
    });
    const interaction = createMockInteraction("x", "y");
    collector.collect(interaction);
    expect(received).toBe(interaction);
  });

  test("emits end event on stop", () => {
    const collector = new ComponentCollector(() => true);
    let reason = "";
    let collected: APIInteraction[] = [];
    collector.on("end", (c, r) => {
      collected = c;
      reason = r;
    });
    const interaction = createMockInteraction("1", "a");
    collector.collect(interaction);
    collector.stop("test");
    expect(reason).toBe("test");
    expect(collected).toHaveLength(1);
  });

  test("off removes listener", () => {
    const collector = new ComponentCollector(() => true);
    let count = 0;
    const fn = () => { count++; };
    collector.on("collect", fn);
    collector.on("collect", fn);
    collector.off("collect", fn);
    collector.collect(createMockInteraction("1", "a"));
    expect(count).toBe(1);
  });

  test("await resolves with collected items", async () => {
    const collector = new ComponentCollector(() => true, { time: 50 });
    collector.collect(createMockInteraction("1", "a"));
    collector.collect(createMockInteraction("2", "b"));
    const result = await collector.await();
    expect(result).toHaveLength(2);
  });
});
