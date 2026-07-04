import type {
  APIButtonComponent,
  APIEmoji,
} from "@dbun/types";
import { ButtonStyle, ComponentType } from "@dbun/types";

export class ButtonBuilder {
  private data: Record<string, unknown> = {
    type: ComponentType.Button,
  };

  setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  setLabel(label: string): this {
    this.data.label = label;
    return this;
  }

  setStyle(style: ButtonStyle): this {
    this.data.style = style;
    return this;
  }

  setEmoji(emoji: Partial<APIEmoji>): this {
    this.data.emoji = emoji;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  setUrl(url: string): this {
    this.data.url = url;
    return this;
  }

  setSkuId(skuId: string): this {
    this.data.sku_id = skuId;
    return this;
  }

  toJSON(): APIButtonComponent {
    return this.data as unknown as APIButtonComponent;
  }

  static primary(customId: string, label: string): ButtonBuilder {
    return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Primary);
  }

  static secondary(customId: string, label: string): ButtonBuilder {
    return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary);
  }

  static success(customId: string, label: string): ButtonBuilder {
    return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Success);
  }

  static danger(customId: string, label: string): ButtonBuilder {
    return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Danger);
  }

  static link(url: string, label: string): ButtonBuilder {
    return new ButtonBuilder().setUrl(url).setLabel(label).setStyle(ButtonStyle.Link);
  }

  static premium(skuId: string): ButtonBuilder {
    return new ButtonBuilder().setSkuId(skuId).setStyle(ButtonStyle.Premium);
  }
}
