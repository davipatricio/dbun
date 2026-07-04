import { BaseManager } from "./base.js";
import { Guild } from "@dbun/structures";
import type { APIGuild } from "@dbun/types";

export class GuildManager extends BaseManager<Guild> {
  async fetch(id: string): Promise<Guild | null> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const data = await this.rest.get<APIGuild>(`/guilds/${id}`);
    if (!data) return null;

    await this.add(id, data);
    return this.cache.get(id);
  }
}
