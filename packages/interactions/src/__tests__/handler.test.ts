import { describe, test, expect, mock, beforeEach } from "bun:test";
import { InteractionRouter } from "../handler.js";
import { InteractionType } from "@dbun/types";
import type { APIInteraction } from "@dbun/types";

function createMockInteraction(
  type: number,
  data?: { name?: string; custom_id?: string },
): APIInteraction {
  return {
    id: "1",
    application_id: "app",
    type,
    token: "token",
    version: 1,
    data,
  } as APIInteraction;
}

describe("InteractionRouter", () => {
  let router: InteractionRouter;

  beforeEach(() => {
    router = new InteractionRouter();
    router.setRest({ post: mock(() => Promise.resolve({})) } as any);
  });

  describe("PING", () => {
    test("auto-responds to PING", async () => {
      const postSpy = mock(() => Promise.resolve({}));
      const r = new InteractionRouter();
      r.setRest({ post: postSpy } as any);
      await r.handle(createMockInteraction(InteractionType.Ping));
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("command", () => {
    test("routes ApplicationCommand to handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.command("ping", handler);
      await router.handle(createMockInteraction(InteractionType.ApplicationCommand, { name: "ping" }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("does not call handler for different command name", async () => {
      const handler = mock(() => Promise.resolve());
      router.command("ping", handler);
      await router.handle(
        createMockInteraction(InteractionType.ApplicationCommand, { name: "pong" }),
      );
      expect(handler).not.toHaveBeenCalled();
    });

    test("calls onCommand wildcard when no specific handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.onCommand(handler);
      await router.handle(createMockInteraction(InteractionType.ApplicationCommand, { name: "unknown" }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("component", () => {
    test("routes MessageComponent to handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.component("btn_1", handler);
      await router.handle(
        createMockInteraction(InteractionType.MessageComponent, { custom_id: "btn_1" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("calls onComponent wildcard", async () => {
      const handler = mock(() => Promise.resolve());
      router.onComponent(handler);
      await router.handle(
        createMockInteraction(InteractionType.MessageComponent, { custom_id: "unknown_btn" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("modal", () => {
    test("routes ModalSubmit to handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.modal("modal_1", handler);
      await router.handle(
        createMockInteraction(InteractionType.ModalSubmit, { custom_id: "modal_1" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("calls onModal wildcard", async () => {
      const handler = mock(() => Promise.resolve());
      router.onModal(handler);
      await router.handle(
        createMockInteraction(InteractionType.ModalSubmit, { custom_id: "unknown_modal" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("autocomplete", () => {
    test("routes autocomplete to handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.autocomplete("search", handler);
      await router.handle(
        createMockInteraction(InteractionType.ApplicationCommandAutocomplete, { name: "search" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("calls onAutocomplete wildcard", async () => {
      const handler = mock(() => Promise.resolve());
      router.onAutocomplete(handler);
      await router.handle(
        createMockInteraction(InteractionType.ApplicationCommandAutocomplete, { name: "unknown" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("removal", () => {
    test("removeCommand removes a command handler", async () => {
      const handler = mock(() => Promise.resolve());
      router.command("ping", handler);
      expect(router.removeCommand("ping")).toBe(true);
      await router.handle(createMockInteraction(InteractionType.ApplicationCommand, { name: "ping" }));
      expect(handler).not.toHaveBeenCalled();
    });

    test("removeCommand returns false if not present", () => {
      expect(router.removeCommand("nope")).toBe(false);
    });

    test("removeComponent removes a component handler", () => {
      router.component("btn_1", () => Promise.resolve());
      expect(router.removeComponent("btn_1")).toBe(true);
      expect(router.removeComponent("btn_1")).toBe(false);
    });

    test("removeModal removes a modal handler", () => {
      router.modal("modal_1", () => Promise.resolve());
      expect(router.removeModal("modal_1")).toBe(true);
    });

    test("removeAutocomplete removes an autocomplete handler", () => {
      router.autocomplete("search", () => Promise.resolve());
      expect(router.removeAutocomplete("search")).toBe(true);
    });

    test("clearCommands removes all command handlers", async () => {
      router.command("a", () => Promise.resolve());
      router.command("b", () => Promise.resolve());
      router.clearCommands();
      const handler = mock(() => Promise.resolve());
      router.onCommand(handler);
      await router.handle(createMockInteraction(InteractionType.ApplicationCommand, { name: "a" }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("clearComponents removes all component handlers", () => {
      router.component("a", () => Promise.resolve());
      router.component("b", () => Promise.resolve());
      router.clearComponents();
      expect(router.removeComponent("a")).toBe(false);
    });
  });
});
