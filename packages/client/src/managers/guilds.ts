import { BaseManager } from "./base.js";
import { Guild } from "@dbun/structures";
import type { APIGuild } from "@dbun/types";

export class GuildManager extends BaseManager<Guild> {
  async fetch(id: string): Promise<Guild | null> {
    const cached = await this.cache.get<APIGuild>(id);
    if (cached) return new Guild(cached, this.context);

    const data = await this.rest.get<APIGuild>(`/guilds/${id}`);
    if (!data) return null;

    await this.cache.set(id, data, this.namespace);
    return new Guild(data, this.context);
  }
}
