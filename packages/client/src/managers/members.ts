import { BaseManager } from "./base.js";
import { GuildMember } from "@dbun/structures";
import type { APIGuildMember } from "@dbun/types";

export class GuildMemberManager extends BaseManager<GuildMember> {
  async fetch(guildId: string, id: string): Promise<GuildMember | null> {
    const cached = await this.cache.get<APIGuildMember>(`${guildId}:${id}`);
    if (cached) return new GuildMember(cached, this.context);

    const data = await this.rest.get<APIGuildMember>(`/guilds/${guildId}/members/${id}`);
    if (!data) return null;

    await this.cache.set(`${guildId}:${id}`, data, this.namespace);
    return new GuildMember(data, this.context);
  }
}
