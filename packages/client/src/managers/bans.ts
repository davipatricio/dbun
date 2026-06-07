import { BaseManager } from "./base.js";
import { Ban } from "@dbun/structures";
import type { APIBan } from "@dbun/types";

export class BanManager extends BaseManager<Ban> {
  async fetch(guildId: string, userId: string): Promise<Ban | null> {
    const cached = await this.cache.get<APIBan>(`${guildId}:${userId}`);
    if (cached) return new Ban(cached, this.context);

    const data = await this.rest.get<APIBan>(`/guilds/${guildId}/bans/${userId}`);
    if (!data) return null;

    await this.cache.set(`${guildId}:${userId}`, data, this.namespace);
    return new Ban(data, this.context);
  }
}
