import type { APIModalSubmitInteraction } from "@dbun/types";

export type ModalHandlerFn = (interaction: APIModalSubmitInteraction) => Promise<void> | void;

export class ModalHandler {
  private handlers = new Map<string, ModalHandlerFn>();

  register(customId: string, handler: ModalHandlerFn): this {
    this.handlers.set(customId, handler);
    return this;
  }

  async handle(interaction: APIModalSubmitInteraction): Promise<void> {
    const handler = this.handlers.get(interaction.data.custom_id);
    if (handler) {
      await handler(interaction);
    }
  }
}
