import type { APITextInputComponent } from "@dbun/types";
import { ComponentType, TextInputStyle } from "@dbun/types";

export class TextInputBuilder {
  private data: Partial<APITextInputComponent> = {
    type: ComponentType.TextInput,
  };

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setLabel(label: string): this {
    this.data.label = label;
    return this;
  }

  setStyle(style: TextInputStyle): this {
    this.data.style = style;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  setRequired(required: boolean): this {
    this.data.required = required;
    return this;
  }

  setMinLength(min: number): this {
    this.data.min_length = min;
    return this;
  }

  setMaxLength(max: number): this {
    this.data.max_length = max;
    return this;
  }

  setValue(value: string): this {
    this.data.value = value;
    return this;
  }

  toJSON(): APITextInputComponent {
    return this.data as APITextInputComponent;
  }

  static short(customId: string, label: string): TextInputBuilder {
    return new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(TextInputStyle.Short);
  }

  static paragraph(customId: string, label: string): TextInputBuilder {
    return new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(TextInputStyle.Paragraph);
  }
}
