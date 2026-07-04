import type { APIModalInteractionResponseCallbackData } from "@dbun/types";
import { TextInputStyle } from "@dbun/types";
import type { ActionRowBuilder } from "./action-row.js";
import { ActionRowBuilder as ActionRowBuilderClass } from "./action-row.js";
import type { TextInputBuilder } from "./text-input.js";
import { TextInputBuilder as TextInputBuilderClass } from "./text-input.js";
import type { ButtonBuilder } from "./button.js";
import type {
  StringSelectBuilder,
  UserSelectBuilder,
  RoleSelectBuilder,
  MentionableSelectBuilder,
  ChannelSelectBuilder,
} from "./select.js";

export type ModalComponentBuilder =
  | TextInputBuilder
  | ButtonBuilder
  | StringSelectBuilder
  | UserSelectBuilder
  | RoleSelectBuilder
  | MentionableSelectBuilder
  | ChannelSelectBuilder;

interface ToJSON {
  toJSON(): object;
}

export class ModalBuilder {
  private _customId = "";
  private _title = "";
  private actionRows: ActionRowBuilder<ToJSON>[] = [];

  setCustomId(customId: string): this {
    this._customId = customId;
    return this;
  }

  setTitle(title: string): this {
    this._title = title;
    return this;
  }

  addActionRow<T extends ModalComponentBuilder & ToJSON>(
    row: ActionRowBuilder<T>,
  ): this {
    this.actionRows.push(row as unknown as ActionRowBuilder<ToJSON>);
    return this;
  }

  setActionRows<T extends ModalComponentBuilder & ToJSON>(
    rows: ActionRowBuilder<T>[],
  ): this {
    this.actionRows = rows as unknown as ActionRowBuilder<ToJSON>[];
    return this;
  }

  addTextInput(
    customId: string,
    label: string,
    style: TextInputStyle = TextInputStyle.Short,
  ): this {
    const input = new TextInputBuilderClass().setCustomId(customId).setLabel(label).setStyle(style);
    const row = new ActionRowBuilderClass<TextInputBuilder & ToJSON>().addComponent(input as TextInputBuilder & ToJSON);
    this.actionRows.push(row as unknown as ActionRowBuilder<ModalComponentBuilder & ToJSON>);
    return this;
  }

  toJSON(): APIModalInteractionResponseCallbackData {
    return {
      custom_id: this._customId,
      title: this._title,
      components: this.actionRows.map((row) => row.toJSON()),
    } as unknown as APIModalInteractionResponseCallbackData;
  }
}
