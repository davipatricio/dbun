import { describe, test, expect, mock } from "bun:test";
import { InteractionResponse } from "../response.js";
import { InteractionType } from "@dbun/types";
import type { APIInteraction } from "@dbun/types";

function createMockInteraction(): APIInteraction {
  return {
    id: "interaction_id",
    application_id: "app_id",
    type: InteractionType.ApplicationCommand,
    token: "test_token",
    version: 1,
    data: { name: "test" },
  } as APIInteraction;
}

function createMockRest() {
  return {
    post: mock(() => Promise.resolve({})),
    patch: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve(undefined)),
  };
}

describe("InteractionResponse", () => {
  test("reply sends correct payload", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.reply({ content: "Hello!" });

    expect(rest.post).toHaveBeenCalledTimes(1);
    const [path, body] = (rest.post as any).mock.calls[0];
    expect(path).toContain("/interactions/interaction_id/test_token/callback");
    expect(body.type).toBe(4);
    expect(body.data.content).toBe("Hello!");
  });

  test("deferReply sends ephemeral flag", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.deferReply(true);

    expect(rest.post).toHaveBeenCalledTimes(1);
    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.type).toBe(5);
    expect(body.data.flags).toBe(64);
  });

  test("deferReply without ephemeral", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.deferReply(false);

    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.data).toBeUndefined();
  });

  test("editReply calls PATCH", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.editReply({ content: "Edited!" });

    expect(rest.patch).toHaveBeenCalledTimes(1);
    expect((rest.patch as any).mock.calls[0][0]).toContain("/webhooks/app_id/test_token/messages/@original");
  });

  test("deleteReply calls DELETE", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.deleteReply();

    expect(rest.delete).toHaveBeenCalledTimes(1);
    expect((rest.delete as any).mock.calls[0][0]).toContain("/webhooks/app_id/test_token/messages/@original");
  });

  test("followUp calls POST webhook", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.followUp({ content: "Follow up!" });

    expect(rest.post).toHaveBeenCalledTimes(1);
    expect((rest.post as any).mock.calls[0][0]).toContain("/webhooks/app_id/test_token");
  });

  test("editFollowUp calls PATCH on specific message", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.editFollowUp("msg_123", { content: "Updated followup" });

    expect(rest.patch).toHaveBeenCalledTimes(1);
    expect((rest.patch as any).mock.calls[0][0]).toContain("/webhooks/app_id/test_token/messages/msg_123");
  });

  test("deleteFollowUp calls DELETE on specific message", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.deleteFollowUp("msg_456");

    expect(rest.delete).toHaveBeenCalledTimes(1);
    expect((rest.delete as any).mock.calls[0][0]).toContain("/webhooks/app_id/test_token/messages/msg_456");
  });

  test("deferUpdate sends correct type", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.deferUpdate();

    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.type).toBe(6);
  });

  test("update sends correct type with data", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.update({ content: "Updated!" });

    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.type).toBe(7);
    expect(body.data.content).toBe("Updated!");
  });

  test("sendModal sends type 9", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    const modal = {
      toJSON: mock(() => ({ custom_id: "modal_1", title: "Test", components: [] })),
    };
    await response.sendModal(modal as any);

    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.type).toBe(9);
  });

  test("sendAutocompleteResult sends type 8 with choices", async () => {
    const rest = createMockRest();
    const response = new InteractionResponse(rest as any, createMockInteraction());
    await response.sendAutocompleteResult([
      { name: "Option A", value: "a" },
    ]);

    const [, body] = (rest.post as any).mock.calls[0];
    expect(body.type).toBe(8);
    expect(body.data.choices).toEqual([{ name: "Option A", value: "a" }]);
  });

  describe("replied guard", () => {
    test("isReplied is false initially", () => {
      const response = new InteractionResponse(createMockRest() as any, createMockInteraction());
      expect(response.isReplied).toBe(false);
    });

    test("isReplied becomes true after reply", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      await response.reply({ content: "Hi" });
      expect(response.isReplied).toBe(true);
    });

    test("throws on double reply", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      await response.reply({ content: "First" });
      await expect(response.reply({ content: "Second" })).rejects.toThrow(/already been replied/);
    });

    test("throws on reply after deferReply", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      await response.deferReply();
      await expect(response.update({ content: "Late" })).rejects.toThrow(/already been replied/);
    });

    test("throws on double sendModal", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      const modal = { toJSON: mock(() => ({ custom_id: "m", title: "T", components: [] })) };
      await response.sendModal(modal as any);
      await expect(response.sendModal(modal as any)).rejects.toThrow(/already been replied/);
    });

    test("followUp does NOT set replied flag", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      await response.reply({ content: "Hi" });
      await response.followUp({ content: "Followup" });
      expect(rest.post).toHaveBeenCalledTimes(2);
    });

    test("editReply does NOT set replied flag", async () => {
      const rest = createMockRest();
      const response = new InteractionResponse(rest as any, createMockInteraction());
      await response.reply({ content: "Hi" });
      await response.editReply({ content: "Edit" });
      expect(response.isReplied).toBe(true);
    });
  });
});
