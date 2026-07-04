import { BaseManager } from "./base.js";
import { Thread } from "@dbun/structures";
import type { APIChannel } from "@dbun/types";

export class ThreadManager extends BaseManager<Thread> {
  async fetch(id: string): Promise<Thread | null> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const data = await this.rest.get<APIChannel>(`/channels/${id}`);
    if (!data) return null;

    await this.add(id, data);
    return this.cache.get(id);
  }
}
