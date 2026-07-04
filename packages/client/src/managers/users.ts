import { BaseManager } from "./base.js";
import { User } from "@dbun/structures";
import type { APIUser } from "@dbun/types";

export class UserManager extends BaseManager<User> {
  async fetch(id: string): Promise<User | null> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const data = await this.rest.get<APIUser>(`/users/${id}`);
    if (!data) return null;

    await this.add(id, data);
    return this.cache.get(id);
  }
}
