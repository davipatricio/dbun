import { BaseManager } from "./base.js";
import { Role } from "@dbun/structures";
import type { APIRole } from "@dbun/types";

export class RoleManager extends BaseManager<Role> {
  async fetch(guildId: string, id: string): Promise<Role | null> {
    const key = `${guildId}:${id}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const roles = await this.rest.get<APIRole[]>(`/guilds/${guildId}/roles`);
    const data = roles?.find((r) => r.id === id);
    if (!data) return null;

    await this.add(key, data);
    return this.cache.get(key);
  }
}
