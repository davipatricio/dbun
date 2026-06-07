import type {
  APIApplicationCommand,
  APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "@dbun/types";

export interface CommandOptions {
  name: string;
  description?: string;
  type?: ApplicationCommandType;
  options?: CommandOption[];
  dmPermission?: boolean;
  nsfw?: boolean;
}

export interface CommandOption {
  name: string;
  description: string;
  type: ApplicationCommandOptionType;
  required?: boolean;
  choices?: { name: string; value: string }[];
}

export type CommandHandler = (interaction: unknown) => Promise<void> | void;

export class CommandBuilder {
  private data: Partial<APIApplicationCommand>;

  constructor(options: CommandOptions) {
    this.data = {
      name: options.name,
      description: options.description ?? "",
      type: options.type ?? 1,
      options: options.options?.map((o) => ({
        name: o.name,
        description: o.description,
        type: o.type,
        required: o.required,
        choices: o.choices,
      })) as APIApplicationCommandOption[],
      dm_permission: options.dmPermission,
      nsfw: options.nsfw,
    };
  }

  setName(name: string): this {
    this.data.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  addOption(option: CommandOption): this {
    if (!this.data.options) {
      this.data.options = [];
    }
    this.data.options.push({
      name: option.name,
      description: option.description,
      type: option.type,
      required: option.required,
      choices: option.choices,
    } as APIApplicationCommandOption);
    return this;
  }

  toJSON(): APIApplicationCommand {
    return this.data as APIApplicationCommand;
  }
}
