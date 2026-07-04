import { BaseManager } from "./base.js";
import { Ban } from "@dbun/structures";
import type { APIBan } from "@dbun/types";

export class BanManager extends BaseManager<Ban> {
  async fetch(guildId: string, userId: string): Promise<Ban | null> {
    const key = `${guildId}:${userId}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const data = await this.rest.get<APIBan>(`/guilds/${guildId}/bans/${userId}`);
    if (!data) return null;

    await this.add(key, data);
    return this.cache.get(key);
  }
}
