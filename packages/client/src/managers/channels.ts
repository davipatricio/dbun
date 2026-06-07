import { BaseManager } from "./base.js";
import { Channel } from "@dbun/structures";
import type { APIChannel } from "@dbun/types";

export class ChannelManager extends BaseManager<Channel> {
  async fetch(id: string): Promise<Channel | null> {
    const cached = await this.cache.get<APIChannel>(id);
    if (cached) return new Channel(cached, this.context);

    const data = await this.rest.get<APIChannel>(`/channels/${id}`);
    if (!data) return null;

    await this.cache.set(id, data, this.namespace);
    return new Channel(data, this.context);
  }
}
