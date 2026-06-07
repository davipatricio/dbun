import { BaseManager } from "./base.js";
import { Role } from "@dbun/structures";
import type { APIRole } from "@dbun/types";

export class RoleManager extends BaseManager<Role> {
  async fetch(guildId: string, id: string): Promise<Role | null> {
    const cached = await this.cache.get<APIRole>(`${guildId}:${id}`);
    if (cached) return new Role(cached, this.context);

    const roles = await this.rest.get<APIRole[]>(`/guilds/${guildId}/roles`);
    const data = roles?.find((r) => r.id === id);
    if (!data) return null;

    await this.cache.set(`${guildId}:${id}`, data, this.namespace);
    return new Role(data, this.context);
  }
}
