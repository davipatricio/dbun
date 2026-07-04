import { BaseManager } from "./base.js";
import { GuildMember } from "@dbun/structures";
import type { APIGuildMember } from "@dbun/types";

export class GuildMemberManager extends BaseManager<GuildMember> {
  async fetch(guildId: string, id: string): Promise<GuildMember | null> {
    const key = `${guildId}:${id}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const data = await this.rest.get<APIGuildMember>(`/guilds/${guildId}/members/${id}`);
    if (!data) return null;

    await this.add(key, data);
    return this.cache.get(key);
  }
}
