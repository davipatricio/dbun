import type { APIApplicationCommandOptionChoice } from "@dbun/types";

export type AutocompleteHandler = (
  value: string,
) => Promise<APIApplicationCommandOptionChoice[]> | APIApplicationCommandOptionChoice[];

export class AutocompleteRouter {
  private handlers = new Map<string, AutocompleteHandler>();

  register(optionName: string, handler: AutocompleteHandler): this {
    this.handlers.set(optionName, handler);
    return this;
  }

  async handle(optionName: string, value: string): Promise<APIApplicationCommandOptionChoice[]> {
    const handler = this.handlers.get(optionName);
    if (!handler) return [];
    return handler(value);
  }
}
