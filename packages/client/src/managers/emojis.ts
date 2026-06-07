import { BaseManager } from "./base.js";
import { Emoji } from "@dbun/structures";
import type { APIEmoji } from "@dbun/types";

export class EmojiManager extends BaseManager<Emoji> {
  async fetch(guildId: string, id: string): Promise<Emoji | null> {
    const cached = await this.cache.get<APIEmoji>(`${guildId}:${id}`);
    if (cached) return new Emoji(cached, this.context);

    const data = await this.rest.get<APIEmoji>(`/guilds/${guildId}/emojis/${id}`);
    if (!data) return null;

    await this.cache.set(`${guildId}:${id}`, data, this.namespace);
    return new Emoji(data, this.context);
  }
}
