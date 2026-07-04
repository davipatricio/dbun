import type {
  APISelectMenuOption,
  SelectMenuDefaultValueType,
} from "@dbun/types";
import { ComponentType } from "@dbun/types";

export type SelectMenuType =
  | ComponentType.StringSelect
  | ComponentType.UserSelect
  | ComponentType.RoleSelect
  | ComponentType.MentionableSelect
  | ComponentType.ChannelSelect;

export interface SelectDefaultValue {
  id: string;
  type: SelectMenuDefaultValueType;
}

function buildSelectBase(
  type: SelectMenuType,
  customId?: string,
): Record<string, unknown> {
  return {
    type,
    ...(customId ? { custom_id: customId } : {}),
  };
}

function applyDefaultValues(
  data: Record<string, unknown>,
  defaults: SelectDefaultValue[],
): void {
  data.default_values = defaults.map((d) => ({ id: d.id, type: d.type }));
}

export class StringSelectBuilder {
  private data: Record<string, unknown> = buildSelectBase(ComponentType.StringSelect);

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  addOption(option: APISelectMenuOption): this {
    const opts = (this.data.options as APISelectMenuOption[]) ?? [];
    opts.push(option);
    this.data.options = opts;
    return this;
  }

  setOptions(options: APISelectMenuOption[]): this {
    this.data.options = options;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  toJSON(): Record<string, unknown> {
    return this.data;
  }
}

export class UserSelectBuilder {
  private data: Record<string, unknown> = buildSelectBase(ComponentType.UserSelect);

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  setDefaultValues(defaults: SelectDefaultValue[]): this {
    applyDefaultValues(this.data, defaults);
    return this;
  }

  toJSON(): Record<string, unknown> {
    return this.data;
  }
}

export class RoleSelectBuilder {
  private data: Record<string, unknown> = buildSelectBase(ComponentType.RoleSelect);

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  setDefaultValues(defaults: SelectDefaultValue[]): this {
    applyDefaultValues(this.data, defaults);
    return this;
  }

  toJSON(): Record<string, unknown> {
    return this.data;
  }
}

export class MentionableSelectBuilder {
  private data: Record<string, unknown> = buildSelectBase(ComponentType.MentionableSelect);

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  setDefaultValues(defaults: SelectDefaultValue[]): this {
    applyDefaultValues(this.data, defaults);
    return this;
  }

  toJSON(): Record<string, unknown> {
    return this.data;
  }
}

export class ChannelSelectBuilder {
  private data: Record<string, unknown> = buildSelectBase(ComponentType.ChannelSelect);

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  setChannelTypes(channelTypes: number[]): this {
    this.data.channel_types = channelTypes;
    return this;
  }

  setDefaultValues(defaults: SelectDefaultValue[]): this {
    applyDefaultValues(this.data, defaults);
    return this;
  }

  toJSON(): Record<string, unknown> {
    return this.data;
  }
}
