import type {
  APIInteraction,
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIApplicationCommandAutocompleteInteraction,
} from "@dbun/types";
import { InteractionType } from "@dbun/types";
import type { RESTClient } from "@dbun/rest";
import { InteractionResponse } from "./response.js";

export type InteractionHandler = (
  interaction: APIInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export type CommandInteractionHandler = (
  interaction: APIChatInputApplicationCommandInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export type ComponentInteractionHandler = (
  interaction: APIMessageComponentInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export type ModalSubmitInteractionHandler = (
  interaction: APIModalSubmitInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export type AutocompleteInteractionHandler = (
  interaction: APIApplicationCommandAutocompleteInteraction,
  response: InteractionResponse,
) => Promise<void> | void;

export class InteractionRouter {
  private commands = new Map<string, InteractionHandler>();
  private components = new Map<string, InteractionHandler>();
  private modals = new Map<string, InteractionHandler>();
  private autocompleteHandlers = new Map<string, InteractionHandler>();
  private rest: RESTClient | null = null;

  private onAnyCommand: InteractionHandler[] = [];
  private onAnyComponent: InteractionHandler[] = [];
  private onAnyModal: InteractionHandler[] = [];
  private onAnyAutocomplete: InteractionHandler[] = [];

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

  autocomplete(commandName: string, handler: InteractionHandler): this {
    this.autocompleteHandlers.set(commandName, handler);
    return this;
  }

  removeCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  removeComponent(customId: string): boolean {
    return this.components.delete(customId);
  }

  removeModal(customId: string): boolean {
    return this.modals.delete(customId);
  }

  removeAutocomplete(commandName: string): boolean {
    return this.autocompleteHandlers.delete(commandName);
  }

  clearCommands(): this {
    this.commands.clear();
    return this;
  }

  clearComponents(): this {
    this.components.clear();
    return this;
  }

  clearModals(): this {
    this.modals.clear();
    return this;
  }

  clearAutocomplete(): this {
    this.autocompleteHandlers.clear();
    return this;
  }

  onCommand(handler: InteractionHandler): this {
    this.onAnyCommand.push(handler);
    return this;
  }

  onComponent(handler: InteractionHandler): this {
    this.onAnyComponent.push(handler);
    return this;
  }

  onModal(handler: InteractionHandler): this {
    this.onAnyModal.push(handler);
    return this;
  }

  onAutocomplete(handler: InteractionHandler): this {
    this.onAnyAutocomplete.push(handler);
    return this;
  }

  async handle(interaction: APIInteraction): Promise<void> {
    if (!this.rest) {
      throw new Error("InteractionRouter has no REST client -- call setRest() before handle()");
    }

    const { type, data } = interaction;
    const response = new InteractionResponse(this.rest, interaction as APIInteraction);

    if (type === InteractionType.Ping) {
      await response.pong();
      return;
    }

    if (type === InteractionType.ApplicationCommand && data) {
      const name = (data as { name?: string }).name;
      if (name) {
        const handler = this.commands.get(name);
        if (handler) {
          await handler(interaction, response);
          return;
        }
      }
      for (const handler of this.onAnyCommand) {
        await handler(interaction, response);
      }
      return;
    }

    if (type === InteractionType.MessageComponent && data) {
      const customId = (data as { custom_id?: string }).custom_id;
      if (customId) {
        const handler = this.components.get(customId);
        if (handler) {
          await handler(interaction, response);
          return;
        }
      }
      for (const handler of this.onAnyComponent) {
        await handler(interaction, response);
      }
      return;
    }

    if (type === InteractionType.ModalSubmit && data) {
      const customId = (data as { custom_id?: string }).custom_id;
      if (customId) {
        const handler = this.modals.get(customId);
        if (handler) {
          await handler(interaction, response);
          return;
        }
      }
      for (const handler of this.onAnyModal) {
        await handler(interaction, response);
      }
      return;
    }

    if (type === InteractionType.ApplicationCommandAutocomplete && data) {
      const name = (data as { name?: string }).name;
      if (name) {
        const handler = this.autocompleteHandlers.get(name);
        if (handler) {
          await handler(interaction, response);
          return;
        }
      }
      for (const handler of this.onAnyAutocomplete) {
        await handler(interaction, response);
      }
    }
  }
}
