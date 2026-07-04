import { BaseManager } from "./base.js";
import { Emoji } from "@dbun/structures";
import type { APIEmoji } from "@dbun/types";

export class EmojiManager extends BaseManager<Emoji> {
  async fetch(guildId: string, id: string): Promise<Emoji | null> {
    const key = `${guildId}:${id}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const data = await this.rest.get<APIEmoji>(`/guilds/${guildId}/emojis/${id}`);
    if (!data) return null;

    await this.add(key, data);
    return this.cache.get(key);
  }
}
