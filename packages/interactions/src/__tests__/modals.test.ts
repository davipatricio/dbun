import { describe, test, expect, mock, beforeEach } from "bun:test";
import { ModalHandler } from "../modals.js";

describe("ModalHandler", () => {
  let handler: ModalHandler;

  beforeEach(() => {
    handler = new ModalHandler();
  });

  describe("register + handle", () => {
    test("calls handler for registered custom_id", async () => {
      const fn = mock(() => Promise.resolve());
      handler.register("modal_1", fn);
      await handler.handle({ data: { custom_id: "modal_1" } } as any);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("does not call handler for unregistered custom_id", async () => {
      const fn = mock(() => Promise.resolve());
      handler.register("modal_1", fn);
      await handler.handle({ data: { custom_id: "modal_2" } } as any);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("chaining", () => {
    test("register returns this", () => {
      expect(handler.register("a", () => {})).toBe(handler);
    });
  });
});
