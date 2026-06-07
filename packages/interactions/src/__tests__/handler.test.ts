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
    router.setRest({} as any);
  });

  describe("setRest", () => {
    test("throws on handle without setRest", async () => {
      const r = new InteractionRouter();
      await expect(
        r.handle(createMockInteraction(InteractionType.ApplicationCommand, { name: "test" })),
      ).rejects.toThrow("no REST client");
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

    test("passes interaction and response to handler", async () => {
      let receivedInteraction: any;
      let receivedResponse: any;
      router.command("ping", (interaction, response) => {
        receivedInteraction = interaction;
        receivedResponse = response;
      });
      const interaction = createMockInteraction(InteractionType.ApplicationCommand, { name: "ping" });
      await router.handle(interaction);
      expect(receivedInteraction).toBe(interaction);
      expect(receivedResponse).toBeDefined();
      expect(typeof receivedResponse.reply).toBe("function");
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

    test("does not call handler for different custom_id", async () => {
      const handler = mock(() => Promise.resolve());
      router.component("btn_1", handler);
      await router.handle(
        createMockInteraction(InteractionType.MessageComponent, { custom_id: "btn_2" }),
      );
      expect(handler).not.toHaveBeenCalled();
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

    test("does not call handler for different custom_id", async () => {
      const handler = mock(() => Promise.resolve());
      router.modal("modal_1", handler);
      await router.handle(
        createMockInteraction(InteractionType.ModalSubmit, { custom_id: "modal_2" }),
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("chaining", () => {
    test("command/component/modal return this", () => {
      expect(router.command("a", () => {})).toBe(router);
      expect(router.component("b", () => {})).toBe(router);
      expect(router.modal("c", () => {})).toBe(router);
    });
  });
});
