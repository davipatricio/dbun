import { BaseManager } from "./base.js";
import { User } from "@dbun/structures";
import type { APIUser } from "@dbun/types";

export class UserManager extends BaseManager<User> {
  async fetch(id: string): Promise<User | null> {
    const cached = await this.cache.get<APIUser>(id);
    if (cached) return new User(cached, this.context);

    const data = await this.rest.get<APIUser>(`/users/${id}`);
    if (!data) return null;

    await this.cache.set(id, data, this.namespace);
    return new User(data, this.context);
  }
}
