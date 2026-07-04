import type {
  APIApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "@dbun/types";

export interface CommandChoice {
  name: string;
  nameLocalizations?: Record<string, string>;
  value: string | number;
}

export interface CommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  nameLocalizations?: Record<string, string>;
  description: string;
  descriptionLocalizations?: Record<string, string>;
  required?: boolean;
  choices?: CommandChoice[];
  options?: CommandOption[];
  channelTypes?: number[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  autocomplete?: boolean;
}

export interface CommandOptions {
  name: string;
  nameLocalizations?: Record<string, string>;
  description?: string;
  descriptionLocalizations?: Record<string, string>;
  type?: ApplicationCommandType;
  options?: CommandOption[];
  defaultMemberPermissions?: string;
  dmPermission?: boolean;
  nsfw?: boolean;
  contexts?: number[];
  integrationTypes?: number[];
}

export type CommandHandler = (interaction: unknown) => Promise<void> | void;

function mapOption(opt: CommandOption): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    type: opt.type,
    name: opt.name,
    description: opt.description,
  };

  if (opt.nameLocalizations) mapped.name_localizations = opt.nameLocalizations;
  if (opt.descriptionLocalizations) mapped.description_localizations = opt.descriptionLocalizations;
  if (opt.required !== undefined) mapped.required = opt.required;
  if (opt.autocomplete !== undefined) mapped.autocomplete = opt.autocomplete;
  if (opt.channelTypes) mapped.channel_types = opt.channelTypes;
  if (opt.minValue !== undefined) mapped.min_value = opt.minValue;
  if (opt.maxValue !== undefined) mapped.max_value = opt.maxValue;
  if (opt.minLength !== undefined) mapped.min_length = opt.minLength;
  if (opt.maxLength !== undefined) mapped.max_length = opt.maxLength;

  if (opt.choices) {
    mapped.choices = opt.choices.map((c) => ({
      name: c.name,
      value: c.value,
      name_localizations: c.nameLocalizations,
    }));
  }

  if (opt.options) {
    mapped.options = opt.options.map(mapOption);
  }

  return mapped;
}

export class SubcommandBuilder {
  private _name: string;
  private _description: string;
  private _options: CommandOption[] = [];
  private _nameLocalizations?: Record<string, string>;
  private _descriptionLocalizations?: Record<string, string>;

  constructor(name: string, description: string) {
    this._name = name;
    this._description = description;
  }

  setNameLocalizations(locs: Record<string, string>): this {
    this._nameLocalizations = locs;
    return this;
  }

  setDescriptionLocalizations(locs: Record<string, string>): this {
    this._descriptionLocalizations = locs;
    return this;
  }

  addOption(option: CommandOption): this {
    this._options.push(option);
    return this;
  }

  build(): CommandOption {
    return {
      type: 1,
      name: this._name,
      description: this._description,
      options: this._options.length > 0 ? this._options : undefined,
      nameLocalizations: this._nameLocalizations,
      descriptionLocalizations: this._descriptionLocalizations,
    };
  }
}

export class SubcommandGroupBuilder {
  private _name: string;
  private _description: string;
  private _options: CommandOption[] = [];
  private _nameLocalizations?: Record<string, string>;
  private _descriptionLocalizations?: Record<string, string>;

  constructor(name: string, description: string) {
    this._name = name;
    this._description = description;
  }

  setNameLocalizations(locs: Record<string, string>): this {
    this._nameLocalizations = locs;
    return this;
  }

  setDescriptionLocalizations(locs: Record<string, string>): this {
    this._descriptionLocalizations = locs;
    return this;
  }

  addSubcommand(subcommand: SubcommandBuilder): this {
    this._options.push(subcommand.build());
    return this;
  }

  build(): CommandOption {
    return {
      type: 2,
      name: this._name,
      description: this._description,
      options: this._options,
      nameLocalizations: this._nameLocalizations,
      descriptionLocalizations: this._descriptionLocalizations,
    };
  }
}

export class CommandBuilder {
  private data: Record<string, unknown>;

  constructor(options: CommandOptions) {
    this.data = {
      name: options.name,
      description: options.description ?? "",
      type: options.type ?? 1,
    };

    if (options.nameLocalizations) {
      this.data.name_localizations = options.nameLocalizations;
    }

    if (options.descriptionLocalizations) {
      this.data.description_localizations = options.descriptionLocalizations;
    }

    if (options.dmPermission !== undefined) {
      this.data.dm_permission = options.dmPermission;
    }

    if (options.nsfw !== undefined) {
      this.data.nsfw = options.nsfw;
    }

    if (options.defaultMemberPermissions !== undefined) {
      this.data.default_member_permissions = options.defaultMemberPermissions;
    }

    if (options.contexts) {
      this.data.contexts = options.contexts;
    }

    if (options.integrationTypes) {
      this.data.integration_types = options.integrationTypes;
    }

    if (options.options) {
      this.data.options = options.options.map(mapOption);
    }
  }

  setName(name: string): this {
    this.data.name = name;
    return this;
  }

  setNameLocalizations(locs: Record<string, string>): this {
    this.data.name_localizations = locs;
    return this;
  }

  setDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  setDescriptionLocalizations(locs: Record<string, string>): this {
    this.data.description_localizations = locs;
    return this;
  }

  setDefaultMemberPermissions(permissions: string): this {
    this.data.default_member_permissions = permissions;
    return this;
  }

  setNSFW(nsfw: boolean): this {
    this.data.nsfw = nsfw;
    return this;
  }

  setDmPermission(enabled: boolean): this {
    this.data.dm_permission = enabled;
    return this;
  }

  setContexts(contexts: number[]): this {
    this.data.contexts = contexts;
    return this;
  }

  setIntegrationTypes(types: number[]): this {
    this.data.integration_types = types;
    return this;
  }

  addOption(option: CommandOption): this {
    const opts = (this.data.options as Record<string, unknown>[]) ?? [];
    opts.push(mapOption(option));
    this.data.options = opts;
    return this;
  }

  addSubcommand(subcommand: SubcommandBuilder): this {
    const opts = (this.data.options as Record<string, unknown>[]) ?? [];
    opts.push(mapOption(subcommand.build()));
    this.data.options = opts;
    return this;
  }

  addSubcommandGroup(group: SubcommandGroupBuilder): this {
    const opts = (this.data.options as Record<string, unknown>[]) ?? [];
    opts.push(mapOption(group.build()));
    this.data.options = opts;
    return this;
  }

  toJSON(): APIApplicationCommand {
    return this.data as unknown as APIApplicationCommand;
  }
}
