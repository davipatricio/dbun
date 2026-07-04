import { BaseManager } from "./base.js";
import { Channel } from "@dbun/structures";
import type { APIChannel } from "@dbun/types";

export class ChannelManager extends BaseManager<Channel> {
  async fetch(id: string): Promise<Channel | null> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const data = await this.rest.get<APIChannel>(`/channels/${id}`);
    if (!data) return null;

    await this.add(id, data);
    return this.cache.get(id);
  }
}
