import type {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
} from "@dbun/types";
import { ComponentType } from "@dbun/types";
import type { ButtonBuilder } from "./button.js";
import type {
  StringSelectBuilder,
  UserSelectBuilder,
  RoleSelectBuilder,
  MentionableSelectBuilder,
  ChannelSelectBuilder,
} from "./select.js";

export type ActionRowComponent =
  | ButtonBuilder
  | StringSelectBuilder
  | UserSelectBuilder
  | RoleSelectBuilder
  | MentionableSelectBuilder
  | ChannelSelectBuilder;

interface ToJSON {
  toJSON(): object;
}

export class ActionRowBuilder<T extends ToJSON = ActionRowComponent & ToJSON> {
  private components: T[] = [];

  addComponent(component: T): this {
    this.components.push(component);
    return this;
  }

  addComponents(components: T[]): this {
    this.components = this.components.concat(components);
    return this;
  }

  setComponents(components: T[]): this {
    this.components = components;
    return this;
  }

  toJSON(): APIActionRowComponent<APIComponentInMessageActionRow> {
    return {
      type: ComponentType.ActionRow,
      components: this.components.map(
        (c) => c.toJSON() as APIComponentInMessageActionRow,
      ),
    } as APIActionRowComponent<APIComponentInMessageActionRow>;
  }
}
