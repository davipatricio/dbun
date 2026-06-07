import type { APIInteraction } from "@dbun/types";
import { InteractionType } from "@dbun/types";
import type { RESTClient } from "@dbun/rest";
import { InteractionResponse } from "./response.js";

export type InteractionHandler = (
  interaction: APIInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export class InteractionRouter {
  private commands = new Map<string, InteractionHandler>();
  private components = new Map<string, InteractionHandler>();
  private modals = new Map<string, InteractionHandler>();
  private rest: RESTClient | null = null;

  setRest(rest: RESTClient): void {
    this.rest = rest;
  }

  command(name: string, handler: InteractionHandler): this {
    this.commands.set(name, handler);
    return this;
  }

  component(customId: string, handler: InteractionHandler): this {
    this.components.set(customId, handler);
    return this;
  }

  modal(customId: string, handler: InteractionHandler): this {
    this.modals.set(customId, handler);
    return this;
  }

  async handle(interaction: APIInteraction): Promise<void> {
    if (!this.rest) {
      throw new Error("InteractionRouter has no REST client — call setRest() before handle()");
    }

    const { type, data } = interaction;
    const response = new InteractionResponse(this.rest, interaction);

    if (type === InteractionType.ApplicationCommand && data?.name) {
      const handler = this.commands.get(data.name);
      if (handler) {
        await handler(interaction, response);
      }
    }

    if (type === InteractionType.MessageComponent && data?.custom_id) {
      const handler = this.components.get(data.custom_id);
      if (handler) {
        await handler(interaction, response);
      }
    }

    if (type === InteractionType.ModalSubmit && data?.custom_id) {
      const handler = this.modals.get(data.custom_id);
      if (handler) {
        await handler(interaction, response);
      }
    }
  }
}
